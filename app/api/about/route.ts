export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getAboutLocaleCandidates } from "@/lib/about-locale"
import { isLocale, resolveLocale } from "@/lib/locale-direction"

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const useFallback = params.get("fallback") !== "0"
  const candidates = useFallback
    ? getAboutLocaleCandidates(params.get("locale"))
    : [resolveLocale(params.get("locale"))]

  for (const locale of candidates) {
    const about = await prisma.aboutPage.findUnique({ where: { locale } })
    if (about) return NextResponse.json(JSON.parse(about.content))
  }
  return NextResponse.json({})
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  const { locale, ...data } = await req.json()
  if (locale !== undefined && !isLocale(locale)) {
    return NextResponse.json({ error: "invalid locale" }, { status: 400 })
  }
  const loc = locale || "zh"
  const content = JSON.stringify(data)
  await prisma.aboutPage.upsert({
    where: { locale: loc },
    update: { content },
    create: { locale: loc, content },
  })
  return NextResponse.json({ ok: true })
}
