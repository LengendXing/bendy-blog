import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendNotifications } from "@/lib/notify"

export async function GET(req: NextRequest) {
  const postId = req.nextUrl.searchParams.get("postId")
  const comments = await prisma.comment.findMany({
    where: postId ? { postId } : {},
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
  const { postId, content, imageUrl, parentId, replyToId } = await req.json()
  const comment = await prisma.comment.create({
    data: {
      postId, content, userId: session.user.id,
      imageUrl: imageUrl || null,
      parentId: parentId || null,
      replyToId: replyToId || null,
    },
    include: { user: { select: { name: true, image: true, githubUsername: true } } },
  })
  const post = await prisma.blogPost.findUnique({ where: { id: postId } })
  if (post) sendNotifications({ event: "comment", title: post.title, url: `${process.env.NEXTAUTH_URL}/blogs/${post.slug}` }).catch(() => {})
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
