import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const dateParam = req.nextUrl.searchParams.get("date")
  const date = dateParam ? new Date(dateParam) : new Date()
  const start = new Date(date); start.setHours(0, 0, 0, 0)
  const end = new Date(date); end.setHours(23, 59, 59, 999)

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
