/** Comment input rules shared by the API route and its unit tests. */
import { normalizeEntityId } from "./public-input"
import { isAllowedCommentImageUrl, MAX_COMMENT_IMAGE_URL_LENGTH } from "./upload-policy"

export const MAX_COMMENT_LENGTH = 2000
export const MAX_IMAGE_URL_LENGTH = MAX_COMMENT_IMAGE_URL_LENGTH
export const MAX_COMMENT_BODY_BYTES = 64 * 1024

export interface CommentInput {
  postId: string
  content: string
  imageUrl: string | null
  parentId: string | null
  replyToId: string | null
}

export type CommentValidationCode =
  | "post_required"
  | "invalid_post_id"
  | "content_required"
  | "content_too_long"
  | "image_too_large"
  | "invalid_image_url"
  | "invalid_parent_id"
  | "invalid_reply_id"

export interface CommentValidationFailure {
  code: CommentValidationCode
  message: string
}

export type CommentValidationResult =
  | { ok: true; value: CommentInput }
  | { ok: false; error: CommentValidationFailure }

type OptionalId = { ok: true; value: string | null } | { ok: false }

function optionalId(value: unknown): OptionalId {
  if (value === undefined || value === null || value === "") return { ok: true, value: null }
  if (typeof value !== "string") return { ok: false }
  if (!value.trim()) return { ok: true, value: null }
  const id = normalizeEntityId(value)
  return id ? { ok: true, value: id } : { ok: false }
}

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
  const postId = normalizeEntityId(raw.postId)
  if (!postId) {
    const supplied = typeof raw.postId === "string" && raw.postId.trim().length > 0
    return {
      ok: false,
      error: supplied
        ? { code: "invalid_post_id", message: "invalid postId" }
        : { code: "post_required", message: "postId required" },
    }
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

  const parent = optionalId(raw.parentId)
  if (!parent.ok) {
    return { ok: false, error: { code: "invalid_parent_id", message: "invalid parent" } }
  }
  const reply = optionalId(raw.replyToId)
  if (!reply.ok) {
    return { ok: false, error: { code: "invalid_reply_id", message: "invalid reply target" } }
  }

  const imageUrl = optionalString(raw.imageUrl)
  if (imageUrl && imageUrl.length > MAX_IMAGE_URL_LENGTH) {
    return { ok: false, error: { code: "image_too_large", message: "image too large" } }
  }
  // Only same-origin proxy URLs and HTTPS URLs are accepted; data URIs are
  // rejected so comment rows cannot be used as an image-storage backend.
  if (imageUrl && !isAllowedCommentImageUrl(imageUrl)) {
    return { ok: false, error: { code: "invalid_image_url", message: "invalid image URL" } }
  }

  return {
    ok: true,
    value: {
      postId,
      content,
      imageUrl,
      parentId: parent.value,
      replyToId: reply.value,
    },
  }
}
