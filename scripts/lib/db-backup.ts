import { readFile } from "node:fs/promises"
import path from "node:path"
import { PrismaClient } from "@prisma/client"
import {
  BACKUP_TABLES,
  DELETE_TABLE_ORDER,
  RESTORE_TABLE_ORDER,
  computeSchemaSha256,
  sortCommentsForRestore,
  validateBackupDocument,
  type BackupDocument,
  type BackupTable,
  type BackupTables,
} from "../../lib/backup"

type ModelDelegate = {
  findMany: (args?: unknown) => Promise<Record<string, unknown>[]>
  deleteMany: () => Promise<{ count: number }>
  createMany: (args: { data: Record<string, unknown>[] }) => Promise<{ count: number }>
  count: () => Promise<number>
}

const MODEL_ORDER_BY: Record<BackupTable, Record<string, "asc">> = {
  user: { id: "asc" },
  account: { id: "asc" },
  session: { id: "asc" },
  verificationToken: { identifier: "asc" },
  column: { id: "asc" },
  blogPost: { id: "asc" },
  comment: { id: "asc" },
  project: { id: "asc" },
  aboutPage: { locale: "asc" },
  siteConfig: { key: "asc" },
  notifyConfig: { id: "asc" },
}

function delegate(client: PrismaClient | Record<string, unknown>, table: BackupTable): ModelDelegate {
  return (client as unknown as Record<string, ModelDelegate>)[table]
}

export function createPrismaClient(databaseUrl?: string): PrismaClient {
  return new PrismaClient(
    databaseUrl
      ? {
          datasources: {
            db: { url: databaseUrl },
          },
        }
      : undefined,
  )
}

export async function collectDatabaseTables(prisma: PrismaClient): Promise<BackupTables> {
  const tables: BackupTables = {}
  for (const table of BACKUP_TABLES) {
    const rows = await delegate(prisma, table).findMany({ orderBy: MODEL_ORDER_BY[table] })
    tables[table] = { count: rows.length, rows }
  }
  return tables
}

export async function loadBackupFile(filePath: string): Promise<BackupDocument> {
  const raw = await readFile(filePath, "utf8")
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    throw new Error(`backup file is not valid JSON: ${error instanceof Error ? error.message : String(error)}`)
  }

  const result = validateBackupDocument(parsed)
  if (!result.ok) throw new Error(`backup file is invalid: ${result.error}`)
  return result.backup
}

export async function restoreBackup(backup: BackupDocument, targetUrl: string): Promise<void> {
  const prisma = createPrismaClient(targetUrl)
  try {
    await prisma.$transaction(
      async transaction => {
        const client = transaction as unknown as Record<string, ModelDelegate>

        for (const table of DELETE_TABLE_ORDER) {
          await delegate(client, table).deleteMany()
        }

        for (const table of RESTORE_TABLE_ORDER) {
          const sourceRows = backup.tables[table]?.rows ?? []
          const rows = table === "comment" ? sortCommentsForRestore(sourceRows) : sourceRows
          if (rows.length > 0) {
            await delegate(client, table).createMany({ data: rows })
          }
        }
      },
      { timeout: 120_000 },
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function verifyRestoredCounts(
  prisma: PrismaClient,
  backup: BackupDocument,
): Promise<Record<string, { expected: number; actual: number }>> {
  const counts: Record<string, { expected: number; actual: number }> = {}
  for (const table of BACKUP_TABLES) {
    const expected = backup.tables[table]?.count ?? 0
    const actual = await delegate(prisma, table).count()
    counts[table] = { expected, actual }
  }
  return counts
}

export async function readSchemaSha256(): Promise<string | undefined> {
  const candidates = [
    path.join(process.cwd(), "schema.prisma"),
    path.join(process.cwd(), "prisma", "schema.prisma"),
  ]
  for (const schemaPath of candidates) {
    try {
      const schema = await readFile(schemaPath, "utf8")
      return computeSchemaSha256(schema)
    } catch {
      // Try the next conventional Prisma schema location.
    }
  }
  return undefined
}
