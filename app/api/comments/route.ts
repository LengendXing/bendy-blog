export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendNotifications } from "@/lib/notify"
import { isRateLimited } from "@/lib/rate-limit"

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

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  if (await isRateLimited(`comments:user:${session.user.id}`, 10, 3600)) {
    return NextResponse.json({ error: "too many comments" }, { status: 429 })
  }

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: "invalid body" }, { status: 400 }) }
  const postId = typeof body.postId === "string" ? body.postId : ""
  const content = typeof body.content === "string" ? body.content.trim() : ""
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : null
  const parentId = typeof body.parentId === "string" && body.parentId ? body.parentId : null
  const replyToId = typeof body.replyToId === "string" && body.replyToId ? body.replyToId : null
  if (!postId || (!content && !imageUrl)) return NextResponse.json({ error: "content required" }, { status: 400 })
  if (content.length > 4000) return NextResponse.json({ error: "comment too long" }, { status: 400 })
  if (imageUrl && imageUrl.length > 7_000_000) return NextResponse.json({ error: "image too large" }, { status: 400 })
  if (imageUrl && !(/^(https?:\/\/|\/api\/image\?|data:image\/(png|jpeg|gif|webp);base64,)/i.test(imageUrl))) {
    return NextResponse.json({ error: "invalid image URL" }, { status: 400 })
  }

  const post = await prisma.blogPost.findUnique({ where: { id: postId }, select: { id: true, title: true, slug: true, published: true } })
  if (!post?.published) return NextResponse.json({ error: "post not found" }, { status: 404 })
  if (parentId) {
    const parent = await prisma.comment.findFirst({ where: { id: parentId, postId }, select: { id: true } })
    if (!parent) return NextResponse.json({ error: "invalid parent" }, { status: 400 })
  }
  if (replyToId) {
    const replyTo = await prisma.comment.findFirst({ where: { id: replyToId, postId }, select: { id: true } })
    if (!replyTo) return NextResponse.json({ error: "invalid reply target" }, { status: 400 })
  }

  const comment = await prisma.comment.create({
    data: {
      postId, content, userId: session.user.id,
      imageUrl: imageUrl || null,
      parentId: parentId || null,
      replyToId: replyToId || null,
    },
    include: { user: { select: { name: true, image: true, githubUsername: true } } },
  })
  sendNotifications({ event: "comment", title: post.title, url: `${process.env.NEXTAUTH_URL}/blogs/${post.slug}` }).catch(() => {})
  return NextResponse.json(comment)
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
