/**
 * Single source of truth for the public site identity.
 * Every absolute URL and metadata default must come from here.
 */
const DEFAULT_SITE_URL = "https://blog.sunchengxin.com"

/** Normalizes a configured site URL; empty values fall back to production. */
export function normalizeSiteUrl(value?: string | null): string {
  const trimmed = value?.trim()
  return (trimmed || DEFAULT_SITE_URL).replace(/\/+$/, "")
}

export const SITE_URL = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)
export const SITE_TITLE = "Bendy Blog"
export const SITE_DESCRIPTION =
  "笨迪博客（BendyBlog）是程序员笨迪的技术博客，记录 Java、后端开发、机器学习、深度学习、算法与工程实践，分享持续成长的码农修炼笔记。"
export const SITE_KEYWORDS = [
  "笨迪博客",
  "BendyBlog",
  "码农修炼笔记",
  "Java",
  "后端开发",
  "机器学习",
  "深度学习",
  "算法",
  "程序员",
]

/** Builds an absolute URL from a site-relative path. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`
}
