import test from "node:test"
import assert from "node:assert/strict"
import { DEFAULT_BLOG_TITLE, isPlaceholderBlogTitle, resolveBlogTitle } from "./blog-title"

test("empty and whitespace-only titles are placeholders", () => {
  assert.equal(isPlaceholderBlogTitle(undefined), true)
  assert.equal(isPlaceholderBlogTitle(""), true)
  assert.equal(isPlaceholderBlogTitle("   "), true)
  assert.equal(resolveBlogTitle("   "), DEFAULT_BLOG_TITLE)
})

test("legacy placeholder titles are matched case-insensitively", () => {
  assert.equal(isPlaceholderBlogTitle("Bendy Blog"), true)
  assert.equal(isPlaceholderBlogTitle("  bendy blog  "), true)
  assert.equal(isPlaceholderBlogTitle("笨迪博客 BendyBlog"), true)
  assert.equal(isPlaceholderBlogTitle("笨迪博客 BendyBlog | 码农修炼笔记"), true)
})

test("custom titles are preserved and trimmed", () => {
  assert.equal(isPlaceholderBlogTitle("My Notes"), false)
  assert.equal(resolveBlogTitle("  My Notes  "), "My Notes")
})

test("default title is the shared site title", () => {
  assert.equal(DEFAULT_BLOG_TITLE, "Bendy Blog")
})
