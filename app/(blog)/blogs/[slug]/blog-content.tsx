"use client"
import { useEffect, useState } from "react"
import { useSession, signIn } from "next-auth/react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Share2, MessageSquare, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import Image from "next/image"

interface Props {
  post: {
    id: string; slug: string; title: string; views: number; shares: number
    comments: Array<{
      id: string; content: string; createdAt: string
      user: { name: string | null; image: string | null; githubUsername: string | null }
    }>
  }
  markdown: string
}

export function BlogContent({ post, markdown }: Props) {
  const { data: session } = useSession()
  const [comment, setComment] = useState("")
  const [comments, setComments] = useState(post.comments)
  const [views, setViews] = useState(post.views)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch(`/api/stats`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: post.slug, event: "view" }) })
      .then(r => r.json()).then(d => d.views && setViews(d.views)).catch(() => {})
  }, [post.slug])

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({ title: post.title, url: window.location.href })
    } else {
      await navigator.clipboard.writeText(window.location.href)
    }
    fetch(`/api/stats`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: post.slug, event: "share" }) })
  }

  async function handleComment() {
    if (!comment.trim() || !session) return
    setSubmitting(true)
    const res = await fetch(`/api/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: post.id, content: comment }),
    })
    if (res.ok) {
      const newComment = await res.json()
      setComments(prev => [newComment, ...prev])
      setComment("")
    }
    setSubmitting(false)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 flex gap-8 flex-col lg:flex-row">
      <article className="flex-1 min-w-0">
        <h1 className="font-mono text-xl uppercase tracking-wider mb-2">{post.title}</h1>
        <div className="flex items-center gap-4 text-xs font-mono text-pixel-gray-500 mb-8">
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {views}</span>
          <button onClick={handleShare} className="flex items-center gap-1 hover:text-pixel-black dark:hover:text-pixel-white">
            <Share2 className="w-3 h-3" /> share
          </button>
          <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {comments.length}</span>
        </div>
        <div className="prose-pixel">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        </div>
      </article>

      <aside className="lg:w-80 shrink-0 border-t-2 lg:border-t-0 lg:border-l-2 border-pixel-black dark:border-pixel-white lg:pl-8 pt-8 lg:pt-0">
        <h2 className="font-mono text-xs uppercase tracking-widest mb-6">// Comments</h2>
        {session ? (
          <div className="mb-6">
            <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Write a comment..." className="mb-2 text-xs" rows={3} />
            <Button size="sm" onClick={handleComment} disabled={submitting || !comment.trim()}>
              {submitting ? "..." : "Post"}
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => signIn("github")} className="mb-6">
            Sign in with GitHub to comment
          </Button>
        )}
        <div className="space-y-4">
          {comments.map(c => (
            <div key={c.id} className="border-b border-pixel-gray-200 dark:border-pixel-gray-800 pb-3">
              <div className="flex items-center gap-2 mb-1">
                {c.user.image && <Image src={c.user.image} alt="" width={20} height={20} className="rounded-full border border-pixel-gray-300" />}
                <span className="font-mono text-xs">{c.user.githubUsername || c.user.name}</span>
                <time className="text-xs text-pixel-gray-400 font-body">{new Date(c.createdAt).toLocaleDateString()}</time>
              </div>
              <p className="font-body text-xs text-pixel-gray-600 dark:text-pixel-gray-400">{c.content}</p>
            </div>
          ))}
          {comments.length === 0 && <p className="font-body text-xs text-pixel-gray-400">No comments yet.</p>}
        </div>
      </aside>
    </div>
  )
}
