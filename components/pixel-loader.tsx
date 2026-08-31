"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { buildPixelRingPath, getSnakeSegments, type PixelPoint } from "@/lib/pixel-loader"

interface Props {
  size?: "sm" | "md" | "lg"
  framed?: boolean
  label?: string
}

const SIZES = {
  sm: { w: 220, h: 60, cell: 6 },
  md: { w: 280, h: 70, cell: 8 },
  lg: { w: 340, h: 80, cell: 10 },
} as const

interface CanvasSize {
  width: number
  height: number
}

export function PixelLoader({ size = "md", framed = false, label }: Props) {
  const { w, h, cell } = SIZES[size]
  const [snake, setSnake] = useState<PixelPoint[]>([])
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: w, height: h })
  const [reducedMotion, setReducedMotion] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReducedMotion(media.matches)
    update()
    media.addEventListener?.("change", update)
    return () => media.removeEventListener?.("change", update)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return
      setCanvasSize(current => (
        Math.abs(current.width - rect.width) < 0.5 && Math.abs(current.height - rect.height) < 0.5
          ? current
          : { width: rect.width, height: rect.height }
      ))
    }

    updateSize()
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(updateSize)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [w, h])

  const geometry = useMemo(() => {
    const border = framed ? 0 : 2
    const scale = Math.max(0.01, Math.min(canvasSize.width / w, canvasSize.height / h))
    const renderCell = Math.max(2, cell * scale)
    const points = buildPixelRingPath({
      width: Math.max(4, canvasSize.width - border * 2),
      height: Math.max(4, canvasSize.height - border * 2),
      cell: renderCell,
      padding: renderCell,
    }).map(point => ({ x: point.x + border, y: point.y + border }))
    return { renderCell, points }
  }, [canvasSize, w, h, cell, framed])

  useEffect(() => {
    const path = geometry.points
    const length = Math.min(10, path.length)
    setSnake(getSnakeSegments(path, 0, length))
    if (reducedMotion || path.length === 0) return

    let frame = 0
    let previous = 0
    let carry = 0
    let animationFrame = 0
    const interval = 1000 / 30
    const tick = (now: number) => {
      if (!previous) previous = now
      carry += Math.min(100, now - previous)
      previous = now
      if (carry >= interval) {
        const steps = Math.max(1, Math.floor(carry / interval))
        frame = (frame + steps) % path.length
        carry -= steps * interval
        setSnake(getSnakeSegments(path, frame, length))
      }
      animationFrame = window.requestAnimationFrame(tick)
    }
    animationFrame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [geometry.points, reducedMotion])

  const outerWidth = "min(" + (w + (framed ? 20 : 0)) + "px, 100%)"
  const textSize = size === "sm" ? "text-[9px]" : size === "md" ? "text-[10px]" : "text-[11px]"
  const subTextSize = size === "sm" ? "text-[6px]" : size === "md" ? "text-[8px]" : "text-[9px]"

  return (
    <div
      className={"box-border flex max-w-full min-w-0 select-none flex-col items-center gap-3 overflow-hidden " + (
        framed ? "border-2 border-pixel-black bg-pixel-white p-2 dark:border-pixel-white dark:bg-pixel-black" : ""
      )}
      style={{ width: outerWidth }}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div
        ref={canvasRef}
        data-pixel-loader-canvas
        className={"relative box-border max-w-full overflow-hidden " + (
          framed ? "" : "border-2 border-pixel-gray-300 dark:border-pixel-gray-700"
        )}
        style={{ width: "100%", maxWidth: w + "px", aspectRatio: w + " / " + h }}
      >
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
          {snake.map((segment, index) => (
            <span
              key={index}
              className={
                index === 0
                  ? "absolute bg-pixel-black dark:bg-pixel-white"
                  : index < 3
                  ? "absolute bg-pixel-gray-600 dark:bg-pixel-gray-400"
                  : "absolute bg-pixel-gray-400 dark:bg-pixel-gray-600"
              }
              style={{
                width: Math.max(1, geometry.renderCell - 1) + "px",
                height: Math.max(1, geometry.renderCell - 1) + "px",
                transform: "translate3d(" + segment.x + "px, " + segment.y + "px, 0)",
                opacity: 1 - index * 0.06,
                transition: reducedMotion ? "none" : "transform 0.04s linear",
              }}
            />
          ))}
        </div>

        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div
            className={"relative isolate flex max-w-[calc(100%-16px)] flex-col items-center gap-0.5 bg-pixel-white px-2 py-1 text-center leading-tight dark:bg-pixel-black" + (
              framed ? "" : " sm:px-3"
            )}
          >
            <p className={"whitespace-nowrap font-mono tracking-normal text-pixel-black dark:text-pixel-white " + textSize}>
              多一点兴趣，少一点功利
            </p>
            <p className={"whitespace-nowrap font-mono tracking-normal text-pixel-gray-500 dark:text-pixel-gray-400 " + subTextSize}>
              More interest Less interests
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1" aria-hidden="true">
        {[0, 1, 2, 3, 4].map(index => (
          <span
            key={index}
            className="h-1 w-1 bg-pixel-gray-400 dark:bg-pixel-gray-600 motion-safe:animate-pulse"
            style={{ animationDelay: index * 100 + "ms" }}
          />
        ))}
      </div>
    </div>
  )
}
