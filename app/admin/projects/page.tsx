"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Pencil, Trash2, Plus, X, Check } from "lucide-react"
import { useLocale } from "@/components/locale-provider"

export default function ProjectsAdminPage() {
  const { t } = useLocale()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ title: "", description: "", url: "", logoUrl: "", sortOrder: 0 })

  useEffect(() => { fetch("/api/projects").then(r => r.json()).then(d => { setProjects(d); setLoading(false) }) }, [])

  function resetForm() { setForm({ title: "", description: "", url: "", logoUrl: "", sortOrder: 0 }); setEditId(null); setShowNew(false) }

  function startEdit(p: any) {
    setEditId(p.id); setShowNew(false)
    setForm({ title: p.title, description: p.description || "", url: p.url || "", logoUrl: p.logoUrl || "", sortOrder: p.sortOrder })
  }

  async function save() {
    if (!form.title) return
    if (editId) {
      const res = await fetch("/api/projects", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editId, ...form }) })
      const updated = await res.json()
      setProjects(p => p.map(x => x.id === editId ? updated : x))
    } else {
      const res = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      const newP = await res.json()
      setProjects(p => [...p, newP])
    }
    resetForm()
  }

  async function del(id: string) {
    if (!confirm("Delete?")) return
    await fetch("/api/projects", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
    setProjects(p => p.filter(x => x.id !== id))
  }

  if (loading) return <div className="flex items-center justify-center h-64 font-mono text-xs">{t.loading}</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-mono text-sm uppercase tracking-widest">// {t.projectsMgmt}</h1>
      </div>

      {(showNew || editId) && (
        <div className="border-2 border-pixel-black dark:border-pixel-white p-4 mb-6 space-y-3 max-w-2xl">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="font-mono text-xs block mb-1">{t.title}</label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><label className="font-mono text-xs block mb-1">URL</label><Input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} /></div>
            <div><label className="font-mono text-xs block mb-1">Logo URL</label><Input value={form.logoUrl} onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))} /></div>
            <div><label className="font-mono text-xs block mb-1">Order</label><Input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} /></div>
          </div>
          <div><label className="font-mono text-xs block mb-1">{t.description}</label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
          <div className="flex gap-2">
            <Button size="sm" onClick={save}><Check className="w-3 h-3 mr-1" />{editId ? t.save : t.add}</Button>
            <Button size="sm" variant="ghost" onClick={resetForm}><X className="w-3 h-3 mr-1" />{t.cancel}</Button>
          </div>
        </div>
      )}

      <div className="max-w-2xl">
        <div className="border-b-2 border-pixel-black dark:border-pixel-white mb-0 flex justify-end pb-2">
          {!showNew && !editId && (
            <button onClick={() => setShowNew(true)} className="font-mono text-sm hover:opacity-70" title={t.add}>＋</button>
          )}
        </div>
        {projects.map(p => (
          <div key={p.id} className="border-b border-pixel-gray-200 dark:border-pixel-gray-800 py-3 flex items-center gap-4">
            <span className="font-mono text-xs text-pixel-gray-400 w-8 shrink-0">{p.id.slice(-4)}</span>
            {p.logoUrl ? (
              <img src={p.logoUrl} alt="" className="w-8 h-8 rounded-full border-2 border-pixel-gray-300 dark:border-pixel-gray-700 shrink-0 object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full border-2 border-pixel-gray-300 dark:border-pixel-gray-700 shrink-0 bg-pixel-gray-100 dark:bg-pixel-gray-800" />
            )}
            <span className="font-body text-sm flex-1 min-w-0 truncate">{p.title}</span>
            <span className="font-body text-xs text-pixel-gray-500 hidden sm:block max-w-[200px] truncate">{p.description}</span>
            <a href={p.url} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-pixel-gray-400 hover:underline hidden md:block max-w-[150px] truncate">{p.url}</a>
            <span className="font-mono text-xs text-pixel-gray-400 w-8 text-center shrink-0">{p.sortOrder}</span>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => startEdit(p)} className="hover:opacity-70"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => del(p.id)} className="hover:opacity-70"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
            </div>
          </div>
        ))}
        {projects.length === 0 && <p className="font-body text-sm text-pixel-gray-500 py-4">{t.noProjectsYet}</p>}
      </div>
    </div>
  )
}
