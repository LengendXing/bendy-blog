import test from "node:test"
import assert from "node:assert/strict"
import {
  MAX_ENTITY_ID_LENGTH,
  MAX_LOCALE_LENGTH,
  MAX_SLUG_LENGTH,
  normalizeDate,
  normalizeEntityId,
  normalizeLocale,
  normalizeOptionalEntityId,
  normalizeOptionalText,
  normalizeSlug,
  normalizeText,
} from "./public-input"

test("slug validation trims input and allows unicode slugs", () => {
  assert.equal(normalizeSlug(" hello-world "), "hello-world")
  assert.equal(normalizeSlug("中文-slug-1"), "中文-slug-1")
  assert.equal(normalizeSlug("a".repeat(MAX_SLUG_LENGTH)), "a".repeat(MAX_SLUG_LENGTH))
})

test("slug validation rejects empty, oversized and path-like values", () => {
  for (const value of [
    "",
    "   ",
    42,
    null,
    "a".repeat(MAX_SLUG_LENGTH + 1),
    "posts/evil",
    "..\\evil",
    "bad?query",
    "bad#hash",
    "bad%2f",
    "bad\nslug",
  ]) {
    assert.equal(normalizeSlug(value), null, String(value))
  }
})

test("entity ids accept cuid-shaped values only", () => {
  assert.equal(normalizeEntityId("clx1234567890abcdefghijkl"), "clx1234567890abcdefghijkl")
  assert.equal(normalizeEntityId("post-1"), "post-1")
  assert.equal(normalizeEntityId("  post_1  "), "post_1")
})

test("entity ids reject traversal, punctuation and oversized values", () => {
  for (const value of [
    "",
    "   ",
    42,
    null,
    "a".repeat(MAX_ENTITY_ID_LENGTH + 1),
    "../etc/passwd",
    "post 1",
    "post/1",
    "post.1",
    "post\n1",
  ]) {
    assert.equal(normalizeEntityId(value), null, String(value))
  }
})

test("locale validation accepts language and region tags", () => {
  assert.equal(normalizeLocale("zh"), "zh")
  assert.equal(normalizeLocale("en-US"), "en-US")
  assert.equal(normalizeLocale(undefined), "zh")
  assert.equal(normalizeLocale(""), "zh")
  assert.equal(normalizeLocale("bo"), "bo")
})

test("locale validation rejects malformed and oversized tags", () => {
  for (const value of ["zh_CN", "a".repeat(MAX_LOCALE_LENGTH + 1), "zh-CN-x", "../zh", 42]) {
    assert.equal(normalizeLocale(value), null, String(value))
  }
})

test("required text is trimmed and length capped", () => {
  assert.equal(normalizeText("  title  ", 10), "title")
  assert.equal(normalizeText("", 10), null)
  assert.equal(normalizeText("a".repeat(11), 10), null)
  assert.equal(normalizeText(42, 10), null)
})

test("optional text distinguishes blank, invalid and valid values", () => {
  assert.equal(normalizeOptionalText(undefined, 10), null)
  assert.equal(normalizeOptionalText(null, 10), null)
  assert.equal(normalizeOptionalText("   ", 10), null)
  assert.equal(normalizeOptionalText("  ok  ", 10), "ok")
  assert.equal(normalizeOptionalText("a".repeat(11), 10), undefined)
  assert.equal(normalizeOptionalText(42, 10), undefined)
})

test("optional entity ids distinguish blank, invalid and valid values", () => {
  assert.equal(normalizeOptionalEntityId(undefined), null)
  assert.equal(normalizeOptionalEntityId(null), null)
  assert.equal(normalizeOptionalEntityId("   "), null)
  assert.equal(normalizeOptionalEntityId("col-1"), "col-1")
  assert.equal(normalizeOptionalEntityId("bad id"), undefined)
  assert.equal(normalizeOptionalEntityId(42), undefined)
})

test("optional dates parse valid input and reject garbage", () => {
  assert.equal(normalizeDate(undefined), null)
  assert.equal(normalizeDate(null), null)
  assert.equal(normalizeDate(""), null)
  assert.equal(normalizeDate("2026-10-17")?.toISOString(), "2026-10-17T00:00:00.000Z")
  assert.equal(normalizeDate("not-a-date"), undefined)
  assert.equal(normalizeDate(42), undefined)
})
