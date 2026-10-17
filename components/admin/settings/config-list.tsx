"use client"

import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { useLocale } from "@/components/locale-provider"
import type { NotifyConfig } from "./types"

interface Props {
  configs: NotifyConfig[]
  toggle: (id: string, enabled: boolean) => void
  onDelete: (id: string) => void
  busy: boolean
}

export function ConfigList({ configs, toggle, onDelete, busy }: Props) {
  const { t } = useLocale()

  return (
    <div className="space-y-2">
      {configs.map(config => {
        let parsed: any = {}
        try { parsed = JSON.parse(config.config) } catch {}
        return (
          <div key={config.id} className="border-2 border-pixel-gray-200 dark:border-pixel-gray-800 p-3 flex items-center justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <span className="font-mono text-xs uppercase">{config.type}</span>
              <span className="font-body text-xs text-pixel-gray-500 ml-2 truncate">{config.type === "webhook" ? parsed.url : parsed.to}</span>
              {!config.enabled && <span className="font-mono text-xs text-red-500 ml-2">({t.disable}d)</span>}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button size="sm" variant="ghost" onClick={() => toggle(config.id, config.enabled)} disabled={busy}>{config.enabled ? t.disable : t.enable}</Button>
              <Button size="sm" variant="ghost" onClick={() => onDelete(config.id)} disabled={busy}><Trash2 className="w-3 h-3 text-red-500" /></Button>
            </div>
          </div>
        )
      })}
      {configs.length === 0 && <p className="font-body text-xs text-pixel-gray-500">—</p>}
    </div>
  )
}
