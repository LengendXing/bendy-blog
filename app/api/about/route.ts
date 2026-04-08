import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const about = await prisma.aboutPage.findFirst()
  return NextResponse.json(about ? JSON.parse(about.content) : {})
}
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  const data = await req.json()
  const existing = await prisma.aboutPage.findFirst()
  const content = JSON.stringify(data)
  if (existing) await prisma.aboutPage.update({ where: { id: existing.id }, data: { content } })
  else await prisma.aboutPage.create({ data: { content } })
  return NextResponse.json({ ok: true })
}
