/** Shared upload/image policy so route handlers and tests use the same rules. */

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
// Leave room for multipart boundaries and form fields around the file part.
export const MAX_UPLOAD_REQUEST_BYTES = MAX_IMAGE_BYTES + 1024 * 1024
// Comment image references are URLs, not payloads; keep them short so a comment
// row can never be used as an image-storage backend.
export const MAX_COMMENT_IMAGE_URL_LENGTH = 2048

const ALLOWED_IMAGE_TYPES: ReadonlySet<string> = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
])

// The image proxy is publicly reachable, so it must never return active content
// such as SVG or HTML even if a storage backend happens to contain it.
const SAFE_IMAGE_CONTENT_TYPES: ReadonlySet<string> = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
])

export function normalizeContentType(value: string | null | undefined) {
  return (value || "").split(";")[0].trim().toLowerCase()
}

export function isAllowedImageType(value: string | null | undefined) {
  return ALLOWED_IMAGE_TYPES.has(normalizeContentType(value))
}

export function isSafeImageContentType(value: string | null | undefined) {
  return SAFE_IMAGE_CONTENT_TYPES.has(normalizeContentType(value))
}

export function isInvalidUploadSize(size: number) {
  return !Number.isFinite(size) || size <= 0 || size > MAX_IMAGE_BYTES
}

export function isRequestTooLarge(contentLength: string | null) {
  if (!contentLength) return false
  const length = Number(contentLength)
  return Number.isFinite(length) && length > MAX_UPLOAD_REQUEST_BYTES
}

/**
 * Comment attachments may only point at the site image proxy or an HTTPS URL
 * returned by a storage backend. Data URIs are rejected so the comment table
 * cannot be used to store whole images.
 */
export function isAllowedCommentImageUrl(value: string | null | undefined) {
  if (!value || value.length > MAX_COMMENT_IMAGE_URL_LENGTH) return false
  if (value.startsWith("/api/image?")) return true
  try {
    const url = new URL(value)
    return url.protocol === "https:" && !url.username && !url.password
  } catch {
    return false
  }
}

/**
 * Verify the file's magic bytes instead of trusting the client-supplied MIME
 * type. This blocks SVG/HTML payloads renamed as raster images.
 */
export function hasValidImageSignature(buffer: Buffer, type: string) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false

  switch (normalizeContentType(type)) {
    case "image/png":
      return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    case "image/jpeg":
      return buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
    case "image/gif": {
      const signature = buffer.subarray(0, 6).toString("ascii")
      return signature === "GIF87a" || signature === "GIF89a"
    }
    case "image/webp":
      return buffer.subarray(0, 4).toString("ascii") === "RIFF"
        && buffer.subarray(8, 12).toString("ascii") === "WEBP"
    default:
      return false
  }
}
