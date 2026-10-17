/** Comment input rules shared by the API route and its unit tests. */
export const MAX_COMMENT_LENGTH = 2000
export const MAX_IMAGE_URL_LENGTH = 7_000_000

/** Only same-origin proxies, http(s) URLs, and safe raster data URIs are accepted. */
const IMAGE_URL_PATTERN = /^(https?:\/\/|\/api\/image\?|data:image\/(png|jpeg|gif|webp);base64,)/i

export interface CommentInput {
  postId: string
  content: string
  imageUrl: string | null
  parentId: string | null
  replyToId: string | null
}

export type CommentValidationCode =
  | "post_required"
  | "content_required"
  | "content_too_long"
  | "image_too_large"
  | "invalid_image_url"

export interface CommentValidationFailure {
  code: CommentValidationCode
  message: string
}

export type CommentValidationResult =
  | { ok: true; value: CommentInput }
  | { ok: false; error: CommentValidationFailure }

function optionalString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function validateCommentInput(body: unknown): CommentValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: { code: "post_required", message: "postId required" } }
  }

  const raw = body as Record<string, unknown>
  const postId = optionalString(raw.postId)
  if (!postId) {
    return { ok: false, error: { code: "post_required", message: "postId required" } }
  }

  // A comment must carry text; an image alone is not a comment.
  const content = typeof raw.content === "string" ? raw.content.trim() : ""
  if (!content) {
    return { ok: false, error: { code: "content_required", message: "content required" } }
  }
  if (content.length > MAX_COMMENT_LENGTH) {
    return {
      ok: false,
      error: {
        code: "content_too_long",
        message: `comment must be at most ${MAX_COMMENT_LENGTH} characters`,
      },
    }
  }

  const imageUrl = optionalString(raw.imageUrl)
  if (imageUrl && imageUrl.length > MAX_IMAGE_URL_LENGTH) {
    return { ok: false, error: { code: "image_too_large", message: "image too large" } }
  }
  if (imageUrl && !IMAGE_URL_PATTERN.test(imageUrl)) {
    return { ok: false, error: { code: "invalid_image_url", message: "invalid image URL" } }
  }

  return {
    ok: true,
    value: {
      postId,
      content,
      imageUrl,
      parentId: optionalString(raw.parentId),
      replyToId: optionalString(raw.replyToId),
    },
  }
}
