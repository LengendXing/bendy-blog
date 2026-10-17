export const dynamic = "force-dynamic"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redis } from "@/lib/redis"
import { sendNotifications } from "@/lib/notify"
import { isRateLimited, requestIp } from "@/lib/rate-limit"
import {
  normalizeStatsSlug,
  parseStatsEvent,
  shouldNotifyStats,
  statsDedupKey,
  statsRateLimitKey,
  statsViewerIdentity,
  STATS_DEDUP_WINDOW_SECONDS,
  STATS_RATE_LIMITS,
  type StatsEvent,
  type StatsViewer,
} from "@/lib/stats-policy"

/** True when this visitor already counted for the same post/event in the window. */
async function isDuplicateStatsEvent(event: StatsEvent, slug: string, identity: string) {
  try {
    const stored = await redis.set(statsDedupKey(event, slug, identity), "1", {
      nx: true,
      ex: STATS_DEDUP_WINDOW_SECONDS,
    })
    return stored === null
  } catch {
    // Redis 故障时放行，避免统计整体不可用（与限流器 fail-open 一致）。
    return false
  }
}

async function viewerIdentity(req: NextRequest, ip: string) {
  try {
    const session = await getServerSession(authOptions)
    return statsViewerIdentity(session?.user as StatsViewer | undefined, ip)
  } catch {
    return statsViewerIdentity(null, ip)
  }
}

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch { return NextResponse.json({ error: "invalid body" }, { status: 400 }) }
  const payload = body && typeof body === "object" ? body as Record<string, unknown> : {}
  const slug = normalizeStatsSlug(payload.slug)
  const event = parseStatsEvent(payload.event)
  if (!slug) return NextResponse.json({ error: "invalid slug" }, { status: 400 })
  if (!event) return NextResponse.json({ error: "invalid event" }, { status: 400 })

  const ip = requestIp(req)
  const limit = STATS_RATE_LIMITS[event]
  if (await isRateLimited(statsRateLimitKey(event, slug, ip), limit.limit, limit.windowSeconds)) {
    const current = await prisma.blogPost.findUnique({ where: { slug }, select: { views: true, shares: true } })
    return NextResponse.json(
      { views: current?.views || 0, shares: current?.shares || 0, counted: false, rateLimited: true },
      { status: 429, headers: { "Retry-After": String(limit.windowSeconds) } }
    )
  }

  const post = await prisma.blogPost.findUnique({ where: { slug } })
  if (!post?.published) return NextResponse.json({ error: "not found" }, { status: 404 })

  const identity = await viewerIdentity(req, ip)
  if (await isDuplicateStatsEvent(event, slug, identity)) {
    return NextResponse.json({ views: post.views, shares: post.shares, counted: false, deduplicated: true })
  }

  const update: any = {}
  if (event === "view") update.views = { increment: 1 }
  if (event === "share") update.shares = { increment: 1 }
  const updated = await prisma.blogPost.update({ where: { slug }, data: update })
  try { await redis.set(`stats:${slug}`, JSON.stringify({ views: updated.views, shares: updated.shares }), { ex: 300 }) } catch {}

  if (shouldNotifyStats(event, updated.views)) {
    sendNotifications({ event, title: post.title, url: `${process.env.NEXTAUTH_URL}/blogs/${slug}`, views: updated.views }).catch(() => {})
  }
  return NextResponse.json({ views: updated.views, shares: updated.shares, counted: true })
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
