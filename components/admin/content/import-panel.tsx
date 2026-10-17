"use client"

import type { RefObject } from "react"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { AdminLoading } from "@/components/admin-loading"
import type { ImportResult } from "./types"

interface Props {
  fileInputRef: RefObject<HTMLInputElement>
  importing: boolean
  results: ImportResult[] | null
  onImport: () => void
  onClose: () => void
}

function resultColor(status: string): string {
  if (status === "imported") return "text-green-600"
  if (status === "skipped") return "text-yellow-600"
  return "text-red-500"
}

export function ImportPanel({ fileInputRef, importing, results, onImport, onClose }: Props) {
  return (
    <div className="relative min-h-[150px] overflow-hidden border-2 border-pixel-black p-4 mb-6 dark:border-pixel-white" aria-busy={importing}>
      {importing && <AdminLoading size="md" className="absolute inset-0 z-20 min-h-full bg-pixel-white/95 p-2 dark:bg-pixel-black/95" />}
      <h3 className="font-mono text-xs uppercase mb-3">Batch Import (Notion Markdown)</h3>
      <p className="font-body text-xs text-pixel-gray-500 mb-3">Select .md files. Format: # Title, metadata, blank line, body.</p>
      <div className="flex items-center gap-3 flex-wrap">
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.txt,.markdown"
          multiple
          className="font-body text-xs file:border-2 file:border-pixel-black dark:file:border-pixel-white file:bg-transparent file:px-3 file:py-1.5 file:font-mono file:text-xs file:mr-3 file:cursor-pointer"
        />
        <Button size="sm" onClick={onImport} disabled={importing}>Import</Button>
        <Button size="sm" variant="ghost" onClick={onClose}><X className="w-3 h-3" /></Button>
      </div>
      {results && (
        <div className="mt-4 space-y-1">
          {results.map((result, index) => (
            <div key={index} className="font-body text-xs flex items-center gap-2">
              <span className={`font-mono ${resultColor(result.status)}`}>[{result.status}]</span>
              <span className="truncate">{result.filename}</span>
              {result.title && <span className="text-pixel-gray-400">— {result.title}</span>}
              {result.error && <span className="text-red-500">({result.error})</span>}
            </div>
          ))}
          <p className="font-mono text-xs text-pixel-gray-400 mt-2">
            {results.filter(result => result.status === "imported").length} imported,{" "}
            {results.filter(result => result.status === "skipped").length} skipped,{" "}
            {results.filter(result => result.status === "error").length} errors
          </p>
        </div>
      )}
    </div>
  )
}
