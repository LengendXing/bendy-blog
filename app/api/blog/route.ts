export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  saveFileContent,
  getFileContent,
  deleteFile,
  type GitHubFile,
  type GitHubWriteResult,
} from "@/lib/github"
import { sortPostsByEffectiveDate } from "@/lib/post-order"

function githubFailure(error: unknown) {
  const message = error instanceof Error ? error.message : "GitHub request failed"
  return NextResponse.json({ error: message, code: "github_api_error" }, { status: 502 })
}

function databaseFailure(message: string) {
  return NextResponse.json({ error: message, code: "db_write_failed" }, { status: 500 })
}

async function rollbackFileWrite(
  path: string,
  previous: GitHubFile | null,
  written: GitHubWriteResult | null,
  action: string,
) {
  try {
    if (previous) {
      await saveFileContent(path, previous.content, written?.content?.sha, `Rollback ${action}: ${path}`)
      return
    }
    const sha = written?.content?.sha
    if (sha) await deleteFile(path, sha)
  } catch (error) {
    console.error(`[blog] failed to roll back GitHub file ${path} after ${action}`, error)
  }
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

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid body", code: "invalid_body" }, { status: 400 })
  }

  const { slug, title, description, content, published, columnId, publishDate } = body
  if (!slug || !title) {
    return NextResponse.json({ error: "slug and title are required", code: "invalid_body" }, { status: 400 })
  }

  const githubPath = `posts/${slug}.md`
  let written: GitHubWriteResult
  try {
    written = await saveFileContent(githubPath, content || `# ${title}\n`, undefined, `Create post: ${title}`)
  } catch (error) {
    return githubFailure(error)
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
    return NextResponse.json(post)
  } catch (error) {
    console.error(`[blog] database create failed for ${githubPath}; rolling back GitHub file`, error)
    await rollbackFileWrite(githubPath, null, written, "create")
    return databaseFailure("Post could not be saved")
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid body", code: "invalid_body" }, { status: 400 })
  }

  const { id, title, description, content, published, columnId, publishDate } = body
  if (!id) return NextResponse.json({ error: "id is required", code: "invalid_body" }, { status: 400 })

  const post = await prisma.blogPost.findUnique({ where: { id } })
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 })

  let previous: GitHubFile | null = null
  let written: GitHubWriteResult | null = null
  if (content !== undefined) {
    try {
      previous = await getFileContent(post.githubPath)
      written = await saveFileContent(post.githubPath, content, previous?.sha, `Update: ${title || post.title}`)
    } catch (error) {
      return githubFailure(error)
    }
  }

  try {
    const updated = await prisma.blogPost.update({
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
    return NextResponse.json(updated)
  } catch (error) {
    console.error(`[blog] database update failed for ${post.githubPath}; rolling back GitHub file`, error)
    if (written) await rollbackFileWrite(post.githubPath, previous, written, "update")
    return databaseFailure("Post could not be saved")
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid body", code: "invalid_body" }, { status: 400 })
  }

  const { id } = body
  if (!id) return NextResponse.json({ error: "id is required", code: "invalid_body" }, { status: 400 })

  const post = await prisma.blogPost.findUnique({ where: { id } })
  if (!post) return NextResponse.json({ error: "not found" }, { status: 404 })

  let file: GitHubFile | null = null
  try {
    file = await getFileContent(post.githubPath)
    if (file) await deleteFile(post.githubPath, file.sha)
  } catch (error) {
    return githubFailure(error)
  }

  try {
    await prisma.blogPost.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(`[blog] database delete failed for ${post.githubPath}; restoring GitHub file`, error)
    if (file) {
      try {
        await saveFileContent(post.githubPath, file.content, undefined, `Restore after failed delete: ${post.githubPath}`)
      } catch (rollbackError) {
        console.error(`[blog] failed to restore GitHub file ${post.githubPath}`, rollbackError)
      }
    }
    return databaseFailure("Post could not be deleted")
  }
}
