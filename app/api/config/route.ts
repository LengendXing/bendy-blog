import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const configs = await prisma.siteConfig.findMany()
  const map: Record<string, string> = {}
  for (const c of configs) map[c.key] = c.value

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

  return NextResponse.json(map)
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  const data = await req.json()
  for (const [key, value] of Object.entries(data)) {
    await prisma.siteConfig.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    })
  }
  return NextResponse.json({ ok: true })
}
