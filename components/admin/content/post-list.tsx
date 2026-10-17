"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useLocale } from "@/components/locale-provider"
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react"
import type { AdminPost } from "./types"

interface Props {
  posts: AdminPost[]
  filteredCount: number
  page: number
  totalPages: number
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  onPageChange: (page: number) => void
}

export function PostList({ posts, filteredCount, page, totalPages, onDelete, onEdit, onPageChange }: Props) {
  const { t } = useLocale()

  return (
    <>
      <div className="space-y-2">
        {posts.map(post => (
          <div key={post.id} className="border-2 border-pixel-black dark:border-pixel-white p-3 sm:p-4 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="font-body text-sm truncate">{post.title}</span>
              {post.column && <span className="font-mono text-[10px] text-pixel-gray-400 border border-pixel-gray-300 dark:border-pixel-gray-700 px-1">{post.column.name}</span>}
              {post.published ? <Badge className="text-green-600 border-green-600">live</Badge> : <Badge className="text-pixel-gray-400 border-pixel-gray-400">draft</Badge>}
              <span className="font-mono text-xs text-pixel-gray-400">{post.views} {t.views} · {post._count?.comments || 0} {t.comments}</span>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => onEdit(post.id)}><Pencil className="w-3 h-3" /></Button>
              <Button size="sm" variant="destructive" onClick={() => onDelete(post.id)}><Trash2 className="w-3 h-3" /></Button>
            </div>
          </div>
        ))}
        {filteredCount === 0 && <p className="font-body text-pixel-gray-500 text-sm">{t.noPostsYet}</p>}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="border-2 border-pixel-black dark:border-pixel-white w-8 h-8 flex items-center justify-center disabled:opacity-30 hover:bg-pixel-gray-100 dark:hover:bg-pixel-gray-900"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono text-xs">{page} / {totalPages}</span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="border-2 border-pixel-black dark:border-pixel-white w-8 h-8 flex items-center justify-center disabled:opacity-30 hover:bg-pixel-gray-100 dark:hover:bg-pixel-gray-900"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  )
}
