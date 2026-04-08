"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Plus } from "lucide-react"
import { useLocale } from "@/components/locale-provider"

export default function SettingsPage() {
  const { t } = useLocale()
  const [configs, setConfigs] = useState<any[]>([])
  const [tab, setTab] = useState<"site" | "webhook" | "email">("site")
  const [loading, setLoading] = useState(true)

  const [blogTitle, setBlogTitle] = useState("BENDY BLOG")
  const [footerText, setFooterText] = useState("Built with nextjs & By @SunChengXin")
  const [dufsEnabled, setDufsEnabled] = useState(false)
  const [dufsUrl, setDufsUrl] = useState("")
  const [dufsUser, setDufsUser] = useState("")
  const [dufsPass, setDufsPass] = useState("")
  const [githubImageRepo, setGithubImageRepo] = useState("")
  const [githubImageToken, setGithubImageToken] = useState("")
  const [savingSite, setSavingSite] = useState(false)

  const [wf, setWf] = useState({ url: "", method: "POST", headers: "{}", body: '{"text":"{{event}}: {{title}} - {{url}} ({{views}} views)"}' })
  const [ef, setEf] = useState({ to: "", template: "<h2>{{event}}</h2><p>Post: {{title}}</p><p>URL: {{url}}</p><p>Views: {{views}}</p>" })

  useEffect(() => {
    Promise.all([
      fetch("/api/config").then(r => r.json()),
      fetch("/api/notify").then(r => r.json()),
    ]).then(([cfg, notifs]) => {
      if (cfg.blogTitle) setBlogTitle(cfg.blogTitle)
      if (cfg.footerText) setFooterText(cfg.footerText)
      setDufsEnabled(cfg.dufsEnabled === "true")
      if (cfg.dufsUrl) setDufsUrl(cfg.dufsUrl)
      if (cfg.dufsUser) setDufsUser(cfg.dufsUser)
      if (cfg.dufsPass) setDufsPass(cfg.dufsPass)
      if (cfg.githubImageRepo) setGithubImageRepo(cfg.githubImageRepo)
      if (cfg.githubImageToken) setGithubImageToken(cfg.githubImageToken)
      setConfigs(notifs)
      setLoading(false)
    })
  }, [])

  async function saveSite() {
    setSavingSite(true)
    await fetch("/api/config", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blogTitle, footerText,
        dufsEnabled: dufsEnabled ? "true" : "false", dufsUrl, dufsUser, dufsPass,
        githubImageRepo, githubImageToken,
      }),
    })
    setSavingSite(false)
  }

  async function addWebhook() {
    if (!wf.url) return
    let headers = {}; try { headers = JSON.parse(wf.headers) } catch {}
    let body = {}; try { body = JSON.parse(wf.body) } catch { body = { text: wf.body } }
    const res = await fetch("/api/notify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "webhook", config: { url: wf.url, method: wf.method, headers, body } }),
    })
    const nc = await res.json()
    setConfigs(c => [...c, nc])
    setWf({ url: "", method: "POST", headers: "{}", body: '{"text":"{{event}}: {{title}} - {{url}} ({{views}} views)"}' })
  }

  async function addEmail() {
    if (!ef.to) return
    const res = await fetch("/api/notify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "email", config: { to: ef.to, template: ef.template } }),
    })
    const nc = await res.json()
    setConfigs(c => [...c, nc])
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

  if (loading) return <div className="flex items-center justify-center h-64 font-mono text-xs">{t.loading}</div>

  return (
    <div>
      <h1 className="font-mono text-sm uppercase tracking-widest mb-6">// {t.settings}</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        <Button size="sm" variant={tab === "site" ? "default" : "outline"} onClick={() => setTab("site")}>{t.siteSettingsTab}</Button>
        <Button size="sm" variant={tab === "webhook" ? "default" : "outline"} onClick={() => setTab("webhook")}>{t.webhookTab}</Button>
        <Button size="sm" variant={tab === "email" ? "default" : "outline"} onClick={() => setTab("email")}>{t.emailTab}</Button>
      </div>

      {tab === "site" && (
        <div className="space-y-6 max-w-2xl">
          <div className="border-2 border-pixel-black dark:border-pixel-white p-4 space-y-4">
            <h2 className="font-mono text-xs uppercase">{t.siteSettingsTab}</h2>
            <div><label className="font-mono text-xs block mb-1">{t.blogTitle}</label><Input value={blogTitle} onChange={e => setBlogTitle(e.target.value)} /></div>
            <div><label className="font-mono text-xs block mb-1">{t.footerText}</label><Input value={footerText} onChange={e => setFooterText(e.target.value)} /></div>
          </div>

          <div className="border-2 border-pixel-black dark:border-pixel-white p-4 space-y-4">
            <h2 className="font-mono text-xs uppercase">{t.imageStorage}</h2>

            <div className="border-b border-pixel-gray-200 dark:border-pixel-gray-800 pb-4">
              <h3 className="font-mono text-xs mb-3">{t.dufsService}</h3>
              <label className="flex items-center gap-2 font-mono text-xs mb-3">
                <input type="checkbox" checked={dufsEnabled} onChange={e => setDufsEnabled(e.target.checked)} className="accent-pixel-black" />
                {t.enable} Dufs
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div><label className="font-mono text-[10px] block mb-1">URL</label><Input value={dufsUrl} onChange={e => setDufsUrl(e.target.value)} placeholder="https://dufs.example.com" disabled={!dufsEnabled} /></div>
                <div><label className="font-mono text-[10px] block mb-1">User</label><Input value={dufsUser} onChange={e => setDufsUser(e.target.value)} disabled={!dufsEnabled} /></div>
                <div><label className="font-mono text-[10px] block mb-1">Pass</label><Input type="password" value={dufsPass} onChange={e => setDufsPass(e.target.value)} disabled={!dufsEnabled} /></div>
              </div>
            </div>

            <div>
              <h3 className="font-mono text-xs mb-3">{t.githubImageRepo}</h3>
              <p className="font-body text-[10px] text-pixel-gray-400 mb-2">Fallback when Dufs is off. Format: owner/repo</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="font-mono text-[10px] block mb-1">Repo</label><Input value={githubImageRepo} onChange={e => setGithubImageRepo(e.target.value)} placeholder="user/blog-images" /></div>
                <div><label className="font-mono text-[10px] block mb-1">Token</label><Input type="password" value={githubImageToken} onChange={e => setGithubImageToken(e.target.value)} /></div>
              </div>
            </div>
          </div>

          <Button onClick={saveSite} disabled={savingSite}>{savingSite ? t.saving : t.save}</Button>
        </div>
      )}

      {tab === "webhook" && (
        <div className="max-w-2xl">
          <div className="border-2 border-pixel-black dark:border-pixel-white p-4 mb-6 space-y-3">
            <h2 className="font-mono text-xs uppercase">{t.webhookTab}</h2>
            <p className="font-body text-xs text-pixel-gray-400">{t.templateVars}: {"{{title}}"}, {"{{url}}"}, {"{{views}}"}, {"{{event}}"}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <Button size="sm" onClick={addWebhook}><Plus className="w-3 h-3 mr-1" />{t.add}</Button>
          </div>
          <h2 className="font-mono text-xs uppercase tracking-wider mb-3">{t.activeConfigs}</h2>
          <ConfigList configs={configs.filter(c => c.type === "webhook")} toggle={toggle} del={del} t={t} />
        </div>
      )}

      {tab === "email" && (
        <div className="max-w-2xl">
          <div className="border-2 border-pixel-black dark:border-pixel-white p-4 mb-6 space-y-3">
            <h2 className="font-mono text-xs uppercase">{t.emailTab}</h2>
            <p className="font-body text-xs text-pixel-gray-400">SMTP: env vars SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM</p>
            <div><label className="font-mono text-xs block mb-1">Recipient</label><Input value={ef.to} onChange={e => setEf(f => ({ ...f, to: e.target.value }))} /></div>
            <div><label className="font-mono text-xs block mb-1">HTML Template</label><Textarea value={ef.template} onChange={e => setEf(f => ({ ...f, template: e.target.value }))} rows={5} /></div>
            <Button size="sm" onClick={addEmail}><Plus className="w-3 h-3 mr-1" />{t.add}</Button>
          </div>
          <h2 className="font-mono text-xs uppercase tracking-wider mb-3">{t.activeConfigs}</h2>
          <ConfigList configs={configs.filter(c => c.type === "email")} toggle={toggle} del={del} t={t} />
        </div>
      )}
    </div>
  )
}

function ConfigList({ configs, toggle, del, t }: { configs: any[]; toggle: (id: string, e: boolean) => void; del: (id: string) => void; t: any }) {
  return (
    <div className="space-y-2">
      {configs.map((c: any) => {
        let cfg: any = {}; try { cfg = JSON.parse(c.config) } catch {}
        return (
          <div key={c.id} className="border-2 border-pixel-gray-200 dark:border-pixel-gray-800 p-3 flex items-center justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <span className="font-mono text-xs uppercase">{c.type}</span>
              <span className="font-body text-xs text-pixel-gray-500 ml-2 truncate">{c.type === "webhook" ? cfg.url : cfg.to}</span>
              {!c.enabled && <span className="font-mono text-xs text-red-500 ml-2">({t.disable}d)</span>}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button size="sm" variant="ghost" onClick={() => toggle(c.id, c.enabled)}>{c.enabled ? t.disable : t.enable}</Button>
              <Button size="sm" variant="ghost" onClick={() => del(c.id)}><Trash2 className="w-3 h-3 text-red-500" /></Button>
            </div>
          </div>
        )
      })}
      {configs.length === 0 && <p className="font-body text-xs text-pixel-gray-500">—</p>}
    </div>
  )
}
