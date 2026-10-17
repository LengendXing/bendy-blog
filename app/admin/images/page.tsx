"use client"

import { useCallback, useEffect, useState } from "react"
import { ImageOff, ScanSearch, ShieldCheck, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AdminLoading } from "@/components/admin-loading"
import { RetryNotice } from "@/components/admin/retry-notice"
import { useAdminToast } from "@/components/admin/admin-toast"
import { useLocale } from "@/components/locale-provider"
import { apiFetch, apiJsonWithRetry, getApiErrorMessage, isAbortError } from "@/lib/api-client"

type OrphanImage = {
  provider: string
  path: string
  name?: string
  size?: number
  updatedAt?: string
  ageMs: number | null
}

type ScanResult = {
  scannedAt: string
  minAgeMs: number
  sources: Array<{ provider: string; total: number }>
  total: number
  orphanCount: number
  orphans: OrphanImage[]
}

type DeleteResult = { deleted: string[]; skipped: string[]; failed: Array<{ path: string; error: string }> }

const imageKey = (image: OrphanImage) => `${image.provider}:${image.path}`

function formatSize(size?: number): string {
  if (typeof size !== "number" || size < 0) return "—"
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function formatAge(ageMs: number | null): string {
  if (ageMs === null) return "—"
  const hours = Math.floor(ageMs / (60 * 60 * 1000))
  if (hours < 48) return `${hours} h`
  return `${Math.floor(hours / 24)} d`
}

function formatDate(value?: string): string {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString()
}

export default function ImagesPage() {
  const { t } = useLocale()
  const toast = useAdminToast()
  const [data, setData] = useState<ScanResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [reloadKey, setReloadKey] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError("")
    apiJsonWithRetry<ScanResult>("/api/images/orphans", { signal: controller.signal })
      .then(result => {
        if (controller.signal.aborted) return
        setData(result)
        setSelected(new Set())
      })
      .catch(caught => {
        if (isAbortError(caught) || controller.signal.aborted) return
        setError(getApiErrorMessage(caught, t))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [reloadKey, t])

  const rescan = useCallback(() => setReloadKey(key => key + 1), [])

  function toggle(key: string) {
    setSelected(current => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleAll() {
    if (!data) return
    setSelected(current =>
      current.size === data.orphans.length ? new Set() : new Set(data.orphans.map(imageKey)),
    )
  }

  async function performDelete(keys: string[]) {
    if (keys.length === 0 || deleting) return
    setDeleting(true)
    try {
      const result = await apiFetch("/api/images/orphans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true, paths: keys }),
      }).then(response => response.json() as Promise<DeleteResult>)

      toast.success(
        t.deleteResult
          .replace("{{deleted}}", String(result.deleted.length))
          .replace("{{skipped}}", String(result.skipped.length))
          .replace("{{failed}}", String(result.failed.length)),
      )
      rescan()
    } catch (caught) {
      const message = getApiErrorMessage(caught, t)
      toast.error(message, { label: t.retry, onClick: () => void performDelete(keys) })
    } finally {
      setDeleting(false)
    }
  }

  function deleteSelected() {
    const keys = Array.from(selected)
    if (keys.length === 0) return
    if (!window.confirm(t.confirmDeleteOrphans.replace("{{count}}", String(keys.length)))) return
    void performDelete(keys)
  }

  if (loading) return <AdminLoading className="min-h-64" />

  if (error) {
    return (
      <div>
        <PageHeader title={t.orphanImages} hint={t.orphanImagesHint} />
        <RetryNotice message={error || t.scanFailed} retryLabel={t.retry} onRetry={rescan} />
      </div>
    )
  }

  if (!data) return null

  const storageEmpty = data.sources.length === 0
  const allSelected = data.orphans.length > 0 && selected.size === data.orphans.length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader title={t.orphanImages} hint={t.orphanImagesHint} />
        <Button size="sm" variant="outline" onClick={rescan} disabled={deleting}>
          <ScanSearch className="mr-2 h-3 w-3" aria-hidden="true" />
          {data ? t.scanAgain : t.scanImages}
        </Button>
      </div>

      <section className="grid gap-0 border-2 border-pixel-black sm:grid-cols-3 dark:border-pixel-white" aria-label={t.orphanImages}>
        <div className="border-b-2 border-pixel-black p-4 sm:border-b-0 sm:border-r-2 dark:border-pixel-white">
          <p className="font-mono text-[10px] uppercase tracking-widest text-pixel-gray-500">{t.sourceLabel}</p>
          <p className="mt-2 font-mono text-xs">
            {data.sources.length > 0
              ? data.sources.map(source => `${source.provider} · ${source.total}`).join("  /  ")
              : "—"}
          </p>
        </div>
        <div className="border-b-2 border-pixel-black p-4 sm:border-b-0 sm:border-r-2 dark:border-pixel-white">
          <p className="font-mono text-[10px] uppercase tracking-widest text-pixel-gray-500">{t.totalImages}</p>
          <p className="mt-2 font-mono text-2xl leading-none">{data.total}</p>
        </div>
        <div className="p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-pixel-gray-500">{t.orphanCandidates}</p>
          <p className={`mt-2 font-mono text-2xl leading-none ${data.orphanCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-green-700 dark:text-green-400"}`}>
            {data.orphanCount}
          </p>
        </div>
      </section>

      <p className="flex items-start gap-2 border-l-2 border-pixel-gray-400 pl-3 font-body text-xs leading-relaxed text-pixel-gray-600 dark:text-pixel-gray-400">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {t.orphanSafetyNote}
      </p>

      {storageEmpty ? (
        <div className="flex min-h-48 flex-col items-center justify-center gap-3 border-2 border-dashed border-pixel-gray-300 p-6 text-center dark:border-pixel-gray-700">
          <ImageOff className="h-6 w-6 text-pixel-gray-400" aria-hidden="true" />
          <p className="max-w-md font-body text-xs text-pixel-gray-500">{t.storageNotConfigured}</p>
        </div>
      ) : data.orphans.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center gap-3 border-2 border-dashed border-green-600/60 p-6 text-center">
          <ShieldCheck className="h-6 w-6 text-green-700 dark:text-green-400" aria-hidden="true" />
          <p className="font-body text-sm">{t.noOrphanImages}</p>
        </div>
      ) : (
        <section className="border-2 border-pixel-black dark:border-pixel-white" aria-label={t.orphanCandidates}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-pixel-black p-3 dark:border-pixel-white">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleAll}
                className="border-2 border-pixel-black px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider hover:bg-pixel-gray-100 focus:outline-none focus:ring-2 focus:ring-pixel-gray-400 dark:border-pixel-white dark:hover:bg-pixel-gray-900"
              >
                {allSelected ? t.clearSelection : t.selectAll}
              </button>
              <span className="font-mono text-[10px] text-pixel-gray-500">
                {t.selectedCount.replace("{{count}}", String(selected.size))}
              </span>
            </div>
            <Button size="sm" variant="destructive" onClick={deleteSelected} disabled={selected.size === 0 || deleting}>
              <Trash2 className="mr-2 h-3 w-3" aria-hidden="true" />
              {deleting ? t.deleting : t.deleteSelected}
            </Button>
          </div>

          <div className="hidden grid-cols-[2rem_minmax(0,1fr)_5rem_5rem_6rem_4rem] gap-3 border-b border-pixel-gray-300 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-pixel-gray-500 sm:grid dark:border-pixel-gray-700">
            <span aria-hidden="true" />
            <span>{t.pathLabel}</span>
            <span>{t.sizeLabel}</span>
            <span>{t.modifiedLabel}</span>
            <span>{t.sourceLabel}</span>
            <span>{t.ageLabel}</span>
          </div>

          <ul className="divide-y divide-pixel-gray-200 dark:divide-pixel-gray-800">
            {data.orphans.map(image => {
              const key = imageKey(image)
              const checked = selected.has(key)
              return (
                <li key={key}>
                  <label
                    className={`grid cursor-pointer grid-cols-[2rem_minmax(0,1fr)] items-center gap-3 px-3 py-3 transition-colors hover:bg-pixel-gray-100 focus-within:bg-pixel-gray-100 sm:grid-cols-[2rem_minmax(0,1fr)_5rem_5rem_6rem_4rem] dark:hover:bg-pixel-gray-900 dark:focus-within:bg-pixel-gray-900 ${checked ? "bg-pixel-gray-100 dark:bg-pixel-gray-900" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(key)}
                      aria-label={`${t.pathLabel}: ${image.path}`}
                      className="h-3.5 w-3.5 accent-current focus:outline-none focus:ring-2 focus:ring-pixel-gray-400"
                    />
                    <span className="min-w-0 break-all font-mono text-xs">{image.path}</span>
                    <span className="col-start-2 font-mono text-[10px] text-pixel-gray-500 sm:col-start-auto">{formatSize(image.size)}</span>
                    <span className="col-start-2 font-mono text-[10px] text-pixel-gray-500 sm:col-start-auto">{formatDate(image.updatedAt)}</span>
                    <span className="col-start-2 font-mono text-[10px] uppercase text-pixel-gray-500 sm:col-start-auto">{image.provider}</span>
                    <span className="col-start-2 font-mono text-[10px] text-pixel-gray-500 sm:col-start-auto">{formatAge(image.ageMs)}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}

function PageHeader({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="max-w-2xl">
      <h1 className="font-mono text-sm uppercase tracking-widest">// {title}</h1>
      <p className="mt-2 font-body text-xs leading-relaxed text-pixel-gray-500">{hint}</p>
    </div>
  )
}
