import { mkdir, readdir, unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import { buildBackupDocument, summarizeBackup } from "../lib/backup"
import { collectDatabaseTables, createPrismaClient, readSchemaSha256 } from "./lib/db-backup"
import { argValue } from "./lib/cli"

const DEFAULT_KEEP = 14

async function pruneBackups(directory: string, keep: number): Promise<string[]> {
  const entries = await readdir(directory)
  const files = entries
    .filter(name => name.startsWith("db-backup-") && name.endsWith(".json"))
    .sort()
  const removable = files.slice(0, Math.max(0, files.length - keep))
  for (const file of removable) await unlink(path.join(directory, file))
  return removable
}

async function main() {
  const outDir = path.resolve(process.cwd(), argValue("--out") ?? "backups")
  const label = argValue("--label")
  const keepValue = Number(argValue("--keep") ?? DEFAULT_KEEP)
  const keep = Number.isFinite(keepValue) && keepValue >= 0 ? Math.floor(keepValue) : DEFAULT_KEEP

  if (!process.env.DATABASE_URL) throw new Error("缺少 DATABASE_URL 环境变量")
  await mkdir(outDir, { recursive: true, mode: 0o700 })

  const prisma = createPrismaClient()
  try {
    const tables = await collectDatabaseTables(prisma)
    const schemaSha256 = await readSchemaSha256()
    const backup = buildBackupDocument({ tables, label, schemaSha256 })
    const filename = `db-backup-${backup.createdAt.replace(/[:.]/g, "-")}.json`
    const filePath = path.join(outDir, filename)

    await writeFile(filePath, `${JSON.stringify(backup, null, 2)}\n`, { mode: 0o600 })
    const summary = summarizeBackup(backup)
    console.log(`[backup] 已写入 ${filePath}`)
    console.log(`[backup] 行数：${Object.entries(summary.tables).map(([table, count]) => `${table}=${count}`).join(", ")}`)
    console.log(`[backup] 合计 ${summary.totalRows} 行，checksum=${backup.checksum}`)

    if (keep > 0) {
      const removed = await pruneBackups(outDir, keep)
      if (removed.length > 0) console.log(`[backup] 已清理 ${removed.length} 个旧备份（保留 ${keep} 个）`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(error => {
  console.error(`[backup] 失败：${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
