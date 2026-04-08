import { prisma } from "@/lib/prisma"
import { getFileContent } from "@/lib/github"
import { notFound } from "next/navigation"
import { BlogContent } from "./blog-content"

export const revalidate = 60

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await prisma.blogPost.findUnique({
    where: { slug: params.slug },
    include: { comments: { include: { user: true }, orderBy: { createdAt: "desc" } } },
  })
  if (!post || !post.published) notFound()

  let markdown = ""
  const file = await getFileContent(post.githubPath)
  if (file) markdown = file.content

  return <BlogContent post={post} markdown={markdown} />
}
