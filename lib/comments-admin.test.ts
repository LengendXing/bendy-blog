import test from "node:test"
import assert from "node:assert/strict"
import {
  COMMENTS_BULK_MAX_IDS,
  buildCommentsCsv,
  commentsExportFilename,
  escapeCsvCell,
  parseBulkDeleteIds,
} from "./comments-admin"

test("bulk delete accepts, trims and dedupes ids", () => {
  assert.deepEqual(parseBulkDeleteIds({ ids: [" cm1 ", "cm2", "cm1"] }), {
    ok: true,
    ids: ["cm1", "cm2"],
  })
})

test("single delete bodies are reported as not bulk", () => {
  assert.deepEqual(parseBulkDeleteIds({ id: "cm1" }), { ok: false, error: "not_bulk" })
  assert.deepEqual(parseBulkDeleteIds(null), { ok: false, error: "not_bulk" })
})

test("bulk delete rejects empty, malformed and oversized id lists", () => {
  assert.deepEqual(parseBulkDeleteIds({ ids: [] }), { ok: false, error: "empty_ids" })
  assert.deepEqual(parseBulkDeleteIds({ ids: "cm1" }), { ok: false, error: "invalid_ids" })
  assert.deepEqual(parseBulkDeleteIds({ ids: ["cm1", 2] }), { ok: false, error: "invalid_ids" })
  assert.deepEqual(parseBulkDeleteIds({ ids: ["bad id!"] }), { ok: false, error: "invalid_ids" })
  assert.deepEqual(parseBulkDeleteIds({ ids: ["x".repeat(65)] }), { ok: false, error: "invalid_ids" })

  const tooMany = Array.from({ length: COMMENTS_BULK_MAX_IDS + 1 }, (_, index) => `cm${index}`)
  assert.deepEqual(parseBulkDeleteIds({ ids: tooMany }), { ok: false, error: "too_many_ids" })
})

test("csv cells quote separators, quotes and newlines", () => {
  assert.equal(escapeCsvCell("plain"), "plain")
  assert.equal(escapeCsvCell("a,b"), '"a,b"')
  assert.equal(escapeCsvCell('say "hi"'), '"say ""hi"""')
  assert.equal(escapeCsvCell("line1\nline2"), '"line1\nline2"')
  assert.equal(escapeCsvCell(null), "")
})

test("csv cells neutralize spreadsheet formula injection", () => {
  assert.equal(escapeCsvCell("=SUM(A1:A2)"), "'=SUM(A1:A2)")
  assert.equal(escapeCsvCell("+1-2"), "'+1-2")
  assert.equal(escapeCsvCell("@import"), "'@import")
})

test("comments csv starts with a BOM, header and CRLF rows", () => {
  const csv = buildCommentsCsv([
    {
      id: "cm1",
      postTitle: "Hello, world",
      postSlug: "hello",
      authorName: "Alice",
      githubUsername: null,
      content: "Nice post\nThanks!",
      imageUrl: null,
      parentId: null,
      replyToId: null,
      createdAt: new Date("2026-10-17T00:00:00.000Z"),
    },
  ])

  assert.ok(csv.startsWith("\uFEFFid,postTitle,postSlug"))
  assert.ok(csv.includes('\r\ncm1,"Hello, world",hello,Alice,,"Nice post\nThanks!"'))
  assert.ok(csv.endsWith("\r\n"))
  assert.ok(csv.includes("2026-10-17T00:00:00.000Z"))
})

test("export filename uses the UTC date", () => {
  assert.equal(commentsExportFilename(new Date("2026-10-17T23:59:59.000Z")), "comments-20261017.csv")
})
