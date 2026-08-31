"use client"

import Link from "next/link"
import { Search, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useLocale } from "@/components/locale-provider"
import { ColumnSelect } from "@/components/column-select"
import { BlogListSkeleton } from "@/components/pixel-skeleton"
import { useDelayedLoading } from "@/components/use-delayed-loading"
import { LIST_SKELETON_DELAY_MS } from "@/lib/loading"

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
  const [loadError, setLoadError] = useState(false)
  const [columnsError, setColumnsError] = useState(false)
  const [query, setQuery] = useState(initialQuery)
  const requestId = useRef(0)
  const showSkeleton = useDelayedLoading(loading, LIST_SKELETON_DELAY_MS, columnId)

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
    const currentRequest = ++requestId.current
    if (!columnId) {
      setPosts(initialPosts)
      setLoading(false)
      setLoadError(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setLoadError(false)
    fetch(`/api/blog?published=true&columnId=${encodeURIComponent(columnId)}`, { signal: controller.signal })
      .then(async response => {
        const data = await response.json().catch(() => null)
        if (!response.ok || !Array.isArray(data)) throw new Error("blog list request failed")
        if (currentRequest === requestId.current && !controller.signal.aborted) {
          setPosts(data.filter((post: BlogPostSummary) => post.published))
        }
      })
      .catch(error => {
        if (error?.name === "AbortError" || currentRequest !== requestId.current) return
        setLoadError(true)
      })
      .finally(() => {
        if (currentRequest === requestId.current && !controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [columnId, initialPosts])

  useEffect(() => {
    if (initialColumns.length > 0) return
    const controller = new AbortController()
    setColumnsLoading(true)
    setColumnsError(false)
    fetch("/api/columns", { signal: controller.signal })
      .then(async response => {
        const data = await response.json().catch(() => null)
        if (!response.ok || !Array.isArray(data)) throw new Error("column list request failed")
        if (!controller.signal.aborted) setColumns(data)
      })
      .catch(error => {
        if (error?.name !== "AbortError") setColumnsError(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setColumnsLoading(false)
      })
    return () => controller.abort()
  }, [initialColumns])

  function displayDate(post: BlogPostSummary) {
    const date = post.publishDate || post.createdAt
    return new Date(date).toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" })
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16">
      <div className="flex items-center justify-between mb-5 sm:mb-6 gap-4 flex-wrap">
        <h1 className="font-mono text-base sm:text-lg uppercase tracking-widest">// {t.blogs}</h1>
        {!columnsLoading && !columnsError && <ColumnSelect columns={columns} value={columnId} onChange={setColumnId} placeholder={t.allColumns} borderless />}
      </div>
      {columnsError && <p className="mb-3 font-body text-xs text-red-500" role="alert">{t.loadFailed}</p>}
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
      {loadError && <p className="mb-4 font-body text-xs text-red-500" role="alert">{t.loadFailed}</p>}
      {showSkeleton ? (
        <div className="pixel-content-transition" aria-busy="true"><BlogListSkeleton /></div>
      ) : loading && posts.length === 0 ? (
        <div className="min-h-[200px]" aria-busy="true" />
      ) : visiblePosts.length === 0 ? (
        <p className="font-body text-pixel-gray-500">{query.trim() ? t.noSearchResults : t.noPostsYet}</p>
      ) : (
        <div className="pixel-content-transition space-y-0">
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
