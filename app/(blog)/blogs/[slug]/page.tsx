import { prisma } from "@/lib/prisma"
import { getFileContent } from "@/lib/github"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { BlogContent } from "./blog-content"
import { sortPostsByEffectiveDate } from "@/lib/post-order"
import { absoluteUrl, SITE_TITLE, SITE_URL } from "@/lib/site"
import { isPublishedPost, publishedPostWhere } from "@/lib/blog-visibility"

export const revalidate = 60

type PageParams = { params: Promise<{ slug: string }> }

async function getPost(slug: string) {
  return prisma.blogPost.findUnique({
    where: { slug },
    include: {
      column: { select: { id: true, name: true } },
    },
  })
}

async function getPostContext(post: Awaited<ReturnType<typeof getPost>>) {
  if (!post) return { previous: null, next: null, related: [] }
  const posts = await prisma.blogPost.findMany({
    where: publishedPostWhere(),
    orderBy: { createdAt: "desc" },
    select: { id: true, slug: true, title: true, columnId: true, publishDate: true, createdAt: true },
  })
  const orderedPosts = sortPostsByEffectiveDate(posts)
  const index = orderedPosts.findIndex(item => item.id === post.id)
  const previous = index >= 0 && orderedPosts[index + 1] ? orderedPosts[index + 1] : null
  const next = index > 0 ? orderedPosts[index - 1] : null
  const sameColumn = post.columnId
    ? orderedPosts.filter(item => item.id !== post.id && item.columnId === post.columnId)
    : []
  return { previous, next, related: sameColumn.slice(0, 3) }
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug: rawSlug } = await params
  const slug = decodeURIComponent(rawSlug)
  const post = await getPost(slug)
  if (!post || !isPublishedPost(post)) return {}

  const description = post.description?.trim() || `${post.title}，来自笨迪博客 BendyBlog 的码农修炼笔记。`
  const url = absoluteUrl(`/blogs/${encodeURIComponent(post.slug)}`)
  return {
    title: SITE_TITLE,
    description,
    keywords: ["笨迪博客", "BendyBlog", "码农修炼笔记", post.title, post.column?.name].filter(Boolean) as string[],
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: SITE_TITLE,
      description,
      publishedTime: post.publishDate?.toISOString() || post.createdAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: ["笨迪"],
      section: post.column?.name,
    },
    twitter: { card: "summary", title: SITE_TITLE, description },
  }
}

export default async function BlogPostPage({ params }: PageParams) {
  const { slug: rawSlug } = await params
  const slug = decodeURIComponent(rawSlug)
  const post = await getPost(slug)
  if (!post || !isPublishedPost(post)) notFound()
  const context = await getPostContext(post)

  let markdown = ""
  const file = await getFileContent(post.githubPath)
  if (file) markdown = file.content

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description || undefined,
    datePublished: (post.publishDate || post.createdAt).toISOString(),
    dateModified: post.updatedAt.toISOString(),
    mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(`/blogs/${encodeURIComponent(post.slug)}`) },
    author: { "@type": "Person", name: "笨迪" },
    publisher: { "@type": "Organization", name: "笨迪博客 BendyBlog", url: SITE_URL },
    articleSection: post.column?.name || undefined,
    keywords: ["笨迪博客", "BendyBlog", "码农修炼笔记", post.title, post.column?.name].filter(Boolean).join(", "),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd).replace(/</g, "\\u003c") }} />
      <BlogContent
        post={{
          ...post,
          publishDate: post.publishDate?.toISOString() || null,
          updatedAt: post.updatedAt.toISOString(),
        }}
        markdown={markdown}
        initialComments={[]}
        navigation={{ previous: context.previous, next: context.next }}
        related={context.related}
      />
    </>
  )
}
