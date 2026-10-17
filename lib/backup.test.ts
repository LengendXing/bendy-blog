import test from "node:test"
import assert from "node:assert/strict"
import {
  BACKUP_FORMAT,
  BACKUP_TABLES,
  BACKUP_VERSION,
  DELETE_TABLE_ORDER,
  RESTORE_TABLE_ORDER,
  buildBackupDocument,
  computeBackupChecksum,
  computeSchemaSha256,
  sortCommentsForRestore,
  stableStringify,
  summarizeBackup,
  validateBackupDocument,
} from "./backup"

type Tables = Record<string, { count: number; rows: Record<string, unknown>[] }>

function emptyTables(): Tables {
  const tables: Tables = {}
  for (const table of BACKUP_TABLES) tables[table] = { count: 0, rows: [] }
  return tables
}

test("stableStringify sorts nested object keys", () => {
  assert.equal(stableStringify({ b: 1, a: { d: 2, c: 3 } }), '{"a":{"c":3,"d":2},"b":1}')
  assert.equal(stableStringify({ a: [{ z: 1, y: 2 }] }), '{"a":[{"y":2,"z":1}]}')
})

test("computeBackupChecksum ignores table insertion order", () => {
  const first: Tables = {
    blogPost: { count: 1, rows: [{ id: "post-1", title: "Hello" }] },
    user: { count: 0, rows: [] },
  }
  const second: Tables = {
    user: { count: 0, rows: [] },
    blogPost: { count: 1, rows: [{ title: "Hello", id: "post-1" }] },
  }
  assert.equal(computeBackupChecksum(first), computeBackupChecksum(second))
})

test("buildBackupDocument records all tables, metadata and a valid checksum", () => {
  const tables = emptyTables()
  tables.blogPost = { count: 1, rows: [{ id: "post-1", title: "Hello" }] }
  const document = buildBackupDocument({
    tables,
    createdAt: "2026-10-17T00:00:00.000Z",
    label: "nightly",
    schemaSha256: "a".repeat(64),
  })

  assert.equal(document.format, BACKUP_FORMAT)
  assert.equal(document.version, BACKUP_VERSION)
  assert.equal(document.label, "nightly")
  assert.equal(document.schemaSha256, "a".repeat(64))
  assert.equal(document.checksum, computeBackupChecksum(tables))
  assert.equal(validateBackupDocument(document).ok, true)
  assert.deepEqual(summarizeBackup(document), {
    totalRows: 1,
    tables: Object.fromEntries(BACKUP_TABLES.map(table => [table, table === "blogPost" ? 1 : 0])),
  })
})

test("validateBackupDocument rejects a tampered checksum", () => {
  const tables = emptyTables()
  tables.blogPost = { count: 1, rows: [{ id: "post-1", title: "Hello" }] }
  const document = buildBackupDocument({ tables, createdAt: "2026-10-17T00:00:00.000Z" })
  document.tables.blogPost.rows[0].title = "Changed"

  const result = validateBackupDocument(document)
  assert.equal(result.ok, false)
  if (!result.ok) assert.match(result.error, /checksum/i)
})

test("validateBackupDocument rejects table count mismatches", () => {
  const tables = emptyTables()
  tables.comment = { count: 1, rows: [{ id: "comment-1" }] }
  const document = buildBackupDocument({ tables, createdAt: "2026-10-17T00:00:00.000Z" })
  document.tables.comment.count = 2
  document.checksum = computeBackupChecksum(document.tables)

  const result = validateBackupDocument(document)
  assert.equal(result.ok, false)
  if (!result.ok) assert.match(result.error, /comment/i)
})

test("validateBackupDocument rejects unknown formats and versions", () => {
  const tables = emptyTables()
  const document = buildBackupDocument({ tables, createdAt: "2026-10-17T00:00:00.000Z" })

  assert.equal(validateBackupDocument({ ...document, format: "other" }).ok, false)
  assert.equal(validateBackupDocument({ ...document, version: 99 }).ok, false)
  assert.equal(validateBackupDocument(null).ok, false)
})

test("computeSchemaSha256 normalizes line endings", () => {
  assert.equal(computeSchemaSha256("model A {}\n"), computeSchemaSha256("model A {}\r\n"))
  assert.notEqual(computeSchemaSha256("model A {}\n"), computeSchemaSha256("model B {}\n"))
})

test("restore and delete orders are exact inverses and cover every table", () => {
  assert.deepEqual([...RESTORE_TABLE_ORDER], [...BACKUP_TABLES])
  assert.deepEqual([...DELETE_TABLE_ORDER], [...BACKUP_TABLES].reverse())
  assert.equal(new Set(RESTORE_TABLE_ORDER).size, BACKUP_TABLES.length)
})

test("sortCommentsForRestore places parents before replies", () => {
  const rows = [
    { id: "comment-3", parentId: "comment-1" },
    { id: "comment-1", parentId: null },
    { id: "comment-2", parentId: "comment-3" },
  ]
  assert.deepEqual(sortCommentsForRestore(rows).map(row => row.id), ["comment-1", "comment-3", "comment-2"])
})

test("sortCommentsForRestore keeps orphans and cycles without losing rows", () => {
  const rows = [
    { id: "comment-a", parentId: "comment-b" },
    { id: "comment-b", parentId: "comment-a" },
    { id: "comment-orphan", parentId: "missing" },
  ]
  const sorted = sortCommentsForRestore(rows)
  assert.equal(sorted.length, rows.length)
  assert.deepEqual(sorted.map(row => row.id).sort(), ["comment-a", "comment-b", "comment-orphan"])
})
