"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "@/components/locale-provider"
import { filterPostsByTitle, getPageCount, paginateItems } from "@/lib/admin-content"
import type { AdminColumn, AdminPost, CreateStage, ImportResult } from "./types"

const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function readArray<T>(response: Response): Promise<T[]> {
  const data = await response.json().catch(() => null)
  return Array.isArray(data) ? data : []
}

/** Owns the admin content page state and side effects; the page only renders. */
export function useContentPage() {
  const { t } = useLocale()
  const router = useRouter()
  const [allPosts, setAllPosts] = useState<AdminPost[]>([])
  const [columns, setColumns] = useState<AdminColumn[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newSlug, setNewSlug] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newColumnId, setNewColumnId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createStage, setCreateStage] = useState<CreateStage>(null)
  const [createError, setCreateError] = useState("")
  const [showImport, setShowImport] = useState(false)
  const [importing, setImporting] = useState(false)
  const [deletingPost, setDeletingPost] = useState(false)
  const [columnAction, setColumnAction] = useState(false)
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchActive, setSearchActive] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/blog").then(response => readArray<AdminPost>(response)),
      fetch("/api/columns").then(response => readArray<AdminColumn>(response)),
    ])
      .then(([posts, loadedColumns]) => {
        setAllPosts(posts)
        setColumns(loadedColumns)
      })
      .catch(() => {
        setAllPosts([])
        setColumns([])
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!showNew && !createStage) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = previousOverflow }
  }, [showNew, createStage])

  const filtered = filterPostsByTitle(allPosts, searchActive)
  const totalPages = getPageCount(filtered.length)
  const posts = paginateItems(filtered, page)

  function doSearch() {
    setSearchActive(search)
    setPage(1)
  }

  async function createColumn(name: string): Promise<AdminColumn | null> {
    if (columnAction) return null
    setColumnAction(true)
    try {
      const res = await fetch("/api/columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) return null
      const column: AdminColumn = await res.json()
      setColumns(current => current.some(item => item.id === column.id) ? current : [...current, column])
      return column
    } finally {
      setColumnAction(false)
    }
  }

  async function updateColumn(id: string, name: string): Promise<AdminColumn | null> {
    if (columnAction) return null
    setColumnAction(true)
    try {
      const res = await fetch("/api/columns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name }),
      })
      if (!res.ok) return null
      const column: AdminColumn = await res.json()
      setColumns(current => current.map(item => item.id === id ? column : item))
      return column
    } finally {
      setColumnAction(false)
    }
  }

  function resetNewPost() {
    setNewSlug("")
    setNewTitle("")
    setNewDescription("")
    setNewColumnId(null)
    setCreateError("")
  }

  async function createPost(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    if (creating) return
    if (!newSlug.trim() || !newTitle.trim()) {
      setCreateError(`${t.title} and ${t.slug} are required.`)
      return
    }

    setCreating(true)
    setCreateError("")
    setCreateStage("saving")
    try {
      const res = await fetch("/api/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: newSlug.trim(),
          title: newTitle.trim(),
          description: newDescription.trim() || null,
          content: `# ${newTitle.trim()}\n\nStart writing...`,
          columnId: newColumnId,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || "Unable to create post")

      setShowNew(false)
      resetNewPost()
      setCreateStage("refreshing")
      const refreshed = await fetch("/api/blog")
      if (refreshed.ok) setAllPosts(await readArray<AdminPost>(refreshed))
      setPage(1)
      setCreateStage("opening")
      await pause(650)
      router.push(`/admin/content/edit?id=${payload.id}`)
    } catch (error) {
      setCreateStage(null)
      setCreating(false)
      setShowNew(true)
      setCreateError(error instanceof Error ? error.message : "Unable to create post")
    }
  }

  function editPost(id: string) {
    router.push(`/admin/content/edit?id=${id}`)
  }

  async function deletePost(id: string) {
    if (!confirm("Delete?")) return
    setDeletingPost(true)
    try {
      await fetch("/api/blog", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      setAllPosts(current => current.filter(post => post.id !== id))
    } finally {
      setDeletingPost(false)
    }
  }

  async function refreshAfterImport() {
    const [refreshedPosts, refreshedColumns] = await Promise.all([
      readArray<AdminPost>(await fetch("/api/blog")),
      readArray<AdminColumn>(await fetch("/api/columns")),
    ])
    setAllPosts(refreshedPosts)
    setColumns(refreshedColumns)
  }

  async function handleImport() {
    const files = fileInputRef.current?.files
    if (!files || files.length === 0) return
    setImporting(true)
    setImportResults(null)
    const formData = new FormData()
    for (const file of Array.from(files)) formData.append("files", file)
    try {
      const res = await fetch("/api/import", { method: "POST", body: formData })
      const data = await res.json()
      setImportResults(data.results || [])
      await refreshAfterImport()
    } catch {
      setImportResults([{ filename: "error", status: "error", error: "Import failed" }])
    }
    setImporting(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return {
    allPosts, columns, loading, showNew, setShowNew,
    newTitle, setNewTitle, newSlug, setNewSlug, newDescription, setNewDescription,
    newColumnId, setNewColumnId, creating, createStage, createError, setCreateError,
    showImport, setShowImport, importing, deletingPost, columnAction, importResults, setImportResults,
    page, setPage, search, setSearch, fileInputRef,
    posts, filteredCount: filtered.length, totalPages,
    doSearch, createColumn, updateColumn, resetNewPost, createPost, editPost, deletePost, handleImport,
  }
}
