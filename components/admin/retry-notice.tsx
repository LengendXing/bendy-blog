"use client"

import { Button } from "@/components/ui/button"
import { RotateCw } from "lucide-react"

export function RetryNotice({
  message,
  retryLabel,
  busyLabel,
  onRetry,
  busy = false,
}: {
  message: string
  retryLabel: string
  busyLabel?: string
  onRetry: () => void
  busy?: boolean
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-4 border-2 border-dashed border-pixel-gray-300 p-6 text-center dark:border-pixel-gray-700" role="alert">
      <p className="font-body text-xs text-red-500">{message}</p>
      <Button size="sm" variant="outline" onClick={onRetry} disabled={busy}>
        <RotateCw className="mr-2 h-3 w-3" aria-hidden="true" />
        {busy ? busyLabel || retryLabel : retryLabel}
      </Button>
    </div>
  )
}
