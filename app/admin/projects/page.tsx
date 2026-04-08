"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2 } from "lucide-react"

export default function ProjectsAdminPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [form, setForm] = useState({ title: "", description: "", url: "", logoUrl: "", sortOrder: 0 })
  const [editId, setEditId] = useState<string | null>(null)

  useEffect(() => { fetch("/api/projects").then(r => r.json()).then(setProjects) }, [])

  async function save() {
    if (!form.title) return
    if (editId) {
      const res = await fetch("/api/projects", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editId, ...form }) })
      const updated = await res.json()
      setProjects(p => p.map(x => x.id === editId ? updated : x))
    } else {
      const res = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      const newProject = await res.json()
        setProjects(p => [...p, newProject])
    }
    setForm({ title: "", description: "", url: "", logoUrl: "", sortOrder: 0 }); setEditId(null)
  }

  async function del(id: string) {
    if (!confirm("Delete?")) return
    await fetch("/api/projects", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
    setProjects(p => p.filter(x => x.id !== id))
  }

  function startEdit(p: any) {
    setEditId(p.id)
    setForm({ title: p.title, description: p.description || "", url: p.url || "", logoUrl: p.logoUrl || "", sortOrder: p.sortOrder })
  }

  return (
    <div>
      <h1 className="font-mono text-sm uppercase tracking-widest mb-6">// Projects</h1>
      <div className="border-2 border-pixel-black dark:border-pixel-white p-4 mb-6 space-y-3 max-w-xl">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="font-mono text-xs block mb-1">Title</label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div><label className="font-mono text-xs block mb-1">URL</label><Input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} /></div>
          <div><label className="font-mono text-xs block mb-1">Logo URL</label><Input value={form.logoUrl} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} /></div>
          <div><label className="font-mono text-xs block mb-1">Sort Order</label><Input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} /></div>
        </div>
        <div><label className="font-mono text-xs block mb-1">Description</label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
        <div className="flex gap-2">
          <Button size="sm" onClick={save}>{editId ? "Update" : "Add"}</Button>
          {editId && <Button size="sm" variant="ghost" onClick={() => { setEditId(null); setForm({ title: "", description: "", url: "", logoUrl: "", sortOrder: 0 }) }}>Cancel</Button>}
        </div>
      </div>
      <div className="space-y-2 max-w-xl">
        {projects.map(p => (
          <div key={p.id} className="border-2 border-pixel-black dark:border-pixel-white p-3 flex items-center justify-between">
            <div>
              <span className="font-body text-sm">{p.title}</span>
              {p.description && <span className="font-body text-xs text-pixel-gray-500 ml-2">{p.description}</span>}
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => startEdit(p)}>Edit</Button>
              <Button size="sm" variant="ghost" onClick={() => del(p.id)}><Trash2 className="w-3 h-3 text-red-500" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
