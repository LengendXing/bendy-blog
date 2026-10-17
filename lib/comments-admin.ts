/** Pure helpers for admin comment bulk actions and CSV export. */

export const COMMENTS_BULK_MAX_IDS = 500
export const COMMENTS_EXPORT_MAX_ROWS = 10_000

export type BulkDeleteParse =
  | { ok: true; ids: string[] }
  | { ok: false; error: "not_bulk" | "empty_ids" | "invalid_ids" | "too_many_ids" }

/**
 * Accepts either a legacy single delete body (`{ id }`) or a bulk body
 * (`{ ids: string[] }`). The caller distinguishes "not bulk" from a real
 * validation error so single deletes keep working unchanged.
 */
export function parseBulkDeleteIds(body: unknown): BulkDeleteParse {
  if (!body || typeof body !== "object" || !("ids" in body)) {
    return { ok: false, error: "not_bulk" }
  }

  const raw = (body as { ids?: unknown }).ids
  if (!Array.isArray(raw)) return { ok: false, error: "invalid_ids" }
  if (raw.length === 0) return { ok: false, error: "empty_ids" }
  if (raw.length > COMMENTS_BULK_MAX_IDS) return { ok: false, error: "too_many_ids" }

  const ids: string[] = []
  for (const value of raw) {
    if (typeof value !== "string") return { ok: false, error: "invalid_ids" }
    const id = value.trim()
    if (!id || id.length > 64 || !/^[A-Za-z0-9_-]+$/.test(id)) {
      return { ok: false, error: "invalid_ids" }
    }
    if (!ids.includes(id)) ids.push(id)
  }

  return { ok: true, ids }
}

export type CommentExportRow = {
  id: string
  postTitle: string | null
  postSlug: string | null
  authorName: string | null
  githubUsername: string | null
  content: string
  imageUrl: string | null
  parentId: string | null
  replyToId: string | null
  createdAt: Date | string
}

export const COMMENT_EXPORT_HEADERS = [
  "id",
  "postTitle",
  "postSlug",
  "authorName",
  "githubUsername",
  "content",
  "imageUrl",
  "parentId",
  "replyToId",
  "createdAt",
] as const

/** Quotes CSV cells and neutralizes spreadsheet formula injection. */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return ""
  let text = value instanceof Date ? value.toISOString() : String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  if (/[",\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`
  return text
}

export function buildCommentsCsv(rows: CommentExportRow[]): string {
  const lines = [COMMENT_EXPORT_HEADERS.join(",")]
  for (const row of rows) {
    lines.push([
      row.id,
      row.postTitle,
      row.postSlug,
      row.authorName,
      row.githubUsername,
      row.content,
      row.imageUrl,
      row.parentId,
      row.replyToId,
      row.createdAt,
    ].map(escapeCsvCell).join(","))
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`
}

export function commentsExportFilename(now: Date = new Date()): string {
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, "0")
  const day = String(now.getUTCDate()).padStart(2, "0")
  return `comments-${year}${month}${day}.csv`
}
