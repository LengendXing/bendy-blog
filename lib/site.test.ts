import test from "node:test"
import assert from "node:assert/strict"
import { absoluteUrl, normalizeSiteUrl, SITE_TITLE, SITE_URL } from "./site"

test("normalizeSiteUrl falls back to the production URL", () => {
  assert.equal(normalizeSiteUrl(undefined), "https://blog.sunchengxin.com")
  assert.equal(normalizeSiteUrl("   "), "https://blog.sunchengxin.com")
})

test("normalizeSiteUrl trims whitespace and trailing slashes", () => {
  assert.equal(normalizeSiteUrl(" https://example.com/// "), "https://example.com")
})

test("absoluteUrl joins paths with exactly one slash", () => {
  assert.equal(absoluteUrl("/blogs"), `${SITE_URL}/blogs`)
  assert.equal(absoluteUrl("feed.xml"), `${SITE_URL}/feed.xml`)
})

test("site identity exposes the default title", () => {
  assert.equal(SITE_TITLE, "Bendy Blog")
})
