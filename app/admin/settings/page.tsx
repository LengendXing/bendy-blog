"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { PixelLoader } from "@/components/pixel-loader"
import { Trash2, Plus, Eye, EyeOff, ExternalLink, Github, Pencil, Search, UserPlus, X } from "lucide-react"
import { useLocale } from "@/components/locale-provider"

interface AdminUser {
  username: string
  githubId: string | null
  avatarUrl: string
  profileUrl: string
}

interface GithubSearchUser {
  login: string
  id: number
  avatar_url: string
  html_url: string
  type: string
}

function SecretInput({ value, onChange, placeholder, disabled }: {
  value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="flex h-10 w-full border-2 border-pixel-black dark:border-pixel-white bg-transparent px-3 py-2 pr-9 text-sm font-body placeholder:text-pixel-gray-400 focus:outline-none focus:ring-2 focus:ring-pixel-gray-400 disabled:opacity-50"
      />
      <button type="button" onClick={() => setShow(!show)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-pixel-gray-400 hover:text-pixel-black dark:hover:text-pixel-white">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const { t } = useLocale()
  const { data: session } = useSession()
  const [configs, setConfigs] = useState<any[]>([])
  const [tab, setTab] = useState<"site" | "webhook" | "email" | "admins">("site")
  const [loading, setLoading] = useState(true)

  const [blogTitle, setBlogTitle] = useState("Bendy Blog")
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

  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [adminsLoading, setAdminsLoading] = useState(true)
  const [adminAction, setAdminAction] = useState("")
  const [adminNotice, setAdminNotice] = useState("")
  const [adminError, setAdminError] = useState("")
  const [replaceAdmin, setReplaceAdmin] = useState<AdminUser | null>(null)
  const [githubQuery, setGithubQuery] = useState("")
  const [githubResults, setGithubResults] = useState<GithubSearchUser[]>([])
  const [githubSearching, setGithubSearching] = useState(false)
  const [githubSearchError, setGithubSearchError] = useState<"" | "failed" | "limited">("")
  const githubSearchAbort = useRef<AbortController | null>(null)
  const githubSearchRequestId = useRef(0)
  const githubSearchCache = useRef(new Map<string, GithubSearchUser[]>())

  const loadAdmins = useCallback(async (options?: { preserveError?: boolean }) => {
    setAdminsLoading(true)
    if (!options?.preserveError) setAdminError("")
    try {
      const res = await fetch("/api/admins", { cache: "no-store" })
      if (!res.ok) throw new Error("load failed")
      const data = await res.json()
      setAdmins(Array.isArray(data.admins) ? data.admins : [])
    } catch {
      setAdminError(t.adminUpdateFailed)
    } finally {
      setAdminsLoading(false)
    }
  }, [t.adminUpdateFailed])

  const runGithubSearch = useCallback(async (rawQuery: string, requestId: number) => {
    const query = rawQuery.trim()
    if (query.length < 2 || requestId !== githubSearchRequestId.current) return

    const cacheKey = query.toLowerCase()
    const cached = githubSearchCache.current.get(cacheKey)
    if (cached) {
      if (requestId !== githubSearchRequestId.current) return
      setGithubResults(cached)
      setGithubSearchError("")
      setGithubSearching(false)
      return
    }

    const controller = new AbortController()
    githubSearchAbort.current = controller

    const params = new URLSearchParams({
      q: `${query} in:login type:user`,
      per_page: "8",
    })

    try {
      // This intentionally calls GitHub anonymously from the browser: no token or app credential is attached.
      const res = await fetch(`https://api.github.com/search/users?${params.toString()}`, {
        signal: controller.signal,
        cache: "no-store",
      })
      if (requestId !== githubSearchRequestId.current) return
      if (res.status === 403 || res.status === 429) {
        setGithubResults([])
        setGithubSearchError("limited")
        return
      }
      if (!res.ok) throw new Error("search failed")

      const data = await res.json()
      const users = Array.isArray(data.items)
        ? data.items
          .filter((item: any) => item?.type === "User" && typeof item.login === "string")
          .map((item: any) => ({
            login: item.login,
            id: Number(item.id),
            avatar_url: String(item.avatar_url || ""),
            html_url: String(item.html_url || ""),
            type: "User",
          }))
        : []
      githubSearchCache.current.set(cacheKey, users)
      if (requestId !== githubSearchRequestId.current) return
      setGithubResults(users)
    } catch (error) {
      if ((error as Error).name !== "AbortError" && requestId === githubSearchRequestId.current) {
        setGithubResults([])
        setGithubSearchError("failed")
      }
    } finally {
      if (requestId === githubSearchRequestId.current) setGithubSearching(false)
    }
  }, [])

  const searchGithubNow = useCallback((rawQuery: string) => {
    githubSearchAbort.current?.abort()
    const requestId = ++githubSearchRequestId.current
    const query = rawQuery.trim()
    setGithubResults([])
    setGithubSearchError("")
    if (query.length < 2) {
      setGithubSearching(false)
      return
    }
    setGithubSearching(true)
    void runGithubSearch(query, requestId)
  }, [runGithubSearch])

  const updateGithubQuery = useCallback((value: string) => {
    const nextQuery = value.replace(/[^a-z\d-]/gi, "").slice(0, 39)
    if (nextQuery === githubQuery) return
    githubSearchAbort.current?.abort()
    ++githubSearchRequestId.current
    setGithubResults([])
    setGithubSearchError("")
    setGithubSearching(nextQuery.trim().length >= 2)
    setGithubQuery(nextQuery)
  }, [githubQuery])

  useEffect(() => {
    Promise.all([
      fetch("/api/config").then(r => r.json()),
      fetch("/api/notify").then(r => r.json()),
    ]).then(([cfg, notifs]) => {
      const configuredTitle = cfg.blogTitle?.trim()
      if (configuredTitle && !["BENDY BLOG", "笨迪博客 BENDYBLOG", "笨迪博客 BENDYBLOG | 码农修炼笔记"].includes(configuredTitle.toUpperCase())) setBlogTitle(configuredTitle)
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
    loadAdmins()
  }, [])

  useEffect(() => {
    githubSearchAbort.current?.abort()
    const requestId = ++githubSearchRequestId.current
    const query = githubQuery.trim()
    setGithubResults([])
    setGithubSearchError("")

    if (tab !== "admins" || query.length < 2) {
      setGithubSearching(false)
      return
    }

    setGithubSearching(true)
    const timeout = window.setTimeout(() => runGithubSearch(query, requestId), 650)
    return () => window.clearTimeout(timeout)
  }, [githubQuery, runGithubSearch, tab])

  useEffect(() => () => {
    githubSearchAbort.current?.abort()
    ++githubSearchRequestId.current
  }, [])

  async function saveSite() {
    setSavingSite(true)
    await fetch("/api/config", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blogTitle, footerText, dufsEnabled: dufsEnabled ? "true" : "false", dufsUrl, dufsUser, dufsPass, githubImageRepo, githubImageToken }),
    })
    setSavingSite(false)
  }

  async function addWebhook() {
    if (!wf.url) return
    let headers = {}; try { headers = JSON.parse(wf.headers) } catch {}
    let body = {}; try { body = JSON.parse(wf.body) } catch { body = { text: wf.body } }
    const res = await fetch("/api/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "webhook", config: { url: wf.url, method: wf.method, headers, body } }) })
    const nc = await res.json(); setConfigs(c => [...c, nc])
    setWf({ url: "", method: "POST", headers: "{}", body: '{"text":"{{event}}: {{title}} - {{url}} ({{views}} views)"}' })
  }

  async function addEmail() {
    if (!ef.to) return
    const res = await fetch("/api/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "email", config: { to: ef.to, template: ef.template } }) })
    const nc = await res.json(); setConfigs(c => [...c, nc])
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

  function adminErrorMessage(code: string) {
    if (code === "last_admin_required") return t.lastAdminCannotBeRemoved
    if (code === "sole_admin_replace_forbidden") return t.soleAdminCannotBeReplaced
    if (code === "admin_config_conflict") return t.adminConfigConflict
    if (code === "already_exists") return t.alreadyAdmin
    if (code === "github_rate_limited") return t.githubRateLimited
    if (code === "github_user_not_found" || code === "invalid_username" || code === "invalid_admin_identity") return t.noGithubUsers
    return t.adminUpdateFailed
  }

  async function saveAdmin(username: string) {
    setAdminAction(username)
    setAdminError("")
    setAdminNotice("")
    try {
      const replacing = Boolean(replaceAdmin)
      const res = await fetch("/api/admins", {
        method: replacing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(replacing ? {
          currentUsername: replaceAdmin!.username,
          currentGithubId: replaceAdmin!.githubId,
          username,
        } : { username }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "update_failed")
      setAdmins(Array.isArray(data.admins) ? data.admins : [])
      setAdminNotice(replacing ? t.adminUpdated : t.adminAdded)
      setReplaceAdmin(null)
      setGithubQuery("")
      setGithubResults([])
      githubSearchCache.current.clear()
    } catch (error) {
      const code = (error as Error).message
      if (code === "admin_config_conflict") await loadAdmins({ preserveError: true })
      setAdminError(adminErrorMessage(code))
    } finally {
      setAdminAction("")
    }
  }

  async function removeAdmin(admin: AdminUser) {
    if (!window.confirm(t.removeAdminConfirm.replace("{{username}}", admin.username))) return
    setAdminAction(admin.githubId || admin.username)
    setAdminError("")
    setAdminNotice("")
    try {
      const res = await fetch("/api/admins", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: admin.username, githubId: admin.githubId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "update_failed")
      setAdmins(Array.isArray(data.admins) ? data.admins : [])
      setAdminNotice(t.adminRemoved)
      if (
        replaceAdmin?.githubId && replaceAdmin.githubId === admin.githubId
        || replaceAdmin?.username.toLowerCase() === admin.username.toLowerCase()
      ) setReplaceAdmin(null)
      githubSearchCache.current.clear()
    } catch (error) {
      const code = (error as Error).message
      if (code === "admin_config_conflict") await loadAdmins({ preserveError: true })
      setAdminError(adminErrorMessage(code))
    } finally {
      setAdminAction("")
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 font-mono text-xs">{t.loading}</div>

  return (
    <div>
      <h1 className="font-mono text-sm uppercase tracking-widest mb-6">// {t.settings}</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        <Button size="sm" variant={tab === "site" ? "default" : "outline"} onClick={() => setTab("site")}>{t.siteSettingsTab}</Button>
        <Button size="sm" variant={tab === "webhook" ? "default" : "outline"} onClick={() => setTab("webhook")}>{t.webhookTab}</Button>
        <Button size="sm" variant={tab === "email" ? "default" : "outline"} onClick={() => setTab("email")}>{t.emailTab}</Button>
        <Button size="sm" variant={tab === "admins" ? "default" : "outline"} onClick={() => setTab("admins")}>{t.adminSettingsTab}</Button>
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
                <div><label className="font-mono text-[10px] block mb-1">Pass</label><SecretInput value={dufsPass} onChange={setDufsPass} disabled={!dufsEnabled} /></div>
              </div>
            </div>

            <div>
              <h3 className="font-mono text-xs mb-3">{t.githubImageRepo}</h3>
              <p className="font-body text-[10px] text-pixel-gray-400 mb-2">Fallback when Dufs is off. Format: owner/repo</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="font-mono text-[10px] block mb-1">Repo</label><Input value={githubImageRepo} onChange={e => setGithubImageRepo(e.target.value)} placeholder="user/blog-images" /></div>
                <div><label className="font-mono text-[10px] block mb-1">Token</label><SecretInput value={githubImageToken} onChange={setGithubImageToken} /></div>
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
                <select value={wf.method} onChange={e => setWf(f => ({ ...f, method: e.target.value }))} className="h-10 w-full border-2 border-pixel-black dark:border-pixel-white bg-transparent px-3 font-body text-sm">
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

      {tab === "admins" && (
        <div className="relative max-w-2xl space-y-6" aria-busy={Boolean(adminAction)}>
          {adminAction && (
            <div className="absolute inset-0 z-20 flex min-h-[360px] items-center justify-center bg-pixel-white/90 px-4 backdrop-blur-[1px] dark:bg-pixel-black/90" role="status" aria-live="polite">
              <PixelLoader size="sm" />
            </div>
          )}
          <section className="border-2 border-pixel-black p-4 dark:border-pixel-white">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-mono text-xs uppercase">{t.githubUserSearch}</h2>
              {replaceAdmin && (
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-body text-xs text-pixel-gray-500">{t.replaceAdmin}: @{replaceAdmin.username}</span>
                  <button
                    type="button"
                    onClick={() => setReplaceAdmin(null)}
                    className="shrink-0 p-1 hover:bg-pixel-gray-100 dark:hover:bg-pixel-gray-900"
                    aria-label={t.cancel}
                    title={t.cancel}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <form onSubmit={event => { event.preventDefault(); searchGithubNow(githubQuery) }} className="flex">
              <div className="relative min-w-0 flex-1">
                <Github className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pixel-gray-400" aria-hidden="true" />
                <Input
                  value={githubQuery}
                  onChange={event => updateGithubQuery(event.target.value)}
                  placeholder={t.githubUsernamePlaceholder}
                  className="pl-9"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={39}
                />
              </div>
              <button
                type="submit"
                disabled={githubQuery.trim().length < 2}
                className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-l-0 border-pixel-black bg-pixel-black text-pixel-white disabled:opacity-50 dark:border-pixel-white dark:bg-pixel-white dark:text-pixel-black"
                aria-label={t.githubUserSearch}
                title={t.githubUserSearch}
              >
                <Search className="h-4 w-4" />
              </button>
            </form>

            <div className="mt-3 min-h-5" aria-live="polite">
              {githubSearching && <p className="font-body text-xs text-pixel-gray-500">{t.loading}</p>}
              {!githubSearching && githubSearchError === "limited" && <p className="font-body text-xs text-red-500">{t.githubRateLimited}</p>}
              {!githubSearching && githubSearchError === "failed" && <p className="font-body text-xs text-red-500">{t.githubSearchFailed}</p>}
              {!githubSearching && !githubSearchError && githubQuery.trim().length >= 2 && githubResults.length === 0 && <p className="font-body text-xs text-pixel-gray-500">{t.noGithubUsers}</p>}
            </div>

            {githubResults.length > 0 && (
              <div className="mt-1 divide-y divide-pixel-gray-200 border-2 border-pixel-gray-200 dark:divide-pixel-gray-800 dark:border-pixel-gray-800">
                {githubResults.map(user => {
                  const userKey = user.login.toLowerCase()
                  const userGithubId = String(user.id)
                  const unchanged = Boolean(replaceAdmin) && (replaceAdmin!.githubId
                    ? replaceAdmin!.githubId === userGithubId
                    : replaceAdmin!.username.toLowerCase() === userKey)
                  const alreadyAdmin = admins.some(admin => {
                    const isReplaceTarget = Boolean(replaceAdmin) && (replaceAdmin!.githubId
                      ? admin.githubId === replaceAdmin!.githubId
                      : admin.githubId === null && admin.username.toLowerCase() === replaceAdmin!.username.toLowerCase())
                    return !isReplaceTarget && (
                      admin.githubId === userGithubId || admin.username.toLowerCase() === userKey
                    )
                  })
                  return (
                    <div key={user.id} className="flex items-center gap-3 p-2.5">
                      <img src={user.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full border border-pixel-gray-300 dark:border-pixel-gray-700" />
                      <a href={user.html_url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-center gap-1 font-body text-sm hover:underline">
                        <span className="truncate">@{user.login}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                      </a>
                      <Button size="sm" onClick={() => saveAdmin(user.login)} disabled={githubSearching || alreadyAdmin || unchanged || Boolean(adminAction)}>
                        <UserPlus className="mr-1 h-3.5 w-3.5" />
                        {alreadyAdmin || unchanged ? t.alreadyAdmin : replaceAdmin ? t.replaceAdmin : t.add}
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <section className="border-2 border-pixel-black p-4 dark:border-pixel-white">
            <h2 className="mb-4 font-mono text-xs uppercase">{t.currentAdmins}</h2>
            {adminsLoading ? (
              <p className="font-body text-xs text-pixel-gray-500">{t.loading}</p>
            ) : admins.length === 0 ? (
              <p className="font-body text-xs text-pixel-gray-500">{t.noAdmins}</p>
            ) : (
              <div className="space-y-2">
                {admins.map(admin => {
                  const currentGithubId = (session?.user as any)?.githubId
                  const currentGithubUsername = (session?.user as any)?.githubUsername
                  const isCurrentUser = admin.githubId && currentGithubId
                    ? admin.githubId === currentGithubId
                    : currentGithubUsername?.toLowerCase() === admin.username.toLowerCase()
                  return (
                    <div key={admin.githubId || admin.username.toLowerCase()} className="flex items-center gap-3 border-2 border-pixel-gray-200 p-3 dark:border-pixel-gray-800">
                      <img src={admin.avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full border border-pixel-gray-300 dark:border-pixel-gray-700" />
                      <a href={admin.profileUrl} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-center gap-1 font-body text-sm hover:underline">
                        <span className="truncate">@{admin.username}{isCurrentUser ? ` (${t.currentUser})` : ""}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                      </a>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            githubSearchAbort.current?.abort()
                            ++githubSearchRequestId.current
                            setReplaceAdmin(admin)
                            setGithubQuery("")
                            setGithubResults([])
                            setGithubSearchError("")
                            setGithubSearching(false)
                            setAdminNotice("")
                            setAdminError("")
                          }}
                          disabled={admins.length <= 1 || Boolean(adminAction)}
                          className="p-2 hover:bg-pixel-gray-100 disabled:opacity-50 dark:hover:bg-pixel-gray-900"
                          aria-label={`${t.edit} @${admin.username}`}
                          title={admins.length <= 1 ? t.soleAdminCannotBeReplaced : t.edit}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeAdmin(admin)}
                          disabled={admins.length <= 1 || Boolean(adminAction)}
                          className="p-2 text-red-500 hover:bg-pixel-gray-100 disabled:opacity-30 dark:hover:bg-pixel-gray-900"
                          aria-label={`${t.delete} @${admin.username}`}
                          title={admins.length <= 1 ? t.lastAdminCannotBeRemoved : t.delete}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <div className="min-h-5" aria-live="polite">
            {adminNotice && <p className="font-body text-xs text-green-600 dark:text-green-400">{adminNotice}</p>}
            {adminError && <p className="font-body text-xs text-red-500">{adminError}</p>}
          </div>
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
