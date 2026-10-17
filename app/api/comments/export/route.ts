export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveCommentsAccess } from "@/lib/comments-query"
import {
  COMMENTS_EXPORT_MAX_ROWS,
  buildCommentsCsv,
  commentsExportFilename,
} from "@/lib/comments-admin"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const access = resolveCommentsAccess(req.nextUrl.searchParams.get("postId"), true)
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  const comments = await prisma.comment.findMany({
    where: access.postId ? { postId: access.postId } : {},
    orderBy: { createdAt: "asc" },
    take: COMMENTS_EXPORT_MAX_ROWS,
    select: {
      id: true,
      content: true,
      imageUrl: true,
      parentId: true,
      replyToId: true,
      createdAt: true,
      post: { select: { title: true, slug: true } },
      user: { select: { name: true, githubUsername: true } },
    },
  })

  const csv = buildCommentsCsv(comments.map((comment) => ({
    id: comment.id,
    postTitle: comment.post.title,
    postSlug: comment.post.slug,
    authorName: comment.user.name,
    githubUsername: comment.user.githubUsername,
    content: comment.content,
    imageUrl: comment.imageUrl,
    parentId: comment.parentId,
    replyToId: comment.replyToId,
    createdAt: comment.createdAt,
  })))

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${commentsExportFilename()}"`,
      "Cache-Control": "no-store",
      "X-Comment-Count": String(comments.length),
    },
  })
}
