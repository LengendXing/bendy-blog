import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  return NextResponse.json(await prisma.project.findMany({ orderBy: { sortOrder: "asc" } }))
}
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  return NextResponse.json(await prisma.project.create({ data: await req.json() }))
}
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  const { id, ...data } = await req.json()
  return NextResponse.json(await prisma.project.update({ where: { id }, data }))
}
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  const { id } = await req.json()
  await prisma.project.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
