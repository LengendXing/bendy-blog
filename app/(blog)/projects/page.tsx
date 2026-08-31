"use client"
import { useEffect, useState, useRef, useCallback } from "react"
import { ExternalLink } from "lucide-react"
import { useLocale } from "@/components/locale-provider"
import { PixelImage } from "@/components/pixel-image"
import { ProjectListSkeleton } from "@/components/pixel-skeleton"
import { useDelayedLoading } from "@/components/use-delayed-loading"

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
  const [loadError, setLoadError] = useState(false)
  const [barrages, setBarrages] = useState<BarrageItem[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number | null>(null)
  const hoveredRef = useRef<string | null>(null)
  const lastFrameRef = useRef(0)
  const [reducedMotion, setReducedMotion] = useState(false)
  const showSkeleton = useDelayedLoading(loading)

  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/projects", { signal: controller.signal })
      .then(async response => {
        const data = await response.json().catch(() => null)
        if (!response.ok || !Array.isArray(data)) throw new Error("projects request failed")
        if (!controller.signal.aborted) setProjects(data)
      })
      .catch(err => {
        if (err?.name !== "AbortError") {
          console.error("Failed to fetch projects:", err)
          setLoadError(true)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReducedMotion(media.matches)
    update()
    media.addEventListener?.("change", update)
    return () => media.removeEventListener?.("change", update)
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
    const now = performance.now()
    if (now - lastFrameRef.current < 1000 / 30) {
      animationRef.current = requestAnimationFrame(animate)
      return
    }
    lastFrameRef.current = now
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
    if (barrages.length > 0 && !reducedMotion) {
      lastFrameRef.current = 0
      animationRef.current = requestAnimationFrame(animate)
      return () => {
        if (animationRef.current !== null) {
          cancelAnimationFrame(animationRef.current)
          animationRef.current = null
        }
      }
    }
    return undefined
  }, [barrages.length, animate, reducedMotion])

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

      {loadError && <p className="mb-4 text-center font-body text-xs text-red-500" role="alert">{t.loadFailed}</p>}
      {showSkeleton ? (
        <div className="pixel-content-transition" aria-busy="true"><ProjectListSkeleton /></div>
      ) : loading ? (
        <div className="min-h-[300px]" aria-busy="true" />
      ) : projects.length === 0 ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <p className="font-body text-pixel-gray-500">{t.noProjectsYet}</p>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="pixel-content-transition relative w-full"
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
                    <PixelImage
                      src={b.logoUrl}
                      alt=""
                      aspectRatio={1}
                      className="h-10 w-10 shrink-0"
                      frameClassName="border-2 border-pixel-gray-300 dark:border-pixel-gray-700"
                      imageClassName="object-cover"
                      fallback={<span className="block h-full w-full bg-pixel-gray-100 dark:bg-pixel-gray-900" aria-hidden="true" />}
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
