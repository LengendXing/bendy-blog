"use client"
import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ColumnSelect } from "@/components/column-select"
import { Plus, Pencil, Trash2, Upload, X, ChevronLeft, ChevronRight } from "lucide-react"
import { useLocale } from "@/components/locale-provider"

const PAGE_SIZE = 15

export default function ContentPage() {
  const { t } = useLocale()
  const [allPosts, setAllPosts] = useState<any[]>([])
  const [columns, setColumns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newSlug, setNewSlug] = useState("")
  const [newColumnId, setNewColumnId] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<any[] | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchActive, setSearchActive] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    Promise.all([
      fetch("/api/blog").then(r => r.json()),
      fetch("/api/columns").then(r => r.json()),
    ]).then(([p, c]) => { setAllPosts(p); setColumns(c); setLoading(false) })
  }, [])

  const filtered = searchActive
    ? allPosts.filter(p => p.title.toLowerCase().includes(searchActive.toLowerCase()))
    : allPosts
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const posts = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function doSearch() { setSearchActive(search); setPage(1) }

  async function createColumn(name: string) {
    const res = await fetch("/api/columns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) })
    if (res.ok) { const col = await res.json(); if (!columns.find((c: any) => c.id === col.id)) setColumns(c => [...c, col]); return col }
    return null
  }

  async function createPost() {
    if (!newSlug || !newTitle) return
    const res = await fetch("/api/blog", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: newSlug, title: newTitle, content: `# ${newTitle}\n\nStart writing...`, columnId: newColumnId }),
    })
    if (res.ok) { const post = await res.json(); setShowNew(false); setNewSlug(""); setNewTitle(""); setNewColumnId(null); router.push(`/admin/content/edit?id=${post.id}`) }
  }

  async function deletePost(id: string) {
    if (!confirm("Delete?")) return
    await fetch("/api/blog", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
    setAllPosts(p => p.filter(x => x.id !== id))
  }

  async function handleImport() {
    const files = fileInputRef.current?.files
    if (!files || files.length === 0) return
    setImporting(true); setImportResults(null)
    const formData = new FormData()
    for (const file of Array.from(files)) formData.append("files", file)
    try {
      const res = await fetch("/api/import", { method: "POST", body: formData })
      const data = await res.json(); setImportResults(data.results || [])
      setAllPosts(await (await fetch("/api/blog")).json())
      setColumns(await (await fetch("/api/columns")).json())
    } catch { setImportResults([{ filename: "error", status: "error", error: "Import failed" }]) }
    setImporting(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  if (loading) return <div className="flex items-center justify-center h-64 font-mono text-xs">{t.loading}</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="font-mono text-sm uppercase tracking-widest">// {t.content}</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setShowImport(!showImport); setImportResults(null) }}><Upload className="w-3 h-3 mr-2" />Import</Button>
          <Button size="sm" onClick={() => setShowNew(!showNew)}><Plus className="w-3 h-3 mr-2" />{t.newPost}</Button>
        </div>
      </div>

      <div className="flex items-center gap-0 mb-4 max-w-sm">
        <input value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === "Enter" && doSearch()}
          placeholder={`${t.title}...`}
          className="flex-1 h-10 border-2 border-r-0 border-pixel-black dark:border-pixel-white bg-transparent px-3 text-sm font-body focus:outline-none" />
        <button onClick={doSearch}
          className="h-10 px-4 border-2 border-pixel-black dark:border-pixel-white bg-pixel-black dark:bg-pixel-white text-pixel-white dark:text-pixel-black font-mono text-xs hover:opacity-80 shrink-0">
          Go !
        </button>
      </div>

      {showImport && (
        <div className="border-2 border-pixel-black dark:border-pixel-white p-4 mb-6">
          <h3 className="font-mono text-xs uppercase mb-3">Batch Import (Notion Markdown)</h3>
          <p className="font-body text-xs text-pixel-gray-500 mb-3">Select .md files. Format: # Title, metadata, blank line, body.</p>
          <div className="flex items-center gap-3 flex-wrap">
            <input ref={fileInputRef} type="file" accept=".md,.txt,.markdown" multiple className="font-body text-xs file:border-2 file:border-pixel-black dark:file:border-pixel-white file:bg-transparent file:px-3 file:py-1.5 file:font-mono file:text-xs file:mr-3 file:cursor-pointer" />
            <Button size="sm" onClick={handleImport} disabled={importing}>{importing ? "Importing..." : "Import"}</Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowImport(false); setImportResults(null) }}><X className="w-3 h-3" /></Button>
          </div>
          {importResults && (
            <div className="mt-4 space-y-1">
              {importResults.map((r: any, i: number) => (
                <div key={i} className="font-body text-xs flex items-center gap-2">
                  <span className={`font-mono ${r.status === "imported" ? "text-green-600" : r.status === "skipped" ? "text-yellow-600" : "text-red-500"}`}>[{r.status}]</span>
                  <span className="truncate">{r.filename}</span>
                  {r.title && <span className="text-pixel-gray-400">— {r.title}</span>}
                  {r.error && <span className="text-red-500">({r.error})</span>}
                </div>
              ))}
              <p className="font-mono text-xs text-pixel-gray-400 mt-2">{importResults.filter(r => r.status === "imported").length} imported, {importResults.filter(r => r.status === "skipped").length} skipped, {importResults.filter(r => r.status === "error").length} errors</p>
            </div>
          )}
        </div>
      )}

      {showNew && (
        <div className="border-2 border-pixel-black dark:border-pixel-white p-4 mb-6 flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[120px]"><label className="font-mono text-xs block mb-1">{t.title}</label><Input value={newTitle} onChange={e => setNewTitle(e.target.value)} /></div>
          <div className="flex-1 min-w-[120px]"><label className="font-mono text-xs block mb-1">{t.slug}</label><Input value={newSlug} onChange={e => setNewSlug(e.target.value)} /></div>
          <div><label className="font-mono text-xs block mb-1">{t.column}</label><ColumnSelect columns={columns} value={newColumnId} onChange={setNewColumnId} onCreate={createColumn} placeholder={t.allColumns} allowCreate /></div>
          <Button onClick={createPost}>{t.add}</Button>
          <Button variant="ghost" onClick={() => { setShowNew(false); setNewTitle(""); setNewSlug(""); setNewColumnId(null) }}>{t.cancel}</Button>
        </div>
      )}

      <div className="space-y-2">
        {posts.map(p => (
          <div key={p.id} className="border-2 border-pixel-black dark:border-pixel-white p-3 sm:p-4 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="font-body text-sm truncate">{p.title}</span>
              {p.column && <span className="font-mono text-[10px] text-pixel-gray-400 border border-pixel-gray-300 dark:border-pixel-gray-700 px-1">{p.column.name}</span>}
              {p.published ? <Badge className="text-green-600 border-green-600">live</Badge> : <Badge className="text-pixel-gray-400 border-pixel-gray-400">draft</Badge>}
              <span className="font-mono text-xs text-pixel-gray-400">{p.views} {t.views} · {p._count?.comments || 0} {t.comments}</span>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => router.push(`/admin/content/edit?id=${p.id}`)}><Pencil className="w-3 h-3" /></Button>
              <Button size="sm" variant="destructive" onClick={() => deletePost(p.id)}><Trash2 className="w-3 h-3" /></Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="font-body text-pixel-gray-500 text-sm">{t.noPostsYet}</p>}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="border-2 border-pixel-black dark:border-pixel-white w-8 h-8 flex items-center justify-center disabled:opacity-30 hover:bg-pixel-gray-100 dark:hover:bg-pixel-gray-900">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono text-xs">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="border-2 border-pixel-black dark:border-pixel-white w-8 h-8 flex items-center justify-center disabled:opacity-30 hover:bg-pixel-gray-100 dark:hover:bg-pixel-gray-900">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
