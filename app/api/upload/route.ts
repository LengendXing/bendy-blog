export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isRateLimited, requestIp } from "@/lib/rate-limit"
import {
  hasValidImageSignature,
  isAllowedImageType,
  isInvalidUploadSize,
  isRequestTooLarge,
  normalizeContentType,
} from "@/lib/upload-policy"

const UPLOAD_TIMEOUT_MS = 15_000

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

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  // Upload is an administrative capability. A GitHub login alone is not enough:
  // anyone can create a GitHub account, so only configured admins may write files.
  if (!(session.user as { isAdmin?: boolean }).isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  if (await isRateLimited(`uploads:user:${session.user.id}:${requestIp(req)}`, 20, 3600)) {
    return NextResponse.json({ error: "too many uploads" }, { status: 429 })
  }
  if (isRequestTooLarge(req.headers.get("content-length"))) {
    return NextResponse.json({ error: "request too large" }, { status: 413 })
  }

  const formData = await req.formData()
  const file = formData.get("file") as File
  if (!file) return NextResponse.json({ error: "no file" }, { status: 400 })
  if (!isAllowedImageType(file.type)) {
    return NextResponse.json({ error: "unsupported image type" }, { status: 400 })
  }
  if (isInvalidUploadSize(file.size)) {
    return NextResponse.json({ error: "image must be 5 MB or smaller" }, { status: 413 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  if (!hasValidImageSignature(buffer, file.type)) {
    return NextResponse.json({ error: "invalid image file" }, { status: 400 })
  }
  const ext = normalizeContentType(file.type).split("/")[1] || "png"
  const filename = `${Date.now()}-${crypto.randomUUID()}.${ext}`

  let storageAttempted = false

  // Priority 1: Dufs
  const dufs = await getDufsConfig()
  if (dufs) {
    storageAttempted = true
    try {
      const headers: Record<string, string> = { "Content-Type": normalizeContentType(file.type) }
      if (dufs.user && dufs.pass) {
        headers["Authorization"] = "Basic " + Buffer.from(`${dufs.user}:${dufs.pass}`).toString("base64")
      }
      const uploadUrl = `${dufs.url.replace(/\/$/, "")}/${filename}`
      const res = await fetch(uploadUrl, {
        method: "PUT",
        headers,
        body: buffer,
        signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
      })
      if (res.ok) return NextResponse.json({ url: `/api/image?url=${encodeURIComponent(uploadUrl)}` })
      console.error("Dufs upload failed with status", res.status)
    } catch (e) {
      console.error("Dufs upload failed:", e)
    }
  }

  // Priority 2: GitHub image repo
  const ghImg = await getGithubImageConfig()
  if (ghImg) {
    storageAttempted = true
    try {
      const path = `images/${filename}`
      const res = await fetch(`https://api.github.com/repos/${ghImg.repo}/contents/${path}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${ghImg.token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        body: JSON.stringify({ message: `Upload image ${filename}`, content: buffer.toString("base64") }),
        signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
      })
      if (res.ok) {
        const data = await res.json()
        return NextResponse.json({ url: data.content.download_url })
      }
      console.error("GitHub image upload failed with status", res.status)
    } catch (e) {
      console.error("GitHub image upload failed:", e)
    }
  }

  // Never inline the image as a data URI: it would be stored in the comment row
  // and can bloat the database without bound.
  if (!storageAttempted) {
    return NextResponse.json({ error: "image storage is not configured" }, { status: 503 })
  }
  return NextResponse.json({ error: "image upload failed" }, { status: 502 })
}
