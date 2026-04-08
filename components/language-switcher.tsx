"use client"
import { useLocale } from "./locale-provider"
import { locales, localeNames } from "@/lib/i18n"
import { Globe } from "lucide-react"
import { useState, useRef, useEffect } from "react"

export function LanguageSwitcher({ compact }: { compact?: boolean }) {
  const { locale, setLocale } = useLocale()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1 font-mono text-xs hover:opacity-70 p-1">
        <Globe className="w-4 h-4" />
        {!compact && <span>{localeNames[locale]}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 border-2 border-pixel-black dark:border-pixel-white bg-pixel-white dark:bg-pixel-black z-50 min-w-[120px]">
          {locales.map(l => (
            <button key={l} onClick={() => { setLocale(l); setOpen(false) }}
              className={`block w-full text-left px-3 py-1.5 font-body text-xs hover:bg-pixel-gray-100 dark:hover:bg-pixel-gray-900 ${locale === l ? "bg-pixel-gray-100 dark:bg-pixel-gray-900" : ""}`}>
              {localeNames[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
