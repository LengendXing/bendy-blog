"use client"

import type { Dispatch, SetStateAction } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { AdminLoading } from "@/components/admin-loading"
import { useLocale } from "@/components/locale-provider"
import { Plus } from "lucide-react"
import { ConfigList } from "./config-list"
import type { EmailForm, NotifyConfig } from "./types"

interface Props {
  form: EmailForm
  onFormChange: Dispatch<SetStateAction<EmailForm>>
  configs: NotifyConfig[]
  busyAction: string
  onAdd: () => void
  onToggle: (id: string, enabled: boolean) => void
  onDelete: (id: string) => void
}

export function EmailSettingsPanel({ form, onFormChange, configs, busyAction, onAdd, onToggle, onDelete }: Props) {
  const { t } = useLocale()
  const busy = Boolean(busyAction)

  return (
    <div className="relative min-h-[360px] max-w-2xl overflow-hidden" aria-busy={busy}>
      {busy && <AdminLoading size="md" className="absolute inset-0 z-20 min-h-full bg-pixel-white/95 p-2 backdrop-blur-[1px] dark:bg-pixel-black/95" />}
      <div className="border-2 border-pixel-black dark:border-pixel-white p-4 mb-6 space-y-3">
        <h2 className="font-mono text-xs uppercase">{t.emailTab}</h2>
        <p className="font-body text-xs text-pixel-gray-400">SMTP: env vars SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM</p>
        <div>
          <label className="font-mono text-xs block mb-1">Recipient</label>
          <Input value={form.to} onChange={event => onFormChange(current => ({ ...current, to: event.target.value }))} />
        </div>
        <div>
          <label className="font-mono text-xs block mb-1">HTML Template</label>
          <Textarea value={form.template} onChange={event => onFormChange(current => ({ ...current, template: event.target.value }))} rows={5} />
        </div>
        <Button size="sm" onClick={onAdd} disabled={busy}><Plus className="w-3 h-3 mr-1" />{t.add}</Button>
      </div>
      <h2 className="font-mono text-xs uppercase tracking-wider mb-3">{t.activeConfigs}</h2>
      <ConfigList configs={configs} toggle={onToggle} onDelete={onDelete} busy={busy} />
    </div>
  )
}
