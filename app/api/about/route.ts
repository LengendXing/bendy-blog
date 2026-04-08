import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const locale = req.nextUrl.searchParams.get("locale") || "zh"
  let about = await prisma.aboutPage.findUnique({ where: { locale } })
  // fallback to zh
  if (!about && locale !== "zh") about = await prisma.aboutPage.findUnique({ where: { locale: "zh" } })
  return NextResponse.json(about ? JSON.parse(about.content) : {})
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  const { locale, ...data } = await req.json()
  const loc = locale || "zh"
  const content = JSON.stringify(data)
  await prisma.aboutPage.upsert({
    where: { locale: loc },
    update: { content },
    create: { locale: loc, content },
  })
  return NextResponse.json({ ok: true })
}
