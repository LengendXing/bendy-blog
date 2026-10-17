export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  nextProjectSortOrder,
  parseProjectCreatePayload,
  parseProjectOrderIds,
  parseProjectUpdatePayload,
  projectOrderBy,
} from "@/lib/project-order"

async function isAdminRequest() {
  const session = await getServerSession(authOptions)
  return Boolean((session?.user as any)?.isAdmin)
}

function forbidden() {
  return NextResponse.json({ error: "forbidden" }, { status: 403 })
}

async function readJson(req: NextRequest) {
  try {
    return await req.json()
  } catch {
    return null
  }
}

export async function GET() {
  return NextResponse.json(await prisma.project.findMany({ orderBy: projectOrderBy() }))
}

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest())) return forbidden()

  const payload = parseProjectCreatePayload(await readJson(req))
  if (!payload) return NextResponse.json({ error: "invalid project" }, { status: 400 })

  const { sortOrder, ...fields } = payload
  const resolvedSortOrder = sortOrder ?? nextProjectSortOrder(
    (await prisma.project.aggregate({ _max: { sortOrder: true } }))._max.sortOrder,
  )

  return NextResponse.json(await prisma.project.create({
    data: { ...fields, sortOrder: resolvedSortOrder },
  }))
}

export async function PUT(req: NextRequest) {
  if (!(await isAdminRequest())) return forbidden()

  const body = await readJson(req)
  if (typeof body?.id !== "string" || !body.id) {
    return NextResponse.json({ error: "invalid project" }, { status: 400 })
  }

  const data = parseProjectUpdatePayload(body)
  if (!data) return NextResponse.json({ error: "invalid project" }, { status: 400 })

  return NextResponse.json(await prisma.project.update({ where: { id: body.id }, data }))
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdminRequest())) return forbidden()

  const body = await readJson(req)
  const ids = parseProjectOrderIds(body?.ids)
  if (!ids) return NextResponse.json({ error: "invalid project order" }, { status: 400 })

  const existing = await prisma.project.findMany({ select: { id: true } })
  const existingIds = new Set(existing.map(project => project.id))
  if (ids.length !== existing.length || ids.some(id => !existingIds.has(id))) {
    return NextResponse.json({ error: "project order must include every project" }, { status: 400 })
  }

  await prisma.$transaction(
    ids.map((id, index) => prisma.project.update({ where: { id }, data: { sortOrder: index } })),
  )

  return NextResponse.json(await prisma.project.findMany({ orderBy: projectOrderBy() }))
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdminRequest())) return forbidden()

  const body = await readJson(req)
  if (typeof body?.id !== "string" || !body.id) {
    return NextResponse.json({ error: "invalid project" }, { status: 400 })
  }

  await prisma.project.delete({ where: { id: body.id } })
  return NextResponse.json({ ok: true })
}
