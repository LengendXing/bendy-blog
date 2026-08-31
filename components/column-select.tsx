"use client"
import { useState, useRef, useEffect } from "react"
import { ChevronDown, Pencil } from "lucide-react"

interface Props {
  columns: Array<{ id: string; name: string }>
  value: string | null
  onChange: (id: string | null) => void
  onCreate?: (name: string) => Promise<{ id: string; name: string } | null>
  onUpdate?: (id: string, name: string) => Promise<{ id: string; name: string } | null>
  placeholder?: string
  allowCreate?: boolean
  borderless?: boolean
}

export function ColumnSelect({ columns, value, onChange, onCreate, onUpdate, placeholder, allowCreate, borderless }: Props) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  const selected = columns.find(c => c.id === value)

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [])

  async function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && input.trim() && allowCreate && onCreate) {
      e.preventDefault()
      const name = input.trim()
      if (name.length > 6) return
      const col = await onCreate(name)
      if (col) { onChange(col.id); setInput(""); setOpen(false) }
    }
  }

  function startEdit(c: { id: string; name: string }, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingId(c.id)
    setEditName(c.name)
  }

  async function saveEdit() {
    if (!editingId || !editName.trim() || !onUpdate) return
    if (editName.trim().length > 6) return
    const col = await onUpdate(editingId, editName.trim())
    if (col) {
      setEditingId(null)
      setEditName("")
    }
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName("")
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 px-3 py-1.5 font-mono text-xs hover:bg-pixel-gray-100 dark:hover:bg-pixel-gray-900 min-w-[100px] ${
          borderless ? "border-0" : "border-2 border-pixel-black dark:border-pixel-white"
        }`}>
        <span className="truncate">{selected?.name || placeholder || "All"}</span>
        <ChevronDown className="w-3 h-3 shrink-0" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 border-2 border-pixel-black dark:border-pixel-white bg-pixel-white dark:bg-pixel-black z-50 min-w-[140px] max-h-[200px] overflow-auto">
          <button onClick={() => { onChange(null); setOpen(false) }}
            className={`block w-full text-left px-3 py-1.5 font-mono text-xs hover:bg-pixel-gray-100 dark:hover:bg-pixel-gray-900 ${!value ? "bg-pixel-gray-100 dark:bg-pixel-gray-900" : ""}`}>
            {placeholder || "All"}
          </button>
          {columns.map(c => (
            <div key={c.id} className="flex items-center justify-between hover:bg-pixel-gray-100 dark:hover:bg-pixel-gray-900 group">
              {editingId === c.id ? (
                <div className="flex items-center gap-1 px-2 py-1 w-full">
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit() }}
                    maxLength={6}
                    className="w-full bg-transparent font-mono text-xs focus:outline-none border-b border-pixel-black dark:border-pixel-white"
                    autoFocus
                  />
                  <button onClick={saveEdit} className="font-mono text-[10px] text-green-600 hover:underline">ok</button>
                </div>
              ) : (
                <>
                  <button onClick={() => { onChange(c.id); setOpen(false) }}
                    className={`flex-1 text-left px-3 py-1.5 font-mono text-xs ${value === c.id ? "bg-pixel-gray-100 dark:bg-pixel-gray-900" : ""}`}>
                    {c.name}
                  </button>
                  {allowCreate && onUpdate && (
                    <button
                      onClick={(e) => startEdit(c, e)}
                      className="px-2 py-1.5 opacity-0 group-hover:opacity-100 hover:bg-pixel-gray-200 dark:hover:bg-pixel-gray-800"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
          {allowCreate && (
            <div className="border-t border-pixel-gray-200 dark:border-pixel-gray-800 px-2 py-1">
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="新建↵ (≤6字)"
                className="w-full bg-transparent font-mono text-xs focus:outline-none py-1 px-1" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
