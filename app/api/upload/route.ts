import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

async function getDufsConfig() {
  const enabledCfg = await prisma.siteConfig.findUnique({ where: { key: "dufsEnabled" } })
  if (enabledCfg?.value !== "true") return null
  const urlCfg = await prisma.siteConfig.findUnique({ where: { key: "dufsUrl" } })
  const userCfg = await prisma.siteConfig.findUnique({ where: { key: "dufsUser" } })
  const passCfg = await prisma.siteConfig.findUnique({ where: { key: "dufsPass" } })
  if (!urlCfg?.value) return null
  return { url: urlCfg.value, user: userCfg?.value || "", pass: passCfg?.value || "" }
}

async function getGithubImageConfig() {
  const repoCfg = await prisma.siteConfig.findUnique({ where: { key: "githubImageRepo" } })
  const tokenCfg = await prisma.siteConfig.findUnique({ where: { key: "githubImageToken" } })
  if (!repoCfg?.value || !tokenCfg?.value) return null
  return { repo: repoCfg.value, token: tokenCfg.value }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get("file") as File
  if (!file) return NextResponse.json({ error: "no file" }, { status: 400 })
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "only images allowed" }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${file.type.split("/")[1]}`

  // Try Dufs first
  const dufs = await getDufsConfig()
  if (dufs) {
    try {
      const headers: Record<string, string> = { "Content-Type": file.type }
      if (dufs.user && dufs.pass) {
        headers["Authorization"] = "Basic " + Buffer.from(`${dufs.user}:${dufs.pass}`).toString("base64")
      }
      const uploadUrl = `${dufs.url.replace(/\/$/, "")}/${filename}`
      const res = await fetch(uploadUrl, { method: "PUT", headers, body: buffer })
      if (res.ok) return NextResponse.json({ url: uploadUrl })
    } catch (e) {
      console.error("Dufs upload failed:", e)
    }
  }

  // Fallback: GitHub image repo
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
        body: JSON.stringify({
          message: `Upload image ${filename}`,
          content: buffer.toString("base64"),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        return NextResponse.json({ url: data.content.download_url })
      }
    } catch (e) {
      console.error("GitHub image upload failed:", e)
    }
  }

  // Last fallback: base64 (warn: not recommended for production)
  const base64 = buffer.toString("base64")
  return NextResponse.json({ url: `data:${file.type};base64,${base64}` })
}
