export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendNotifications } from "@/lib/notify"
import { isRateLimited, requestIp } from "@/lib/rate-limit"
import { validateCommentInput } from "@/lib/comment-policy"

export async function GET(req: NextRequest) {
  const postId = req.nextUrl.searchParams.get("postId")
  const session = await getServerSession(authOptions)
  const isAdmin = Boolean((session?.user as any)?.isAdmin)
  const comments = await prisma.comment.findMany({
    where: {
      ...(postId ? { postId } : {}),
      ...(!isAdmin ? { post: { published: true } } : {}),
    },
    include: {
      user: { select: { name: true, image: true, githubUsername: true } },
      post: { select: { title: true, slug: true } },
    },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json(comments)
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
  const { id } = await req.json()
  await prisma.comment.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  const { id, content } = await req.json()
  return NextResponse.json(await prisma.comment.update({ where: { id }, data: { content } }))
}
