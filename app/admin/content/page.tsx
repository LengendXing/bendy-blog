"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2 } from "lucide-react"

export default function ContentPage() {
  const [posts, setPosts] = useState<any[]>([])
  const [showNew, setShowNew] = useState(false)
  const [newSlug, setNewSlug] = useState("")
  const [newTitle, setNewTitle] = useState("")
  const router = useRouter()

  useEffect(() => { fetch("/api/blog").then(r => r.json()).then(setPosts) }, [])

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-mono text-sm uppercase tracking-widest">// Content</h1>
        <Button size="sm" onClick={() => setShowNew(!showNew)}><Plus className="w-3 h-3 mr-2" />New Post</Button>
      </div>
      {showNew && (
        <div className="border-2 border-pixel-black dark:border-pixel-white p-4 mb-6 flex gap-3 items-end">
          <div className="flex-1"><label className="font-mono text-xs block mb-1">Slug</label><Input value={newSlug} onChange={e => setNewSlug(e.target.value)} placeholder="my-post" /></div>
          <div className="flex-1"><label className="font-mono text-xs block mb-1">Title</label><Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="My Post" /></div>
          <Button onClick={createPost}>Create</Button>
        </div>
      )}
      <div className="space-y-2">
        {posts.map(p => (
          <div key={p.id} className="border-2 border-pixel-black dark:border-pixel-white p-4 flex items-center justify-between">
            <div>
              <span className="font-body text-sm">{p.title}</span>
              <span className="ml-3">{p.published ? <Badge className="text-green-600 border-green-600">live</Badge> : <Badge className="text-pixel-gray-400 border-pixel-gray-400">draft</Badge>}</span>
              <span className="font-mono text-xs text-pixel-gray-400 ml-3">{p.views} views · {p._count?.comments || 0} comments</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => router.push(`/admin/content/edit?id=${p.id}`)}><Pencil className="w-3 h-3" /></Button>
              <Button size="sm" variant="destructive" onClick={() => deletePost(p.id)}><Trash2 className="w-3 h-3" /></Button>
            </div>
          </div>
        ))}
        {posts.length === 0 && <p className="font-body text-pixel-gray-500 text-sm">No posts yet.</p>}
      </div>
    </div>
  )
}
