"use client"
import { useEffect, useState, useRef, useCallback } from "react"
import { useSession, signIn } from "next-auth/react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Share2, MessageSquare, Eye, Reply, X, ImageIcon, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLocale } from "@/components/locale-provider"

interface CommentData {
  id: string; content: string; imageUrl?: string | null; parentId?: string | null; replyToId?: string | null
  createdAt: string
  user: { name: string | null; image: string | null; githubUsername: string | null }
}

interface Props {
  post: { id: string; slug: string; title: string; views: number; shares: number; publishDate: string | null; updatedAt: string }
  markdown: string
  initialComments: CommentData[]
}

function Linkified({ text }: { text: string }) {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlRegex)
  return (
    <span>
      {parts.map((part, i) =>
        urlRegex.test(part)
          ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 underline break-all">{part}</a>
          : <span key={i}>{part}</span>
      )}
    </span>
  )
}

function CommentBox({ postId, parentId, replyToId, replyToName, onPosted, onCancel }: {
  postId: string; parentId?: string; replyToId?: string; replyToName?: string
  onPosted: (c: CommentData) => void; onCancel?: () => void
}) {
  const { t } = useLocale()
  const [content, setContent] = useState("")
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault()
        const file = item.getAsFile()
        if (!file) return
        setUploading(true)
        const formData = new FormData()
        formData.append("file", file)
        try {
          const res = await fetch("/api/upload", { method: "POST", body: formData })
          if (res.ok) { const { url } = await res.json(); setImageUrl(url) }
        } catch {}
        setUploading(false)
        return
      }
    }
  }, [])

  async function submit() {
    if (!content.trim() && !imageUrl) return
    setSubmitting(true)
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, content, imageUrl, parentId, replyToId }),
    })
    if (res.ok) { onPosted(await res.json()); setContent(""); setImageUrl(null) }
    setSubmitting(false)
  }

  return (
    <div className="mb-3">
      {replyToName && (
        <div className="flex items-center gap-1 mb-1">
          <span className="font-mono text-xs text-pixel-gray-500">{t.replyTo} @{replyToName}</span>
          {onCancel && <button onClick={onCancel}><X className="w-3 h-3" /></button>}
        </div>
      )}
      <textarea value={content} onChange={e => setContent(e.target.value)} onPaste={handlePaste}
        placeholder={t.writeComment}
        className="w-full border-2 border-pixel-black dark:border-pixel-white bg-transparent px-3 py-2 text-xs font-body focus:outline-none resize-y min-h-[60px]" rows={2} />
      {uploading && <p className="font-mono text-[10px] text-pixel-gray-400 mt-1">Uploading...</p>}
      {imageUrl && (
        <div className="relative inline-block mt-1">
          <img src={imageUrl} alt="" className="max-h-24 border border-pixel-gray-300" onError={e => (e.currentTarget.style.display = "none")} />
          <button onClick={() => setImageUrl(null)} className="absolute -top-1 -right-1 bg-pixel-black text-pixel-white dark:bg-pixel-white dark:text-pixel-black rounded-full w-4 h-4 flex items-center justify-center text-xs">×</button>
        </div>
      )}
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        <Button size="sm" onClick={submit} disabled={submitting || uploading || (!content.trim() && !imageUrl)}>
          {submitting ? "..." : t.post}
        </Button>
        <span className="text-[10px] text-pixel-gray-400 flex items-center gap-1"><ImageIcon className="w-3 h-3" />{t.pasteImage}</span>
        {onCancel && <Button size="sm" variant="ghost" onClick={onCancel}>{t.cancel}</Button>}
      </div>
    </div>
  )
}

