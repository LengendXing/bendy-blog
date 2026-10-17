import path from "node:path"
import { summarizeBackup } from "../lib/backup"
import { createPrismaClient, loadBackupFile, readSchemaSha256, restoreBackup, verifyRestoredCounts } from "./lib/db-backup"
import { argValue, hasFlag } from "./lib/cli"

async function main() {
  const file = argValue("--file")
  if (!file) throw new Error("缺少 --file <备份文件路径>")

  const backup = await loadBackupFile(path.resolve(process.cwd(), file))
  const summary = summarizeBackup(backup)
  console.log(`[restore] 备份时间：${backup.createdAt}${backup.label ? `（${backup.label}）` : ""}`)
  console.log(`[restore] 行数：${Object.entries(summary.tables).map(([table, count]) => `${table}=${count}`).join(", ")}`)
  console.log(`[restore] 合计 ${summary.totalRows} 行，checksum=${backup.checksum}`)

  const targetUrl = argValue("--target-url") ?? process.env.RESTORE_DATABASE_URL ?? process.env.DATABASE_URL
  if (!targetUrl) throw new Error("缺少目标数据库：请传 --target-url 或设置 RESTORE_DATABASE_URL / DATABASE_URL")

  if (backup.schemaSha256) {
    const currentSchemaSha256 = await readSchemaSha256()
    if (currentSchemaSha256 && currentSchemaSha256 !== backup.schemaSha256) {
      console.warn("[restore] 警告：备份的 schema 哈希与当前 prisma/schema.prisma 不一致，请确认迁移状态")
    }
  }

  if (!hasFlag("--execute")) {
    console.log("[restore] 当前为 dry-run，仅校验备份；加 --execute 才会清空目标库并写入数据")
    return
  }

  const targetsProduction = Boolean(process.env.DATABASE_URL && targetUrl === process.env.DATABASE_URL)
  if (targetsProduction && !hasFlag("--allow-production")) {
    throw new Error("目标数据库与 DATABASE_URL 相同；如确认要覆盖生产库，请追加 --allow-production")
  }

  console.log("[restore] 开始恢复（单事务，失败会自动回滚）")
  await restoreBackup(backup, targetUrl)

  const prisma = createPrismaClient(targetUrl)
  try {
    const counts = await verifyRestoredCounts(prisma, backup)
    const mismatches = Object.entries(counts).filter(([, value]) => value.expected !== value.actual)
    if (mismatches.length > 0) {
      throw new Error(
        `恢复后行数不一致：${mismatches
          .map(([table, value]) => `${table} expected=${value.expected} actual=${value.actual}`)
          .join(", ")}`,
      )
    }
    console.log(`[restore] 恢复完成，${Object.keys(counts).length} 张表行数校验通过`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(error => {
  const message = error instanceof Error ? error.message : String(error)
  if (/does not exist|P2021/i.test(message)) {
    console.error("[restore] 失败：目标库缺少表结构，请先对目标库执行 npx prisma db push --skip-generate")
  } else {
    console.error(`[restore] 失败：${message}`)
  }
  process.exitCode = 1
})
