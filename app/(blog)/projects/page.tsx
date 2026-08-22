"use client"
import { useEffect, useState, useRef, useCallback } from "react"
import { ExternalLink } from "lucide-react"
import { useLocale } from "@/components/locale-provider"
import { PixelLoader } from "@/components/pixel-loader"

const CLASSIC_EMOJIS = [
  "😊", "😄", "😃", "😆", "😂", "🤣", "😊", "😎", "🤩", "😋",
  "😜", "🤪", "😝", "😏", "😌", "😁", "😀", "🤔", "👀", "🔥",
  "✨", "💪", "👍", "🤙", "👏", "🙌", "✌️", "🤟", "😘", "🥳",
  "😊", "🥰", "😍", "🤗", "🙃", "😁", "🤭", "🤭", "😅", "🤣",
]

interface Project {
  id: string
  title: string
  description?: string
  url?: string
  logoUrl?: string
}

interface BarrageItem extends Project {
  x: number
  speed: number
  row: number
  hovered: boolean
  scale: number
  emoji: string
}

export default function ProjectsPage() {
  const { t } = useLocale()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [barrages, setBarrages] = useState<BarrageItem[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()
  const hoveredRef = useRef<string | null>(null)

  useEffect(() => {
    fetch("/api/projects")
      .then(r => r.json())
      .then(data => {
        setProjects(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(err => {
        console.error("Failed to fetch projects:", err)
        setProjects([])
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (projects.length === 0) return

    const containerWidth = containerRef.current?.clientWidth || 1200
    const rows = 3

    const initialBarrages: BarrageItem[] = projects.map((p, i) => ({
      ...p,
      x: Math.random() * containerWidth * 2 - containerWidth,
      speed: 0.5 + Math.random() * 1.5,
      row: i % rows,
      hovered: false,
      scale: 1,
      emoji: CLASSIC_EMOJIS[Math.floor(Math.random() * CLASSIC_EMOJIS.length)],
    }))

    setBarrages(initialBarrages)
  }, [projects])

  const animate = useCallback(() => {
    if (!containerRef.current) return
    const containerWidth = containerRef.current.clientWidth
    const cardWidth = 280

    setBarrages(prev => prev.map(b => {
      let newX = b.x
      let newSpeed = b.speed
      let newScale = b.scale

      if (hoveredRef.current === b.id) {
        newScale = Math.min(1.2, newScale + 0.02)
      } else {
        newScale = Math.max(1, newScale - 0.02)
        if (Math.random() < 0.001) {
          newSpeed = 0.3 + Math.random() * 2
        }
        newX = b.x - b.speed
        if (newX < -cardWidth) {
          newX = containerWidth + Math.random() * 200
          newSpeed = 0.3 + Math.random() * 2
        }
      }

      return { ...b, x: newX, speed: newSpeed, scale: newScale }
    }))

    animationRef.current = requestAnimationFrame(animate)
  }, [])

  useEffect(() => {
    if (barrages.length > 0) {
      animationRef.current = requestAnimationFrame(animate)
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
        }
      }
    }
  }, [barrages.length, animate])

  const handleMouseEnter = (id: string) => {
    hoveredRef.current = id
  }

  const handleMouseLeave = () => {
    hoveredRef.current = null
  }

  const rowHeight = 120

  return (
    <div className="min-h-screen overflow-hidden">
      <div className="max-w-full px-4 py-10 sm:py-16">
        <h1 className="font-mono text-base sm:text-lg uppercase tracking-widest mb-8 sm:mb-12 text-center">// {t.projects}</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <PixelLoader size="lg" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <p className="font-body text-pixel-gray-500">{t.noProjectsYet}</p>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="relative w-full"
          style={{ height: `${rowHeight * 3}px` }}
        >
          {barrages.map(b => (
            <div
              key={b.id}
              className="absolute transition-transform duration-200 ease-out"
              style={{
                left: `${b.x}px`,
                top: `${b.row * rowHeight + 10}px`,
                transform: `scale(${b.scale})`,
                zIndex: hoveredRef.current === b.id ? 100 : 10,
              }}
              onMouseEnter={() => handleMouseEnter(b.id)}
              onMouseLeave={handleMouseLeave}
            >
              <a
                href={b.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="group block border-2 border-pixel-black dark:border-pixel-white bg-pixel-white dark:bg-pixel-black p-4 w-[260px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-shadow relative"
              >
                <span className="absolute -top-2 -right-2 text-3xl leading-none animate-bounce" style={{ animationDuration: '2s' }}>{b.emoji}</span>
                <div className="flex items-start gap-3">
                  {b.logoUrl ? (
                    <img
                      src={b.logoUrl}
                      alt=""
                      className="w-10 h-10 border-2 border-pixel-gray-300 dark:border-pixel-gray-700 shrink-0 object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 border-2 border-pixel-black dark:border-pixel-white flex items-center justify-center bg-pixel-gray-100 dark:bg-pixel-gray-900">
                      <span className="font-mono text-xs">{b.title[0]?.toUpperCase() || "?"}</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs uppercase truncate">{b.title}</span>
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                    {b.description && (
                      <p className="font-body text-[10px] text-pixel-gray-500 mt-1 line-clamp-2">{b.description}</p>
                    )}
                  </div>
                </div>
              </a>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-center py-8">
        <div className="flex gap-1">
          {[0,1,2,3,4].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 bg-pixel-gray-300 dark:bg-pixel-gray-700"
            />
          ))}
        </div>
      </div>
    </div>
  )
}
