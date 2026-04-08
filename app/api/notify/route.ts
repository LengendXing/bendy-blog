import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  return NextResponse.json(await prisma.notifyConfig.findMany())
}
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  const { type, config, enabled } = await req.json()
  return NextResponse.json(await prisma.notifyConfig.create({ data: { type, config: JSON.stringify(config), enabled: enabled ?? true } }))
}
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  const { id, config, enabled } = await req.json()
  return NextResponse.json(await prisma.notifyConfig.update({ where: { id }, data: { ...(config && { config: JSON.stringify(config) }), ...(enabled !== undefined && { enabled }) } }))
}
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  const { id } = await req.json()
  await prisma.notifyConfig.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
