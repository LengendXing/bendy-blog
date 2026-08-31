"use client"
import { useEffect, useState } from "react"
import { useLocale } from "@/components/locale-provider"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { PixelImage, PixelMarkdownImage } from "@/components/pixel-image"
import { AboutSkeleton } from "@/components/pixel-skeleton"
import { MarkdownTable } from "@/components/markdown-table"

interface AboutContent {
  name?: string
  bio?: string
  avatar?: string
  markdown?: string
  links?: Record<string, string>
}

export default function AboutPage() {
  const { locale, t } = useLocale()
  const [content, setContent] = useState<AboutContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setLoadError(false)
    fetch(`/api/about?locale=${locale}`, { signal: controller.signal })
      .then(async response => {
        const data = await response.json().catch(() => null)
        if (!response.ok || !data || typeof data !== "object") throw new Error("about request failed")
        return data as AboutContent
      })
      .then(data => {
        if (!controller.signal.aborted) setContent(data)
      })
      .catch(err => {
        if (err?.name !== "AbortError") {
          console.error("Failed to fetch about:", err)
          setContent(null)
          setLoadError(true)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [locale])

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="font-mono text-lg uppercase tracking-widest mb-12">// {t.about}</h1>
      {loading ? (
        <AboutSkeleton />
      ) : (
        <div key={`about-content-${locale}`} className="pixel-content-transition">
      {loadError && <p className="mb-6 font-body text-xs text-red-500" role="alert">{t.loadFailed}</p>}
      {content?.avatar && (
        <div className="mb-8">
          <PixelImage
            src={content.avatar}
            alt={content.name || t.about}
            aspectRatio={1}
            width={96}
            height={96}
            className="h-24 w-24"
            frameClassName="border-2 border-pixel-black dark:border-pixel-white"
            imageClassName="object-cover"
            fallback={<span className="block h-full w-full bg-pixel-gray-100 dark:bg-pixel-gray-900" aria-hidden="true" />}
          />
        </div>
      )}
      {content?.name && <h2 className="font-mono text-base mb-2">{content.name}</h2>}
      {content?.bio && <p className="font-body text-sm text-pixel-gray-600 dark:text-pixel-gray-400 mb-6">{content.bio}</p>}
      {content?.links && (
        <div className="flex gap-4 mb-8">
          {Object.entries(content.links).map(([label, url]) => (
            <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="font-mono text-xs uppercase border-b-2 border-pixel-black dark:border-pixel-white hover:opacity-70">
              {label}
            </a>
          ))}
        </div>
      )}
      {content?.markdown && (
        <div className="prose-pixel pixel-content-transition">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ table: MarkdownTable, img: PixelMarkdownImage }}>{content.markdown}</ReactMarkdown>
        </div>
      )}
      {!content?.name && !content?.markdown && <p className="font-body text-pixel-gray-500">{t.aboutNotConfigured}</p>}
        </div>
      )}
    </div>
  )
}
