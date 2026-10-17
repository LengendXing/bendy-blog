"use client"

import { useEffect, useRef } from "react"

export function confirmDiscardChanges(message: string): boolean {
  if (typeof window === "undefined") return true
  return window.confirm(message)
}

/**
 * Warn before leaving an admin form with unsaved edits.
 * Covers tab close/refresh (beforeunload) and same-origin anchor navigation
 * (sidebar links, back-to-blog links). Programmatic router.push callers must
 * call `confirmDiscardChanges` themselves before navigating.
 */
export function useUnsavedChanges(dirty: boolean, message: string): void {
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirtyRef.current) return
      event.preventDefault()
      event.returnValue = message
      return message
    }

    function handleClick(event: MouseEvent) {
      if (!dirtyRef.current || event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest("a[href]")
      if (!(anchor instanceof HTMLAnchorElement)) return
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return
      const href = anchor.getAttribute("href")
      if (!href || href.startsWith("#")) return
      let destination: URL
      try {
        destination = new URL(href, window.location.href)
      } catch {
        return
      }
      if (destination.origin !== window.location.origin) return
      if (destination.pathname === window.location.pathname && destination.search === window.location.search) return
      if (!window.confirm(message)) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    document.addEventListener("click", handleClick, true)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      document.removeEventListener("click", handleClick, true)
    }
  }, [message])
}
