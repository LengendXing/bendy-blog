export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isRateLimited, requestIp } from "@/lib/rate-limit"
import { logStructured } from "@/lib/observability"
import { reportOperationFailure } from "@/lib/ops"

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const UPLOAD_TIMEOUT_MS = 15_000
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"])

function hasValidSignature(buffer: Buffer, type: string) {
  if (type === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  if (type === "image/jpeg") return buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
  if (type === "image/gif") {
    const signature = buffer.subarray(0, 6).toString("ascii")
    return signature === "GIF87a" || signature === "GIF89a"
  }
  if (type === "image/webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP"
  return false
}

async function getDufsConfig() {
  // DB config first
  const enabledCfg = await prisma.siteConfig.findUnique({ where: { key: "dufsEnabled" } })
  const dbEnabled = enabledCfg?.value === "true"
  // Env fallback
  const envEnabled = process.env.DUFS_ENABLED === "true"

  if (!dbEnabled && !envEnabled) return null

  const urlCfg = await prisma.siteConfig.findUnique({ where: { key: "dufsUrl" } })
  const userCfg = await prisma.siteConfig.findUnique({ where: { key: "dufsUser" } })
  const passCfg = await prisma.siteConfig.findUnique({ where: { key: "dufsPass" } })

  const url = urlCfg?.value || process.env.DUFS_URL || ""
  const user = userCfg?.value || process.env.DUFS_USER || ""
  const pass = passCfg?.value || process.env.DUFS_PASS || ""

  if (!url) return null
  return { url, user, pass }
}

async function getGithubImageConfig() {
  const repoCfg = await prisma.siteConfig.findUnique({ where: { key: "githubImageRepo" } })
  const tokenCfg = await prisma.siteConfig.findUnique({ where: { key: "githubImageToken" } })

  const repo = repoCfg?.value || process.env.GITHUB_IMAGE_REPO || ""
  const token = tokenCfg?.value || process.env.GITHUB_IMAGE_TOKEN || ""

  if (!repo || !token) return null
  return { repo, token }
}

async function loadBackendConfig<T>(
  backend: string,
  loader: () => Promise<T | null>,
): Promise<T | null> {
  try {
    return await loader()
  } catch (error) {
    await reportOperationFailure({
      event: "upload.config_load_failed",
      component: "api.upload",
      action: backend,
      error,
      severity: "warning",
      fingerprint: `upload.config_load_failed:${backend}`,
    })
    return null
  }
}

async function uploadToDufs(
  buffer: Buffer,
  contentType: string,
  filename: string,
  config: { url: string; user: string; pass: string },
): Promise<string> {
  const headers: Record<string, string> = { "Content-Type": contentType }
  if (config.user && config.pass) {
    headers.Authorization = "Basic " + Buffer.from(`${config.user}:${config.pass}`).toString("base64")
  }
  const uploadUrl = `${config.url.replace(/\/$/, "")}/${filename}`
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers,
    body: new Uint8Array(buffer),
    signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`Dufs responded ${response.status}`)
  return `/api/image?url=${encodeURIComponent(uploadUrl)}`
}

async function uploadToGithubImage(
  buffer: Buffer,
  filename: string,
  config: { repo: string; token: string },
): Promise<string> {
  const path = `images/${filename}`
  const response = await fetch(`https://api.github.com/repos/${config.repo}/contents/${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({ message: `Upload image ${filename}`, content: buffer.toString("base64") }),
    signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    throw new Error(`GitHub image upload responded ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`)
  }
  const data = await response.json()
  const downloadUrl = data?.content?.download_url
  if (typeof downloadUrl !== "string" || !downloadUrl) {
    throw new Error("GitHub image upload returned no download URL")
  }
  return downloadUrl
}

async function recordBackendFailure(
  backend: string,
  error: unknown,
  filename: string,
  failedBackends: string[],
): Promise<void> {
  failedBackends.push(backend)
  await reportOperationFailure({
    event: "upload.backend_failed",
    component: "api.upload",
    action: backend,
    error,
    context: { filename },
    severity: "warning",
    fingerprint: `upload.backend_failed:api.upload:${backend}`,
  })
}

async function attemptUploads(
  buffer: Buffer,
  contentType: string,
  filename: string,
  dufs: Awaited<ReturnType<typeof getDufsConfig>>,
  ghImg: Awaited<ReturnType<typeof getGithubImageConfig>>,
): Promise<{ url: string | null; failedBackends: string[] }> {
  const failedBackends: string[] = []

  if (dufs) {
    try {
      return { url: await uploadToDufs(buffer, contentType, filename, dufs), failedBackends }
    } catch (error) {
      await recordBackendFailure("dufs", error, filename, failedBackends)
    }
  }

  if (ghImg) {
    try {
      return { url: await uploadToGithubImage(buffer, filename, ghImg), failedBackends }
    } catch (error) {
      await recordBackendFailure("github_image", error, filename, failedBackends)
    }
  }

  return { url: null, failedBackends }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (await isRateLimited(`uploads:user:${session.user.id}:${requestIp(req)}`, 20, 3600)) {
    return NextResponse.json({ error: "too many uploads" }, { status: 429 })
  }

  const formData = await req.formData()
  const file = formData.get("file") as File
  if (!file) return NextResponse.json({ error: "no file" }, { status: 400 })
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) return NextResponse.json({ error: "unsupported image type" }, { status: 400 })
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) return NextResponse.json({ error: "image must be 5 MB or smaller" }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  if (!hasValidSignature(buffer, file.type)) return NextResponse.json({ error: "invalid image file" }, { status: 400 })
  const ext = file.type.split("/")[1] || "png"
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const dufs = await loadBackendConfig("dufs", getDufsConfig)
  const ghImg = await loadBackendConfig("github_image", getGithubImageConfig)
  const { url, failedBackends } = await attemptUploads(buffer, file.type, filename, dufs, ghImg)
  if (url) return NextResponse.json({ url })

  const configuredBackends = [dufs ? "dufs" : null, ghImg ? "github_image" : null].filter(Boolean)
  logStructured("warn", {
    event: "upload.fallback_used",
    component: "api.upload",
    outcome: "fallback",
    context: { filename, configuredBackends, failedBackends },
  })

  if (failedBackends.length > 0) {
    await reportOperationFailure({
      event: "upload.fallback_used",
      component: "api.upload",
      action: "fallback",
      error: new Error(`Image upload fell back to base64 after ${failedBackends.join(", ")} failed`),
      context: { filename, configuredBackends, failedBackends },
      severity: "warning",
      fingerprint: "upload.fallback_used:api.upload",
    })
  }

  // Fallback: base64
  return NextResponse.json({ url: `data:${file.type};base64,${buffer.toString("base64")}` })
}
