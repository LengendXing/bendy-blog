export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { resolveTimelineRange } from "@/lib/timeline"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  const range = resolveTimelineRange(req.nextUrl.searchParams.get("date"))
  if (!range) return NextResponse.json({ error: "invalid_date" }, { status: 400 })
  const { start, end } = range

  const comments = await prisma.comment.findMany({
    where: { createdAt: { gte: start, lte: end } },
    include: { user: { select: { name: true, githubUsername: true } }, post: { select: { title: true } } },
    orderBy: { createdAt: "desc" },
  })

  const posts = await prisma.blogPost.findMany({
    where: { createdAt: { gte: start, lte: end } },
    orderBy: { createdAt: "desc" },
  })

  const events: Array<{ time: string; type: string; desc: string }> = []
  for (const c of comments) {
    events.push({
      time: c.createdAt.toISOString(),
      type: "comment",
      desc: `${c.user.githubUsername || c.user.name} commented on "${c.post.title}"`,
    })
  }
  for (const p of posts) {
    events.push({
      time: p.createdAt.toISOString(),
      type: "post",
      desc: `Published "${p.title}"`,
    })
  }
  events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  return NextResponse.json(events)
}
