/** Pure helpers behind the admin content list. */
export const CONTENT_PAGE_SIZE = 15

/** Case-insensitive title search; always returns a fresh array. */
export function filterPostsByTitle<T extends { title: string }>(posts: readonly T[], query: string): T[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return [...posts]
  return posts.filter((post) => post.title.toLowerCase().includes(normalized))
}

/** Number of pages, never less than one so the UI always has a page to show. */
export function getPageCount(totalItems: number, pageSize = CONTENT_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(totalItems / pageSize))
}

/** Slices a page and clamps out-of-range page numbers. */
export function paginateItems<T>(items: readonly T[], page: number, pageSize = CONTENT_PAGE_SIZE): T[] {
  const pageCount = getPageCount(items.length, pageSize)
  const safePage = Math.min(Math.max(1, Math.floor(page) || 1), pageCount)
  const start = (safePage - 1) * pageSize
  return items.slice(start, start + pageSize)
}
