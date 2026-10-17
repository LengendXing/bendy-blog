"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Pencil, Check, X, Plus, ChevronLeft, ChevronRight, MessageSquare, ArrowRight, Download } from "lucide-react"
import { useLocale } from "@/components/locale-provider"
import { AdminLoading } from "@/components/admin-loading"
import { PixelImage } from "@/components/pixel-image"

const GROUP_PAGE_SIZE = 15
const COMMENTS_PAGE_SIZE = 100

type CommentGroup = {
  title: string
  comments: any[]
}

type CommentPage = {
  items: any[]
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasMore: boolean
}

async function fetchCommentPage(page: number): Promise<CommentPage> {
  const response = await fetch(`/api/comments?page=${page}&pageSize=${COMMENTS_PAGE_SIZE}`)
  const data = await response.json().catch(() => null) as CommentPage | null
  if (!response.ok || !data || !Array.isArray(data.items)) throw new Error("comments request failed")
  return data
}

function commentAuthor(comment: any) {
  return comment.user?.githubUsername || comment.user?.name || "Unknown user"
}

function replyTargetId(comment: any, commentById: Map<string, any>) {
  if (comment.replyToId && commentById.has(comment.replyToId)) return comment.replyToId
  if (comment.parentId && commentById.has(comment.parentId)) return comment.parentId
  return null
}

