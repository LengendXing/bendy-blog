"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { useLocale } from "@/components/locale-provider"

export default function ContentPage() {
  const { t } = useLocale()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newSlug, setNewSlug] = useState("")
  const router = useRouter()

  useEffect(() => { fetch("/api/blog").then(r => r.json()).then(d => { setPosts(d); setLoading(false) }) }, [])

  async function createPost() {
    if (!newSlug || !newTitle) return
    const res = await fetch("/api/blog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: newSlug, title: newTitle, content: `# ${newTitle}\n\nStart writing...` }),
    })
    if (res.ok) {
      const post = await res.json()
      setShowNew(false); setNewSlug(""); setNewTitle("")
      router.push(`/admin/content/edit?id=${post.id}`)
    }
  }

  async function deletePost(id: string) {
    if (!confirm("Delete this post?")) return
    await fetch("/api/blog", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
    setPosts(p => p.filter(x => x.id !== id))
  }

  if (loading) return <div className="flex items-center justify-center h-64 font-mono text-xs">{t.loading}</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-mono text-sm uppercase tracking-widest">// {t.content}</h1>
        <Button size="sm" onClick={() => setShowNew(!showNew)}><Plus className="w-3 h-3 mr-2" />{t.newPost}</Button>
      </div>
      {showNew && (
        <div className="border-2 border-pixel-black dark:border-pixel-white p-4 mb-6 flex gap-3 items-end">
          <div className="flex-1"><label className="font-mono text-xs block mb-1">{t.title}</label><Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="My Post" /></div>
          <div className="flex-1"><label className="font-mono text-xs block mb-1">{t.slug}</label><Input value={newSlug} onChange={e => setNewSlug(e.target.value)} placeholder="my-post" /></div>
          <Button onClick={createPost}>{t.add}</Button>
          <Button variant="ghost" onClick={() => { setShowNew(false); setNewTitle(""); setNewSlug("") }}>{t.cancel}</Button>
        </div>
      )}
      <div className="space-y-2">
        {posts.map(p => (
          <div key={p.id} className="border-2 border-pixel-black dark:border-pixel-white p-4 flex items-center justify-between">
            <div>
              <span className="font-body text-sm">{p.title}</span>
              <span className="ml-3">{p.published ? <Badge className="text-green-600 border-green-600">live</Badge> : <Badge className="text-pixel-gray-400 border-pixel-gray-400">draft</Badge>}</span>
              <span className="font-mono text-xs text-pixel-gray-400 ml-3">{p.views} {t.views} · {p._count?.comments || 0} {t.comments}</span>
            </div>
            <div className="flex gap-2">
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
