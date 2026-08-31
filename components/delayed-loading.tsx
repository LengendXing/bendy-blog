"use client"

import { useEffect, useState, type ReactNode } from "react"
import { clampDelay, LIST_SKELETON_DELAY_MS } from "@/lib/loading"

interface DelayedLoadingProps {
  children: ReactNode
  delay?: number
  minHeightClassName?: string
}

/** Delay a route fallback so fast server responses never flash a loader. */
export function DelayedLoading({ children, delay = LIST_SKELETON_DELAY_MS, minHeightClassName = "min-h-[280px]" }: DelayedLoadingProps) {
  const [visible, setVisible] = useState(delay <= 0)

  useEffect(() => {
    if (delay <= 0) {
      setVisible(true)
      return
    }
    setVisible(false)
    const timer = window.setTimeout(() => setVisible(true), clampDelay(delay))
    return () => window.clearTimeout(timer)
  }, [delay])

  if (visible) return <>{children}</>
  return <div className={minHeightClassName} aria-busy="true" aria-hidden="true" />
}
