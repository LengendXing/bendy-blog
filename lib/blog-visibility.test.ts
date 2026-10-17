import test from "node:test"
import assert from "node:assert/strict"
import { blogListWhere, isPublishedPost, publishedPostWhere } from "./blog-visibility"

test("publishedPostWhere always constrains reads to published posts", () => {
  assert.deepEqual(publishedPostWhere(), { published: true })
})

test("publishedPostWhere merges extra filters without mutating the input", () => {
  const extra = { columnId: "column-1" }
  assert.deepEqual(publishedPostWhere(extra), { columnId: "column-1", published: true })
  assert.deepEqual(extra, { columnId: "column-1" })
})

test("blogListWhere hides drafts from anonymous readers", () => {
  assert.deepEqual(blogListWhere({ isAdmin: false, publishedOnly: false }), { published: true })
})

test("blogListWhere lets admins see drafts by default", () => {
  assert.deepEqual(blogListWhere({ isAdmin: true, publishedOnly: false }), {})
})

test("blogListWhere honours an explicit published-only request for admins", () => {
  assert.deepEqual(blogListWhere({ isAdmin: true, publishedOnly: true }), { published: true })
})

test("blogListWhere keeps the column filter for every caller", () => {
  assert.deepEqual(
    blogListWhere({ isAdmin: true, publishedOnly: false, columnId: "column-1" }),
    { columnId: "column-1" },
  )
  assert.deepEqual(
    blogListWhere({ isAdmin: false, publishedOnly: false, columnId: "column-1" }),
    { columnId: "column-1", published: true },
  )
})

test("isPublishedPost only accepts an explicitly published post", () => {
  assert.equal(isPublishedPost({ published: true }), true)
  assert.equal(isPublishedPost({ published: false }), false)
  assert.equal(isPublishedPost(null), false)
  assert.equal(isPublishedPost(undefined), false)
})
