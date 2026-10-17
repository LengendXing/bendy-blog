export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { saveFileContent, getFileContent, deleteFile } from "@/lib/github"
import { sortPostsByEffectiveDate } from "@/lib/post-order"
import { planBlogListQuery, PUBLIC_BLOG_POST_SELECT, toPublicBlogPost } from "@/lib/blog-visibility"

export async function GET(req: NextRequest) {
  const all = req.nextUrl.searchParams.get("all") === "true"
  const columnId = req.nextUrl.searchParams.get("columnId")
  const session = await getServerSession(authOptions)
  const isAdmin = Boolean((session?.user as any)?.isAdmin)
  const plan = planBlogListQuery({ all, isAdmin, columnId })

  if (plan.kind === "forbidden") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  if (plan.mode === "admin") {
    const posts = await prisma.blogPost.findMany({
      where: plan.where,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { comments: true } }, column: true },
    })
    return NextResponse.json(sortPostsByEffectiveDate(posts))
  }

  const posts = await prisma.blogPost.findMany({
    where: plan.where,
    orderBy: { createdAt: "desc" },
    select: PUBLIC_BLOG_POST_SELECT,
  })
  return NextResponse.json(sortPostsByEffectiveDate(posts.map(toPublicBlogPost)))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  const { slug, title, description, content, published, columnId, publishDate } = await req.json()
  const githubPath = `posts/${slug}.md`
  await saveFileContent(githubPath, content || `# ${title}\n`, undefined, `Create post: ${title}`)
  return NextResponse.json(await prisma.blogPost.create({
    data: {
      slug, title, description, githubPath,
      published: published ?? false,
      columnId: columnId || null,
      publishDate: publishDate ? new Date(publishDate) : null,
    },
    include: { column: true },
  }))
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  const { id, title, description, content, published, columnId, publishDate } = await req.json()
  const post = await prisma.blogPost.findUnique({ where: { id } })
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 })
  if (content !== undefined) {
    const file = await getFileContent(post.githubPath)
    await saveFileContent(post.githubPath, content, file?.sha, `Update: ${title || post.title}`)
  }
  return NextResponse.json(await prisma.blogPost.update({
    where: { id },
    data: {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(published !== undefined && { published }),
      ...(columnId !== undefined && { columnId: columnId || null }),
      ...(publishDate !== undefined && { publishDate: publishDate ? new Date(publishDate) : null }),
    },
    include: { column: true },
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
