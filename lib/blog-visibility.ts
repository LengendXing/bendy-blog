import type { Prisma } from "@prisma/client"

/**
 * Single server-side definition of "publicly visible".
 * Any read path that serves anonymous traffic must go through these helpers.
 */
export const PUBLISHED_POST_FILTER = { published: true } as const satisfies Prisma.BlogPostWhereInput

/** Adds the published constraint to an existing filter without mutating it. */
export function publishedPostWhere(where: Prisma.BlogPostWhereInput = {}): Prisma.BlogPostWhereInput {
  return { ...where, published: true }
}

interface BlogListWhereOptions {
  isAdmin: boolean
  publishedOnly: boolean
  columnId?: string | null
}

/** Builds the list filter; only admins may see drafts, and only when they did not ask for published-only. */
export function blogListWhere({ isAdmin, publishedOnly, columnId }: BlogListWhereOptions): Prisma.BlogPostWhereInput {
  const where: Prisma.BlogPostWhereInput = {}
  if (columnId) where.columnId = columnId
  if (!isAdmin || publishedOnly) where.published = true
  return where
}

/** Guard for detail reads after a query that may include drafts. */
export function isPublishedPost<T extends { published?: boolean | null }>(
  post: T | null | undefined,
): post is T & { published: true } {
  return post?.published === true
}
