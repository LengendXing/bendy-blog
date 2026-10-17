import test from "node:test"
import assert from "node:assert/strict"
import { hasUnsavedChanges, stableSnapshot } from "./unsaved-changes"

test("stableSnapshot is independent of object key order", () => {
  assert.equal(
    stableSnapshot({ title: "a", meta: { b: 2, a: 1 } }),
    stableSnapshot({ meta: { a: 1, b: 2 }, title: "a" }),
  )
})

test("stableSnapshot keeps array order meaningful", () => {
  assert.notEqual(stableSnapshot({ links: ["a", "b"] }), stableSnapshot({ links: ["b", "a"] }))
})

test("stableSnapshot ignores undefined object fields", () => {
  assert.equal(stableSnapshot({ title: "a", extra: undefined }), stableSnapshot({ title: "a" }))
})

test("hasUnsavedChanges is false for equal form snapshots", () => {
  const initial = { title: "Post", markdown: "# Body", published: false }
  assert.equal(hasUnsavedChanges({ ...initial }, initial), false)
})

test("hasUnsavedChanges detects edits in nested values", () => {
  const initial = { title: "Post", links: { github: "https://github.com/a" } }
  assert.equal(
    hasUnsavedChanges({ title: "Post", links: { github: "https://github.com/b" } }, initial),
    true,
  )
})

test("hasUnsavedChanges detects a cleared field", () => {
  assert.equal(hasUnsavedChanges({ description: "" }, { description: "old" }), true)
})
