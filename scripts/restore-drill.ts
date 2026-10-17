import path from "node:path"
import { summarizeBackup } from "../lib/backup"
import { createPrismaClient, loadBackupFile, restoreBackup, verifyRestoredCounts } from "./lib/db-backup"
import { argValue } from "./lib/cli"

async function main() {
  const file = argValue("--file")
  if (!file) throw new Error("缺少 --file <备份文件路径>")

  const targetUrl = argValue("--target-url") ?? process.env.DRILL_DATABASE_URL
  if (!targetUrl) throw new Error("缺少演练库：请传 --target-url 或设置 DRILL_DATABASE_URL")
  if (process.env.DATABASE_URL && targetUrl === process.env.DATABASE_URL) {
    throw new Error("演练库不能与 DATABASE_URL 相同，请使用独立的临时数据库")
  }

  const backup = await loadBackupFile(path.resolve(process.cwd(), file))
  const summary = summarizeBackup(backup)
  console.log(`[drill] 使用备份 ${backup.createdAt}，合计 ${summary.totalRows} 行`)

  await restoreBackup(backup, targetUrl)

  const prisma = createPrismaClient(targetUrl)
  try {
    const counts = await verifyRestoredCounts(prisma, backup)
    const mismatches = Object.entries(counts).filter(([, value]) => value.expected !== value.actual)
    if (mismatches.length > 0) {
      throw new Error(
        `演练行数校验失败：${mismatches
          .map(([table, value]) => `${table} expected=${value.expected} actual=${value.actual}`)
          .join(", ")}`,
      )
    }
    console.log(`[drill] 恢复演练通过：${Object.keys(counts).length} 张表行数一致`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(error => {
  const message = error instanceof Error ? error.message : String(error)
  if (/does not exist|P2021/i.test(message)) {
    console.error("[drill] 失败：演练库缺少表结构，请先对演练库执行 npx prisma db push --skip-generate")
  } else {
    console.error(`[drill] 失败：${message}`)
  }
  process.exitCode = 1
})
