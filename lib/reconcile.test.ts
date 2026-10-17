import test from "node:test"
import assert from "node:assert/strict"
import { formatReconcileMarkdown, normalizeRepoPath, reconcileContent } from "./reconcile"

function dbPost(overrides: Record<string, unknown> = {}) {
  return {
    id: "post-1",
    slug: "hello",
    githubPath: "posts/hello.md",
    title: "Hello",
    published: true,
    ...overrides,
  }
}

test("normalizeRepoPath strips leading slashes and dot segments", () => {
  assert.equal(normalizeRepoPath("/posts/a.md"), "posts/a.md")
  assert.equal(normalizeRepoPath("./posts/a.md"), "posts/a.md")
  assert.equal(normalizeRepoPath("posts\\a.md"), "posts/a.md")
})

test("reconcileContent reports a clean match", () => {
  const report = reconcileContent([dbPost()], [{ path: "posts/hello.md" }], {
    generatedAt: "2026-10-17T00:00:00.000Z",
  })
  assert.equal(report.ok, true)
  assert.equal(report.summary.dbPosts, 1)
  assert.equal(report.summary.repoFiles, 1)
  assert.equal(report.summary.matched, 1)
  assert.equal(report.summary.missingInRepo, 0)
  assert.equal(report.summary.missingInDb, 0)
  assert.deepEqual(report.findings, [])
})

test("reconcileContent reports database posts missing from the repository", () => {
  const report = reconcileContent([dbPost()], [], { generatedAt: "2026-10-17T00:00:00.000Z" })
  assert.equal(report.ok, false)
  assert.equal(report.summary.missingInRepo, 1)
  assert.equal(report.findings[0].type, "missing_in_repo")
  assert.equal(report.findings[0].slug, "hello")
})

test("reconcileContent reports repository files missing from the database", () => {
  const report = reconcileContent([], [{ path: "posts/orphan.md" }], {
    generatedAt: "2026-10-17T00:00:00.000Z",
  })
  assert.equal(report.ok, false)
  assert.equal(report.summary.missingInDb, 1)
  assert.equal(report.findings[0].type, "missing_in_db")
  assert.equal(report.findings[0].path, "posts/orphan.md")
})

test("reconcileContent flags githubPath drift from the slug convention", () => {
  const report = reconcileContent([dbPost({ githubPath: "posts/legacy-name.md" })], [
    { path: "posts/legacy-name.md" },
  ], { generatedAt: "2026-10-17T00:00:00.000Z" })
  assert.equal(report.ok, false)
  assert.equal(report.summary.pathMismatches, 1)
  assert.equal(report.findings[0].type, "path_mismatch")
})

test("reconcileContent flags duplicate githubPath references", () => {
  const report = reconcileContent(
    [dbPost(), dbPost({ id: "post-2", slug: "hello-copy" })],
    [{ path: "posts/hello.md" }],
    { generatedAt: "2026-10-17T00:00:00.000Z" },
  )
  assert.equal(report.ok, false)
  assert.equal(report.summary.duplicatePaths, 1)
  assert.ok(report.findings.some(finding => finding.type === "duplicate_github_path"))
})

test("reconcileContent flags invalid githubPath values", () => {
  const report = reconcileContent([dbPost({ githubPath: "" })], [], {
    generatedAt: "2026-10-17T00:00:00.000Z",
  })
  assert.equal(report.ok, false)
  assert.equal(report.findings[0].type, "invalid_github_path")
})

test("reconcileContent ignores non-post markdown files", () => {
  const report = reconcileContent([dbPost()], [
    { path: "posts/hello.md" },
    { path: "README.md" },
    { path: "posts/notes.txt" },
  ], { generatedAt: "2026-10-17T00:00:00.000Z" })
  assert.equal(report.summary.repoFiles, 1)
  assert.equal(report.ok, true)
})

test("formatReconcileMarkdown includes the summary and each finding", () => {
  const report = reconcileContent([dbPost()], [], { generatedAt: "2026-10-17T00:00:00.000Z" })
  const markdown = formatReconcileMarkdown(report)
  assert.match(markdown, /内容仓库对账报告/)
  assert.match(markdown, /数据库有、仓库缺失 \| 1/)
  assert.match(markdown, /missing_in_repo/)
  assert.match(markdown, /posts\/hello\.md/)
})

test("reconcileContent output is deterministic", () => {
  const first = reconcileContent([dbPost({ githubPath: "" })], [{ path: "posts/b.md" }, { path: "posts/a.md" }], {
    generatedAt: "2026-10-17T00:00:00.000Z",
  })
  const second = reconcileContent([dbPost({ githubPath: "" })], [{ path: "posts/a.md" }, { path: "posts/b.md" }], {
    generatedAt: "2026-10-17T00:00:00.000Z",
  })
  assert.deepEqual(first, second)
})
