import test from "node:test"
import assert from "node:assert/strict"
import { CONTENT_PAGE_SIZE, filterPostsByTitle, getPageCount, paginateItems } from "./admin-content"

const posts = [
  { title: "Alpha Post" },
  { title: "Beta Guide" },
  { title: "alpha notes" },
]

test("empty search returns a copy of every post", () => {
  const result = filterPostsByTitle(posts, "   ")
  assert.deepEqual(result, posts)
  assert.notEqual(result, posts)
})

test("search is trimmed and case-insensitive", () => {
  assert.deepEqual(filterPostsByTitle(posts, "  ALPHA "), [posts[0], posts[2]])
})

test("page count is never below one", () => {
  assert.equal(getPageCount(0), 1)
  assert.equal(getPageCount(CONTENT_PAGE_SIZE), 1)
  assert.equal(getPageCount(CONTENT_PAGE_SIZE + 1), 2)
})

test("pagination clamps out-of-range pages", () => {
  const items = Array.from({ length: CONTENT_PAGE_SIZE + 2 }, (_, index) => index)
  assert.equal(paginateItems(items, 0).length, CONTENT_PAGE_SIZE)
  assert.deepEqual(paginateItems(items, 2), [CONTENT_PAGE_SIZE, CONTENT_PAGE_SIZE + 1])
  assert.deepEqual(paginateItems(items, 99), [CONTENT_PAGE_SIZE, CONTENT_PAGE_SIZE + 1])
})
