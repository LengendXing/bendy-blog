import test from "node:test"
import assert from "node:assert/strict"
import { getAboutLocaleCandidates, hasAboutContent } from "./about-locale"

test("about content falls back from the requested locale to English, then Chinese", () => {
  assert.deepEqual(getAboutLocaleCandidates("bo"), ["bo", "en", "zh"])
  assert.deepEqual(getAboutLocaleCandidates("mn"), ["mn", "en", "zh"])
  assert.deepEqual(getAboutLocaleCandidates("en"), ["en", "zh"])
  assert.deepEqual(getAboutLocaleCandidates("zh"), ["zh", "en"])
})

test("invalid or missing about locales never produce an unsafe query", () => {
  assert.deepEqual(getAboutLocaleCandidates(null), ["zh", "en"])
  assert.deepEqual(getAboutLocaleCandidates("../../etc/passwd"), ["zh", "en"])
})

test("about content detection accepts any configured field, not only name", () => {
  assert.equal(hasAboutContent({ name: "Bendy" }), true)
  assert.equal(hasAboutContent({ name: "", markdown: "hello" }), true)
  assert.equal(hasAboutContent({ name: "", links: { GitHub: "https://github.com" } }), true)
  assert.equal(hasAboutContent({ name: "", bio: "", avatar: "", markdown: "", links: {} }), false)
  assert.equal(hasAboutContent(null), false)
})
