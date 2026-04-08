"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Plus } from "lucide-react"

export default function SettingsPage() {
  const [configs, setConfigs] = useState<any[]>([])
  const [tab, setTab] = useState<"webhook" | "email">("webhook")

  useEffect(() => { fetch("/api/notify").then(r => r.json()).then(setConfigs) }, [])

  const [wf, setWf] = useState({ url: "", method: "POST", headers: "{}", body: '{"text":"{{event}}: {{title}} - {{url}} ({{views}} views)"}' })
  const [ef, setEf] = useState({ to: "", template: "<h2>{{event}}</h2><p>Post: {{title}}</p><p>URL: {{url}}</p><p>Views: {{views}}</p>" })

  async function addWebhook() {
    if (!wf.url) return
    let headers = {}; try { headers = JSON.parse(wf.headers) } catch {}
    let body = {}; try { body = JSON.parse(wf.body) } catch { body = { text: wf.body } }
    const res = await fetch("/api/notify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "webhook", config: { url: wf.url, method: wf.method, headers, body } }),
    })
    const newConfig = await res.json()
      setConfigs(c => [...c, newConfig])
    setWf({ url: "", method: "POST", headers: "{}", body: '{"text":"{{event}}: {{title}} - {{url}} ({{views}} views)"}' })
  }

  async function addEmail() {
    if (!ef.to) return
    const res = await fetch("/api/notify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "email", config: { to: ef.to, template: ef.template } }),
    })
    const newConfig = await res.json()
      setConfigs(c => [...c, newConfig])
    setEf({ to: "", template: ef.template })
  }

  async function toggle(id: string, enabled: boolean) {
    await fetch("/api/notify", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, enabled: !enabled }) })
    setConfigs(c => c.map(x => x.id === id ? { ...x, enabled: !enabled } : x))
  }

  async function del(id: string) {
    await fetch("/api/notify", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
    setConfigs(c => c.filter(x => x.id !== id))
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-mono text-sm uppercase tracking-widest mb-6">// Notification Settings</h1>
      <p className="font-body text-xs text-pixel-gray-500 mb-4">
        Available template variables: {"{{title}}"}, {"{{url}}"}, {"{{views}}"}, {"{{event}}"}. Events: view (every 100), share, comment.
      </p>

      <div className="flex gap-2 mb-6">
        <Button size="sm" variant={tab === "webhook" ? "default" : "outline"} onClick={() => setTab("webhook")}>Webhook</Button>
        <Button size="sm" variant={tab === "email" ? "default" : "outline"} onClick={() => setTab("email")}>Email</Button>
      </div>

      {tab === "webhook" && (
        <div className="border-2 border-pixel-black dark:border-pixel-white p-4 mb-6 space-y-3">
          <h2 className="font-mono text-xs uppercase">New Webhook</h2>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="font-mono text-xs block mb-1">URL</label><Input value={wf.url} onChange={e => setWf(f => ({ ...f, url: e.target.value }))} placeholder="https://..." /></div>
            <div><label className="font-mono text-xs block mb-1">Method</label>
              <select value={wf.method} onChange={e => setWf(f => ({ ...f, method: e.target.value }))}
                className="h-10 w-full border-2 border-pixel-black dark:border-pixel-white bg-transparent px-3 font-body text-sm">
                <option value="POST">POST</option><option value="GET">GET</option>
              </select>
            </div>
          </div>
          <div><label className="font-mono text-xs block mb-1">Headers (JSON)</label><Input value={wf.headers} onChange={e => setWf(f => ({ ...f, headers: e.target.value }))} /></div>
          <div><label className="font-mono text-xs block mb-1">Body (JSON)</label><Textarea value={wf.body} onChange={e => setWf(f => ({ ...f, body: e.target.value }))} rows={3} /></div>
          <Button size="sm" onClick={addWebhook}><Plus className="w-3 h-3 mr-1" />Add Webhook</Button>
        </div>
      )}

      {tab === "email" && (
        <div className="border-2 border-pixel-black dark:border-pixel-white p-4 mb-6 space-y-3">
          <h2 className="font-mono text-xs uppercase">New Email Notification</h2>
          <p className="font-body text-xs text-pixel-gray-400">SMTP configured via env vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM</p>
          <div><label className="font-mono text-xs block mb-1">Recipient Email</label><Input value={ef.to} onChange={e => setEf(f => ({ ...f, to: e.target.value }))} /></div>
          <div><label className="font-mono text-xs block mb-1">HTML Template</label><Textarea value={ef.template} onChange={e => setEf(f => ({ ...f, template: e.target.value }))} rows={5} /></div>
          <Button size="sm" onClick={addEmail}><Plus className="w-3 h-3 mr-1" />Add Email</Button>
        </div>
      )}

      <h2 className="font-mono text-xs uppercase tracking-wider mb-3">Active Configurations</h2>
      <div className="space-y-2">
        {configs.map(c => {
          let cfg: any = {}; try { cfg = JSON.parse(c.config) } catch {}
          return (
            <div key={c.id} className="border-2 border-pixel-gray-200 dark:border-pixel-gray-800 p-3 flex items-center justify-between">
              <div>
                <span className="font-mono text-xs uppercase">{c.type}</span>
                <span className="font-body text-xs text-pixel-gray-500 ml-2">{c.type === "webhook" ? cfg.url : cfg.to}</span>
                {!c.enabled && <span className="font-mono text-xs text-red-500 ml-2">(disabled)</span>}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => toggle(c.id, c.enabled)}>{c.enabled ? "Disable" : "Enable"}</Button>
                <Button size="sm" variant="ghost" onClick={() => del(c.id)}><Trash2 className="w-3 h-3 text-red-500" /></Button>
              </div>
            </div>
          )
        })}
        {configs.length === 0 && <p className="font-body text-xs text-pixel-gray-500">No notification configs.</p>}
      </div>
    </div>
  )
}
