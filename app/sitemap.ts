import type { MetadataRoute } from "next"
import { prisma } from "@/lib/prisma"
import { sortPostsByEffectiveDate } from "@/lib/post-order"
import { absoluteUrl } from "@/lib/site"
import { publishedPostWhere } from "@/lib/blog-visibility"

export const revalidate = 3600
export const dynamic = "force-dynamic"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let posts: Array<{ slug: string; updatedAt: Date; publishDate: Date | null; createdAt: Date }> = []

  try {
    posts = sortPostsByEffectiveDate(await prisma.blogPost.findMany({
      where: publishedPostWhere(),
      select: { slug: true, updatedAt: true, publishDate: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }))
  } catch {
    // Keep the sitemap available even if the database is temporarily unavailable.
  }

  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/blogs"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/about"), changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/projects"), changeFrequency: "weekly", priority: 0.6 },
  ]

  return [
    ...staticPages,
    ...posts.map(post => ({
      url: absoluteUrl(`/blogs/${encodeURIComponent(post.slug)}`),
      lastModified: post.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ]
}
