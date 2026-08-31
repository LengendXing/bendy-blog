import { cn } from "@/lib/utils"
import type { CSSProperties } from "react"

interface PixelSkeletonProps {
  className?: string
  style?: CSSProperties
}

export function PixelSkeleton({ className, style }: PixelSkeletonProps) {
  return <span className={cn("pixel-skeleton", className)} style={style} aria-hidden="true" />
}

export function BlogListSkeleton({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-0", className)} role="status" aria-live="polite">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 border-b-2 border-pixel-gray-200 py-4 sm:py-5 dark:border-pixel-gray-800">
          <PixelSkeleton className="h-3 w-6 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <PixelSkeleton className="h-3 w-4/5 max-w-[26rem]" />
            <PixelSkeleton className="h-2 w-3/5 max-w-[20rem]" />
          </div>
          <PixelSkeleton className="h-2 w-16 shrink-0" />
        </div>
      ))}
    </div>
  )
}

export function CommentsSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-4", className)} role="status" aria-live="polite">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="border-b border-pixel-gray-200 pb-3 dark:border-pixel-gray-800">
          <div className="mb-2 flex items-center gap-2">
            <PixelSkeleton className="h-5 w-5 shrink-0" />
            <PixelSkeleton className="h-2 w-24" />
            <PixelSkeleton className="ml-auto h-2 w-16" />
          </div>
          <PixelSkeleton className="mb-2 h-2 w-full" />
          <PixelSkeleton className="h-2 w-2/3" />
        </div>
      ))}
    </div>
  )
}

export function BlogDetailSkeleton() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:gap-8 sm:py-12 lg:flex-row" aria-busy="true">
      <article className="min-w-0 flex-1">
        <PixelSkeleton className="mb-4 h-5 w-4/5 max-w-xl" />
        <div className="mb-3 flex gap-4"><PixelSkeleton className="h-2 w-12" /><PixelSkeleton className="h-2 w-16" /><PixelSkeleton className="h-2 w-14" /></div>
        <PixelSkeleton className="mb-8 h-2 w-56" />
        <div className="space-y-4">
          <PixelSkeleton className="h-3 w-full" />
          <PixelSkeleton className="h-3 w-11/12" />
          <PixelSkeleton className="h-40 w-full" />
          <PixelSkeleton className="h-3 w-4/5" />
          <PixelSkeleton className="h-3 w-full" />
        </div>
      </article>
      <aside className="shrink-0 border-t-2 border-pixel-black pt-6 dark:border-pixel-white lg:w-72 lg:border-l-2 lg:border-t-0 lg:pl-6 lg:pt-0 xl:w-80">
        <PixelSkeleton className="mb-6 h-3 w-24" />
        <CommentsSkeleton rows={3} />
      </aside>
    </div>
  )
}

export function ProjectListSkeleton() {
  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-live="polite">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="border-2 border-pixel-gray-300 p-4 dark:border-pixel-gray-700">
          <div className="mb-4 flex items-center gap-3"><PixelSkeleton className="h-10 w-10 shrink-0" /><PixelSkeleton className="h-3 w-2/3" /></div>
          <PixelSkeleton className="mb-2 h-2 w-full" /><PixelSkeleton className="h-2 w-4/5" />
        </div>
      ))}
    </div>
  )
}

export function AboutSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-live="polite">
      <PixelSkeleton className="h-24 w-24" />
      <PixelSkeleton className="h-4 w-48" />
      <PixelSkeleton className="h-3 w-full" />
      <PixelSkeleton className="h-3 w-4/5" />
      <PixelSkeleton className="h-48 w-full" />
    </div>
  )
}
