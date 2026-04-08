import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url")
  if (!url) return NextResponse.json({ error: "missing url" }, { status: 400 })

  // Only proxy Dufs URLs
  const dufsUrlCfg = await prisma.siteConfig.findUnique({ where: { key: "dufsUrl" } })
  const dufsUrl = dufsUrlCfg?.value || process.env.DUFS_URL || ""
  
  if (!dufsUrl || !url.startsWith(dufsUrl)) {
    return NextResponse.redirect(url)
  }

  const userCfg = await prisma.siteConfig.findUnique({ where: { key: "dufsUser" } })
  const passCfg = await prisma.siteConfig.findUnique({ where: { key: "dufsPass" } })
  const user = userCfg?.value || process.env.DUFS_USER || ""
  const pass = passCfg?.value || process.env.DUFS_PASS || ""

  const headers: Record<string, string> = {}
  if (user && pass) {
    headers["Authorization"] = "Basic " + Buffer.from(`${user}:${pass}`).toString("base64")
  }

  const res = await fetch(url, { headers })
  if (!res.ok) return new NextResponse("Not found", { status: 404 })

  return new NextResponse(res.body, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") || "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}