function CommentItem({ comment, allComments, postId, onNewReply, depth = 0 }: {
  comment: CommentData; allComments: CommentData[]; postId: string
  onNewReply: (c: CommentData) => void; depth?: number
}) {
  const { t } = useLocale()
  const [showReply, setShowReply] = useState(false)
  const replies = depth === 0 ? allComments.filter(c => c.parentId === comment.id) : []
  const replyTo = comment.replyToId ? allComments.find(c => c.id === comment.replyToId) : null

  return (
    <div className={depth === 0 ? "border-b border-pixel-gray-200 dark:border-pixel-gray-800 pb-3 mb-3" : "ml-4 sm:ml-6 border-l-2 border-pixel-gray-200 dark:border-pixel-gray-800 pl-3 mb-2"}>
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        {comment.user.image && <img src={comment.user.image} alt="" className="w-5 h-5 rounded-full border border-pixel-gray-300" />}
        <span className="font-mono text-xs">{comment.user.githubUsername || comment.user.name}</span>
        {replyTo && <span className="text-xs text-pixel-gray-400">→ @{replyTo.user.githubUsername || replyTo.user.name}</span>}
        <time className="text-[10px] text-pixel-gray-400 font-body">{new Date(comment.createdAt).toLocaleString()}</time>
      </div>
      <div className="font-body text-xs text-pixel-gray-600 dark:text-pixel-gray-400 mb-1"><Linkified text={comment.content} /></div>
      {comment.imageUrl && <img src={comment.imageUrl} alt="" className="max-h-40 border border-pixel-gray-300 mb-1" onError={e => (e.currentTarget.style.display = "none")} />}
      <button onClick={() => setShowReply(!showReply)} className="flex items-center gap-1 text-xs text-pixel-gray-400 hover:text-pixel-black dark:hover:text-pixel-white">
        <Reply className="w-3 h-3" />{t.replyTo}
      </button>
      {showReply && (
        <div className="mt-2">
          <CommentBox postId={postId} parentId={depth === 0 ? comment.id : comment.parentId!}
            replyToId={comment.id} replyToName={comment.user.githubUsername || comment.user.name || ""}
            onPosted={c => { onNewReply(c); setShowReply(false) }} onCancel={() => setShowReply(false)} />
        </div>
      )}
      {replies.map(r => <CommentItem key={r.id} comment={r} allComments={allComments} postId={postId} onNewReply={onNewReply} depth={1} />)}
    </div>
  )
}

export function BlogContent({ post, markdown, initialComments }: Props) {
  const { data: session } = useSession()
  const { t } = useLocale()
  const [comments, setComments] = useState(initialComments)
  const [views, setViews] = useState(post.views)

  useEffect(() => {
    fetch("/api/stats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: post.slug, event: "view" }) })
      .then(r => r.json()).then(d => d.views && setViews(d.views)).catch(() => {})
  }, [post.slug])

  async function handleShare() {
    if (navigator.share) await navigator.share({ title: post.title, url: window.location.href })
    else await navigator.clipboard.writeText(window.location.href)
    fetch("/api/stats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: post.slug, event: "share" }) })
  }

  const topLevel = comments.filter(c => !c.parentId)
  const pubDate = post.publishDate ? new Date(post.publishDate) : null
  const updDate = new Date(post.updatedAt)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 flex gap-6 sm:gap-8 flex-col lg:flex-row">
      <article className="flex-1 min-w-0">
        <h1 className="font-mono text-lg sm:text-xl uppercase tracking-wider mb-2">{post.title}</h1>
        <div className="flex items-center gap-3 sm:gap-4 text-xs font-mono text-pixel-gray-500 mb-2 flex-wrap">
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {views}</span>
          <button onClick={handleShare} className="flex items-center gap-1 hover:text-pixel-black dark:hover:text-pixel-white"><Share2 className="w-3 h-3" /> {t.share}</button>
          <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {comments.length}</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono text-pixel-gray-400 mb-6 sm:mb-8 flex-wrap">
          {pubDate && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Published {pubDate.toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" })}
            </span>
          )}
          <span className="flex items-center gap-1">
            Updated {updDate.toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" })}
          </span>
        </div>
        <div className="prose-pixel"><ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown></div>
      </article>

      <aside className="lg:w-72 xl:w-80 shrink-0 border-t-2 lg:border-t-0 lg:border-l-2 border-pixel-black dark:border-pixel-white lg:pl-6 xl:lg:pl-8 pt-6 lg:pt-0">
        <h2 className="font-mono text-xs uppercase tracking-widest mb-4 sm:mb-6">// {t.comments}</h2>
        {session ? (
          <CommentBox postId={post.id} onPosted={c => setComments(prev => [...prev, c])} />
        ) : (
          <Button size="sm" variant="outline" onClick={() => signIn("github")} className="mb-4 sm:mb-6 text-xs">{t.signInToComment}</Button>
        )}
        <div>
          {topLevel.map(c => <CommentItem key={c.id} comment={c} allComments={comments} postId={post.id} onNewReply={c => setComments(prev => [...prev, c])} />)}
          {comments.length === 0 && <p className="font-body text-xs text-pixel-gray-400">{t.noComments}</p>}
        </div>
      </aside>
    </div>
  )
}
