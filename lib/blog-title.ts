export const DEFAULT_BLOG_TITLE = "Bendy Blog"

// Titles written by older versions of the site (and its admin form) are
// treated as placeholders so a rename only has to happen in one place.
const PLACEHOLDER_BLOG_TITLES = new Set([
  "BENDY BLOG",
  "笨迪博客 BENDYBLOG",
  "笨迪博客 BENDYBLOG | 码农修炼笔记",
])

export function isPlaceholderBlogTitle(title: string | null | undefined): boolean {
  const normalized = title?.trim().toUpperCase() ?? ""
  return normalized === "" || PLACEHOLDER_BLOG_TITLES.has(normalized)
}

export function resolveBlogTitle(title: string | null | undefined): string {
  const trimmed = title?.trim()
  return trimmed && !isPlaceholderBlogTitle(trimmed) ? trimmed : DEFAULT_BLOG_TITLE
}
