"use client"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useLocale } from "@/components/locale-provider"
import { ColumnSelect } from "@/components/column-select"

export default function BlogsPage() {
  const { t } = useLocale()
  const [posts, setPosts] = useState<any[]>([])
  const [columns, setColumns] = useState<any[]>([])
  const [columnId, setColumnId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/columns").then(r => r.json()).then(setColumns)
  }, [])

  useEffect(() => {
    setLoading(true)
    const url = columnId ? `/api/blog?published=true&columnId=${columnId}` : `/api/blog?published=true`
    fetch(url).then(r => r.json()).then(data => {
      setPosts(data.filter((p: any) => p.published))
      setLoading(false)
    })
  }, [columnId])

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16">
      <div className="flex items-center justify-between mb-8 sm:mb-12 gap-4 flex-wrap">
        <h1 className="font-mono text-base sm:text-lg uppercase tracking-widest">// {t.blogs}</h1>
        <ColumnSelect columns={columns} value={columnId} onChange={setColumnId} placeholder={t.allColumns} borderless />
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-32 font-mono text-xs">{t.loading}</div>
      ) : posts.length === 0 ? (
        <p className="font-body text-pixel-gray-500">{t.noPostsYet}</p>
      ) : (
        <div className="space-y-0">
          {posts.map((post: any, i: number) => (
            <Link key={post.slug} href={`/blogs/${post.slug}`} className="group block border-b-2 border-pixel-gray-200 dark:border-pixel-gray-800 py-4 sm:py-5 hover:bg-pixel-gray-100 dark:hover:bg-pixel-gray-900 px-3 sm:px-4 -mx-3 sm:-mx-4 transition-colors">
              <div className="flex items-baseline justify-between gap-2 sm:gap-4">
                <div className="flex items-baseline gap-2 sm:gap-4 min-w-0">
                  <span className="font-mono text-xs text-pixel-gray-400 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                  <span className="font-body text-sm group-hover:underline underline-offset-4 truncate">{post.title}</span>
                  {post.column && <span className="font-mono text-[10px] text-pixel-gray-400 border border-pixel-gray-300 dark:border-pixel-gray-700 px-1 shrink-0 hidden sm:inline">{post.column.name}</span>}
                </div>
                <time className="font-mono text-[10px] sm:text-xs text-pixel-gray-400 shrink-0">
                  {new Date(post.createdAt).toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" })}
                </time>
              </div>
              {post.description && <p className="font-body text-xs text-pixel-gray-500 mt-1 ml-6 sm:ml-8 truncate">{post.description}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
