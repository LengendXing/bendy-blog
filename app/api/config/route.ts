export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ADMIN_GITHUB_USERS_CONFIG_KEY } from "@/lib/admins"
import { parseSiteConfigPayload } from "@/lib/site-config"

const privateResponseHeaders = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie",
}

export async function GET() {
  const configs = await prisma.siteConfig.findMany()
  const map: Record<string, string> = {}
  for (const c of configs) map[c.key] = c.value

  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) {
    return NextResponse.json({
      blogTitle: map.blogTitle || "",
      footerText: map.footerText || "",
    }, { headers: privateResponseHeaders })
  }

  // Merge env defaults (DB takes priority)
  const envDefaults: Record<string, string> = {
    dufsEnabled: process.env.DUFS_ENABLED || "false",
    dufsUrl: process.env.DUFS_URL || "",
    dufsUser: process.env.DUFS_USER || "",
    dufsPass: process.env.DUFS_PASS || "",
    githubImageRepo: process.env.GITHUB_IMAGE_REPO || "",
    githubImageToken: process.env.GITHUB_IMAGE_TOKEN || "",
  }

  for (const [key, val] of Object.entries(envDefaults)) {
    if (!map[key] && val) map[key] = val
  }

  delete map[ADMIN_GITHUB_USERS_CONFIG_KEY]

  return NextResponse.json(map, { headers: privateResponseHeaders })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  let data: unknown
  try {
    data = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid_payload", message: "Request body must be valid JSON" }, { status: 400 })
  }

  if (typeof data === "object" && data !== null && Object.prototype.hasOwnProperty.call(data, ADMIN_GITHUB_USERS_CONFIG_KEY)) {
    return NextResponse.json({ error: "reserved config key" }, { status: 400 })
  }

  const parsed = parseSiteConfigPayload(data)
  if (!parsed.ok) {
    return NextResponse.json(parsed.error, { status: 400 })
  }

  const entries = Object.entries(parsed.values)
  if (entries.length > 0) {
    await prisma.$transaction(entries.map(([key, value]) => prisma.siteConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    })))
  }

  return NextResponse.json({ ok: true })
}
