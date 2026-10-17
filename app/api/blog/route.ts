export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { saveFileContent, getFileContent, deleteFile } from "@/lib/github"
import { sortPostsByEffectiveDate } from "@/lib/post-order"
import { planBlogListQuery, PUBLIC_BLOG_POST_SELECT, toPublicBlogPost } from "@/lib/blog-visibility"
import {
  MAX_CONTENT_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_TITLE_LENGTH,
  normalizeDate,
  normalizeEntityId,
  normalizeOptionalEntityId,
  normalizeOptionalText,
  normalizeSlug,
  normalizeText,
} from "@/lib/public-input"

export async function GET(req: NextRequest) {
  const all = req.nextUrl.searchParams.get("all") === "true"
  const rawColumnId = req.nextUrl.searchParams.get("columnId")
  const columnId = rawColumnId ? normalizeEntityId(rawColumnId) : null
  if (rawColumnId && !columnId) {
    return NextResponse.json({ error: "invalid columnId" }, { status: 400 })
  }

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

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: "invalid body" }, { status: 400 }) }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "invalid body" }, { status: 400 })

  const raw = body as Record<string, unknown>
  const slug = normalizeSlug(raw.slug)
  const title = normalizeText(raw.title, MAX_TITLE_LENGTH)
  const description = normalizeOptionalText(raw.description, MAX_DESCRIPTION_LENGTH)
  const columnId = normalizeOptionalEntityId(raw.columnId)
  const publishDate = normalizeDate(raw.publishDate)
  if (!slug) return NextResponse.json({ error: "invalid slug" }, { status: 400 })
  if (!title) return NextResponse.json({ error: "invalid title" }, { status: 400 })
  if (description === undefined) return NextResponse.json({ error: "invalid description" }, { status: 400 })
  if (columnId === undefined) return NextResponse.json({ error: "invalid columnId" }, { status: 400 })
  if (publishDate === undefined) return NextResponse.json({ error: "invalid publishDate" }, { status: 400 })
  if (raw.content !== undefined && (typeof raw.content !== "string" || raw.content.length > MAX_CONTENT_LENGTH)) {
    return NextResponse.json({ error: "invalid content" }, { status: 400 })
  }

  const existing = await prisma.blogPost.findUnique({ where: { slug }, select: { id: true } })
  if (existing) return NextResponse.json({ error: "slug already exists" }, { status: 409 })

  const githubPath = `posts/${slug}.md`
  await saveFileContent(githubPath, (raw.content as string) || `# ${title}\n`, undefined, `Create post: ${title}`)
  try {
    return NextResponse.json(await prisma.blogPost.create({
      data: {
        slug, title, description, githubPath,
        published: raw.published === true,
        columnId,
        publishDate,
      },
      include: { column: true },
    }))
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "slug already exists" }, { status: 409 })
    }
    throw error
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: "invalid body" }, { status: 400 }) }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "invalid body" }, { status: 400 })

  const raw = body as Record<string, unknown>
  const id = normalizeEntityId(raw.id)
  if (!id) return NextResponse.json({ error: "invalid id" }, { status: 400 })

  const title = raw.title === undefined ? undefined : normalizeText(raw.title, MAX_TITLE_LENGTH)
  if (title === null) return NextResponse.json({ error: "invalid title" }, { status: 400 })

  let description: string | null | undefined
  if (raw.description !== undefined) {
    description = normalizeOptionalText(raw.description, MAX_DESCRIPTION_LENGTH)
    if (description === undefined) return NextResponse.json({ error: "invalid description" }, { status: 400 })
  }

  let columnId: string | null | undefined
  if (raw.columnId !== undefined) {
    columnId = normalizeOptionalEntityId(raw.columnId)
    if (columnId === undefined) return NextResponse.json({ error: "invalid columnId" }, { status: 400 })
  }

  let publishDate: Date | null | undefined
  if (raw.publishDate !== undefined) {
    publishDate = normalizeDate(raw.publishDate)
    if (publishDate === undefined) return NextResponse.json({ error: "invalid publishDate" }, { status: 400 })
  }

  if (raw.content !== undefined && (typeof raw.content !== "string" || raw.content.length > MAX_CONTENT_LENGTH)) {
    return NextResponse.json({ error: "invalid content" }, { status: 400 })
  }

  const post = await prisma.blogPost.findUnique({ where: { id } })
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 })
  if (raw.content !== undefined) {
    const file = await getFileContent(post.githubPath)
    await saveFileContent(post.githubPath, raw.content as string, file?.sha, `Update: ${title || post.title}`)
  }
  return NextResponse.json(await prisma.blogPost.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(typeof raw.published === "boolean" && { published: raw.published }),
      ...(columnId !== undefined && { columnId }),
      ...(publishDate !== undefined && { publishDate }),
    },
    include: { column: true },
  }))
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: "invalid body" }, { status: 400 }) }
  const id = normalizeEntityId((body as { id?: unknown } | null)?.id)
  if (!id) return NextResponse.json({ error: "invalid id" }, { status: 400 })
  const post = await prisma.blogPost.findUnique({ where: { id } })
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 })
  const file = await getFileContent(post.githubPath)
  if (file) await deleteFile(post.githubPath, file.sha)
  await prisma.blogPost.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
