"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AdminLoading } from "@/components/admin-loading"
import { PixelImage } from "@/components/pixel-image"
import { useLocale } from "@/components/locale-provider"
import { ExternalLink, Github, Pencil, Search, Trash2, UserPlus, X } from "lucide-react"
import type { AdminUser, GithubSearchUser } from "./types"

interface Props {
  admins: AdminUser[]
  adminsLoading: boolean
  adminAction: string
  adminNotice: string
  adminError: string
  replaceAdmin: AdminUser | null
  onCancelReplace: () => void
  githubQuery: string
  onGithubQueryChange: (value: string) => void
  githubResults: GithubSearchUser[]
  githubSearching: boolean
  githubSearchError: "" | "failed" | "limited"
  onSearch: () => void
  onSaveAdmin: (username: string) => void
  onRemoveAdmin: (admin: AdminUser) => void
  onStartReplace: (admin: AdminUser) => void
  currentGithubId?: string | null
  currentGithubUsername?: string | null
}

export function AdminsSettingsPanel(props: Props) {
  const { t } = useLocale()
  const busy = Boolean(props.adminAction)

  return (
    <div className="relative min-h-[360px] max-w-2xl overflow-hidden" aria-busy={busy}>
      {busy && <AdminLoading size="md" className="absolute inset-0 z-20 min-h-full bg-pixel-white/95 p-2 backdrop-blur-[1px] dark:bg-pixel-black/95" />}
      <div className="space-y-6">
        <section className="border-2 border-pixel-black p-4 dark:border-pixel-white">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-mono text-xs uppercase">{t.githubUserSearch}</h2>
            {props.replaceAdmin && (
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate font-body text-xs text-pixel-gray-500">{t.replaceAdmin}: @{props.replaceAdmin.username}</span>
                <button type="button" onClick={props.onCancelReplace} className="shrink-0 p-1 hover:bg-pixel-gray-100 dark:hover:bg-pixel-gray-900" aria-label={t.cancel} title={t.cancel}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <form onSubmit={event => { event.preventDefault(); props.onSearch() }} className="flex">
            <div className="relative min-w-0 flex-1">
              <Github className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pixel-gray-400" aria-hidden="true" />
              <Input
                value={props.githubQuery}
                onChange={event => props.onGithubQueryChange(event.target.value)}
                placeholder={t.githubUsernamePlaceholder}
                className="pl-9"
                autoComplete="off"
                spellCheck={false}
                maxLength={39}
              />
            </div>
            <button
              type="submit"
              disabled={props.githubQuery.trim().length < 2}
              className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-l-0 border-pixel-black bg-pixel-black text-pixel-white disabled:opacity-50 dark:border-pixel-white dark:bg-pixel-white dark:text-pixel-black"
              aria-label={t.githubUserSearch}
              title={t.githubUserSearch}
            >
              <Search className="h-4 w-4" />
            </button>
          </form>

          <div className={`mt-3 ${props.githubSearching ? "min-h-[84px]" : "min-h-5"}`} aria-live="polite">
            {props.githubSearching && <AdminLoading size="sm" className="min-h-[84px] p-0" />}
            {!props.githubSearching && props.githubSearchError === "limited" && <p className="font-body text-xs text-red-500">{t.githubRateLimited}</p>}
            {!props.githubSearching && props.githubSearchError === "failed" && <p className="font-body text-xs text-red-500">{t.githubSearchFailed}</p>}
            {!props.githubSearching && !props.githubSearchError && props.githubQuery.trim().length >= 2 && props.githubResults.length === 0 && <p className="font-body text-xs text-pixel-gray-500">{t.noGithubUsers}</p>}
          </div>

          {props.githubResults.length > 0 && (
            <div className="mt-1 divide-y divide-pixel-gray-200 border-2 border-pixel-gray-200 dark:divide-pixel-gray-800 dark:border-pixel-gray-800">
              {props.githubResults.map(user => {
                const userKey = user.login.toLowerCase()
                const userGithubId = String(user.id)
                const unchanged = Boolean(props.replaceAdmin) && (props.replaceAdmin!.githubId
                  ? props.replaceAdmin!.githubId === userGithubId
                  : props.replaceAdmin!.username.toLowerCase() === userKey)
                const alreadyAdmin = props.admins.some(admin => {
                  const isReplaceTarget = Boolean(props.replaceAdmin) && (props.replaceAdmin!.githubId
                    ? admin.githubId === props.replaceAdmin!.githubId
                    : admin.githubId === null && admin.username.toLowerCase() === props.replaceAdmin!.username.toLowerCase())
                  return !isReplaceTarget && (admin.githubId === userGithubId || admin.username.toLowerCase() === userKey)
                })
                return (
                  <div key={user.id} className="flex items-center gap-3 p-2.5">
                    <PixelImage
                      src={user.avatar_url}
                      alt=""
                      aspectRatio={1}
                      className="h-8 w-8 shrink-0 rounded-full"
                      frameClassName="border border-pixel-gray-300 dark:border-pixel-gray-700"
                      imageClassName="object-cover"
                      fallback={<span className="block h-full w-full bg-pixel-gray-100 dark:bg-pixel-gray-900" aria-hidden="true" />}
                    />
                    <a href={user.html_url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-center gap-1 font-body text-sm hover:underline">
                      <span className="truncate">@{user.login}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                    </a>
                    <Button size="sm" onClick={() => props.onSaveAdmin(user.login)} disabled={props.githubSearching || alreadyAdmin || unchanged || busy}>
                      <UserPlus className="mr-1 h-3.5 w-3.5" />
                      {alreadyAdmin || unchanged ? t.alreadyAdmin : props.replaceAdmin ? t.replaceAdmin : t.add}
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="border-2 border-pixel-black p-4 dark:border-pixel-white">
          <h2 className="mb-4 font-mono text-xs uppercase">{t.currentAdmins}</h2>
          {props.adminsLoading ? (
            <AdminLoading size="sm" className="min-h-[112px] p-0" />
          ) : props.admins.length === 0 ? (
            <p className="font-body text-xs text-pixel-gray-500">{t.noAdmins}</p>
          ) : (
            <div className="space-y-2">
              {props.admins.map(admin => {
                const isCurrentUser = admin.githubId && props.currentGithubId
                  ? admin.githubId === props.currentGithubId
                  : props.currentGithubUsername?.toLowerCase() === admin.username.toLowerCase()
                return (
                  <div key={admin.githubId || admin.username.toLowerCase()} className="flex items-center gap-3 border-2 border-pixel-gray-200 p-3 dark:border-pixel-gray-800">
                    <PixelImage
                      src={admin.avatarUrl}
                      alt=""
                      aspectRatio={1}
                      className="h-9 w-9 shrink-0 rounded-full"
                      frameClassName="border border-pixel-gray-300 dark:border-pixel-gray-700"
                      imageClassName="object-cover"
                      fallback={<span className="block h-full w-full bg-pixel-gray-100 dark:bg-pixel-gray-900" aria-hidden="true" />}
                    />
                    <a href={admin.profileUrl} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-center gap-1 font-body text-sm hover:underline">
                      <span className="truncate">@{admin.username}{isCurrentUser ? ` (${t.currentUser})` : ""}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                    </a>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => props.onStartReplace(admin)}
                        disabled={props.admins.length <= 1 || busy}
                        className="p-2 hover:bg-pixel-gray-100 disabled:opacity-50 dark:hover:bg-pixel-gray-900"
                        aria-label={`${t.edit} @${admin.username}`}
                        title={props.admins.length <= 1 ? t.soleAdminCannotBeReplaced : t.edit}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => props.onRemoveAdmin(admin)}
                        disabled={props.admins.length <= 1 || busy}
                        className="p-2 text-red-500 hover:bg-pixel-gray-100 disabled:opacity-30 dark:hover:bg-pixel-gray-900"
                        aria-label={`${t.delete} @${admin.username}`}
                        title={props.admins.length <= 1 ? t.lastAdminCannotBeRemoved : t.delete}
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
          {props.adminNotice && <p className="font-body text-xs text-green-600 dark:text-green-400">{props.adminNotice}</p>}
          {props.adminError && <p className="font-body text-xs text-red-500">{props.adminError}</p>}
        </div>
      </div>
    </div>
  )
}
