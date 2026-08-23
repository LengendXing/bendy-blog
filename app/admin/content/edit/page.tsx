"use client"
import { useEffect, useState, Suspense, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ColumnSelect } from "@/components/column-select"
import { useLocale } from "@/components/locale-provider"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { PixelStatus } from "@/components/pixel-status"
import { MarkdownTable } from "@/components/markdown-table"
import { AdminLoading } from "@/components/admin-loading"

function EditContent() {
  const params = useSearchParams()
  const router = useRouter()
  const { t } = useLocale()
  const id = params.get("id")
  const [post, setPost] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [columns, setColumns] = useState<any[]>([])
  const [markdown, setMarkdown] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [published, setPublished] = useState(false)
  const [columnId, setColumnId] = useState<string | null>(null)
  const [publishDate, setPublishDate] = useState("")
  const [saving, setSaving] = useState(false)
  const [savedFeedback, setSavedFeedback] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [columnAction, setColumnAction] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setLoadError("")
    setPost(null)
    if (!id) {
      setLoadError("Missing post id")
      setLoading(false)
      return () => controller.abort()
    }
    Promise.all([
      fetch("/api/blog", { signal: controller.signal }).then(response => {
        if (!response.ok) throw new Error("posts load failed")
        return response.json()
      }),
      fetch("/api/columns", { signal: controller.signal }).then(response => {
        if (!response.ok) throw new Error("columns load failed")
        return response.json()
      }),
    ]).then(async ([posts, cols]) => {
      if (!Array.isArray(posts)) throw new Error("posts load failed")
      const p = posts.find((x: any) => x.id === id)
      if (!p) throw new Error("Post not found")
      const fileResponse = await fetch(`/api/github?path=${encodeURIComponent(p.githubPath)}`, { signal: controller.signal })
      if (!fileResponse.ok) throw new Error("content load failed")
      const file = await fileResponse.json()
      if (controller.signal.aborted) return
      setColumns(Array.isArray(cols) ? cols : [])
      setPost(p); setTitle(p.title); setDescription(p.description || "")
      setPublished(p.published); setColumnId(p.columnId || null)
      setPublishDate(p.publishDate ? new Date(p.publishDate).toISOString().slice(0, 10) : "")
      setMarkdown(file.content || "")
    }).catch(error => {
      if ((error as Error).name !== "AbortError") setLoadError((error as Error).message || "Unable to load post")
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [id])

  async function createColumn(name: string) {
    if (columnAction) return null
    setColumnAction(true)
    try {
      const res = await fetch("/api/columns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) })
      if (res.ok) { const col = await res.json(); if (!columns.find(c => c.id === col.id)) setColumns(c => [...c, col]); return col }
      return null
    } finally {
      setColumnAction(false)
    }
  }

  async function updateColumn(id: string, name: string) {
    if (columnAction) return null
    setColumnAction(true)
    try {
      const res = await fetch("/api/columns", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, name }) })
      if (res.ok) {
        const col = await res.json()
        setColumns(cols => cols.map(c => c.id === id ? col : c))
        return col
      }
      return null
    } finally {
      setColumnAction(false)
    }
  }

  async function save() {
    if (saving || savedFeedback) return
    setSaving(true)
    setSaveError("")
    try {
      const res = await fetch("/api/blog", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title, description, content: markdown, published, columnId, publishDate: publishDate || null }),
      })
      if (!res.ok) throw new Error("save failed")
    } catch {
      setSaving(false)
      setSaveError(t.saveFailed)
      return
    }
    setSaving(false)
    setSavedFeedback(true)
    saveTimer.current = setTimeout(() => router.push("/admin/content"), 2000)
  }

  if (loading) return <AdminLoading className="min-h-64" />
  if (!post) return <div className="flex min-h-64 items-center justify-center font-body text-xs text-red-500" role="alert">{loadError || "Unable to load post"}</div>

  return (
    <div className="relative flex h-full min-h-[520px] flex-col overflow-hidden" aria-busy={columnAction}>
      {columnAction && (
        <AdminLoading
          size="sm"
          className="absolute inset-0 z-30 min-h-full bg-pixel-white/95 p-2 backdrop-blur-[1px] dark:bg-pixel-black/95"
        />
      )}
      <div className="flex items-center gap-2 sm:gap-3 mb-4 flex-wrap">
        <Button size="sm" variant="ghost" onClick={() => router.push("/admin/content")}>{t.backToBlog}</Button>
        <Input value={title} onChange={e => setTitle(e.target.value)} className="max-w-[180px]" placeholder={t.title} />
        <Input value={description} onChange={e => setDescription(e.target.value)} className="max-w-[180px]" placeholder={t.description} />
        <ColumnSelect columns={columns} value={columnId} onChange={setColumnId} onCreate={createColumn} onUpdate={updateColumn} placeholder={t.allColumns} allowCreate />
        <div className="flex items-center gap-1">
          <label className="font-mono text-[10px] text-pixel-gray-500">Pub Date</label>
          <input type="date" value={publishDate} onChange={e => setPublishDate(e.target.value)}
            className="border-2 border-pixel-black dark:border-pixel-white bg-transparent px-2 py-1 font-mono text-xs focus:outline-none h-8" />
        </div>
        <label className="flex items-center gap-2 font-mono text-xs">
          <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} className="accent-pixel-black" />{t.published}
        </label>
        <Button size="sm" onClick={save} disabled={saving || savedFeedback}>{t.save}</Button>
        {saveError && <span className="font-body text-xs text-red-500" role="alert">{saveError}</span>}
      </div>
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-0 border-2 border-pixel-black dark:border-pixel-white min-h-[400px] sm:min-h-[500px]">
        <textarea value={markdown} onChange={e => setMarkdown(e.target.value)}
          className="p-3 sm:p-4 font-body text-sm bg-transparent resize-none focus:outline-none border-b-2 md:border-b-0 md:border-r-2 border-pixel-black dark:border-pixel-white"
          placeholder="Write markdown..." />
        <div className="p-3 sm:p-4 overflow-auto prose-pixel"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ table: MarkdownTable }}>{markdown}</ReactMarkdown></div>
      </div>
      {saving && <PixelStatus title={t.saving} detail={t.saving} />}
      {savedFeedback && <PixelStatus success title={t.savedSuccessfully} detail={t.returningToContent} />}
    </div>
  )
}

export default function EditPage() {
  return <Suspense fallback={<AdminLoading className="min-h-64" />}><EditContent /></Suspense>
}
