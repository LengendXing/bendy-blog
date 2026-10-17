"use client"

import type { Dispatch, SetStateAction } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { AdminLoading } from "@/components/admin-loading"
import { useLocale } from "@/components/locale-provider"
import { Plus } from "lucide-react"
import { ConfigList } from "./config-list"
import type { NotifyConfig, WebhookForm } from "./types"

interface Props {
  form: WebhookForm
  onFormChange: Dispatch<SetStateAction<WebhookForm>>
  configs: NotifyConfig[]
  busyAction: string
  onAdd: () => void
  onToggle: (id: string, enabled: boolean) => void
  onDelete: (id: string) => void
}

export function WebhookSettingsPanel({ form, onFormChange, configs, busyAction, onAdd, onToggle, onDelete }: Props) {
  const { t } = useLocale()
  const busy = Boolean(busyAction)

  return (
    <div className="relative min-h-[360px] max-w-2xl overflow-hidden" aria-busy={busy}>
      {busy && <AdminLoading size="md" className="absolute inset-0 z-20 min-h-full bg-pixel-white/95 p-2 backdrop-blur-[1px] dark:bg-pixel-black/95" />}
      <div className="border-2 border-pixel-black dark:border-pixel-white p-4 mb-6 space-y-3">
        <h2 className="font-mono text-xs uppercase">{t.webhookTab}</h2>
        <p className="font-body text-xs text-pixel-gray-400">{t.templateVars}: {"{{title}}"}, {"{{url}}"}, {"{{views}}"}, {"{{event}}"}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-mono text-xs block mb-1">URL</label>
            <Input value={form.url} onChange={event => onFormChange(current => ({ ...current, url: event.target.value }))} placeholder="https://..." />
          </div>
          <div>
            <label className="font-mono text-xs block mb-1">Method</label>
            <select value={form.method} onChange={event => onFormChange(current => ({ ...current, method: event.target.value }))} className="h-10 w-full border-2 border-pixel-black dark:border-pixel-white bg-transparent px-3 font-body text-sm">
              <option value="POST">POST</option>
              <option value="GET">GET</option>
            </select>
          </div>
        </div>
        <div>
          <label className="font-mono text-xs block mb-1">Headers (JSON)</label>
          <Input value={form.headers} onChange={event => onFormChange(current => ({ ...current, headers: event.target.value }))} />
        </div>
        <div>
          <label className="font-mono text-xs block mb-1">Body (JSON)</label>
          <Textarea value={form.body} onChange={event => onFormChange(current => ({ ...current, body: event.target.value }))} rows={3} />
        </div>
        <Button size="sm" onClick={onAdd} disabled={busy}><Plus className="w-3 h-3 mr-1" />{t.add}</Button>
      </div>
      <h2 className="font-mono text-xs uppercase tracking-wider mb-3">{t.activeConfigs}</h2>
      <ConfigList configs={configs} toggle={onToggle} onDelete={onDelete} busy={busy} />
    </div>
  )
}
