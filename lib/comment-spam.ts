/**
 * Server-side comment anti-spam rules.
 *
 * The keyword list is intentionally conservative: obvious advertising and
 * adult spam terms only. Site owners can extend it without a deploy through
 * COMMENT_BLOCKED_KEYWORDS (comma separated, Chinese commas accepted).
 */
export const MAX_LINKS_PER_COMMENT = 3

export const DEFAULT_BLOCKED_KEYWORDS = [
  "viagra",
  "cialis",
  "casino",
  "online poker",
  "betting site",
  "adult video",
  "sex chat",
  "crypto giveaway",
  "博彩",
  "赌博",
  "色情",
  "成人视频",
  "代开发票",
  "办证",
  "刷单",
  "兼职日结",
  "加微信",
  "加qq",
  "贷款秒批",
  "稳赚不赔",
] as const

export type CommentSpamCode = "blocked_keyword" | "too_many_links"

export type CommentSpamResult =
  | { ok: true }
  | { ok: false; code: CommentSpamCode; message: string }

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

export function parseBlockedKeywords(raw: string | undefined): string[] {
  const extra = (raw || "")
    .split(/[,，]/)
    .map((keyword) => normalizeText(keyword))
    .filter(Boolean)
  return Array.from(new Set([...DEFAULT_BLOCKED_KEYWORDS.map(normalizeText), ...extra]))
}

export function getBlockedKeywords(envValue: string | undefined = process.env.COMMENT_BLOCKED_KEYWORDS): string[] {
  return parseBlockedKeywords(envValue)
}

export function checkCommentContent(
  content: string,
  blockedKeywords: string[] = getBlockedKeywords(),
): CommentSpamResult {
  const normalized = normalizeText(content)
  const matched = blockedKeywords.find((keyword) => {
    const candidate = normalizeText(keyword)
    return candidate.length > 0 && normalized.includes(candidate)
  })
  if (matched) {
    return { ok: false, code: "blocked_keyword", message: "comment contains blocked keyword" }
  }

  const linkCount = (content.match(/https?:\/\/|www\./gi) || []).length
  if (linkCount > MAX_LINKS_PER_COMMENT) {
    return { ok: false, code: "too_many_links", message: "comment contains too many links" }
  }

  return { ok: true }
}
