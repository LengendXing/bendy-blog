"use client"
import { useState, useRef, useEffect } from "react"
import { ChevronDown } from "lucide-react"

interface Props {
  columns: Array<{ id: string; name: string }>
  value: string | null
  onChange: (id: string | null) => void
  onCreate?: (name: string) => Promise<{ id: string; name: string } | null>
  placeholder?: string
  allowCreate?: boolean
}

export function ColumnSelect({ columns, value, onChange, onCreate, placeholder, allowCreate }: Props) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
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

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-1 border-2 border-pixel-black dark:border-pixel-white px-3 py-1.5 font-mono text-xs hover:bg-pixel-gray-100 dark:hover:bg-pixel-gray-900 min-w-[100px]">
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
            <button key={c.id} onClick={() => { onChange(c.id); setOpen(false) }}
              className={`block w-full text-left px-3 py-1.5 font-mono text-xs hover:bg-pixel-gray-100 dark:hover:bg-pixel-gray-900 ${value === c.id ? "bg-pixel-gray-100 dark:bg-pixel-gray-900" : ""}`}>
              {c.name}
            </button>
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
