"use client"

import { Check } from "lucide-react"
import { PixelLoader } from "@/components/pixel-loader"

interface PixelStatusProps {
  title: string
  detail?: string
  success?: boolean
}

export function PixelStatus({ title, detail, success = false }: PixelStatusProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-pixel-black/60 p-4" role="status" aria-live="polite">
      <div className="pixel-status-panel pixel-pop w-full max-w-sm border-2 border-pixel-black dark:border-pixel-white bg-pixel-white dark:bg-pixel-black p-5 text-center text-pixel-black dark:text-pixel-white">
        {success ? (
          <>
            <div className="mb-4 flex items-center justify-center gap-2">
              <Check className="h-4 w-4" />
              <span className="font-mono text-xs uppercase tracking-widest">{title}</span>
            </div>
            <div className="pixel-progress mb-4" aria-hidden="true">
              {Array.from({ length: 12 }).map((_, index) => (
                <span key={index} className="pixel-progress-cell pixel-progress-cell-done" />
              ))}
            </div>
            {detail && <p className="font-body text-xs text-pixel-gray-500 dark:text-pixel-gray-400">{detail}</p>}
          </>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <PixelLoader size="md" framed />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider">{title}</p>
              {detail && <p className="mt-2 font-body text-xs text-pixel-gray-500 dark:text-pixel-gray-400">{detail}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
