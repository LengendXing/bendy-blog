import { prisma } from "@/lib/prisma"
import { getFileContent } from "@/lib/github"
import { notFound } from "next/navigation"
import { BlogContent } from "./blog-content"

export const revalidate = 60

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const slug = decodeURIComponent(params.slug)
  const post = await prisma.blogPost.findUnique({
    where: { slug },
    include: {
      comments: {
        include: { user: { select: { name: true, image: true, githubUsername: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  })
  if (!post || !post.published) notFound()

  let markdown = ""
  const file = await getFileContent(post.githubPath)
  if (file) markdown = file.content

  const serialized = post.comments.map(c => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }))

  return <BlogContent
    post={{
      ...post,
      publishDate: post.publishDate?.toISOString() || null,
      updatedAt: post.updatedAt.toISOString(),
    }}
    markdown={markdown}
    initialComments={serialized}
  />
}
