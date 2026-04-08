import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const columns = await prisma.column.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { posts: true } } } })
  return NextResponse.json(columns)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  const { name } = await req.json()
  if (!name || name.length > 6) return NextResponse.json({ error: "Name must be 1-6 characters" }, { status: 400 })
  const existing = await prisma.column.findUnique({ where: { name } })
  if (existing) return NextResponse.json(existing)
  return NextResponse.json(await prisma.column.create({ data: { name } }))
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  const { id } = await req.json()
  await prisma.column.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
