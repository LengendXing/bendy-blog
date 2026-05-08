"use client"
import { useEffect, useState } from "react"

interface Props {
  size?: "sm" | "md" | "lg"
}

export function PixelLoader({ size = "md" }: Props) {
  const [snake, setSnake] = useState<{ x: number; y: number }[]>([])
  const [head, setHead] = useState(0)

  const sizes = {
    sm: { w: 220, h: 60, cell: 6 },
    md: { w: 280, h: 70, cell: 8 },
    lg: { w: 340, h: 80, cell: 10 }
  }

  const { w, h, cell } = sizes[size]

  useEffect(() => {
    const padding = cell
    const innerW = w - padding * 2
    const innerH = h - padding * 2

    const perimeter = 2 * (innerW + innerH) / cell
    const path: { x: number; y: number }[] = []

    for (let i = 0; i < innerW / cell; i++) {
      path.push({ x: padding + i * cell, y: padding })
    }
    for (let i = 0; i < innerH / cell; i++) {
      path.push({ x: w - padding - cell, y: padding + i * cell })
    }
    for (let i = innerW / cell - 1; i >= 0; i--) {
      path.push({ x: padding + i * cell, y: h - padding - cell })
    }
    for (let i = innerH / cell - 1; i >= 0; i--) {
      path.push({ x: padding, y: padding + i * cell })
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
      setHead(frame % path.length)
      frame++
    }, 50)

    return () => clearInterval(timer)
  }, [w, h, cell])

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative border-2 border-pixel-gray-300 dark:border-pixel-gray-700"
        style={{ width: `${w}px`, height: `${h}px` }}
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
              width: `${cell - 1}px`,
              height: `${cell - 1}px`,
              opacity: 1 - i * 0.06,
              transition: "all 0.05s linear"
            }}
          />
        ))}

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-0.5 px-8">
            <p className="font-mono text-[11px] text-pixel-black dark:text-pixel-white tracking-widest whitespace-nowrap">
              多一点兴趣，少一点功利
            </p>
            <p className="font-mono text-[9px] text-pixel-gray-500 dark:text-pixel-gray-400 tracking-wide whitespace-nowrap">
              More interest, less utility
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
