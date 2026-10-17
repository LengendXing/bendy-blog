"use client"

import { Button } from "@/components/ui/button"
import { Plus, Upload } from "lucide-react"
import { useLocale } from "@/components/locale-provider"

interface Props {
  search: string
  onSearchChange: (value: string) => void
  onSearch: () => void
  onToggleImport: () => void
  onNewPost: () => void
}

export function ContentToolbar({ search, onSearchChange, onSearch, onToggleImport, onNewPost }: Props) {
  const { t } = useLocale()

  return (
    <>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="font-mono text-sm uppercase tracking-widest">// {t.content}</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onToggleImport}>
            <Upload className="w-3 h-3 mr-2" />Import
          </Button>
          <Button size="sm" onClick={onNewPost}>
            <Plus className="w-3 h-3 mr-2" />{t.newPost}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-0 mb-4 max-w-sm">
        <input
          value={search}
          onChange={event => onSearchChange(event.target.value)}
          onKeyDown={event => event.key === "Enter" && onSearch()}
          placeholder={`${t.title}...`}
          className="flex-1 h-10 border-2 border-r-0 border-pixel-black dark:border-pixel-white bg-transparent px-3 text-sm font-body focus:outline-none"
        />
        <button
          onClick={onSearch}
          className="h-10 px-4 border-2 border-pixel-black dark:border-pixel-white bg-pixel-black dark:bg-pixel-white text-pixel-white dark:text-pixel-black font-mono text-xs hover:opacity-80 shrink-0"
        >
          Go !
        </button>
      </div>
    </>
  )
}
