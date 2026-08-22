import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { sortPostsByEffectiveDate } from "@/lib/post-order"
import BlogsClient from "./blogs-client"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Bendy Blog",
  description: "浏览笨迪博客 BendyBlog 的技术文章，涵盖 Java、后端开发、机器学习、深度学习、算法与工程实践。",
  alternates: { canonical: "/blogs" },
  openGraph: {
    type: "website",
    url: "/blogs",
    title: "Bendy Blog",
    description: "浏览笨迪博客 BendyBlog 的技术文章，涵盖 Java、后端开发、机器学习、深度学习、算法与工程实践。",
  },
}

export default async function BlogsPage({ searchParams }: { searchParams?: { q?: string } }) {
  let posts: Array<{
    slug: string
    title: string
    description: string | null
    published: boolean
    publishDate: Date | null
    createdAt: Date
    column: { id: string; name: string } | null
  }> = []
  let columns: Array<{ id: string; name: string }> = []

  try {
    ;[posts, columns] = await Promise.all([
      prisma.blogPost.findMany({
        where: { published: true },
        orderBy: { createdAt: "desc" },
        select: { slug: true, title: true, description: true, published: true, publishDate: true, createdAt: true, column: { select: { id: true, name: true } } },
      }),
      prisma.column.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    ])
  } catch {
    // The client still renders the empty state if the database is temporarily unavailable.
  }

  const orderedPosts = sortPostsByEffectiveDate(posts)

  return (
    <BlogsClient
      initialPosts={orderedPosts.map(post => ({ ...post, publishDate: post.publishDate?.toISOString() || null, createdAt: post.createdAt.toISOString() }))}
      initialColumns={columns}
      initialQuery={searchParams?.q || ""}
    />
  )
}
