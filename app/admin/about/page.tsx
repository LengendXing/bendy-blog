"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useLocale } from "@/components/locale-provider"
import { locales, localeNames, Locale } from "@/lib/i18n"
import { AdminLoading } from "@/components/admin-loading"
import { useAdminToast } from "@/components/admin/admin-toast"
import { apiFetch, apiJson, getApiErrorMessage, isAbortError } from "@/lib/api-client"

export default function AboutAdminPage() {
  const { t } = useLocale()
  const toast = useAdminToast()
  const [activeLocale, setActiveLocale] = useState<Locale>("zh")
  const [data, setData] = useState({ name: "", bio: "", avatar: "", markdown: "", links: {} as Record<string, string> })
  const [linkKey, setLinkKey] = useState("")
  const [linkVal, setLinkVal] = useState("")
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setLoadError(false)
    apiJson<any>(`/api/about?locale=${activeLocale}`, { signal: controller.signal })
      .then(d => setData(d.name ? d : { name: "", bio: "", avatar: "", markdown: "", links: {} }))
      .catch(error => {
        if (isAbortError(error)) return
        setData({ name: "", bio: "", avatar: "", markdown: "", links: {} })
        setLoadError(true)
        toast.error(getApiErrorMessage(error, t))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [activeLocale, t, toast])

  async function save() {
    setSaving(true)
    try {
      await apiFetch("/api/about", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: activeLocale, ...data }),
      })
      toast.success(t.savedSuccessfully)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t))
    } finally {
      setSaving(false)
    }
  }

  function addLink() {
    if (!linkKey) return
    setData(d => ({ ...d, links: { ...d.links, [linkKey]: linkVal } }))
    setLinkKey(""); setLinkVal("")
  }

  function removeLink(key: string) {
    setData(d => { const l = { ...d.links }; delete l[key]; return { ...d, links: l } })
  }

  return (
    <div className="relative max-w-2xl overflow-hidden" aria-busy={saving}>
      {saving && <AdminLoading size="md" className="absolute inset-0 z-20 min-h-full bg-pixel-white/95 p-2 dark:bg-pixel-black/95" />}
      <h1 className="font-mono text-sm uppercase tracking-widest mb-6">// {t.aboutPage}</h1>

      <div className="flex gap-1 mb-6 flex-wrap">
        {locales.map(l => (
          <button key={l} onClick={() => setActiveLocale(l)}
            className={`font-mono text-xs px-3 py-1.5 border-2 transition-colors ${activeLocale === l
              ? "border-pixel-black dark:border-pixel-white bg-pixel-black dark:bg-pixel-white text-pixel-white dark:text-pixel-black"
              : "border-pixel-gray-300 dark:border-pixel-gray-700 hover:border-pixel-black dark:hover:border-pixel-white"}`}>
            {localeNames[l]}
          </button>
        ))}
      </div>

      {loading ? (
        <AdminLoading size="md" className="min-h-32" />
      ) : loadError ? (
        <div className="flex min-h-32 items-center justify-center font-body text-xs text-red-500" role="alert">{t.loadFailed}</div>
      ) : (
        <div className="space-y-4">
          <div><label className="font-mono text-xs block mb-1">{t.title} ({localeNames[activeLocale]})</label><Input value={data.name} onChange={e => setData(d => ({ ...d, name: e.target.value }))} /></div>
          <div><label className="font-mono text-xs block mb-1">Avatar URL</label><Input value={data.avatar} onChange={e => setData(d => ({ ...d, avatar: e.target.value }))} /></div>
          <div><label className="font-mono text-xs block mb-1">Bio</label><Textarea value={data.bio} onChange={e => setData(d => ({ ...d, bio: e.target.value }))} rows={3} /></div>
          <div><label className="font-mono text-xs block mb-1">Markdown</label><Textarea value={data.markdown} onChange={e => setData(d => ({ ...d, markdown: e.target.value }))} rows={8} /></div>
          <div>
            <label className="font-mono text-xs block mb-1">Links</label>
            {Object.entries(data.links).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs">{k}:</span><span className="font-body text-xs truncate">{v}</span>
                <Button size="sm" variant="ghost" onClick={() => removeLink(k)} className="text-red-500 h-6">×</Button>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <Input value={linkKey} onChange={e => setLinkKey(e.target.value)} placeholder="Label" className="max-w-[120px]" />
              <Input value={linkVal} onChange={e => setLinkVal(e.target.value)} placeholder="URL" />
              <Button size="sm" variant="outline" onClick={addLink}>{t.add}</Button>
            </div>
          </div>
          <Button onClick={save} disabled={saving}>{t.save}</Button>
        </div>
      )}
    </div>
  )
}
