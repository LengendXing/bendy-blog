"use client"

import { Check, LoaderCircle } from "lucide-react"

interface PixelStatusProps {
  title: string
  detail?: string
  success?: boolean
}

export function PixelStatus({ title, detail, success = false }: PixelStatusProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-pixel-black/60 p-4" role="status" aria-live="polite">
      <div className="pixel-status-panel pixel-pop w-full max-w-sm border-2 border-pixel-black dark:border-pixel-white bg-pixel-white dark:bg-pixel-black p-5 text-center text-pixel-black dark:text-pixel-white">
        <div className="mb-4 flex items-center justify-center gap-2">
          {success ? <Check className="h-4 w-4" /> : <LoaderCircle className="h-4 w-4 animate-spin" />}
          <span className="font-mono text-xs uppercase tracking-widest">{title}</span>
        </div>
        <div className="pixel-progress mb-4" aria-hidden="true">
          {Array.from({ length: 12 }).map((_, index) => (
            <span key={index} className={success ? "pixel-progress-cell pixel-progress-cell-done" : "pixel-progress-cell"} style={{ animationDelay: `${index * 70}ms` }} />
          ))}
        </div>
        {detail && <p className="font-body text-xs text-pixel-gray-500 dark:text-pixel-gray-400">{detail}</p>}
      </div>
    </div>
  )
}
