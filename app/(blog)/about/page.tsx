"use client"
import { useEffect, useState } from "react"
import { useLocale } from "@/components/locale-provider"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { PixelLoader } from "@/components/pixel-loader"
import { MarkdownTable } from "@/components/markdown-table"

export default function AboutPage() {
  const { locale, t } = useLocale()
  const [content, setContent] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/about?locale=${locale}`)
      .then(r => r.json())
      .then(data => {
        setContent(data)
        setLoading(false)
      })
      .catch(err => {
        console.error("Failed to fetch about:", err)
        setContent({})
        setLoading(false)
      })
  }, [locale])

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="font-mono text-lg uppercase tracking-widest mb-12">// {t.about}</h1>
      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <PixelLoader size="md" />
        </div>
      ) : (
        <>
      {content.avatar && (
        <div className="mb-8">
          <img src={content.avatar} alt="avatar" className="w-24 h-24 border-2 border-pixel-black dark:border-pixel-white" />
        </div>
      )}
      {content.name && <h2 className="font-mono text-base mb-2">{content.name}</h2>}
      {content.bio && <p className="font-body text-sm text-pixel-gray-600 dark:text-pixel-gray-400 mb-6">{content.bio}</p>}
      {content.links && (
        <div className="flex gap-4 mb-8">
          {Object.entries(content.links as Record<string, string>).map(([label, url]) => (
            <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="font-mono text-xs uppercase border-b-2 border-pixel-black dark:border-pixel-white hover:opacity-70">
              {label}
            </a>
          ))}
        </div>
      )}
      {content.markdown && (
        <div className="prose-pixel">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ table: MarkdownTable }}>{content.markdown}</ReactMarkdown>
        </div>
      )}
      {!content.name && !content.markdown && <p className="font-body text-pixel-gray-500">{t.aboutNotConfigured}</p>}
        </>
      )}
    </div>
  )
}
