"use client"

import { cn } from "@/lib/utils"
import { PixelLoader } from "@/components/pixel-loader"

interface AdminLoadingProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

/** Stable loading surface for admin pages and panels. */
export function AdminLoading({ size = "sm", className }: AdminLoadingProps) {
  return (
    <div
      className={cn(
        "box-border flex min-h-32 w-full min-w-0 max-w-full items-center justify-center overflow-hidden",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <PixelLoader size={size} framed />
    </div>
  )
}
