"use client"
import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ColumnSelect } from "@/components/column-select"
import { Plus, Pencil, Trash2, Upload, X, ChevronLeft, ChevronRight, FilePlus2 } from "lucide-react"
import { useLocale } from "@/components/locale-provider"
import { PixelStatus } from "@/components/pixel-status"
import { AdminLoading } from "@/components/admin-loading"

const PAGE_SIZE = 15
type CreateStage = "saving" | "refreshing" | "opening" | null

const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export default function ContentPage() {
  const { t } = useLocale()
  const [allPosts, setAllPosts] = useState<any[]>([])
  const [columns, setColumns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newSlug, setNewSlug] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newColumnId, setNewColumnId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createStage, setCreateStage] = useState<CreateStage>(null)
  const [createError, setCreateError] = useState("")
  const [showImport, setShowImport] = useState(false)
  const [importing, setImporting] = useState(false)
  const [deletingPost, setDeletingPost] = useState(false)
  const [columnAction, setColumnAction] = useState(false)
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
    ]).then(([p, c]) => {
      setAllPosts(Array.isArray(p) ? p : [])
      setColumns(Array.isArray(c) ? c : [])
      setLoading(false)
    }).catch(() => {
      setAllPosts([])
      setColumns([])
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!showNew && !createStage) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = previousOverflow }
  }, [showNew, createStage])

  const filtered = searchActive
    ? allPosts.filter(p => p.title.toLowerCase().includes(searchActive.toLowerCase()))
    : allPosts
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const posts = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function doSearch() { setSearchActive(search); setPage(1) }

  async function createColumn(name: string) {
    if (columnAction) return null
    setColumnAction(true)
    try {
      const res = await fetch("/api/columns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) })
      if (res.ok) { const col = await res.json(); if (!columns.find((c: any) => c.id === col.id)) setColumns(c => [...c, col]); return col }
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

  function resetNewPost() {
    setNewSlug("")
    setNewTitle("")
    setNewDescription("")
    setNewColumnId(null)
    setCreateError("")
  }

  async function createPost(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    if (creating) return
    if (!newSlug.trim() || !newTitle.trim()) {
      setCreateError(`${t.title} and ${t.slug} are required.`)
      return
    }

    setCreating(true)
    setCreateError("")
    setCreateStage("saving")
    try {
      const res = await fetch("/api/blog", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: newSlug.trim(),
          title: newTitle.trim(),
          description: newDescription.trim() || null,
          content: `# ${newTitle.trim()}\n\nStart writing...`,
          columnId: newColumnId,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || "Unable to create post")

      setShowNew(false)
      resetNewPost()
      setCreateStage("refreshing")
      const refreshed = await fetch("/api/blog")
      if (refreshed.ok) setAllPosts(await refreshed.json())
      setPage(1)
      setCreateStage("opening")
      await pause(650)
      router.push(`/admin/content/edit?id=${payload.id}`)
    } catch (error) {
      setCreateStage(null)
      setCreating(false)
      setShowNew(true)
      setCreateError(error instanceof Error ? error.message : "Unable to create post")
    }
  }

  async function deletePost(id: string) {
    if (!confirm("Delete?")) return
    setDeletingPost(true)
    try {
      await fetch("/api/blog", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
      setAllPosts(p => p.filter(x => x.id !== id))
    } finally {
      setDeletingPost(false)
    }
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
      const refreshedPosts = await (await fetch("/api/blog")).json()
      const refreshedColumns = await (await fetch("/api/columns")).json()
      if (Array.isArray(refreshedPosts)) setAllPosts(refreshedPosts)
      if (Array.isArray(refreshedColumns)) setColumns(refreshedColumns)
    } catch { setImportResults([{ filename: "error", status: "error", error: "Import failed" }]) }
    setImporting(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  if (loading) return <AdminLoading className="min-h-64" />

  return (
    <div className="relative min-h-[360px] overflow-hidden" aria-busy={deletingPost}>
      {deletingPost && <AdminLoading size="sm" className="absolute inset-0 z-20 min-h-full bg-pixel-white/95 p-2 dark:bg-pixel-black/95" />}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="font-mono text-sm uppercase tracking-widest">// {t.content}</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setShowImport(!showImport); setImportResults(null) }}><Upload className="w-3 h-3 mr-2" />Import</Button>
          <Button size="sm" onClick={() => { setShowNew(true); setCreateError("") }}><Plus className="w-3 h-3 mr-2" />{t.newPost}</Button>
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
        <div className="relative min-h-[150px] overflow-hidden border-2 border-pixel-black p-4 mb-6 dark:border-pixel-white" aria-busy={importing}>
          {importing && <AdminLoading size="sm" className="absolute inset-0 z-20 min-h-full bg-pixel-white/95 p-2 dark:bg-pixel-black/95" />}
          <h3 className="font-mono text-xs uppercase mb-3">Batch Import (Notion Markdown)</h3>
          <p className="font-body text-xs text-pixel-gray-500 mb-3">Select .md files. Format: # Title, metadata, blank line, body.</p>
          <div className="flex items-center gap-3 flex-wrap">
            <input ref={fileInputRef} type="file" accept=".md,.txt,.markdown" multiple className="font-body text-xs file:border-2 file:border-pixel-black dark:file:border-pixel-white file:bg-transparent file:px-3 file:py-1.5 file:font-mono file:text-xs file:mr-3 file:cursor-pointer" />
            <Button size="sm" onClick={handleImport} disabled={importing}>Import</Button>
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

      {showNew && !createStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-pixel-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="new-post-title">
          <form onSubmit={createPost} className="pixel-pop relative min-h-[360px] w-full max-w-xl overflow-hidden border-2 border-pixel-black dark:border-pixel-white bg-pixel-white dark:bg-pixel-black p-5 sm:p-6 text-pixel-black dark:text-pixel-white shadow-[8px_8px_0_currentColor]" aria-busy={columnAction}>
            {columnAction && (
              <AdminLoading
                size="sm"
                className="absolute inset-0 z-20 min-h-full bg-pixel-white/95 p-2 backdrop-blur-[1px] dark:bg-pixel-black/95"
              />
            )}
            <div className="flex items-start justify-between gap-4 border-b-2 border-pixel-black dark:border-pixel-white pb-4 mb-5">
              <div className="flex items-center gap-3">
                <FilePlus2 className="w-4 h-4 shrink-0" />
                <div>
                  <h2 id="new-post-title" className="font-mono text-xs uppercase tracking-widest">{t.newPost}</h2>
                  <p className="font-mono text-[10px] text-pixel-gray-500 dark:text-pixel-gray-400 mt-1">// NEW ENTRY</p>
                </div>
              </div>
              <button type="button" onClick={() => { setShowNew(false); resetNewPost() }} title={t.cancel} className="p-1 hover:bg-pixel-gray-100 dark:hover:bg-pixel-gray-900">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block sm:col-span-2">
                <span className="font-mono text-[10px] uppercase block mb-1">{t.title} *</span>
                <Input required autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder={t.title} />
              </label>
              <label className="block">
                <span className="font-mono text-[10px] uppercase block mb-1">{t.slug} *</span>
                <Input required value={newSlug} onChange={e => setNewSlug(e.target.value)} placeholder="my-post-slug" />
              </label>
              <div>
                <span className="font-mono text-[10px] uppercase block mb-1">{t.column}</span>
                <ColumnSelect columns={columns} value={newColumnId} onChange={setNewColumnId} onCreate={createColumn} onUpdate={updateColumn} placeholder={t.allColumns} allowCreate />
              </div>
              <label className="block sm:col-span-2">
                <span className="font-mono text-[10px] uppercase block mb-1">{t.description}</span>
                <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)} rows={3} placeholder={t.description}
                  className="w-full border-2 border-pixel-black dark:border-pixel-white bg-transparent px-3 py-2 text-sm font-body placeholder:text-pixel-gray-400 focus:outline-none focus:ring-2 focus:ring-pixel-gray-400 resize-y" />
              </label>
            </div>

            {createError && <p className="mt-4 border-l-2 border-red-500 pl-2 font-body text-xs text-red-500" role="alert">{createError}</p>}
            <div className="flex items-center justify-end gap-2 border-t-2 border-pixel-black dark:border-pixel-white mt-5 pt-4">
              <Button type="button" variant="ghost" onClick={() => { setShowNew(false); resetNewPost() }}>{t.cancel}</Button>
              <Button type="submit" disabled={creating}><Plus className="w-3 h-3 mr-2" />{t.add}</Button>
            </div>
          </form>
        </div>
      )}

      {createStage && (
        <PixelStatus
          title={createStage === "saving" ? t.saving : createStage === "refreshing" ? t.refreshingList : t.openingEditor}
          detail={createStage === "refreshing" ? t.refreshingList : createStage === "opening" ? t.openingEditor : t.saving}
        />
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
