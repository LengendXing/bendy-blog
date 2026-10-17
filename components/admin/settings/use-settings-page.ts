"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useLocale } from "@/components/locale-provider"
import { resolveBlogTitle } from "@/lib/blog-title"
import type { AdminUser, EmailForm, GithubSearchUser, NotifyConfig, SettingsTab, WebhookForm } from "./types"

const DEFAULT_WEBHOOK: WebhookForm = {
  url: "",
  method: "POST",
  headers: "{}",
  body: '{"text":"{{event}}: {{title}} - {{url}} ({{views}} views)"}',
}

const DEFAULT_EMAIL: EmailForm = {
  to: "",
  template: "<h2>{{event}}</h2><p>Post: {{title}}</p><p>URL: {{url}}</p><p>Views: {{views}}</p>",
}

/** Owns settings state and API calls; tab components stay presentational. */
export function useSettingsPage() {
  const { t } = useLocale()
  const { data: session } = useSession()
  const [configs, setConfigs] = useState<NotifyConfig[]>([])
  const [tab, setTab] = useState<SettingsTab>("site")
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const [blogTitle, setBlogTitle] = useState("Bendy Blog")
  const [footerText, setFooterText] = useState("Built with nextjs & By @SunChengXin")
  const [dufsEnabled, setDufsEnabled] = useState(false)
  const [dufsUrl, setDufsUrl] = useState("")
  const [dufsUser, setDufsUser] = useState("")
  const [dufsPass, setDufsPass] = useState("")
  const [githubImageRepo, setGithubImageRepo] = useState("")
  const [githubImageToken, setGithubImageToken] = useState("")
  const [savingSite, setSavingSite] = useState(false)

  const [wf, setWf] = useState<WebhookForm>(DEFAULT_WEBHOOK)
  const [ef, setEf] = useState<EmailForm>(DEFAULT_EMAIL)
  const [notificationAction, setNotificationAction] = useState("")

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
    const params = new URLSearchParams({ q: `${query} in:login type:user`, per_page: "8" })

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
      const users: GithubSearchUser[] = Array.isArray(data.items)
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
    const controller = new AbortController()
    Promise.all([
      fetch("/api/config", { signal: controller.signal }).then(response => {
        if (!response.ok) throw new Error("config load failed")
        return response.json()
      }),
      fetch("/api/notify", { signal: controller.signal }).then(response => {
        if (!response.ok) throw new Error("notifications load failed")
        return response.json()
      }),
    ]).then(([cfg, notifs]) => {
      if (controller.signal.aborted) return
      setBlogTitle(resolveBlogTitle(cfg.blogTitle))
      if (cfg.footerText) setFooterText(cfg.footerText)
      setDufsEnabled(cfg.dufsEnabled === "true")
      if (cfg.dufsUrl) setDufsUrl(cfg.dufsUrl)
      if (cfg.dufsUser) setDufsUser(cfg.dufsUser)
      if (cfg.dufsPass) setDufsPass(cfg.dufsPass)
      if (cfg.githubImageRepo) setGithubImageRepo(cfg.githubImageRepo)
      if (cfg.githubImageToken) setGithubImageToken(cfg.githubImageToken)
      setConfigs(Array.isArray(notifs) ? notifs : [])
    }).catch(error => {
      if ((error as Error).name !== "AbortError") {
        setConfigs([])
        setLoadError(true)
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    loadAdmins()
    return () => controller.abort()
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
    if (savingSite) return
    setSavingSite(true)
    try {
      await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blogTitle, footerText,
          dufsEnabled: dufsEnabled ? "true" : "false",
          dufsUrl, dufsUser, dufsPass, githubImageRepo, githubImageToken,
        }),
      })
    } finally {
      setSavingSite(false)
    }
  }

  async function addWebhook() {
    if (!wf.url || notificationAction) return
    let headers = {}
    try { headers = JSON.parse(wf.headers) } catch {}
    let body: unknown = {}
    try { body = JSON.parse(wf.body) } catch { body = { text: wf.body } }
    setNotificationAction("webhook:add")
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "webhook", config: { url: wf.url, method: wf.method, headers, body } }),
      })
      if (!res.ok) return
      const created = await res.json()
      setConfigs(current => [...current, created])
      setWf(DEFAULT_WEBHOOK)
    } finally {
      setNotificationAction("")
    }
  }

  async function addEmail() {
    if (!ef.to || notificationAction) return
    setNotificationAction("email:add")
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "email", config: { to: ef.to, template: ef.template } }),
      })
      if (!res.ok) return
      const created = await res.json()
      setConfigs(current => [...current, created])
      setEf({ to: "", template: ef.template })
    } finally {
      setNotificationAction("")
    }
  }

  async function toggle(id: string, enabled: boolean) {
    if (notificationAction) return
    setNotificationAction(`toggle:${id}`)
    try {
      const res = await fetch("/api/notify", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, enabled: !enabled }),
      })
      if (res.ok) setConfigs(current => current.map(item => item.id === id ? { ...item, enabled: !enabled } : item))
    } finally {
      setNotificationAction("")
    }
  }

  async function removeNotification(id: string) {
    if (notificationAction) return
    setNotificationAction(`delete:${id}`)
    try {
      const res = await fetch("/api/notify", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (res.ok) setConfigs(current => current.filter(item => item.id !== id))
    } finally {
      setNotificationAction("")
    }
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

  function startReplaceAdmin(admin: AdminUser) {
    githubSearchAbort.current?.abort()
    ++githubSearchRequestId.current
    setReplaceAdmin(admin)
    setGithubQuery("")
    setGithubResults([])
    setGithubSearchError("")
    setGithubSearching(false)
    setAdminNotice("")
    setAdminError("")
  }

  return {
    tab, setTab, loading, loadError, configs, notificationAction,
    toggle, removeNotification,
    site: {
      blogTitle, setBlogTitle, footerText, setFooterText,
      dufsEnabled, setDufsEnabled, dufsUrl, setDufsUrl, dufsUser, setDufsUser,
      dufsPass, setDufsPass, githubImageRepo, setGithubImageRepo,
      githubImageToken, setGithubImageToken, savingSite, saveSite,
    },
    webhook: { wf, setWf, addWebhook },
    email: { ef, setEf, addEmail },
    admins: {
      admins, adminsLoading, adminAction, adminNotice, adminError,
      replaceAdmin, setReplaceAdmin, startReplaceAdmin,
      githubQuery, updateGithubQuery, githubResults, githubSearching, githubSearchError,
      searchGithubNow, saveAdmin, removeAdmin,
      currentGithubId: (session?.user as any)?.githubId as string | null | undefined,
      currentGithubUsername: (session?.user as any)?.githubUsername as string | null | undefined,
    },
  }
}
