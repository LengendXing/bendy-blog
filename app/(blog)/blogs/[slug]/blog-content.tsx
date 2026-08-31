"use client"
import { useEffect, useState, useCallback, Children, isValidElement, type ClipboardEvent, type ReactElement, type ReactNode } from "react"
import Link from "next/link"
import { useSession, signIn } from "next-auth/react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Share2, MessageSquare, Eye, Reply, X, ImageIcon, Calendar, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLocale } from "@/components/locale-provider"
import { MarkdownTable } from "@/components/markdown-table"
import { CommentsSkeleton } from "@/components/pixel-skeleton"
import { PixelImage, PixelMarkdownImage } from "@/components/pixel-image"

interface CommentData {
  id: string; content: string; imageUrl?: string | null; parentId?: string | null; replyToId?: string | null
  createdAt: string; updatedAt?: string
  user: { name: string | null; image: string | null; githubUsername: string | null }
}

interface Props {
  post: { id: string; slug: string; title: string; views: number; shares: number; publishDate: string | null; updatedAt: string }
  markdown: string
  initialComments: CommentData[]
  navigation: {
    previous: { slug: string; title: string } | null
    next: { slug: string; title: string } | null
  }
  related: Array<{ slug: string; title: string }>
}

function MarkdownPre({ children }: { children?: ReactNode }) {
  const { t } = useLocale()
  const [copied, setCopied] = useState(false)
  const child = Children.toArray(children).find(isValidElement) as ReactElement<{ children?: ReactNode }> | undefined
  const code = child ? String(child.props.children || "").replace(/\n$/, "") : ""

  async function copyCode() {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch (error) {
      console.error("Failed to copy code:", error)
    }
  }

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={copyCode}
        className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 border border-pixel-gray-400 bg-pixel-gray-100 px-2 py-1 font-mono text-[9px] text-pixel-black opacity-70 hover:opacity-100 dark:border-pixel-gray-600 dark:bg-pixel-gray-800 dark:text-pixel-white"
        aria-label={copied ? t.copied : t.copyCode}
        title={copied ? t.copied : t.copyCode}
      >
        {copied ? <Check className="h-3 w-3" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
        <span className="sr-only">{copied ? t.copied : t.copyCode}</span>
      </button>
      <pre>{children}</pre>
    </div>
  )
}

