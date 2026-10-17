export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { saveFileContent, getFileContent, deleteFile } from "@/lib/github"
import { sortPostsByEffectiveDate } from "@/lib/post-order"
import { logStructured } from "@/lib/observability"
import { reportOperationFailure } from "@/lib/ops"

async function reportGitHubFailure(
  event: string,
  action: string,
  error: unknown,
  context: Record<string, unknown>,
) {
  await reportOperationFailure({
    event,
    component: "api.blog",
    action,
    error,
    context,
    fingerprint: `${event}:${action}:${context.path || context.id || "unknown"}`,
  })
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "GitHub request failed", code: "github_api_error" },
    { status: 502 },
  )
}

async function reportDatabaseFailure(
  event: string,
  action: string,
  error: unknown,
  context: Record<string, unknown>,
) {
  await reportOperationFailure({
    event,
    component: "api.blog",
    action,
    error,
    context,
    fingerprint: `${event}:${action}:${context.id || context.slug || "unknown"}`,
  })
  return NextResponse.json(
    { error: "Database write failed", code: "db_write_failed" },
    { status: 500 },
  )
}

async function readJsonBody(req: NextRequest): Promise<Record<string, any> | null> {
  try {
    return await req.json()
  } catch {
    return null
  }
}

async function writePostContent(
  post: { githubPath: string; title: string },
  content: string,
  title?: string,
): Promise<void> {
  const file = await getFileContent(post.githubPath)
  await saveFileContent(post.githubPath, content, file?.sha, `Update: ${title || post.title}`)
}

async function applyPostUpdate(id: string, fields: Record<string, any>) {
  const { title, description, published, columnId, publishDate } = fields
  return prisma.blogPost.update({
    where: { id },
    data: {
      ...(title && { title }),
      ...(description !== undefined && { description }),
      ...(published !== undefined && { published }),
      ...(columnId !== undefined && { columnId: columnId || null }),
      ...(publishDate !== undefined && { publishDate: publishDate ? new Date(publishDate) : null }),
    },
    include: { column: true },
  })
}

export async function GET(req: NextRequest) {
  const published = req.nextUrl.searchParams.get("published")
  const columnId = req.nextUrl.searchParams.get("columnId")
  const session = await getServerSession(authOptions)
  const isAdmin = Boolean((session?.user as any)?.isAdmin)
  const where: any = { published: true }
  if (isAdmin && published !== "true") delete where.published
  if (columnId) where.columnId = columnId

  if (!isAdmin) {
    const posts = await prisma.blogPost.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        slug: true,
        title: true,
        description: true,
        published: true,
        publishDate: true,
        createdAt: true,
        column: { select: { id: true, name: true } },
      },
    })
    return NextResponse.json(sortPostsByEffectiveDate(posts))
  }

  const posts = await prisma.blogPost.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { comments: true } }, column: true },
  })
  return NextResponse.json(sortPostsByEffectiveDate(posts))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const body = await readJsonBody(req)
  if (!body) return NextResponse.json({ error: "invalid body", code: "invalid_body" }, { status: 400 })

  const { slug, title, description, content, published, columnId, publishDate } = body
  if (typeof slug !== "string" || !slug.trim() || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "slug and title are required", code: "invalid_body" }, { status: 400 })
  }

  const githubPath = `posts/${slug}.md`

  try {
    await saveFileContent(githubPath, content || `# ${title}\n`, undefined, `Create post: ${title}`)
  } catch (error) {
    return reportGitHubFailure("content.publish_failed", "create", error, { slug, path: githubPath })
  }

  try {
    const post = await prisma.blogPost.create({
      data: {
        slug, title, description, githubPath,
        published: published ?? false,
        columnId: columnId || null,
        publishDate: publishDate ? new Date(publishDate) : null,
      },
      include: { column: true },
    })
    logStructured("info", {
      event: "content.published",
      component: "api.blog",
      action: "create",
      outcome: "success",
      context: { slug, path: githubPath, postId: post.id },
    })
    return NextResponse.json(post)
  } catch (error) {
    return reportDatabaseFailure("content.db_write_failed", "create", error, {
      slug,
      path: githubPath,
      repositoryWriteSucceeded: true,
    })
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const body = await readJsonBody(req)
  if (!body) return NextResponse.json({ error: "invalid body", code: "invalid_body" }, { status: 400 })

  const { id, title, description, content, published, columnId, publishDate } = body
  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "id is required", code: "invalid_body" }, { status: 400 })
  }

  const post = await prisma.blogPost.findUnique({ where: { id } })
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 })

  if (content !== undefined) {
    try {
      await writePostContent(post, content, title)
    } catch (error) {
      return reportGitHubFailure("content.publish_failed", "update", error, {
        id,
        slug: post.slug,
        path: post.githubPath,
      })
    }
  }

  try {
    const updated = await applyPostUpdate(id, { title, description, published, columnId, publishDate })
    logStructured("info", {
      event: "content.published",
      component: "api.blog",
      action: "update",
      outcome: "success",
      context: { id, slug: post.slug, path: post.githubPath, contentUpdated: content !== undefined },
    })
    return NextResponse.json(updated)
  } catch (error) {
    return reportDatabaseFailure("content.db_write_failed", "update", error, {
      id,
      slug: post.slug,
      path: post.githubPath,
      repositoryWriteSucceeded: content !== undefined,
    })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const body = await readJsonBody(req)
  if (!body) return NextResponse.json({ error: "invalid body", code: "invalid_body" }, { status: 400 })

  const { id } = body
  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "id is required", code: "invalid_body" }, { status: 400 })
  }

  const post = await prisma.blogPost.findUnique({ where: { id } })
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 })

  try {
    const file = await getFileContent(post.githubPath)
    if (file) await deleteFile(post.githubPath, file.sha)
  } catch (error) {
    return reportGitHubFailure("content.delete_failed", "delete", error, {
      id,
      slug: post.slug,
      path: post.githubPath,
    })
  }

  try {
    await prisma.blogPost.delete({ where: { id } })
    logStructured("info", {
      event: "content.deleted",
      component: "api.blog",
      action: "delete",
      outcome: "success",
      context: { id, slug: post.slug, path: post.githubPath },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return reportDatabaseFailure("content.db_delete_failed", "delete", error, {
      id,
      slug: post.slug,
      path: post.githubPath,
      repositoryDeleteSucceeded: true,
    })
  }
}
