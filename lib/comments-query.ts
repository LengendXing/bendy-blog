export const COMMENTS_DEFAULT_PAGE_SIZE = 20
export const COMMENTS_MAX_PAGE_SIZE = 100
export const COMMENTS_MAX_PAGE = 100_000
export const COMMENTS_MAX_POST_ID_LENGTH = 64

export type CommentsPagination = {
  page: number
  pageSize: number
}

export type CommentsAccess =
  | { ok: true; postId: string | null }
  | { ok: false; status: 400; error: "postId_required" | "invalid_post_id" }

type QueryParams = Pick<URLSearchParams, "get">

function parsePositiveInteger(raw: string | null, fallback: number): number {
  if (!raw || !/^\d+$/.test(raw)) return fallback
  const value = Number(raw)
  return Number.isSafeInteger(value) && value > 0 ? value : fallback
}

export function parseCommentsPagination(params: QueryParams): CommentsPagination {
  return {
    page: Math.min(parsePositiveInteger(params.get("page"), 1), COMMENTS_MAX_PAGE),
    pageSize: Math.min(
      parsePositiveInteger(params.get("pageSize"), COMMENTS_DEFAULT_PAGE_SIZE),
      COMMENTS_MAX_PAGE_SIZE,
    ),
  }
}

export function resolveCommentsAccess(postId: string | null, isAdmin: boolean): CommentsAccess {
  if (!postId) {
    return isAdmin ? { ok: true, postId: null } : { ok: false, status: 400, error: "postId_required" }
  }
  if (postId.length > COMMENTS_MAX_POST_ID_LENGTH || !/^[A-Za-z0-9_-]+$/.test(postId)) {
    return { ok: false, status: 400, error: "invalid_post_id" }
  }
  return { ok: true, postId }
}

export function buildCommentWhere(postId: string | null, isAdmin: boolean) {
  return {
    ...(postId ? { postId } : {}),
    ...(!isAdmin ? { post: { published: true } } : {}),
  }
}

export function commentPaginationMeta(total: number, page: number, pageSize: number) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize)
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasMore: page * pageSize < total,
  }
}

export const PUBLIC_COMMENT_SELECT = {
  id: true,
  content: true,
  imageUrl: true,
  parentId: true,
  replyToId: true,
  createdAt: true,
  user: { select: { name: true, image: true, githubUsername: true } },
} as const

export const ADMIN_COMMENT_SELECT = {
  ...PUBLIC_COMMENT_SELECT,
  postId: true,
  post: { select: { title: true, slug: true } },
} as const
