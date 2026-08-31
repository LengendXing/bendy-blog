"use client"

import { useEffect, useState } from "react"
import { clampDelay, LIST_SKELETON_DELAY_MS } from "@/lib/loading"

/** Show a loading surface only when a request crosses the UX threshold. */
export function useDelayedLoading(loading: boolean, delay = LIST_SKELETON_DELAY_MS, resetKey?: unknown) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!loading) {
      setVisible(false)
      return
    }

    setVisible(false)
    const timer = window.setTimeout(() => setVisible(true), clampDelay(delay))
    return () => window.clearTimeout(timer)
  }, [delay, loading, resetKey])

  return visible
}
