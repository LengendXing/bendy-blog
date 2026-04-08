import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { saveFileContent, getFileContent, deleteFile } from "@/lib/github"

export async function GET() {
  return NextResponse.json(await prisma.blogPost.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { comments: true } } },
  }))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  const { slug, title, description, content, published } = await req.json()
  const githubPath = `posts/${slug}.md`
  await saveFileContent(githubPath, content || `# ${title}\n`, undefined, `Create post: ${title}`)
  return NextResponse.json(await prisma.blogPost.create({ data: { slug, title, description, githubPath, published: published ?? false } }))
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  const { id, title, description, content, published } = await req.json()
  const post = await prisma.blogPost.findUnique({ where: { id } })
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 })
  if (content !== undefined) {
    const file = await getFileContent(post.githubPath)
    await saveFileContent(post.githubPath, content, file?.sha, `Update: ${title || post.title}`)
  }
  return NextResponse.json(await prisma.blogPost.update({
    where: { id },
    data: { ...(title && { title }), ...(description !== undefined && { description }), ...(published !== undefined && { published }) },
  }))
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  const { id } = await req.json()
  const post = await prisma.blogPost.findUnique({ where: { id } })
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 })
  const file = await getFileContent(post.githubPath)
  if (file) await deleteFile(post.githubPath, file.sha)
  await prisma.blogPost.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
