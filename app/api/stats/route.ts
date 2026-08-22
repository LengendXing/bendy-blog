export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redis } from "@/lib/redis"
import { sendNotifications } from "@/lib/notify"
import { isRateLimited, requestIp } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: "invalid body" }, { status: 400 }) }
  const slug = typeof body.slug === "string" ? body.slug : ""
  const event = body.event
  if (!slug || !event) return NextResponse.json({ error: "missing" }, { status: 400 })
  if (event !== "view" && event !== "share") return NextResponse.json({ error: "invalid event" }, { status: 400 })
  if (await isRateLimited(`stats:${event}:${slug}:${requestIp(req)}`, event === "view" ? 20 : 5, 3600)) {
    const current = await prisma.blogPost.findUnique({ where: { slug }, select: { views: true, shares: true } })
    return NextResponse.json({ views: current?.views || 0, shares: current?.shares || 0, counted: false })
  }
  const post = await prisma.blogPost.findUnique({ where: { slug } })
  if (!post?.published) return NextResponse.json({ error: "not found" }, { status: 404 })

  const update: any = {}
  if (event === "view") update.views = { increment: 1 }
  if (event === "share") update.shares = { increment: 1 }
  const updated = await prisma.blogPost.update({ where: { slug }, data: update })
  try { await redis.set(`stats:${slug}`, JSON.stringify({ views: updated.views, shares: updated.shares }), { ex: 300 }) } catch {}

  const shouldNotify = event === "share" || event === "comment" || (event === "view" && updated.views % 100 === 0)
  if (shouldNotify) {
    sendNotifications({ event, title: post.title, url: `${process.env.NEXTAUTH_URL}/blogs/${slug}`, views: updated.views }).catch(() => {})
  }
  return NextResponse.json({ views: updated.views, shares: updated.shares })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!(session?.user as any)?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 })
  const posts = await prisma.blogPost.findMany({
    select: { slug: true, title: true, views: true, shares: true, updatedAt: true, _count: { select: { comments: true } } },
    orderBy: { views: "desc" },
  })
  const totalViews = posts.reduce((s, p) => s + p.views, 0)
  const totalShares = posts.reduce((s, p) => s + p.shares, 0)
  const totalComments = posts.reduce((s, p) => s + p._count.comments, 0)
  const topViewed = posts[0] || null
  const topCommented = [...posts].sort((a, b) => b._count.comments - a._count.comments)[0] || null
  const lastUpdated = posts.length ? posts.reduce((a, b) => new Date(a.updatedAt) > new Date(b.updatedAt) ? a : b).updatedAt : null

  return NextResponse.json({
    totalViews, totalShares, totalComments, totalPosts: posts.length,
    topViewed: topViewed ? { slug: topViewed.slug, title: topViewed.title, views: topViewed.views } : null,
    topCommented: topCommented ? { slug: topCommented.slug, title: topCommented.title, comments: topCommented._count.comments } : null,
    lastUpdated,
  })
}
