import { prisma } from "@/lib/prisma"

const siteUrl = "https://blog.sunchengxin.com"
export const revalidate = 3600

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export async function GET() {
  let posts: Array<{
    slug: string
    title: string
    description: string | null
    publishDate: Date | null
    createdAt: Date
    updatedAt: Date
  }> = []

  try {
    posts = await prisma.blogPost.findMany({
      where: { published: true },
      orderBy: [{ publishDate: "desc" }, { createdAt: "desc" }],
      take: 50,
      select: { slug: true, title: true, description: true, publishDate: true, createdAt: true, updatedAt: true },
    })
  } catch {
    // Keep the feed valid even when the database is temporarily unavailable.
  }

  const items = posts.map(post => {
    const url = `${siteUrl}/blogs/${encodeURIComponent(post.slug)}`
    const date = post.publishDate || post.createdAt
    return `
      <item>
        <title>${escapeXml(post.title)}</title>
        <link>${escapeXml(url)}</link>
        <guid isPermaLink="true">${escapeXml(url)}</guid>
        <description>${escapeXml(post.description || `${post.title} | Bendy Blog`)}</description>
        <pubDate>${date.toUTCString()}</pubDate>
        <lastBuildDate>${post.updatedAt.toUTCString()}</lastBuildDate>
      </item>`
  }).join("")

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Bendy Blog</title>
    <link>${siteUrl}/blogs</link>
    <description>笨迪博客 BendyBlog 的码农修炼笔记。</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  })
}
