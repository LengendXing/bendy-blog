export type BlogListMode = "public" | "admin"

export type BlogListPlan =
  | { kind: "forbidden" }
  | { kind: "query"; mode: BlogListMode; where: { published?: true; columnId?: string } }

/**
 * Public requests only ever see published posts. Drafts require an explicit
 * `?all=true` from an authenticated admin.
 */
export function planBlogListQuery(input: {
  all: boolean
  isAdmin: boolean
  columnId?: string | null
}): BlogListPlan {
  const { all, isAdmin, columnId } = input
  if (all && !isAdmin) return { kind: "forbidden" }

  const where: { published?: true; columnId?: string } = {}
  if (!all) where.published = true
  if (columnId) where.columnId = columnId

  return { kind: "query", mode: all ? "admin" : "public", where }
}

/** Fields fetched for the anonymous list; everything else stays server-side. */
export const PUBLIC_BLOG_POST_SELECT = {
  slug: true,
  title: true,
  description: true,
  published: true,
  publishDate: true,
  createdAt: true,
  column: { select: { name: true } },
}

export type PublicBlogPostRow = {
  slug: string
  title: string
  description: string | null
  published: boolean
  publishDate: Date | null
  createdAt: Date
  column: { name: string } | null
}

/**
 * Serializes a public list row explicitly so internal columns such as
 * `githubPath`, `columnId`, `views`, `_count` or the `column` relation can
 * never leak into the response.
 */
export function toPublicBlogPost(row: PublicBlogPostRow) {
  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    published: row.published,
    publishDate: row.publishDate,
    createdAt: row.createdAt,
    columnName: row.column?.name ?? null,
  }
}
