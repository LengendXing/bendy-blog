import test from "node:test"
import assert from "node:assert/strict"
import {
  MAX_LINKS_PER_COMMENT,
  checkCommentContent,
  parseBlockedKeywords,
} from "./comment-spam"

const KEYWORDS = ["casino", "加微信", "online poker"]

test("normal comments pass the spam filter", () => {
  assert.deepEqual(checkCommentContent("这篇文章写得很好，谢谢分享！", KEYWORDS), { ok: true })
})

test("blocked keywords match case-insensitively", () => {
  assert.deepEqual(checkCommentContent("Visit this CASINO now", KEYWORDS), {
    ok: false,
    code: "blocked_keyword",
    message: "comment contains blocked keyword",
  })
})

test("zero-width characters cannot hide blocked keywords", () => {
  assert.equal(checkCommentContent("ca\u200bsino", KEYWORDS).ok, false)
})

test("chinese blocked keywords match", () => {
  assert.equal(checkCommentContent("想赚钱就加微信", KEYWORDS).ok, false)
})

test("keyword list accepts chinese commas, trims and dedupes", () => {
  const keywords = parseBlockedKeywords("  Foo，bar, foo ,,  ")
  assert.ok(keywords.includes("foo"))
  assert.ok(keywords.includes("bar"))
  assert.equal(keywords.filter((keyword) => keyword === "foo").length, 1)
})

test("link floods are rejected but normal link counts pass", () => {
  const allowed = Array.from({ length: MAX_LINKS_PER_COMMENT }, (_, index) => `https://example.com/${index}`).join(" ")
  assert.deepEqual(checkCommentContent(allowed, KEYWORDS), { ok: true })

  const blocked = `${allowed} https://example.com/extra`
  assert.deepEqual(checkCommentContent(blocked, KEYWORDS), {
    ok: false,
    code: "too_many_links",
    message: "comment contains too many links",
  })
})

test("www-only links count toward the link limit", () => {
  const content = "www.a.com www.b.com www.c.com www.d.com"
  assert.equal(checkCommentContent(content, KEYWORDS).ok, false)
})
