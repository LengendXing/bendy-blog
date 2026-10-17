export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import type { Prisma } from "@prisma/client"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendNotifications } from "@/lib/notify"
import { isRateLimited, requestIp } from "@/lib/rate-limit"
import { validateCommentInput } from "@/lib/comment-policy"
import { checkCommentContent } from "@/lib/comment-spam"
import { parseBulkDeleteIds } from "@/lib/comments-admin"
import {
  ADMIN_COMMENT_SELECT,
  PUBLIC_COMMENT_SELECT,
  buildCommentWhere,
  commentPaginationMeta,
  parseCommentsPagination,
  resolveCommentsAccess,
} from "@/lib/comments-query"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const isAdmin = Boolean((session?.user as any)?.isAdmin)
  const access = resolveCommentsAccess(req.nextUrl.searchParams.get("postId"), isAdmin)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  const { page, pageSize } = parseCommentsPagination(req.nextUrl.searchParams)
  const where: Prisma.CommentWhereInput = buildCommentWhere(access.postId, isAdmin)
  const select: Prisma.CommentSelect = isAdmin ? ADMIN_COMMENT_SELECT : PUBLIC_COMMENT_SELECT
  const [total, comments] = await prisma.$transaction([
    prisma.comment.count({ where }),
    prisma.comment.findMany({
      where,
      select,
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])
  return NextResponse.json({
    items: comments,
    ...commentPaginationMeta(total, page, pageSize),
  })
}

function tooManyComments() {
  return NextResponse.json(
    { error: "too many comments" },
    { status: 429, headers: { "Retry-After": "3600" } },
  )
}

function isForeignKeyError(error: unknown) {
  return Boolean(error && typeof error === "object" && (error as { code?: string }).code === "P2003")
}

function isRecordNotFoundError(error: unknown) {
  return Boolean(error && typeof error === "object" && (error as { code?: string }).code === "P2025")
}

async function validateCommentReferences(postId: string, parentId: string | null, replyToId: string | null) {
  if (parentId) {
    const parent = await prisma.comment.findFirst({ where: { id: parentId, postId }, select: { id: true } })
    if (!parent) return "invalid parent"
  }
  if (replyToId) {
    const replyTo = await prisma.comment.findFirst({ where: { id: replyToId, postId }, select: { id: true } })
    if (!replyTo) return "invalid reply target"
  }
  return null
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const userId = session.user.id
  const isAdmin = Boolean((session?.user as any)?.isAdmin)
  const ip = requestIp(req)
  if (await isRateLimited(`comments:user:${userId}`, 10, 3600)) return tooManyComments()
  if (ip !== "unknown" && await isRateLimited(`comments:ip:${ip}`, 30, 3600)) return tooManyComments()

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: "invalid body" }, { status: 400 }) }

  const parsed = validateCommentInput(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error.message, code: parsed.error.code }, { status: 400 })
  }

  const { postId, content, imageUrl, parentId, replyToId } = parsed.value

  if (!isAdmin) {
    const spam = checkCommentContent(content)
    if (!spam.ok) {
      return NextResponse.json({ error: spam.message, code: spam.code }, { status: 400 })
    }
  }

  const post = await prisma.blogPost.findUnique({
    where: { id: postId },
    select: { id: true, title: true, slug: true, published: true },
  })
  if (!post?.published) return NextResponse.json({ error: "post not found" }, { status: 404 })

  const referenceError = await validateCommentReferences(postId, parentId, replyToId)
  if (referenceError) return NextResponse.json({ error: referenceError }, { status: 400 })

  try {
    const comment = await prisma.comment.create({
      data: { postId, content, userId, imageUrl, parentId, replyToId },
      include: { user: { select: { name: true, image: true, githubUsername: true } } },
    })
    sendNotifications({
      event: "comment",
      title: post.title,
      url: `${process.env.NEXTAUTH_URL}/blogs/${post.slug}`,
    }).catch((error) => console.error("Comment notification failed:", error))
    return NextResponse.json(comment)
  } catch (error) {
    if (isForeignKeyError(error)) return NextResponse.json({ error: "post not found" }, { status: 404 })
    console.error("Failed to create comment:", error)
    return NextResponse.json({ error: "failed to create comment" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: "invalid body" }, { status: 400 }) }

  const bulk = parseBulkDeleteIds(body)
  if (bulk.ok) {
    const result = await prisma.comment.deleteMany({ where: { id: { in: bulk.ids } } })
    return NextResponse.json({ ok: true, deleted: result.count })
  }
  if (bulk.error !== "not_bulk") {
    return NextResponse.json({ error: bulk.error }, { status: 400 })
  }

  const id = (body as { id?: unknown })?.id
  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 })
  }

  try {
    await prisma.comment.delete({ where: { id } })
  } catch (error) {
    if (isRecordNotFoundError(error)) return NextResponse.json({ error: "not found" }, { status: 404 })
    throw error
  }
  return NextResponse.json({ ok: true, deleted: 1 })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  const { id, content } = await req.json()
  return NextResponse.json(await prisma.comment.update({ where: { id }, data: { content } }))
}
