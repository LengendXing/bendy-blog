import test from "node:test"
import assert from "node:assert/strict"
import { DEFAULT_BLOG_TITLE, isPlaceholderBlogTitle, resolveBlogTitle } from "./blog-title"

test("treats empty and whitespace-only titles as placeholders", () => {
  assert.equal(isPlaceholderBlogTitle(undefined), true)
  assert.equal(isPlaceholderBlogTitle(null), true)
  assert.equal(isPlaceholderBlogTitle(""), true)
  assert.equal(isPlaceholderBlogTitle("   "), true)
})

test("treats every legacy default title as a placeholder regardless of case and spacing", () => {
  const legacyTitles = ["BENDY BLOG", "笨迪博客 BENDYBLOG", "笨迪博客 BENDYBLOG | 码农修炼笔记"]

  for (const title of legacyTitles) {
    assert.equal(isPlaceholderBlogTitle(title), true)
    assert.equal(isPlaceholderBlogTitle(`  ${title.toLowerCase()}  `), true)
  }
})

test("keeps custom titles", () => {
  assert.equal(isPlaceholderBlogTitle("Bendy Notes"), false)
  assert.equal(isPlaceholderBlogTitle("我的博客"), false)
})

test("resolves placeholders to the default title and trims custom titles", () => {
  assert.equal(resolveBlogTitle(undefined), DEFAULT_BLOG_TITLE)
  assert.equal(resolveBlogTitle("   "), DEFAULT_BLOG_TITLE)
  assert.equal(resolveBlogTitle("bendy blog"), DEFAULT_BLOG_TITLE)
  assert.equal(resolveBlogTitle("  我的博客  "), "我的博客")
})
