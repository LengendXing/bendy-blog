/**
 * Shared validation for untrusted input on public API routes.
 *
 * The public surface accepts slugs, post/comment ids, locales and short text
 * fields. Keeping the rules in one module avoids each route growing its own
 * (and drifting) definition of "valid".
 */

export const MAX_SLUG_LENGTH = 200
export const MAX_ENTITY_ID_LENGTH = 64
export const MAX_LOCALE_LENGTH = 16
export const MAX_TITLE_LENGTH = 300
export const MAX_DESCRIPTION_LENGTH = 2000
export const MAX_CONTENT_LENGTH = 500_000
export const MAX_IMAGE_PROXY_URL_LENGTH = 4096

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/
// Slugs become part of a GitHub path (`posts/<slug>.md`) and Redis keys, so
// path separators and URL metacharacters are never allowed.
const SLUG_FORBIDDEN = /[/\\?#%]/
const ENTITY_ID_PATTERN = /^[A-Za-z0-9_-]+$/
const LOCALE_PATTERN = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/

/**
 * Trims and validates a blog slug. Unicode letters are allowed because
 * imported Chinese titles legitimately produce Chinese slugs.
 */
export function normalizeSlug(value: unknown): string | null {
  if (typeof value !== "string") return null
  const slug = value.trim()
  if (!slug || slug.length > MAX_SLUG_LENGTH) return null
  if (CONTROL_CHARACTERS.test(slug) || SLUG_FORBIDDEN.test(slug)) return null
  return slug
}

/** Validates a Prisma cuid-shaped identifier (post, comment, column, ...). */
export function normalizeEntityId(value: unknown): string | null {
  if (typeof value !== "string") return null
  const id = value.trim()
  if (!id || id.length > MAX_ENTITY_ID_LENGTH) return null
  return ENTITY_ID_PATTERN.test(id) ? id : null
}

/** Validates an optional identifier, returning `null` for blanks. */
export function normalizeOptionalEntityId(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null
  if (typeof value !== "string") return undefined
  if (!value.trim()) return null
  return normalizeEntityId(value) ?? undefined
}

/**
 * Validates a locale tag such as `zh`, `en` or `zh-CN`. Empty input falls
 * back to the default locale so existing callers keep working.
 */
export function normalizeLocale(value: unknown, fallback = "zh"): string | null {
  if (value === undefined || value === null || value === "") return fallback
  if (typeof value !== "string") return null
  const locale = value.trim()
  if (!locale || locale.length > MAX_LOCALE_LENGTH) return null
  return LOCALE_PATTERN.test(locale) ? locale : null
}

/** Trims a required text field and enforces its maximum length. */
export function normalizeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null
  const text = value.trim()
  if (!text || text.length > maxLength) return null
  return text
}

/** Validates an optional text field, returning `null` for blanks. */
export function normalizeOptionalText(value: unknown, maxLength: number): string | null | undefined {
  if (value === undefined || value === null || value === "") return null
  if (typeof value !== "string") return undefined
  const text = value.trim()
  if (!text) return null
  return text.length <= maxLength ? text : undefined
}

/** Parses an optional date input, returning `null` for blanks. */
export function normalizeDate(value: unknown): Date | null | undefined {
  if (value === undefined || value === null || value === "") return null
  if (typeof value !== "string") return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}
