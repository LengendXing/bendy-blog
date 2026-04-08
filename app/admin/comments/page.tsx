"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Pencil, Check, X } from "lucide-react"
import Image from "next/image"

export default function CommentsPage() {
  const [comments, setComments] = useState<any[]>([])
  const [editId, setEditId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [filter, setFilter] = useState("")

  useEffect(() => { fetch("/api/comments").then(r => r.json()).then(setComments) }, [])

  const grouped = comments.reduce((acc: any, c: any) => {
    const key = c.post?.slug || "unknown"
    if (!acc[key]) acc[key] = { title: c.post?.title || "Unknown", comments: [] }
    acc[key].comments.push(c)
    return acc
  }, {})

  async function deleteComment(id: string) {
    if (!confirm("Delete?")) return
    await fetch("/api/comments", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
    setComments(c => c.filter(x => x.id !== id))
  }

  async function saveEdit(id: string) {
    await fetch("/api/comments", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, content: editContent }) })
    setComments(c => c.map(x => x.id === id ? { ...x, content: editContent } : x))
    setEditId(null)
  }

  const entries = Object.entries(grouped).filter(([k, v]: any) => !filter || v.title.toLowerCase().includes(filter.toLowerCase()))

  return (
    <div>
      <h1 className="font-mono text-sm uppercase tracking-widest mb-6">// Comments</h1>
      <input
        placeholder="Filter by post title..."
        value={filter} onChange={e => setFilter(e.target.value)}
        className="mb-4 w-full max-w-sm border-2 border-pixel-black dark:border-pixel-white bg-transparent px-3 py-2 text-sm font-body focus:outline-none"
      />
      {entries.map(([slug, group]: any) => (
        <div key={slug} className="mb-6">
          <h2 className="font-mono text-xs uppercase tracking-wider border-b-2 border-pixel-black dark:border-pixel-white pb-2 mb-3">{group.title}</h2>
          <div className="space-y-2">
            {group.comments.map((c: any) => (
              <div key={c.id} className="border-2 border-pixel-gray-200 dark:border-pixel-gray-800 p-3 flex items-start gap-3">
                {c.user?.image && <Image src={c.user.image} alt="" width={24} height={24} className="rounded-full border shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs">{c.user?.githubUsername || c.user?.name}</span>
                    <time className="text-xs text-pixel-gray-400">{new Date(c.createdAt).toLocaleDateString()}</time>
                  </div>
                  {editId === c.id ? (
                    <div className="flex gap-2 items-end">
                      <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="text-xs flex-1" rows={2} />
                      <Button size="sm" onClick={() => saveEdit(c.id)}><Check className="w-3 h-3" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditId(null)}><X className="w-3 h-3" /></Button>
                    </div>
                  ) : (
                    <p className="font-body text-xs text-pixel-gray-600 dark:text-pixel-gray-400">{c.content}</p>
                  )}
                </div>
                {editId !== c.id && (
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => { setEditId(c.id); setEditContent(c.content) }}><Pencil className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteComment(c.id)}><Trash2 className="w-3 h-3 text-red-500" /></Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      {entries.length === 0 && <p className="font-body text-sm text-pixel-gray-500">No comments yet.</p>}
    </div>
  )
}
