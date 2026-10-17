"use client"

import type { FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ColumnSelect } from "@/components/column-select"
import { AdminLoading } from "@/components/admin-loading"
import { useLocale } from "@/components/locale-provider"
import { FilePlus2, Plus, X } from "lucide-react"
import type { AdminColumn } from "./types"

interface Props {
  open: boolean
  columns: AdminColumn[]
  title: string
  slug: string
  description: string
  columnId: string | null
  creating: boolean
  columnAction: boolean
  error: string
  onTitleChange: (value: string) => void
  onSlugChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onColumnChange: (value: string | null) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onClose: () => void
  onCreateColumn: (name: string) => Promise<AdminColumn | null>
  onUpdateColumn: (id: string, name: string) => Promise<AdminColumn | null>
}

export function NewPostDialog({
  open, columns, title, slug, description, columnId, creating, columnAction, error,
  onTitleChange, onSlugChange, onDescriptionChange, onColumnChange, onSubmit, onClose,
  onCreateColumn, onUpdateColumn,
}: Props) {
  const { t } = useLocale()
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pixel-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="new-post-title">
      <form onSubmit={onSubmit} className="pixel-pop relative min-h-[360px] w-full max-w-xl overflow-hidden border-2 border-pixel-black dark:border-pixel-white bg-pixel-white dark:bg-pixel-black p-5 sm:p-6 text-pixel-black dark:text-pixel-white shadow-[8px_8px_0_currentColor]" aria-busy={columnAction}>
        {columnAction && (
          <AdminLoading size="md" className="absolute inset-0 z-20 min-h-full bg-pixel-white/95 p-2 backdrop-blur-[1px] dark:bg-pixel-black/95" />
        )}
        <div className="flex items-start justify-between gap-4 border-b-2 border-pixel-black dark:border-pixel-white pb-4 mb-5">
          <div className="flex items-center gap-3">
            <FilePlus2 className="w-4 h-4 shrink-0" />
            <div>
              <h2 id="new-post-title" className="font-mono text-xs uppercase tracking-widest">{t.newPost}</h2>
              <p className="font-mono text-[10px] text-pixel-gray-500 dark:text-pixel-gray-400 mt-1">// NEW ENTRY</p>
            </div>
          </div>
          <button type="button" onClick={onClose} title={t.cancel} className="p-1 hover:bg-pixel-gray-100 dark:hover:bg-pixel-gray-900">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block sm:col-span-2">
            <span className="font-mono text-[10px] uppercase block mb-1">{t.title} *</span>
            <Input required autoFocus value={title} onChange={event => onTitleChange(event.target.value)} placeholder={t.title} />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase block mb-1">{t.slug} *</span>
            <Input required value={slug} onChange={event => onSlugChange(event.target.value)} placeholder="my-post-slug" />
          </label>
          <div>
            <span className="font-mono text-[10px] uppercase block mb-1">{t.column}</span>
            <ColumnSelect columns={columns} value={columnId} onChange={onColumnChange} onCreate={onCreateColumn} onUpdate={onUpdateColumn} placeholder={t.allColumns} allowCreate />
          </div>
          <label className="block sm:col-span-2">
            <span className="font-mono text-[10px] uppercase block mb-1">{t.description}</span>
            <textarea
              value={description}
              onChange={event => onDescriptionChange(event.target.value)}
              rows={3}
              placeholder={t.description}
              className="w-full border-2 border-pixel-black dark:border-pixel-white bg-transparent px-3 py-2 text-sm font-body placeholder:text-pixel-gray-400 focus:outline-none focus:ring-2 focus:ring-pixel-gray-400 resize-y"
            />
          </label>
        </div>

        {error && <p className="mt-4 border-l-2 border-red-500 pl-2 font-body text-xs text-red-500" role="alert">{error}</p>}
        <div className="flex items-center justify-end gap-2 border-t-2 border-pixel-black dark:border-pixel-white mt-5 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>{t.cancel}</Button>
          <Button type="submit" disabled={creating}><Plus className="w-3 h-3 mr-2" />{t.add}</Button>
        </div>
      </form>
    </div>
  )
}
