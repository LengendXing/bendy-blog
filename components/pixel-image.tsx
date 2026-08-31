"use client"

import { useEffect, useRef, useState, type ImgHTMLAttributes, type ReactNode, type SyntheticEvent } from "react"
import { useLocale } from "@/components/locale-provider"
import { cn } from "@/lib/utils"

type PixelImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt" | "width" | "height" | "loading" | "onLoad" | "onError"> & {
  src?: string | null
  alt?: string
  width?: number
  height?: number
  aspectRatio?: string | number | null
  priority?: boolean
  errorLabel?: string
  imageClassName?: string
  frameClassName?: string
  fallback?: ReactNode
  onLoad?: (event: SyntheticEvent<HTMLImageElement>) => void
  onError?: (event: SyntheticEvent<HTMLImageElement>) => void
}

export function PixelImage({
  src,
  alt = "",
  width,
  height,
  aspectRatio = "16 / 9",
  priority = false,
  errorLabel,
  className,
  imageClassName,
  frameClassName,
  fallback,
  onLoad,
  onError,
  ...imageProps
}: PixelImageProps) {
  const { t } = useLocale()
  const imageRef = useRef<HTMLImageElement>(null)
  const [state, setState] = useState<"loading" | "loaded" | "error">(src ? "loading" : "error")
  const hasAspectRatio = aspectRatio !== undefined && aspectRatio !== null
  const frameStyle = hasAspectRatio
    ? { aspectRatio: typeof aspectRatio === "number" ? String(aspectRatio) : aspectRatio }
    : undefined

  useEffect(() => {
    setState(src ? "loading" : "error")
  }, [src])

  useEffect(() => {
    const image = imageRef.current
    if (!image || !src || !image.complete) return
    setState(image.naturalWidth > 0 ? "loaded" : "error")
  }, [src])

  function handleLoad(event: SyntheticEvent<HTMLImageElement>) {
    setState("loaded")
    onLoad?.(event)
  }

  function handleError(event: SyntheticEvent<HTMLImageElement>) {
    setState("error")
    onError?.(event)
  }

  return (
    <span
      className={cn("pixel-image-frame", !hasAspectRatio && "pixel-image-frame--auto", className, frameClassName)}
      style={frameStyle}
      aria-busy={state === "loading"}
    >
      <span className="pixel-image-placeholder" aria-hidden="true" />
      {src && (
        <img
          {...imageProps}
          ref={imageRef}
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : undefined}
          className={cn("pixel-image-element", state === "loaded" && "pixel-image-element--loaded", imageClassName)}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
      {state === "error" && (fallback || <span className="pixel-image-error">{errorLabel || t.imageLoadFailed}</span>)}
    </span>
  )
}

export function PixelMarkdownImage({ src, alt, title }: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <PixelImage
      src={src}
      alt={alt || ""}
      title={title}
      aspectRatio={null}
      className="my-4 w-full"
      frameClassName="pixel-image-frame--fill border-2 border-pixel-black dark:border-pixel-white"
      imageClassName="object-contain"
    />
  )
}
