"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Trash2, Pencil, Check, X, Plus, ChevronLeft, ChevronRight, MessageSquare, ArrowRight } from "lucide-react"
import { useLocale } from "@/components/locale-provider"
import { AdminLoading } from "@/components/admin-loading"

const PAGE_SIZE = 15

type CommentGroup = {
  title: string
  comments: any[]
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
  const [commentError, setCommentError] = useState("")
  const [commentAction, setCommentAction] = useState("")

  useEffect(() => {
    fetch("/api/comments")
      .then(async response => {
        const data = await response.json().catch(() => null)
        if (!response.ok || !Array.isArray(data)) {
          setComments([])
          setCommentError("Unable to load comments")
        } else {
          setComments(data)
        }
        setLoading(false)
      })
      .catch(() => {
        setComments([])
        setCommentError("Unable to load comments")
        setLoading(false)
      })
  }, [])

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
  const totalPages = Math.max(1, Math.ceil(allEntries.length / PAGE_SIZE))
  const entries = allEntries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const selectedGroup = drawerSlug ? grouped[drawerSlug] : null

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
            {comment.user?.image && <img src={comment.user.image} alt="" className="w-7 h-7 rounded-full border shrink-0" />}
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
                  {comment.imageUrl && <img src={comment.imageUrl} alt="" className="max-h-32 border border-pixel-gray-300 mt-2" onError={e => (e.currentTarget.style.display = "none")} />}
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

      <div className="flex items-center gap-0 mb-4 max-w-sm">
        <input value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === "Enter" && doSearch()}
          placeholder={`${t.title}...`}
          className="flex-1 h-10 border-2 border-r-0 border-pixel-black dark:border-pixel-white bg-transparent px-3 text-sm font-body focus:outline-none" />
        <button onClick={doSearch}
          className="h-10 px-4 border-2 border-pixel-black dark:border-pixel-white bg-pixel-black dark:bg-pixel-white text-pixel-white dark:text-pixel-black font-mono text-xs hover:opacity-80 shrink-0">
          Go !
        </button>
      </div>

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

      {selectedGroup && (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-labelledby="comments-drawer-title">
          <button className="absolute inset-0 bg-pixel-black/60" onClick={closeDrawer} aria-label={t.cancel} />
          <aside className="pixel-drawer-in absolute right-0 top-0 bottom-0 flex w-full max-w-xl flex-col overflow-hidden border-l-2 border-pixel-black dark:border-pixel-white bg-pixel-white dark:bg-pixel-black text-pixel-black dark:text-pixel-white shadow-[-8px_0_0_#0a0a0a] dark:shadow-[-8px_0_0_#fafafa]" aria-busy={Boolean(commentAction)}>
            {commentAction && (
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
