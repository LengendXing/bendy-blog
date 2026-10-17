import { createHash } from "node:crypto"

export const BACKUP_FORMAT = "bendy-blog-db-backup"
export const BACKUP_VERSION = 1

/**
 * Tables included in a logical backup. The order is also the insert order used
 * by restore: referenced rows (User, Column, BlogPost) come before their
 * dependants (Account, Session, Comment).
 */
export const BACKUP_TABLES = [
  "user",
  "account",
  "session",
  "verificationToken",
  "column",
  "blogPost",
  "comment",
  "project",
  "aboutPage",
  "siteConfig",
  "notifyConfig",
] as const

export type BackupTable = (typeof BACKUP_TABLES)[number]

export const RESTORE_TABLE_ORDER: readonly BackupTable[] = BACKUP_TABLES

export const DELETE_TABLE_ORDER: readonly BackupTable[] = [...BACKUP_TABLES].reverse()

export interface BackupTableData {
  count: number
  rows: Record<string, unknown>[]
}

export type BackupTables = Record<string, BackupTableData>

export interface BackupDocument {
  format: typeof BACKUP_FORMAT
  version: number
  createdAt: string
  label?: string
  schemaSha256?: string
  tables: BackupTables
  checksum: string
}

export interface BackupSummary {
  totalRows: number
  tables: Record<string, number>
}

export type ValidationResult =
  | { ok: true; backup: BackupDocument }
  | { ok: false; error: string }

function normalizeForJson(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(normalizeForJson)
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = normalizeForJson(record[key])
        return result
      }, {})
  }
  return value
}

/** JSON serialization with recursively sorted keys, used for stable checksums. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(normalizeForJson(value))
}

export function computeBackupChecksum(tables: BackupTables): string {
  return createHash("sha256").update(stableStringify(tables)).digest("hex")
}

export function computeSchemaSha256(schema: string): string {
  return createHash("sha256").update(schema.replace(/\r\n/g, "\n")).digest("hex")
}

export function buildBackupDocument(input: {
  tables: BackupTables
  createdAt?: string
  label?: string
  schemaSha256?: string
}): BackupDocument {
  const tables: BackupTables = {}
  for (const table of BACKUP_TABLES) {
    const data = input.tables[table] ?? { count: 0, rows: [] }
    tables[table] = { count: data.rows.length, rows: data.rows }
  }

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: input.createdAt ?? new Date().toISOString(),
    ...(input.label ? { label: input.label } : {}),
    ...(input.schemaSha256 ? { schemaSha256: input.schemaSha256 } : {}),
    tables,
    checksum: computeBackupChecksum(tables),
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export function validateBackupDocument(value: unknown): ValidationResult {
  if (!isPlainObject(value)) return { ok: false, error: "backup document must be an object" }
  if (value.format !== BACKUP_FORMAT) {
    return { ok: false, error: `unsupported backup format: ${String(value.format)}` }
  }
  if (value.version !== BACKUP_VERSION) {
    return { ok: false, error: `unsupported backup version: ${String(value.version)}` }
  }
  if (typeof value.createdAt !== "string" || Number.isNaN(Date.parse(value.createdAt))) {
    return { ok: false, error: "backup createdAt must be an ISO date" }
  }
  if (!isPlainObject(value.tables)) return { ok: false, error: "backup tables must be an object" }

  const knownTables = new Set<string>(BACKUP_TABLES)
  for (const key of Object.keys(value.tables)) {
    if (!knownTables.has(key)) return { ok: false, error: `unknown backup table: ${key}` }
  }

  for (const table of BACKUP_TABLES) {
    const data = value.tables[table]
    if (!isPlainObject(data)) return { ok: false, error: `missing backup table: ${table}` }
    if (!Array.isArray(data.rows)) return { ok: false, error: `table ${table} rows must be an array` }
    if (!Number.isInteger(data.count) || data.count !== data.rows.length) {
      return { ok: false, error: `table ${table} count does not match rows length` }
    }
    if (data.rows.some(row => !isPlainObject(row))) {
      return { ok: false, error: `table ${table} contains a non-object row` }
    }
  }

  if (typeof value.checksum !== "string" || !/^[a-f0-9]{64}$/.test(value.checksum)) {
    return { ok: false, error: "backup checksum is missing or malformed" }
  }
  const expected = computeBackupChecksum(value.tables as BackupTables)
  if (expected !== value.checksum) {
    return { ok: false, error: "backup checksum mismatch; the file was modified or corrupted" }
  }

  return { ok: true, backup: value as unknown as BackupDocument }
}

export function summarizeBackup(backup: BackupDocument): BackupSummary {
  const tables: Record<string, number> = {}
  let totalRows = 0
  for (const table of BACKUP_TABLES) {
    const count = backup.tables[table]?.count ?? 0
    tables[table] = count
    totalRows += count
  }
  return { totalRows, tables }
}

/**
 * Comments reference themselves through parentId, so a bulk restore must insert
 * parents before replies. Rows with missing parents and cycles are appended in
 * their original order instead of being dropped.
 */
export function sortCommentsForRestore<T extends Record<string, unknown>>(rows: T[]): T[] {
  const byId = new Map<string, T>()
  for (const row of rows) {
    if (typeof row.id === "string") byId.set(row.id, row)
  }

  const children = new Map<string, T[]>()
  const roots: T[] = []
  for (const row of rows) {
    const parentId = typeof row.parentId === "string" ? row.parentId : null
    if (!parentId || !byId.has(parentId) || parentId === row.id) {
      roots.push(row)
      continue
    }
    const siblings = children.get(parentId) ?? []
    siblings.push(row)
    children.set(parentId, siblings)
  }

  const result: T[] = []
  const visited = new Set<T>()
  const visit = (row: T) => {
    if (visited.has(row)) return
    visited.add(row)
    result.push(row)
    for (const child of children.get(String(row.id)) ?? []) visit(child)
  }

  for (const root of roots) visit(root)
  for (const row of rows) visit(row)
  return result
}
