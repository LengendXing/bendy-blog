import test from "node:test"
import assert from "node:assert/strict"
import {
  ADMIN_COMMENT_SELECT,
  COMMENTS_DEFAULT_PAGE_SIZE,
  COMMENTS_MAX_PAGE_SIZE,
  PUBLIC_COMMENT_SELECT,
  buildCommentWhere,
  commentPaginationMeta,
  parseCommentsPagination,
  resolveCommentsAccess,
} from "./comments-query"

function params(query: Record<string, string>): Pick<URLSearchParams, "get"> {
  const search = new URLSearchParams(query)
  return { get: (name: string) => search.get(name) }
}

test("comments default to the first page with 20 items", () => {
  assert.deepEqual(parseCommentsPagination(params({})), {
    page: 1,
    pageSize: COMMENTS_DEFAULT_PAGE_SIZE,
  })
})

test("comments pagination clamps page size and normalizes invalid values", () => {
  assert.deepEqual(parseCommentsPagination(params({ page: "3", pageSize: "50" })), {
    page: 3,
    pageSize: 50,
  })
  assert.deepEqual(parseCommentsPagination(params({ page: "0", pageSize: "1000" })), {
    page: 1,
    pageSize: COMMENTS_MAX_PAGE_SIZE,
  })
  assert.deepEqual(parseCommentsPagination(params({ page: "-2", pageSize: "abc" })), {
    page: 1,
    pageSize: COMMENTS_DEFAULT_PAGE_SIZE,
  })
  assert.deepEqual(parseCommentsPagination(params({ page: "1.5", pageSize: "2.5" })), {
    page: 1,
    pageSize: COMMENTS_DEFAULT_PAGE_SIZE,
  })
  assert.deepEqual(parseCommentsPagination(params({ page: String(Number.MAX_SAFE_INTEGER) })), {
    page: 100_000,
    pageSize: COMMENTS_DEFAULT_PAGE_SIZE,
  })
})

test("anonymous comment listing requires a post id", () => {
  assert.deepEqual(resolveCommentsAccess(null, false), {
    ok: false,
    status: 400,
    error: "postId_required",
  })
})

test("anonymous comment listing accepts a well-formed post id", () => {
  assert.deepEqual(resolveCommentsAccess("clx123abc", false), {
    ok: true,
    postId: "clx123abc",
  })
})

test("comment listing rejects malformed post ids", () => {
  assert.deepEqual(resolveCommentsAccess("bad post id", false), {
    ok: false,
    status: 400,
    error: "invalid_post_id",
  })
  assert.deepEqual(resolveCommentsAccess("a".repeat(65), true), {
    ok: false,
    status: 400,
    error: "invalid_post_id",
  })
})

test("administrators may list comments across all posts", () => {
  assert.deepEqual(resolveCommentsAccess(null, true), { ok: true, postId: null })
})

test("comment visibility filters keep drafts private for anonymous readers", () => {
  assert.deepEqual(buildCommentWhere("clx123abc", false), {
    postId: "clx123abc",
    post: { published: true },
  })
  assert.deepEqual(buildCommentWhere(null, true), {})
  assert.deepEqual(buildCommentWhere("clx123abc", true), { postId: "clx123abc" })
})

test("pagination metadata reports totals and the next page", () => {
  assert.deepEqual(commentPaginationMeta(45, 2, 20), {
    page: 2,
    pageSize: 20,
    total: 45,
    totalPages: 3,
    hasMore: true,
  })
  assert.deepEqual(commentPaginationMeta(45, 3, 20), {
    page: 3,
    pageSize: 20,
    total: 45,
    totalPages: 3,
    hasMore: false,
  })
  assert.deepEqual(commentPaginationMeta(0, 1, 20), {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
    hasMore: false,
  })
})

test("public comment select exposes only fields required by the comment UI", () => {
  assert.deepEqual(Object.keys(PUBLIC_COMMENT_SELECT).sort(), [
    "content",
    "createdAt",
    "id",
    "imageUrl",
    "parentId",
    "replyToId",
    "user",
  ])
  assert.equal("post" in PUBLIC_COMMENT_SELECT, false)
  assert.equal("postId" in PUBLIC_COMMENT_SELECT, false)
  assert.equal("userId" in PUBLIC_COMMENT_SELECT, false)
  assert.equal("updatedAt" in PUBLIC_COMMENT_SELECT, false)
})

test("admin comment select adds post summary without internal user fields", () => {
  assert.equal(ADMIN_COMMENT_SELECT.postId, true)
  assert.deepEqual(ADMIN_COMMENT_SELECT.post, { select: { title: true, slug: true } })
  assert.equal("userId" in ADMIN_COMMENT_SELECT, false)
  assert.equal("updatedAt" in ADMIN_COMMENT_SELECT, false)
})
