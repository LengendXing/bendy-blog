import Link from "next/link"
import { prisma } from "@/lib/prisma"

export const revalidate = 60

export default async function BlogsPage() {
  const posts = await prisma.blogPost.findMany({
    where: { published: true },
    orderBy: { createdAt: "desc" },
    select: { slug: true, title: true, description: true, createdAt: true },
  })

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="font-mono text-lg uppercase tracking-widest mb-12">// Blog Posts</h1>
      {posts.length === 0 && <p className="font-body text-pixel-gray-500">No posts yet.</p>}
      <div className="space-y-0">
        {posts.map((post, i) => (
          <Link key={post.slug} href={`/blogs/${post.slug}`} className="group block border-b-2 border-pixel-gray-200 dark:border-pixel-gray-800 py-5 hover:bg-pixel-gray-100 dark:hover:bg-pixel-gray-900 px-4 -mx-4 transition-colors">
            <div className="flex items-baseline justify-between gap-4">
              <div className="flex items-baseline gap-4 min-w-0">
                <span className="font-mono text-xs text-pixel-gray-400 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                <span className="font-body text-sm group-hover:underline underline-offset-4 truncate">{post.title}</span>
              </div>
              <time className="font-mono text-xs text-pixel-gray-400 shrink-0">
                {new Date(post.createdAt).toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" })}
              </time>
            </div>
            {post.description && (
              <p className="font-body text-xs text-pixel-gray-500 mt-1 ml-8 truncate">{post.description}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
