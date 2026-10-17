"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AdminLoading } from "@/components/admin-loading"
import { useLocale } from "@/components/locale-provider"
import { SecretInput } from "./secret-input"

interface Props {
  blogTitle: string
  onBlogTitleChange: (value: string) => void
  footerText: string
  onFooterTextChange: (value: string) => void
  dufsEnabled: boolean
  onDufsEnabledChange: (value: boolean) => void
  dufsUrl: string
  onDufsUrlChange: (value: string) => void
  dufsUser: string
  onDufsUserChange: (value: string) => void
  dufsPass: string
  onDufsPassChange: (value: string) => void
  githubImageRepo: string
  onGithubImageRepoChange: (value: string) => void
  githubImageToken: string
  onGithubImageTokenChange: (value: string) => void
  saving: boolean
  onSave: () => void
}

export function SiteSettingsPanel(props: Props) {
  const { t } = useLocale()

  return (
    <div className="relative min-h-[360px] max-w-2xl overflow-hidden" aria-busy={props.saving}>
      {props.saving && (
        <AdminLoading size="md" className="absolute inset-0 z-20 min-h-full bg-pixel-white/95 p-2 backdrop-blur-[1px] dark:bg-pixel-black/95" />
      )}
      <div className="space-y-6">
        <div className="border-2 border-pixel-black dark:border-pixel-white p-4 space-y-4">
          <h2 className="font-mono text-xs uppercase">{t.siteSettingsTab}</h2>
          <div>
            <label className="font-mono text-xs block mb-1">{t.blogTitle}</label>
            <Input value={props.blogTitle} onChange={event => props.onBlogTitleChange(event.target.value)} />
          </div>
          <div>
            <label className="font-mono text-xs block mb-1">{t.footerText}</label>
            <Input value={props.footerText} onChange={event => props.onFooterTextChange(event.target.value)} />
          </div>
        </div>

        <div className="border-2 border-pixel-black dark:border-pixel-white p-4 space-y-4">
          <h2 className="font-mono text-xs uppercase">{t.imageStorage}</h2>

          <div className="border-b border-pixel-gray-200 dark:border-pixel-gray-800 pb-4">
            <h3 className="font-mono text-xs mb-3">{t.dufsService}</h3>
            <label className="flex items-center gap-2 font-mono text-xs mb-3">
              <input type="checkbox" checked={props.dufsEnabled} onChange={event => props.onDufsEnabledChange(event.target.checked)} className="accent-pixel-black" />
              {t.enable} Dufs
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-mono text-[10px] block mb-1">URL</label>
                <Input value={props.dufsUrl} onChange={event => props.onDufsUrlChange(event.target.value)} placeholder="https://dufs.example.com" disabled={!props.dufsEnabled} />
              </div>
              <div>
                <label className="font-mono text-[10px] block mb-1">User</label>
                <Input value={props.dufsUser} onChange={event => props.onDufsUserChange(event.target.value)} disabled={!props.dufsEnabled} />
              </div>
              <div>
                <label className="font-mono text-[10px] block mb-1">Pass</label>
                <SecretInput value={props.dufsPass} onChange={props.onDufsPassChange} disabled={!props.dufsEnabled} />
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-mono text-xs mb-3">{t.githubImageRepo}</h3>
            <p className="font-body text-[10px] text-pixel-gray-400 mb-2">Fallback when Dufs is off. Format: owner/repo</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-mono text-[10px] block mb-1">Repo</label>
                <Input value={props.githubImageRepo} onChange={event => props.onGithubImageRepoChange(event.target.value)} placeholder="user/blog-images" />
              </div>
              <div>
                <label className="font-mono text-[10px] block mb-1">Token</label>
                <SecretInput value={props.githubImageToken} onChange={props.onGithubImageTokenChange} />
              </div>
            </div>
          </div>
        </div>

        <Button onClick={props.onSave} disabled={props.saving}>{props.saving ? t.saving : t.save}</Button>
      </div>
    </div>
  )
}
