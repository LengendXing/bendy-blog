export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isRateLimited, requestIp } from "@/lib/rate-limit"

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
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

  // Priority 1: Dufs
  const dufs = await getDufsConfig()
  if (dufs) {
    try {
      const headers: Record<string, string> = { "Content-Type": file.type }
      if (dufs.user && dufs.pass) {
        headers["Authorization"] = "Basic " + Buffer.from(`${dufs.user}:${dufs.pass}`).toString("base64")
      }
      const uploadUrl = `${dufs.url.replace(/\/$/, "")}/${filename}`
      const res = await fetch(uploadUrl, { method: "PUT", headers, body: buffer })
      if (res.ok) return NextResponse.json({ url: `/api/image?url=${encodeURIComponent(uploadUrl)}` })
    } catch (e) {
      console.error("Dufs upload failed:", e)
    }
  }

  // Priority 2: GitHub image repo
  const ghImg = await getGithubImageConfig()
  if (ghImg) {
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
      })
      if (res.ok) {
        const data = await res.json()
        return NextResponse.json({ url: data.content.download_url })
      }
    } catch (e) {
      console.error("GitHub image upload failed:", e)
    }
  }

  // Fallback: base64
  return NextResponse.json({ url: `data:${file.type};base64,${buffer.toString("base64")}` })
}
