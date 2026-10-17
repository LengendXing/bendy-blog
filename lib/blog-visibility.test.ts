import test from "node:test"
import assert from "node:assert/strict"
import {
  planBlogListQuery,
  PUBLIC_BLOG_POST_SELECT,
  toPublicBlogPost,
} from "./blog-visibility"

test("anonymous requests default to published posts only", () => {
  assert.deepEqual(planBlogListQuery({ all: false, isAdmin: false }), {
    kind: "query",
    mode: "public",
    where: { published: true },
  })
})

test("admin requests still default to published posts", () => {
  assert.deepEqual(planBlogListQuery({ all: false, isAdmin: true }), {
    kind: "query",
    mode: "public",
    where: { published: true },
  })
})

test("admin all=true explicitly unlocks drafts", () => {
  assert.deepEqual(planBlogListQuery({ all: true, isAdmin: true }), {
    kind: "query",
    mode: "admin",
    where: {},
  })
})

test("non-admin all=true is rejected", () => {
  assert.deepEqual(planBlogListQuery({ all: true, isAdmin: false }), {
    kind: "forbidden",
  })
})

test("column filters are preserved in both scopes", () => {
  assert.deepEqual(
    planBlogListQuery({ all: false, isAdmin: false, columnId: "col-1" }),
    { kind: "query", mode: "public", where: { published: true, columnId: "col-1" } },
  )
  assert.deepEqual(
    planBlogListQuery({ all: true, isAdmin: true, columnId: "col-1" }),
    { kind: "query", mode: "admin", where: { columnId: "col-1" } },
  )
})

test("public select never fetches internal fields", () => {
  for (const field of ["githubPath", "columnId", "views", "shares", "updatedAt", "_count", "id"]) {
    assert.equal(field in PUBLIC_BLOG_POST_SELECT, false, `${field} must stay internal`)
  }
})

test("public serializer drops internal fields and flattens the column name", () => {
  const row = {
    slug: "hello",
    title: "Hello",
    description: null,
    published: true,
    publishDate: null,
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    column: { id: "col-1", name: "Arch" },
    githubPath: "posts/hello.md",
    columnId: "col-1",
    views: 42,
    shares: 3,
    updatedAt: new Date("2026-10-02T00:00:00.000Z"),
    _count: { comments: 7 },
  }

  const post = toPublicBlogPost(row)

  assert.deepEqual(Object.keys(post).sort(), [
    "columnName",
    "createdAt",
    "description",
    "publishDate",
    "published",
    "slug",
    "title",
  ])
  assert.equal(post.columnName, "Arch")
  assert.equal("githubPath" in post, false)
  assert.equal("_count" in post, false)
  assert.equal("column" in post, false)
})

test("public serializer tolerates posts without a column", () => {
  const post = toPublicBlogPost({
    slug: "solo",
    title: "Solo",
    description: "No column",
    published: true,
    publishDate: null,
    createdAt: new Date("2026-10-01T00:00:00.000Z"),
    column: null,
  })

  assert.equal(post.columnName, null)
})
