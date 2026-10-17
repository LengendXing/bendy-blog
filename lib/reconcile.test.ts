import test from "node:test"
import assert from "node:assert/strict"
import {
  countContentDrift,
  hasContentDrift,
  normalizeContentPath,
  reconcileContent,
  summarizeContentDrift,
} from "./reconcile"

test("normalizeContentPath strips leading slashes and normalizes separators", () => {
  assert.equal(normalizeContentPath("/posts/a.md"), "posts/a.md")
  assert.equal(normalizeContentPath("\\posts\\b.md"), "posts/b.md")
  assert.equal(normalizeContentPath("  posts/c.md  "), "posts/c.md")
  assert.equal(normalizeContentPath("   "), null)
  assert.equal(normalizeContentPath(null), null)
})

test("reconcileContent reports a clean state", () => {
  const drift = reconcileContent(
    [{ id: "1", slug: "a", githubPath: "posts/a.md" }],
    [{ path: "posts/a.md" }],
  )
  assert.equal(hasContentDrift(drift), false)
  assert.equal(countContentDrift(drift).total, 0)
})

test("reconcileContent detects missing, orphan, duplicate and invalid paths", () => {
  const drift = reconcileContent(
    [
      { id: "1", slug: "missing", githubPath: "posts/missing.md" },
      { id: "2", slug: "dup-a", githubPath: "/posts/dup.md" },
      { id: "3", slug: "dup-b", githubPath: "posts/dup.md" },
      { id: "4", slug: "broken", githubPath: null },
    ],
    [
      { path: "posts/dup.md" },
      { path: "posts/orphan.md" },
    ],
  )

  assert.deepEqual(drift.missingInRepository.map(post => post.slug), ["missing"])
  assert.deepEqual(drift.orphanInRepository.map(file => file.path), ["posts/orphan.md"])
  assert.equal(drift.duplicatePaths.length, 1)
  assert.equal(drift.duplicatePaths[0].githubPath, "posts/dup.md")
  assert.deepEqual(drift.duplicatePaths[0].records.map(record => record.slug), ["dup-a", "dup-b"])
  assert.deepEqual(drift.invalidPaths.map(post => post.slug), ["broken"])

  const counts = countContentDrift(drift)
  assert.deepEqual(counts, {
    missingInRepository: 1,
    orphanInRepository: 1,
    duplicatePaths: 1,
    invalidPaths: 1,
    total: 4,
  })
  assert.equal(summarizeContentDrift(drift), "missing=1, orphan=1, duplicate=1, invalid=1")
})

test("reconcileContent matches normalized repository paths", () => {
  const drift = reconcileContent(
    [{ id: "1", slug: "a", githubPath: "posts/a.md" }],
    [{ path: "/posts/a.md" }],
  )
  assert.equal(hasContentDrift(drift), false)
})
