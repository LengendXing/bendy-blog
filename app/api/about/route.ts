export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { normalizeLocale } from "@/lib/public-input"

export async function GET(req: NextRequest) {
  const locale = normalizeLocale(req.nextUrl.searchParams.get("locale"))
  if (!locale) return NextResponse.json({ error: "invalid locale" }, { status: 400 })
  let about = await prisma.aboutPage.findUnique({ where: { locale } })
  // fallback to zh
  if (!about && locale !== "zh") about = await prisma.aboutPage.findUnique({ where: { locale: "zh" } })
  return NextResponse.json(about ? JSON.parse(about.content) : {})
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: "invalid body" }, { status: 400 }) }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "invalid body" }, { status: 400 })
  const { locale, ...data } = body as Record<string, unknown>
  const loc = normalizeLocale(locale)
  if (!loc) return NextResponse.json({ error: "invalid locale" }, { status: 400 })
  const content = JSON.stringify(data)
  await prisma.aboutPage.upsert({
    where: { locale: loc },
    update: { content },
    create: { locale: loc, content },
  })
  return NextResponse.json({ ok: true })
}
