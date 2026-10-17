import { SITE_TITLE } from "./site"

/** Fallback title used whenever the configured title is empty or a legacy placeholder. */
export const DEFAULT_BLOG_TITLE = SITE_TITLE

const LEGACY_PLACEHOLDER_TITLES: readonly string[] = [
  "BENDY BLOG",
  "笨迪博客 BENDYBLOG",
  "笨迪博客 BENDYBLOG | 码农修炼笔记",
]

/** True when the stored title is empty or one of the shipped placeholder values. */
export function isPlaceholderBlogTitle(value: string | null | undefined): boolean {
  const normalized = value?.trim().toUpperCase() ?? ""
  return normalized === "" || LEGACY_PLACEHOLDER_TITLES.includes(normalized)
}

/** Resolves the display title, preserving genuine custom titles. */
export function resolveBlogTitle(value: string | null | undefined): string {
  return isPlaceholderBlogTitle(value) ? DEFAULT_BLOG_TITLE : value!.trim()
}
