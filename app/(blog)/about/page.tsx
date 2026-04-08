import { prisma } from "@/lib/prisma"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export const revalidate = 60

export default async function AboutPage() {
  const about = await prisma.aboutPage.findFirst()
  let content: any = {}
  if (about) {
    try { content = JSON.parse(about.content) } catch {}
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="font-mono text-lg uppercase tracking-widest mb-12">// About</h1>
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
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content.markdown}</ReactMarkdown>
        </div>
      )}
      {!about && <p className="font-body text-pixel-gray-500">About page not configured yet.</p>}
    </div>
  )
}
