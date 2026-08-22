import { prisma } from "@/lib/prisma"
import { getFileContent } from "@/lib/github"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { BlogContent } from "./blog-content"

export const revalidate = 60
const siteUrl = "https://blog.sunchengxin.com"

type PageParams = { params: { slug: string } }

async function getPost(slug: string) {
  return prisma.blogPost.findUnique({
    where: { slug },
    include: {
      comments: {
        include: { user: { select: { name: true, image: true, githubUsername: true } } },
        orderBy: { createdAt: "asc" },
      },
      column: { select: { id: true, name: true } },
    },
  })
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const slug = decodeURIComponent(params.slug)
  const post = await getPost(slug)
  if (!post || !post.published) return {}

  const description = post.description?.trim() || `${post.title}，来自笨迪博客 BendyBlog 的码农修炼笔记。`
  const url = `${siteUrl}/blogs/${encodeURIComponent(post.slug)}`
  return {
    title: "Bendy Blog",
    description,
    keywords: ["笨迪博客", "BendyBlog", "码农修炼笔记", post.title, post.column?.name].filter(Boolean) as string[],
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: "Bendy Blog",
      description,
      publishedTime: post.publishDate?.toISOString() || post.createdAt.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      authors: ["笨迪"],
      section: post.column?.name,
    },
    twitter: { card: "summary", title: "Bendy Blog", description },
  }
}

export default async function BlogPostPage({ params }: PageParams) {
  const slug = decodeURIComponent(params.slug)
  const post = await getPost(slug)
  if (!post || !post.published) notFound()

  let markdown = ""
  const file = await getFileContent(post.githubPath)
  if (file) markdown = file.content

  const serialized = post.comments.map(c => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }))

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description || undefined,
    datePublished: (post.publishDate || post.createdAt).toISOString(),
    dateModified: post.updatedAt.toISOString(),
    mainEntityOfPage: { "@type": "WebPage", "@id": `${siteUrl}/blogs/${encodeURIComponent(post.slug)}` },
    author: { "@type": "Person", name: "笨迪" },
    publisher: { "@type": "Organization", name: "笨迪博客 BendyBlog", url: siteUrl },
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
        initialComments={serialized}
      />
    </>
  )
}