function Linkified({ text }: { text: string }) {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlRegex)
  return (
    <span>
      {parts.map((part, i) =>
        /^https?:\/\/[^\s]+$/.test(part)
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

  const [error, setError] = useState(false)

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
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
          if (!res.ok) throw new Error("image upload failed")
          const { url } = await res.json()
          if (typeof url !== "string" || !url) throw new Error("image upload returned no URL")
          setImageUrl(url)
          setError(false)
        } catch (uploadError) {
          console.error("Failed to upload comment image:", uploadError)
          setError(true)
        } finally {
          setUploading(false)
        }
        return
      }
    }
  }, [])

  async function submit() {
    if (!content.trim() && !imageUrl) return
    setSubmitting(true)
    setError(false)
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, content, imageUrl, parentId, replyToId }),
      })
      if (!res.ok) throw new Error("comment request failed")
      onPosted(await res.json())
      setContent("")
      setImageUrl(null)
    } catch (submitError) {
      console.error("Failed to post comment:", submitError)
      setError(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mb-3">
      {replyToName && (
        <div className="flex items-center gap-1 mb-1">
          <span className="font-mono text-xs text-pixel-gray-500">{t.replyTo} @{replyToName}</span>
          {onCancel && <button onClick={onCancel}><X className="w-3 h-3" /></button>}
        </div>
      )}
      <textarea value={content} maxLength={4000} onChange={e => setContent(e.target.value)} onPaste={handlePaste}
        placeholder={t.writeComment}
        className="w-full border-2 border-pixel-black dark:border-pixel-white bg-transparent px-3 py-2 text-xs font-body focus:outline-none resize-y min-h-[60px]" rows={2} />
      {error && <p className="mt-1 font-body text-[10px] text-red-500" role="alert">{t.loadFailed}</p>}
      {uploading && <p className="font-mono text-[10px] text-pixel-gray-400 mt-1">Uploading...</p>}
      {imageUrl && (
        <div className="relative mt-1 inline-block">
          <PixelImage
            src={imageUrl}
            alt=""
            aspectRatio={null}
            className="max-w-full"
            frameClassName="border border-pixel-gray-300"
            imageClassName="max-h-24 max-w-full object-contain"
            fallback={<span className="block h-8 w-24 bg-pixel-gray-100 dark:bg-pixel-gray-900" aria-hidden="true" />}
          />
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
        {comment.user.image && (
          <PixelImage
            src={comment.user.image}
            alt=""
            aspectRatio={1}
            className="h-5 w-5 shrink-0 rounded-full"
            frameClassName="border border-pixel-gray-300"
            imageClassName="object-cover"
            fallback={<span className="block h-full w-full bg-pixel-gray-100 dark:bg-pixel-gray-900" aria-hidden="true" />}
          />
        )}
        <span className="font-mono text-xs">{comment.user.githubUsername || comment.user.name}</span>
        {replyTo && <span className="text-xs text-pixel-gray-400">→ @{replyTo.user.githubUsername || replyTo.user.name}</span>}
        <time className="text-[10px] text-pixel-gray-400 font-body">{new Date(comment.createdAt).toLocaleString()}</time>
      </div>
      <div className="font-body text-xs text-pixel-gray-600 dark:text-pixel-gray-400 mb-1"><Linkified text={comment.content} /></div>
      {comment.imageUrl && (
        <PixelImage
          src={comment.imageUrl}
          alt=""
          aspectRatio={null}
          className="mb-1 max-w-full"
          frameClassName="border border-pixel-gray-300"
          imageClassName="max-h-40 max-w-full object-contain"
        />
      )}
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

export function BlogContent({ post, markdown, initialComments, navigation, related }: Props) {
  const { data: session } = useSession()
  const { t } = useLocale()
  const [comments, setComments] = useState(initialComments)
  const [commentsLoading, setCommentsLoading] = useState(true)
  const [commentsError, setCommentsError] = useState(false)
  const [views, setViews] = useState(post.views)

  useEffect(() => {
    const controller = new AbortController()
    setCommentsLoading(true)
    setCommentsError(false)
    fetch(`/api/comments?postId=${encodeURIComponent(post.id)}`, { signal: controller.signal })
      .then(async response => {
        const data = await response.json().catch(() => null)
        if (!response.ok || !Array.isArray(data)) throw new Error("comments request failed")
        if (!controller.signal.aborted) setComments(data as CommentData[])
      })
      .catch(error => {
        if (error?.name !== "AbortError") {
          console.error("Failed to load comments:", error)
          setCommentsError(true)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCommentsLoading(false)
      })
    return () => controller.abort()
  }, [post.id])

  useEffect(() => {
    fetch("/api/stats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: post.slug, event: "view" }) })
      .then(r => r.json()).then(d => d.views && setViews(d.views)).catch(error => console.error("Failed to record view:", error))
  }, [post.slug])

  async function handleShare() {
    if (navigator.share) await navigator.share({ title: post.title, url: window.location.href })
    else await navigator.clipboard.writeText(window.location.href)
    fetch("/api/stats", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: post.slug, event: "share" }) }).catch(error => console.error("Failed to record share:", error))
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
        <div className="prose-pixel"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ pre: MarkdownPre, table: MarkdownTable, img: PixelMarkdownImage }}>{markdown}</ReactMarkdown></div>

        {(navigation.previous || navigation.next) && (
          <nav className="mt-10 grid grid-cols-2 gap-3 border-t-2 border-pixel-black pt-4 dark:border-pixel-white" aria-label="Article navigation">
            <div>
              {navigation.previous && (
                <Link href={`/blogs/${encodeURIComponent(navigation.previous.slug)}`} className="group block">
                  <span className="font-mono text-[10px] text-pixel-gray-400">← {t.previous}</span>
                  <span className="mt-1 block truncate font-body text-xs group-hover:underline">{navigation.previous.title}</span>
                </Link>
              )}
            </div>
            <div className="text-right">
              {navigation.next && (
                <Link href={`/blogs/${encodeURIComponent(navigation.next.slug)}`} className="group block">
                  <span className="font-mono text-[10px] text-pixel-gray-400">{t.next} →</span>
                  <span className="mt-1 block truncate font-body text-xs group-hover:underline">{navigation.next.title}</span>
                </Link>
              )}
            </div>
          </nav>
        )}

        {related.length > 0 && (
          <section className="mt-10 border-t-2 border-pixel-gray-300 pt-5 dark:border-pixel-gray-700">
            <h2 className="mb-3 font-mono text-xs uppercase tracking-widest">// {t.relatedPosts}</h2>
            <div className="space-y-2">
              {related.map(item => (
                <Link key={item.slug} href={`/blogs/${encodeURIComponent(item.slug)}`} className="block truncate font-body text-xs hover:underline">
                  {item.title}
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>

      <aside className="lg:w-72 xl:w-80 shrink-0 border-t-2 lg:border-t-0 lg:border-l-2 border-pixel-black dark:border-pixel-white lg:pl-6 xl:lg:pl-8 pt-6 lg:pt-0 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:overscroll-contain">
        <h2 className="font-mono text-xs uppercase tracking-widest mb-4 sm:mb-6">// {t.comments}</h2>
        {session ? (
          <CommentBox postId={post.id} onPosted={c => setComments(prev => [...prev, c])} />
        ) : (
          <Button size="sm" variant="outline" onClick={() => signIn("github")} className="mb-4 sm:mb-6 text-xs">{t.signInToComment}</Button>
        )}
        <div aria-busy={commentsLoading}>
          {commentsLoading ? (
            <div key="comments-loading" className="pixel-content-transition"><CommentsSkeleton /></div>
          ) : commentsError ? (
            <p key="comments-error" className="pixel-content-transition font-body text-xs text-red-500" role="alert">{t.loadFailed}</p>
          ) : (
            <div key="comments-content" className="pixel-content-transition">
              {topLevel.map(c => <CommentItem key={c.id} comment={c} allComments={comments} postId={post.id} onNewReply={c => setComments(prev => [...prev, c])} />)}
              {comments.length === 0 && <p className="font-body text-xs text-pixel-gray-400">{t.noComments}</p>}
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
