"use client"
import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

function EditContent() {
  const params = useSearchParams()
  const router = useRouter()
  const id = params.get("id")
  const [post, setPost] = useState<any>(null)
  const [markdown, setMarkdown] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [published, setPublished] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch("/api/blog").then(r => r.json()).then(posts => {
      const p = posts.find((x: any) => x.id === id)
      if (p) {
        setPost(p); setTitle(p.title); setDescription(p.description || ""); setPublished(p.published)
        fetch(`/api/github?path=${encodeURIComponent(p.githubPath)}`).then(r => r.json()).then(f => setMarkdown(f.content || ""))
      }
    })
  }, [id])

  async function save() {
    setSaving(true)
    await fetch("/api/blog", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title, description, content: markdown, published }),
    })
    setSaving(false)
  }

  if (!post) return <div className="font-mono text-xs">Loading...</div>

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Button size="sm" variant="ghost" onClick={() => router.push("/admin/content")}>← Back</Button>
        <Input value={title} onChange={e => setTitle(e.target.value)} className="max-w-xs" placeholder="Title" />
        <Input value={description} onChange={e => setDescription(e.target.value)} className="max-w-xs" placeholder="Description" />
        <label className="flex items-center gap-2 font-mono text-xs">
          <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} className="accent-pixel-black" />
          Published
        </label>
        <Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-0 border-2 border-pixel-black dark:border-pixel-white min-h-[500px]">
        <textarea
          value={markdown}
          onChange={e => setMarkdown(e.target.value)}
          className="p-4 font-body text-sm bg-transparent resize-none focus:outline-none border-r-2 border-pixel-black dark:border-pixel-white"
          placeholder="Write markdown..."
        />
        <div className="p-4 overflow-auto prose-pixel">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}

export default function EditPage() {
  return <Suspense fallback={<div className="font-mono text-xs">Loading...</div>}><EditContent /></Suspense>
}