export default function CommentsPage() {
  const { t } = useLocale()
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("")
  const [drawerSlug, setDrawerSlug] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [commentsPage, setCommentsPage] = useState(1)
  const [hasMoreComments, setHasMoreComments] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [commentError, setCommentError] = useState("")
  const [commentAction, setCommentAction] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState("")
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchCommentPage(1)
      .then(data => {
        if (cancelled) return
        setComments(data.items)
        setCommentsPage(data.page)
        setHasMoreComments(data.hasMore)
      })
      .catch(() => {
        if (cancelled) return
        setComments([])
        setCommentError("Unable to load comments")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  async function loadMoreComments() {
    if (loadingMore || !hasMoreComments) return
    setLoadingMore(true)
    setCommentError("")
    try {
      const data = await fetchCommentPage(commentsPage + 1)
      setComments(current => [...current, ...data.items])
      setCommentsPage(data.page)
      setHasMoreComments(data.hasMore)
    } catch {
      setCommentError("Unable to load comments")
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    if (!drawerSlug) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") closeDrawer()
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", closeOnEscape)
    }
  }, [drawerSlug])

  function doSearch() { setFilter(search); setPage(1) }

  const grouped = comments.reduce<Record<string, CommentGroup>>((acc, comment) => {
    const key = comment.post?.slug || "unknown"
    if (!acc[key]) acc[key] = { title: comment.post?.title || "Unknown", comments: [] }
    acc[key].comments.push(comment)
    return acc
  }, {})

  const allEntries = Object.entries(grouped).filter(([, group]) => !filter || group.title.toLowerCase().includes(filter.toLowerCase()))
  const totalPages = Math.max(1, Math.ceil(allEntries.length / GROUP_PAGE_SIZE))
  const entries = allEntries.slice((page - 1) * GROUP_PAGE_SIZE, page * GROUP_PAGE_SIZE)
  const selectedGroup = drawerSlug ? grouped[drawerSlug] : null
  const groupIds = selectedGroup?.comments.map(comment => comment.id) || []
  const allGroupSelected = groupIds.length > 0 && groupIds.every(id => selectedIds.has(id))

  const commentById = new Map<string, any>()
  const childrenByTarget = new Map<string, any[]>()
  if (selectedGroup) {
    for (const comment of selectedGroup.comments) {
      commentById.set(comment.id, comment)
    }
    for (const comment of selectedGroup.comments) {
      // replyToId is the direct reply target. parentId is retained as a fallback
      // for older comments that only recorded their top-level thread.
      const targetId = replyTargetId(comment, commentById)
      if (targetId) {
        const children = childrenByTarget.get(targetId) || []
        children.push(comment)
        childrenByTarget.set(targetId, children)
      }
    }
  }
  const renderedComments = new Set<string>()

  useEffect(() => {
    if (drawerSlug && !selectedGroup) {
      setDrawerSlug(null)
      setEditId(null)
    }
  }, [drawerSlug, selectedGroup])

  function openDrawer(slug: string) {
    setDrawerSlug(slug)
    setEditId(null)
    setCommentError("")
  }

  function closeDrawer() {
    setDrawerSlug(null)
    setEditId(null)
    setCommentError("")
    setSelectedIds(new Set())
  }

  async function deleteComment(id: string) {
    if (!confirm("Delete?")) return
    if (commentAction) return
    setCommentAction(`delete:${id}`)
    setCommentError("")
    try {
      const res = await fetch("/api/comments", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
      if (!res.ok) { setCommentError("Unable to delete comment"); return }
      setComments(current => {
        const removed = new Set([id])
        let changed = true
        while (changed) {
          changed = false
          for (const comment of current) {
            if (comment.parentId && removed.has(comment.parentId) && !removed.has(comment.id)) {
              removed.add(comment.id)
              changed = true
            }
          }
        }
        return current.filter(comment => !removed.has(comment.id))
      })
      setSelectedIds(current => {
        const next = new Set(current)
        next.delete(id)
        return next
      })
      if (editId === id) {
        setEditId(null)
        setEditContent("")
      }
    } catch {
      setCommentError("Unable to delete comment")
    } finally {
      setCommentAction("")
    }
  }

  async function saveEdit(id: string) {
    if (!editContent.trim() || commentAction) return
    setCommentAction(`edit:${id}`)
    setCommentError("")
    try {
      const res = await fetch("/api/comments", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, content: editContent.trim() }) })
      if (!res.ok) { setCommentError("Unable to save comment"); return }
      setComments(current => current.map(comment => comment.id === id ? { ...comment, content: editContent.trim() } : comment))
      setEditId(null)
      setEditContent("")
    } catch {
      setCommentError("Unable to save comment")
    } finally {
      setCommentAction("")
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds(current => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectGroup() {
    if (!selectedGroup) return
    const ids = selectedGroup.comments.map(comment => comment.id)
    const shouldClear = ids.length > 0 && ids.every(id => selectedIds.has(id))
    setSelectedIds(current => {
      const next = new Set(current)
      for (const id of ids) {
        if (shouldClear) next.delete(id)
        else next.add(id)
      }
      return next
    })
  }

  async function deleteSelected() {
    if (selectedIds.size === 0 || bulkAction) return
    if (!confirm(t.confirmBulkDelete.replace("{{count}}", String(selectedIds.size)))) return
    setBulkAction("delete")
    setCommentError("")
    try {
      const res = await fetch("/api/comments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      if (!res.ok) {
        setCommentError(t.bulkDeleteFailed)
        return
      }
      const idsToRemove = Array.from(selectedIds)
      setComments(current => {
        const removed = new Set(idsToRemove)
        let changed = true
        while (changed) {
          changed = false
          for (const comment of current) {
            if (comment.parentId && removed.has(comment.parentId) && !removed.has(comment.id)) {
              removed.add(comment.id)
              changed = true
            }
          }
        }
        return current.filter(comment => !removed.has(comment.id))
      })
      setSelectedIds(new Set())
    } catch {
      setCommentError(t.bulkDeleteFailed)
    } finally {
      setBulkAction("")
    }
  }

  async function exportComments(postId?: string) {
    if (exporting) return
    setExporting(true)
    setCommentError("")
    try {
      const url = postId
        ? `/api/comments/export?postId=${encodeURIComponent(postId)}`
        : "/api/comments/export"
      const response = await fetch(url)
      if (!response.ok) throw new Error("export failed")
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      const disposition = response.headers.get("content-disposition") || ""
      const filename = /filename="([^"]+)"/.exec(disposition)?.[1] || "comments.csv"
      link.href = objectUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)
    } catch {
      setCommentError(t.exportFailed)
    } finally {
      setExporting(false)
    }
  }

  function renderCommentTree(comment: any, depth = 0, trail = new Set<string>()): ReactNode {
    // Keep malformed or cyclic data from preventing the rest of the drawer from rendering.
    if (trail.has(comment.id)) return null
    renderedComments.add(comment.id)
    const nextTrail = new Set(trail)
    nextTrail.add(comment.id)
    const targetId = replyTargetId(comment, commentById)
    const replyTarget = targetId ? commentById.get(targetId) : null
    const children = childrenByTarget.get(comment.id) || []

    return (
      <div key={comment.id} className={depth > 0 ? "border-l-2 border-pixel-gray-300 dark:border-pixel-gray-700 pl-3 sm:pl-4" : ""}
        style={depth > 0 ? { marginLeft: `${Math.min(depth, 6) * 0.75}rem` } : undefined}>
        <article className="border-b-2 border-pixel-gray-200 dark:border-pixel-gray-800 pb-4">
          {replyTarget && (
            <div className="mb-2 flex items-center gap-1 border-l-2 border-pixel-gray-300 dark:border-pixel-gray-700 pl-2 font-mono text-[10px] uppercase tracking-wider text-pixel-gray-500 dark:text-pixel-gray-400">
              <span>{commentAuthor(comment)}</span>
              <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>@{commentAuthor(replyTarget)}</span>
            </div>
          )}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={selectedIds.has(comment.id)}
              onChange={() => toggleSelected(comment.id)}
              aria-label={`${t.selectComment}: ${commentAuthor(comment)}`}
              className="mt-1 h-3.5 w-3.5 shrink-0 accent-pixel-black dark:accent-pixel-white"
            />
            {comment.user?.image && (
              <PixelImage
                src={comment.user.image}
                alt=""
                aspectRatio={1}
                className="h-7 w-7 shrink-0 rounded-full"
                frameClassName="border"
                imageClassName="object-cover"
                fallback={<span className="block h-full w-full bg-pixel-gray-100 dark:bg-pixel-gray-900" aria-hidden="true" />}
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-mono text-xs">{commentAuthor(comment)}</span>
                <time className="text-[10px] text-pixel-gray-400">{new Date(comment.createdAt).toLocaleString()}</time>
              </div>
              {editId === comment.id ? (
                <div className="space-y-2">
                  <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="text-xs" rows={3} autoFocus />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(comment.id)} title={t.save}><Check className="w-3 h-3 mr-1" />{t.save}</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditId(null); setEditContent("") }} title={t.cancel}><X className="w-3 h-3" /></Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="font-body text-xs text-pixel-gray-600 dark:text-pixel-gray-400 break-words whitespace-pre-wrap">{comment.content}</p>
                  {comment.imageUrl && (
                    <PixelImage
                      src={comment.imageUrl}
                      alt=""
                      aspectRatio={null}
                      className="mt-2 max-w-full"
                      frameClassName="border border-pixel-gray-300"
                      imageClassName="max-h-32 max-w-full object-contain"
                    />
                  )}
                </>
              )}
            </div>
            {editId !== comment.id && (
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => { setEditId(comment.id); setEditContent(comment.content); setCommentError("") }} title={t.edit} aria-label={t.edit}><Pencil className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => deleteComment(comment.id)} title={t.delete} aria-label={t.delete}><Trash2 className="w-3 h-3 text-red-500" /></Button>
              </div>
            )}
          </div>
        </article>
        {children.map(child => renderCommentTree(child, depth + 1, nextTrail))}
      </div>
    )
  }

  if (loading) return <AdminLoading className="min-h-64" />

  return (
    <div>
      <h1 className="font-mono text-sm uppercase tracking-widest mb-6">// {t.commentsMgmt}</h1>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-1 items-center gap-0 max-w-sm min-w-[220px]">
          <input value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && doSearch()}
            placeholder={`${t.title}...`}
            className="flex-1 h-10 border-2 border-r-0 border-pixel-black dark:border-pixel-white bg-transparent px-3 text-sm font-body focus:outline-none" />
          <button onClick={doSearch}
            className="h-10 px-4 border-2 border-pixel-black dark:border-pixel-white bg-pixel-black dark:bg-pixel-white text-pixel-white dark:text-pixel-black font-mono text-xs hover:opacity-80 shrink-0">
            Go !
          </button>
        </div>
        <Button size="sm" variant="outline" onClick={() => exportComments()} disabled={exporting}>
          <Download className="mr-1 h-3 w-3" aria-hidden="true" />
          {exporting ? t.loading : t.exportAllComments}
        </Button>
      </div>

      {commentError && !drawerSlug && <p className="mb-4 border-l-2 border-red-500 pl-2 font-body text-xs text-red-500" role="alert">{commentError}</p>}

      <div className="border-t-2 border-pixel-black dark:border-pixel-white">
        {entries.map(([slug, group]) => {
          const latest = group.comments[group.comments.length - 1]
          return (
            <div key={slug} className="flex items-center gap-4 border-b-2 border-pixel-black dark:border-pixel-white py-4">
              <button onClick={() => openDrawer(slug)} className="flex min-w-0 flex-1 items-start gap-3 text-left hover:opacity-70">
                <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-pixel-gray-500" />
                <span className="min-w-0">
                  <span className="block truncate font-mono text-xs uppercase tracking-wider">{group.title}</span>
                  <span className="mt-1 block truncate font-body text-xs text-pixel-gray-500 dark:text-pixel-gray-400">
                    {group.comments.length} {t.comments}{latest?.content ? ` · ${latest.content}` : ""}
                  </span>
                </span>
              </button>
              <button onClick={() => openDrawer(slug)} title={t.expand} aria-label={`${t.expand}: ${group.title}`}
                className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-pixel-black dark:border-pixel-white hover:bg-pixel-gray-100 dark:hover:bg-pixel-gray-900">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>

      {allEntries.length === 0 && <p className="font-body text-sm text-pixel-gray-500">{t.noComments}</p>}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={() => setPage(current => Math.max(1, current - 1))} disabled={page === 1}
            className="border-2 border-pixel-black dark:border-pixel-white w-8 h-8 flex items-center justify-center disabled:opacity-30 hover:bg-pixel-gray-100 dark:hover:bg-pixel-gray-900">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono text-xs">{page} / {totalPages}</span>
          <button onClick={() => setPage(current => Math.min(totalPages, current + 1))} disabled={page === totalPages}
            className="border-2 border-pixel-black dark:border-pixel-white w-8 h-8 flex items-center justify-center disabled:opacity-30 hover:bg-pixel-gray-100 dark:hover:bg-pixel-gray-900">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {hasMoreComments && (
        <div className="mt-6 flex justify-center">
          <Button size="sm" variant="outline" onClick={loadMoreComments} disabled={loadingMore}>
            {loadingMore ? t.loading : t.loadMoreComments}
          </Button>
        </div>
      )}

      {selectedGroup && (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-labelledby="comments-drawer-title">
          <button className="absolute inset-0 bg-pixel-black/60" onClick={closeDrawer} aria-label={t.cancel} />
          <aside className="pixel-drawer-in absolute right-0 top-0 bottom-0 flex w-full max-w-xl flex-col overflow-hidden border-l-2 border-pixel-black dark:border-pixel-white bg-pixel-white dark:bg-pixel-black text-pixel-black dark:text-pixel-white shadow-[-8px_0_0_#0a0a0a] dark:shadow-[-8px_0_0_#fafafa]" aria-busy={Boolean(commentAction || bulkAction)}>
            {(commentAction || bulkAction) && (
              <AdminLoading
                size="md"
                className="absolute inset-0 z-20 min-h-full bg-pixel-white/95 p-2 backdrop-blur-[1px] dark:bg-pixel-black/95"
              />
            )}
            <header className="flex items-start justify-between gap-4 border-b-2 border-pixel-black dark:border-pixel-white p-4 sm:p-5">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-widest text-pixel-gray-500">// {t.comments}</p>
                <h2 id="comments-drawer-title" className="mt-2 truncate font-mono text-xs uppercase tracking-wider">{selectedGroup.title}</h2>
                <p className="mt-1 font-body text-xs text-pixel-gray-500">{selectedGroup.comments.length} {t.comments}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-2 font-mono text-[10px] uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={allGroupSelected}
                      onChange={toggleSelectGroup}
                      className="h-3.5 w-3.5 accent-pixel-black dark:accent-pixel-white"
                    />
                    {t.selectAll}
                  </label>
                  <span className="font-mono text-[10px] text-pixel-gray-500">{t.selected}: {selectedIds.size}</span>
                  <Button size="sm" variant="destructive" onClick={deleteSelected} disabled={selectedIds.size === 0 || Boolean(bulkAction)}>
                    <Trash2 className="mr-1 h-3 w-3" aria-hidden="true" />
                    {t.bulkDelete}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportComments(selectedGroup.comments[0]?.postId)} disabled={exporting}>
                    <Download className="mr-1 h-3 w-3" aria-hidden="true" />
                    {t.exportComments}
                  </Button>
                </div>
              </div>
              <button onClick={closeDrawer} title={t.cancel} aria-label={t.cancel} className="p-1 hover:bg-pixel-gray-100 dark:hover:bg-pixel-gray-900">
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {commentError && <p className="mb-4 border-l-2 border-red-500 pl-2 font-body text-xs text-red-500" role="alert">{commentError}</p>}
              <div className="space-y-4">
                {(() => {
                  const roots = selectedGroup.comments.filter(comment => {
                    return !replyTargetId(comment, commentById)
                  })
                  const tree = roots.map(comment => {
                    return renderCommentTree(comment)
                  })
                  const unlinked = selectedGroup.comments.filter(comment => !renderedComments.has(comment.id))
                  return [...tree, ...unlinked.map(comment => renderCommentTree(comment))]
                })()}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
