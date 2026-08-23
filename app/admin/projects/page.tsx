"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Pencil, Trash2, X, Check, ExternalLink } from "lucide-react"
import { useLocale } from "@/components/locale-provider"
import { AdminLoading } from "@/components/admin-loading"

export default function ProjectsAdminPage() {
  const { t } = useLocale()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [actionError, setActionError] = useState("")
  const [editId, setEditId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [action, setAction] = useState<"save" | "delete" | "">("")
  const [form, setForm] = useState({ title: "", description: "", url: "", logoUrl: "", sortOrder: 0 })

  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/projects", { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("projects load failed")
        const data = await response.json()
        if (!controller.signal.aborted) setProjects(Array.isArray(data) ? data : [])
      })
      .catch(error => {
        if ((error as Error).name !== "AbortError") {
          setProjects([])
          setLoadError(true)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

  function resetForm() { setForm({ title: "", description: "", url: "", logoUrl: "", sortOrder: 0 }); setEditId(null); setShowNew(false) }
  function startEdit(p: any) { setEditId(p.id); setShowNew(false); setForm({ title: p.title, description: p.description || "", url: p.url || "", logoUrl: p.logoUrl || "", sortOrder: p.sortOrder }) }

  async function save() {
    if (!form.title) return
    if (action) return
    setAction("save")
    setActionError("")
    try {
      if (editId) {
        const res = await fetch("/api/projects", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editId, ...form }) })
        if (!res.ok) throw new Error("save failed")
        const updated = await res.json()
        setProjects(p => p.map(x => x.id === editId ? updated : x))
      } else {
        const res = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
        if (!res.ok) throw new Error("save failed")
        const newP = await res.json()
        setProjects(p => [...p, newP])
      }
      resetForm()
    } catch {
      setActionError("Unable to save project")
    } finally {
      setAction("")
    }
  }

  async function del(id: string) {
    if (!confirm("Delete?")) return
    if (action) return
    setAction("delete")
    setActionError("")
    try {
      const res = await fetch("/api/projects", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
      if (!res.ok) throw new Error("delete failed")
      setProjects(p => p.filter(x => x.id !== id))
    } catch {
      setActionError("Unable to delete project")
    } finally {
      setAction("")
    }
  }

  if (loading) return <AdminLoading className="min-h-64" />
  if (loadError) return <div className="flex min-h-64 items-center justify-center font-body text-xs text-red-500" role="alert">Unable to load projects</div>

  return (
    <div className="relative min-h-[360px] overflow-hidden" aria-busy={Boolean(action)}>
      {action && <AdminLoading size="sm" className="absolute inset-0 z-20 min-h-full bg-pixel-white/95 p-2 dark:bg-pixel-black/95" />}
      <h1 className="font-mono text-sm uppercase tracking-widest mb-6">// {t.projectsMgmt}</h1>
      {actionError && <p className="mb-4 font-body text-xs text-red-500" role="alert">{actionError}</p>}

      {(showNew || editId) && (
        <div className="border-2 border-pixel-black dark:border-pixel-white p-4 mb-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

      <div>
        <div className="border-b-2 border-pixel-black dark:border-pixel-white mb-0 flex justify-end pb-2">
          {!showNew && !editId && (
            <button onClick={() => setShowNew(true)} className="font-mono text-sm hover:opacity-70" title={t.add}>＋</button>
          )}
        </div>
        {projects.map((p, index) => (
          <div key={p.id} className="border-b border-pixel-gray-200 dark:border-pixel-gray-800 py-3 flex items-center gap-6 sm:gap-8">
            <span className="font-mono text-xs text-pixel-gray-400 w-8 shrink-0 hidden sm:block">{index + 1}</span>
            {p.logoUrl ? (
              <img src={p.logoUrl} alt="" className="w-8 h-8 rounded-full border-2 border-pixel-gray-300 dark:border-pixel-gray-700 shrink-0 object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full border-2 border-pixel-gray-300 dark:border-pixel-gray-700 shrink-0 bg-pixel-gray-100 dark:bg-pixel-gray-800" />
            )}
            <span className="font-body text-sm min-w-0 truncate flex-shrink-0 max-w-[150px] sm:max-w-[250px]">{p.title}</span>
            <span className="font-body text-xs text-pixel-gray-500 hidden md:block flex-1 min-w-0 truncate">{p.description}</span>
            <button onClick={() => window.open(p.url, '_blank')} title={p.url} className="font-mono text-xs text-pixel-gray-400 hover:opacity-70 hidden lg:flex items-center justify-center w-8 h-8 shrink-0"><ExternalLink className="w-3.5 h-3.5" /></button>
            <span className="font-mono text-xs text-pixel-gray-400 w-8 text-center shrink-0">{p.sortOrder}</span>
            <div className="flex gap-1 shrink-0 ml-auto">
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
