"use client"
import { useEffect, useRef, useState } from "react"

interface Props {
  size?: "sm" | "md" | "lg"
  framed?: boolean
}

export function PixelLoader({ size = "md", framed = false }: Props) {
  const [snake, setSnake] = useState<{ x: number; y: number }[]>([])
  const canvasRef = useRef<HTMLDivElement>(null)

  const sizes = {
    sm: { w: 220, h: 60, cell: 6 },
    md: { w: 280, h: 70, cell: 8 },
    lg: { w: 340, h: 80, cell: 10 }
  }

  const { w, h, cell } = sizes[size]
  const [canvasSize, setCanvasSize] = useState({ width: w, height: h })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const updateWidth = () => {
      const rect = canvas.getBoundingClientRect()
      setCanvasSize(current => (
        Math.abs(current.width - rect.width) < 0.5 && Math.abs(current.height - rect.height) < 0.5
          ? current
          : { width: rect.width, height: rect.height }
      ))
    }

    updateWidth()
    if (typeof ResizeObserver === "undefined") return

    const observer = new ResizeObserver(updateWidth)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [w])

  useEffect(() => {
    const border = framed ? 0 : 2
    const contentW = canvasSize.width - border * 2
    const contentH = canvasSize.height - border * 2
    const scale = Math.min(canvasSize.width / w, canvasSize.height / h)
    const renderCell = Math.max(2, cell * scale)
    const padding = renderCell
    // Keep the ring on the outside edges. Centering a discrete grid leaves
    // extra space above it, which moves the top rail into the slogan area.
    const left = padding
    const right = Math.max(left + renderCell, contentW - padding - renderCell)
    const top = padding
    const bottom = Math.max(top + renderCell, contentH - padding - renderCell)
    const columns = Math.max(2, Math.floor((right - left) / renderCell) + 1)
    const rows = Math.max(2, Math.floor((bottom - top) / renderCell) + 1)
    const xAt = (index: number) => Math.round(left + (right - left) * index / (columns - 1))
    const yAt = (index: number) => Math.round(top + (bottom - top) * index / (rows - 1))

    const path: { x: number; y: number }[] = []

    for (let i = 0; i < columns; i++) {
      path.push({ x: xAt(i), y: top })
    }
    for (let i = 1; i < rows; i++) {
      path.push({ x: right, y: yAt(i) })
    }
    for (let i = columns - 2; i >= 0; i--) {
      path.push({ x: xAt(i), y: bottom })
    }
    for (let i = rows - 2; i > 0; i--) {
      path.push({ x: left, y: yAt(i) })
    }

    const snakeLength = 10
    let frame = 0

    const timer = setInterval(() => {
      const newSnake: { x: number; y: number }[] = []
      for (let i = 0; i < snakeLength; i++) {
        const idx = (frame - i + path.length) % path.length
        newSnake.push(path[idx])
      }
      setSnake(newSnake)
      frame++
    }, 50)

    return () => clearInterval(timer)
  }, [canvasSize, w, h, cell, framed])

  const scale = Math.min(canvasSize.width / w, canvasSize.height / h)
  const renderCell = Math.max(2, cell * scale)

  return (
    <div
      className={`box-border flex max-w-full min-w-0 flex-col items-center gap-3 overflow-hidden ${
        framed
          ? "border-2 border-pixel-black bg-pixel-white p-2 dark:border-pixel-white dark:bg-pixel-black"
          : ""
      }`}
      style={{ width: `min(${w + (framed ? 20 : 0)}px, 100%)` }}
    >
      <div
        ref={canvasRef}
        className={`relative box-border max-w-full overflow-hidden ${
          framed ? "" : "border-2 border-pixel-gray-300 dark:border-pixel-gray-700"
        }`}
        style={{ width: "100%", maxWidth: `${w}px`, aspectRatio: `${w} / ${h}` }}
      >
        {snake.map((seg, i) => (
          <div
            key={i}
            className={`absolute rounded-sm ${
              i === 0
                ? "bg-pixel-black dark:bg-pixel-white"
                : i < 3
                ? "bg-pixel-gray-600 dark:bg-pixel-gray-400"
                : "bg-pixel-gray-400 dark:bg-pixel-gray-600"
            }`}
            style={{
              left: `${seg.x}px`,
              top: `${seg.y}px`,
              width: `${Math.max(1, renderCell - 1)}px`,
              height: `${Math.max(1, renderCell - 1)}px`,
              opacity: 1 - i * 0.06,
              transition: "all 0.05s linear"
            }}
          />
        ))}

        <div className={`absolute inset-0 flex items-center justify-center ${framed ? "overflow-hidden" : ""}`}>
          <div className={`relative z-10 ${framed
            ? "flex max-w-full flex-col items-center gap-0.5 bg-pixel-white px-1 text-center leading-tight dark:bg-pixel-black"
            : "flex flex-col items-center gap-0.5 bg-pixel-white px-8 dark:bg-pixel-black"
          }`}>
            <p className={framed
              ? `max-w-full font-mono text-pixel-black dark:text-pixel-white tracking-normal ${size === "sm" ? "text-[9px]" : size === "md" ? "text-[10px]" : "text-[11px]"}`
              : "whitespace-nowrap font-mono text-[11px] tracking-widest text-pixel-black dark:text-pixel-white"
            }>
              多一点兴趣，少一点功利
            </p>
            <p className={framed
              ? `max-w-full font-mono text-pixel-gray-500 dark:text-pixel-gray-400 tracking-normal ${size === "sm" ? "text-[6px]" : size === "md" ? "text-[8px]" : "text-[9px]"}`
              : "whitespace-nowrap font-mono text-[9px] tracking-wide text-pixel-gray-500 dark:text-pixel-gray-400"
            }>
              More interest Less interests
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-1 h-1 bg-pixel-gray-400 dark:bg-pixel-gray-600 rounded-full animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
