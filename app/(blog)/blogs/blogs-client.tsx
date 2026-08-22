"use client"

import Link from "next/link"
import { Search, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useLocale } from "@/components/locale-provider"
import { ColumnSelect } from "@/components/column-select"
import { PixelLoader } from "@/components/pixel-loader"

interface BlogPostSummary {
  slug: string
  title: string
  description: string | null
  published: boolean
  publishDate: string | null
  createdAt: string
  column: { id: string; name: string } | null
}

interface ColumnSummary {
  id: string
  name: string
}

interface Props {
  initialPosts: BlogPostSummary[]
  initialColumns: ColumnSummary[]
  initialQuery: string
}

export default function BlogsClient({ initialPosts, initialColumns, initialQuery }: Props) {
  const { t } = useLocale()
  const [posts, setPosts] = useState<BlogPostSummary[]>(initialPosts)
  const [columns, setColumns] = useState<ColumnSummary[]>(initialColumns)
  const [columnId, setColumnId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [columnsLoading, setColumnsLoading] = useState(false)
  const [query, setQuery] = useState(initialQuery)

  const visiblePosts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    if (!normalized) return posts
    return posts.filter(post => [post.title, post.description || "", post.column?.name || ""]
      .some(value => value.toLocaleLowerCase().includes(normalized)))
  }, [posts, query])

  function updateQuery(value: string) {
    setQuery(value)
    const url = new URL(window.location.href)
    if (value.trim()) url.searchParams.set("q", value.trim())
    else url.searchParams.delete("q")
    window.history.replaceState(null, "", url)
  }

  useEffect(() => {
    if (!columnId) {
      setPosts(initialPosts)
      return
    }

    setLoading(true)
    fetch(`/api/blog?published=true&columnId=${encodeURIComponent(columnId)}`)
      .then(async response => {
        const data = await response.json().catch(() => [])
        setPosts(response.ok && Array.isArray(data) ? data.filter((post: BlogPostSummary) => post.published) : [])
      })
      .catch(() => setPosts([]))
      .finally(() => setLoading(false))
  }, [columnId, initialPosts])

  useEffect(() => {
    if (initialColumns.length > 0) return
    setColumnsLoading(true)
    fetch("/api/columns")
      .then(async response => {
        const data = await response.json().catch(() => [])
        if (response.ok && Array.isArray(data)) setColumns(data)
      })
      .catch(() => {})
      .finally(() => setColumnsLoading(false))
  }, [initialColumns])

  function displayDate(post: BlogPostSummary) {
    const date = post.publishDate || post.createdAt
    return new Date(date).toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" })
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16">
      <div className="flex items-center justify-between mb-5 sm:mb-6 gap-4 flex-wrap">
        <h1 className="font-mono text-base sm:text-lg uppercase tracking-widest">// {t.blogs}</h1>
        {!columnsLoading && <ColumnSelect columns={columns} value={columnId} onChange={setColumnId} placeholder={t.allColumns} borderless />}
      </div>
      <div className="flex items-center border-b-2 border-pixel-black dark:border-pixel-white mb-8 sm:mb-12">
        <Search className="w-4 h-4 shrink-0 text-pixel-gray-400" aria-hidden="true" />
        <input
          value={query}
          onChange={event => updateQuery(event.target.value)}
          placeholder={t.searchPosts}
          aria-label={t.searchPosts}
          className="h-9 flex-1 bg-transparent px-2 font-body text-xs focus:outline-none"
        />
        {query && (
          <button type="button" onClick={() => updateQuery("")} className="p-1 text-pixel-gray-400 hover:text-pixel-black dark:hover:text-pixel-white" aria-label={t.cancel}>
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]"><PixelLoader size="md" /></div>
      ) : visiblePosts.length === 0 ? (
        <p className="font-body text-pixel-gray-500">{query.trim() ? t.noSearchResults : t.noPostsYet}</p>
      ) : (
        <div className="space-y-0">
          {visiblePosts.map((post, index) => (
            <Link key={post.slug} href={`/blogs/${encodeURIComponent(post.slug)}`} className="group block border-b-2 border-pixel-gray-200 dark:border-pixel-gray-800 py-4 sm:py-5 hover:bg-pixel-gray-100 dark:hover:bg-pixel-gray-900 px-3 sm:px-4 -mx-3 sm:-mx-4 transition-colors">
              <div className="flex items-baseline justify-between gap-2 sm:gap-4">
                <div className="flex items-baseline gap-2 sm:gap-4 min-w-0">
                  <span className="font-mono text-xs text-pixel-gray-400 shrink-0">{String(index + 1).padStart(2, "0")}</span>
                  <span className="font-body text-sm group-hover:underline underline-offset-4 truncate">{post.title}</span>
                  {post.column && <span className="font-mono text-[10px] text-pixel-gray-400 border border-pixel-gray-300 dark:border-pixel-gray-700 px-1 shrink-0 hidden sm:inline">{post.column.name}</span>}
                </div>
                <time dateTime={post.publishDate || post.createdAt} className="font-mono text-[10px] sm:text-xs text-pixel-gray-400 shrink-0">{displayDate(post)}</time>
              </div>
              {post.description && <p className="font-body text-xs text-pixel-gray-500 mt-1 ml-6 sm:ml-8 truncate">{post.description}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
