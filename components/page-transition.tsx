"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname() || ""
  const [enabled, setEnabled] = useState(true)
  const slowFrames = useRef(0)

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (media.matches) {
      setEnabled(false)
      return
    }

    let previous = performance.now()
    let frameId = 0
    const sample = (now: number) => {
      const elapsed = now - previous
      previous = now
      slowFrames.current = elapsed > 50 ? slowFrames.current + 1 : 0
      if (slowFrames.current >= 5) {
        setEnabled(false)
        return
      }
      frameId = window.requestAnimationFrame(sample)
    }
    frameId = window.requestAnimationFrame(sample)
    return () => window.cancelAnimationFrame(frameId)
  }, [])

  return (
    <div key={pathname} className={enabled ? "page-transition" : "page-transition page-transition--static"}>
      {children}
    </div>
  )
}
