"use client"
import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ColumnSelect } from "@/components/column-select"
import { useLocale } from "@/components/locale-provider"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

function EditContent() {
  const params = useSearchParams()
  const router = useRouter()
  const { t } = useLocale()
  const id = params.get("id")
  const [post, setPost] = useState<any>(null)
  const [columns, setColumns] = useState<any[]>([])
  const [markdown, setMarkdown] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [published, setPublished] = useState(false)
  const [columnId, setColumnId] = useState<string | null>(null)
  const [publishDate, setPublishDate] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      fetch("/api/blog").then(r => r.json()),
      fetch("/api/columns").then(r => r.json()),
    ]).then(([posts, cols]) => {
      setColumns(cols)
      const p = posts.find((x: any) => x.id === id)
      if (p) {
        setPost(p); setTitle(p.title); setDescription(p.description || "")
        setPublished(p.published); setColumnId(p.columnId || null)
        if (p.publishDate) setPublishDate(new Date(p.publishDate).toISOString().slice(0, 10))
        fetch(`/api/github?path=${encodeURIComponent(p.githubPath)}`).then(r => r.json()).then(f => setMarkdown(f.content || ""))
      }
    })
  }, [id])

  async function createColumn(name: string) {
    const res = await fetch("/api/columns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) })
    if (res.ok) { const col = await res.json(); if (!columns.find(c => c.id === col.id)) setColumns(c => [...c, col]); return col }
    return null
  }

  async function save() {
    setSaving(true)
    await fetch("/api/blog", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title, description, content: markdown, published, columnId, publishDate: publishDate || null }),
    })
    setSaving(false)
  }

  if (!post) return <div className="flex items-center justify-center h-64 font-mono text-xs">{t.loading}</div>

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 flex-wrap">
        <Button size="sm" variant="ghost" onClick={() => router.push("/admin/content")}>{t.backToBlog}</Button>
        <Input value={title} onChange={e => setTitle(e.target.value)} className="max-w-[180px]" placeholder={t.title} />
        <Input value={description} onChange={e => setDescription(e.target.value)} className="max-w-[180px]" placeholder={t.description} />
        <ColumnSelect columns={columns} value={columnId} onChange={setColumnId} onCreate={createColumn} placeholder={t.allColumns} allowCreate />
        <div className="flex items-center gap-1">
          <label className="font-mono text-[10px] text-pixel-gray-500">Pub Date</label>
          <input type="date" value={publishDate} onChange={e => setPublishDate(e.target.value)}
            className="border-2 border-pixel-black dark:border-pixel-white bg-transparent px-2 py-1 font-mono text-xs focus:outline-none h-8" />
        </div>
        <label className="flex items-center gap-2 font-mono text-xs">
          <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} className="accent-pixel-black" />{t.published}
        </label>
        <Button size="sm" onClick={save} disabled={saving}>{saving ? t.saving : t.save}</Button>
      </div>
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-0 border-2 border-pixel-black dark:border-pixel-white min-h-[400px] sm:min-h-[500px]">
        <textarea value={markdown} onChange={e => setMarkdown(e.target.value)}
          className="p-3 sm:p-4 font-body text-sm bg-transparent resize-none focus:outline-none border-b-2 md:border-b-0 md:border-r-2 border-pixel-black dark:border-pixel-white"
          placeholder="Write markdown..." />
        <div className="p-3 sm:p-4 overflow-auto prose-pixel"><ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown></div>
      </div>
    </div>
  )
}

export default function EditPage() {
  return <Suspense fallback={<div className="flex items-center justify-center h-64 font-mono text-xs">Loading...</div>}><EditContent /></Suspense>
}
