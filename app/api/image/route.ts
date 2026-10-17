export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isSafeImageContentType, normalizeContentType } from "@/lib/upload-policy"

const IMAGE_PROXY_TIMEOUT_MS = 15_000
const MAX_PROXY_BYTES = 10 * 1024 * 1024

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url")
  if (!url) return NextResponse.json({ error: "missing url" }, { status: 400 })

  const dufsUrlCfg = await prisma.siteConfig.findUnique({ where: { key: "dufsUrl" } })
  const dufsUrl = dufsUrlCfg?.value || process.env.DUFS_URL || ""

  let target: URL
  let base: URL
  try {
    target = new URL(url)
    base = new URL(dufsUrl)
  } catch {
    return NextResponse.json({ error: "invalid image URL" }, { status: 400 })
  }

  const basePath = base.pathname.replace(/\/+$/, "")
  const pathAllowed = !basePath || target.pathname === basePath || target.pathname.startsWith(`${basePath}/`)
  if (target.protocol !== "https:" || base.protocol !== "https:" || target.username || target.password || target.origin !== base.origin || !pathAllowed) {
    return NextResponse.json({ error: "image URL not allowed" }, { status: 403 })
  }

  const userCfg = await prisma.siteConfig.findUnique({ where: { key: "dufsUser" } })
  const passCfg = await prisma.siteConfig.findUnique({ where: { key: "dufsPass" } })
  const user = userCfg?.value || process.env.DUFS_USER || ""
  const pass = passCfg?.value || process.env.DUFS_PASS || ""

  const headers: Record<string, string> = {}
  if (user && pass) {
    headers["Authorization"] = "Basic " + Buffer.from(`${user}:${pass}`).toString("base64")
  }

  let res: Response
  try {
    res = await fetch(target, {
      headers,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(IMAGE_PROXY_TIMEOUT_MS),
    })
  } catch (e) {
    console.error("Image proxy fetch failed:", e)
    return new NextResponse("Upstream unavailable", { status: 502 })
  }
  if (res.status >= 300 && res.status < 400) return new NextResponse("Upstream redirect refused", { status: 502 })
  if (!res.ok) return new NextResponse("Not found", { status: 404 })

  const contentLength = Number(res.headers.get("content-length"))
  if (Number.isFinite(contentLength) && contentLength > MAX_PROXY_BYTES) {
    return new NextResponse("Image too large", { status: 413 })
  }

  const contentType = normalizeContentType(res.headers.get("Content-Type"))
  // Never proxy SVG/HTML through the site origin: an SVG served with
  // image/svg+xml can execute script when opened directly.
  if (!isSafeImageContentType(contentType)) return new NextResponse("Not a safe image type", { status: 415 })

  return new NextResponse(res.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  })
}
