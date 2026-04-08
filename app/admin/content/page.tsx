"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ColumnSelect } from "@/components/column-select"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { useLocale } from "@/components/locale-provider"

export default function ContentPage() {
  const { t } = useLocale()
  const [posts, setPosts] = useState<any[]>([])
  const [columns, setColumns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newSlug, setNewSlug] = useState("")
  const [newColumnId, setNewColumnId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    Promise.all([
      fetch("/api/blog").then(r => r.json()),
      fetch("/api/columns").then(r => r.json()),
    ]).then(([p, c]) => { setPosts(p); setColumns(c); setLoading(false) })
  }, [])

  async function createColumn(name: string) {
    const res = await fetch("/api/columns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) })
    if (res.ok) {
      const col = await res.json()
      if (!columns.find((c: any) => c.id === col.id)) setColumns(c => [...c, col])
      return col
    }
    return null
  }

  async function createPost() {
    if (!newSlug || !newTitle) return
    const res = await fetch("/api/blog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: newSlug, title: newTitle, content: `# ${newTitle}\n\nStart writing...`, columnId: newColumnId }),
    })
    if (res.ok) {
      const post = await res.json()
      setShowNew(false); setNewSlug(""); setNewTitle(""); setNewColumnId(null)
      router.push(`/admin/content/edit?id=${post.id}`)
    }
  }

  async function deletePost(id: string) {
    if (!confirm("Delete?")) return
    await fetch("/api/blog", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
    setPosts(p => p.filter(x => x.id !== id))
  }

  if (loading) return <div className="flex items-center justify-center h-64 font-mono text-xs">{t.loading}</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="font-mono text-sm uppercase tracking-widest">// {t.content}</h1>
        <Button size="sm" onClick={() => setShowNew(!showNew)}><Plus className="w-3 h-3 mr-2" />{t.newPost}</Button>
      </div>
      {showNew && (
        <div className="border-2 border-pixel-black dark:border-pixel-white p-4 mb-6 flex gap-3 items-end flex-wrap">
          <div className="flex-1 min-w-[120px]"><label className="font-mono text-xs block mb-1">{t.title}</label><Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="My Post" /></div>
          <div className="flex-1 min-w-[120px]"><label className="font-mono text-xs block mb-1">{t.slug}</label><Input value={newSlug} onChange={e => setNewSlug(e.target.value)} placeholder="my-post" /></div>
          <div><label className="font-mono text-xs block mb-1">{t.column}</label>
            <ColumnSelect columns={columns} value={newColumnId} onChange={setNewColumnId}
              onCreate={createColumn} placeholder={t.allColumns} allowCreate />
          </div>
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
        {posts.length === 0 && <p className="font-body text-pixel-gray-500 text-sm">{t.noPostsYet}</p>}
      </div>
    </div>
  )
}
