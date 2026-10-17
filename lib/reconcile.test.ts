import test from "node:test"
import assert from "node:assert/strict"
import { hasContentDrift, normalizeContentPath, reconcileContent } from "./reconcile"

test("normalizeContentPath trims leading slashes and backslashes", () => {
  assert.equal(normalizeContentPath("/posts/hello.md"), "posts/hello.md")
  assert.equal(normalizeContentPath("\\posts\\hello.md"), "posts/hello.md")
  assert.equal(normalizeContentPath("   "), null)
  assert.equal(normalizeContentPath(null), null)
})

test("reconcileContent reports a clean state when DB and repository match", () => {
  const drift = reconcileContent(
    [{ id: "1", slug: "hello", githubPath: "posts/hello.md" }],
    [{ path: "posts/hello.md" }],
  )

  assert.equal(hasContentDrift(drift), false)
  assert.deepEqual(drift, {
    missingInRepository: [],
    orphanInRepository: [],
    duplicatePaths: [],
    invalidPaths: [],
  })
})

test("reconcileContent finds database records whose file is missing", () => {
  const drift = reconcileContent(
    [
      { id: "1", slug: "hello", githubPath: "posts/hello.md" },
      { id: "2", slug: "gone", githubPath: "posts/gone.md" },
    ],
    [{ path: "posts/hello.md" }],
  )

  assert.equal(hasContentDrift(drift), true)
  assert.deepEqual(drift.missingInRepository.map(post => post.slug), ["gone"])
})

test("reconcileContent finds orphan repository files", () => {
  const drift = reconcileContent(
    [{ id: "1", slug: "hello", githubPath: "posts/hello.md" }],
    [{ path: "posts/hello.md" }, { path: "posts/orphan.md" }],
  )

  assert.deepEqual(drift.orphanInRepository, [{ path: "posts/orphan.md" }])
})

test("reconcileContent reports duplicate githubPath references", () => {
  const drift = reconcileContent(
    [
      { id: "1", slug: "hello", githubPath: "posts/hello.md" },
      { id: "2", slug: "hello-copy", githubPath: "posts/hello.md" },
    ],
    [{ path: "posts/hello.md" }],
  )

  assert.deepEqual(drift.duplicatePaths, [
    {
      githubPath: "posts/hello.md",
      records: [
        { id: "1", slug: "hello", githubPath: "posts/hello.md" },
        { id: "2", slug: "hello-copy", githubPath: "posts/hello.md" },
      ],
    },
  ])
})

test("reconcileContent reports records without a usable githubPath", () => {
  const drift = reconcileContent(
    [
      { id: "1", slug: "no-path", githubPath: null },
      { id: "2", slug: "blank-path", githubPath: "  " },
    ],
    [],
  )

  assert.deepEqual(drift.invalidPaths.map(post => post.slug), ["blank-path", "no-path"])
})
