import { loadEnvConfig } from "@next/env"

loadEnvConfig(process.cwd())

function printList(title: string, items: string[]) {
  console.log(`${title}: ${items.length}`)
  for (const item of items) console.log(`  - ${item}`)
}

async function main() {
  const [{ runContentReconciliation }, { prisma }, { logStructured }, { reportOperationFailure }, { summarizeContentDrift }] = await Promise.all([
    import("../lib/reconcile-runner"),
    import("../lib/prisma"),
    import("../lib/observability"),
    import("../lib/ops"),
    import("../lib/reconcile"),
  ])

  try {
    const report = await runContentReconciliation()

    if (process.argv.includes("--json")) {
      console.log(JSON.stringify(report, null, 2))
    } else {
      console.log(`Content reconciliation at ${report.checkedAt}`)
      console.log(`Database posts: ${report.posts}; repository files: ${report.repositoryFiles}`)
      printList(
        "Missing in repository",
        report.drift.missingInRepository.map(post => `${post.slug} (${post.githubPath})`),
      )
      printList(
        "Orphan files in repository",
        report.drift.orphanInRepository.map(file => file.path),
      )
      printList(
        "Duplicate githubPath",
        report.drift.duplicatePaths.map(item => `${item.githubPath} -> ${item.records.map(record => record.slug).join(", ")}`),
      )
      printList(
        "Invalid githubPath",
        report.drift.invalidPaths.map(post => `${post.slug} (${post.githubPath ?? "null"})`),
      )
      console.log(report.ok ? "Result: OK" : "Result: DRIFT FOUND")
    }

    logStructured(report.ok ? "info" : "warn", {
      event: report.ok ? "content.reconcile_ok" : "content.reconcile_drift",
      component: "script.reconcile",
      outcome: report.ok ? "success" : "failure",
      context: {
        checkedAt: report.checkedAt,
        posts: report.posts,
        repositoryFiles: report.repositoryFiles,
        counts: report.counts,
      },
    })

    if (!report.ok) {
      await reportOperationFailure({
        event: "content.reconcile_drift",
        component: "script.reconcile",
        action: "reconcile",
        error: new Error(`Content drift detected: ${summarizeContentDrift(report.drift)}`),
        context: {
          checkedAt: report.checkedAt,
          posts: report.posts,
          repositoryFiles: report.repositoryFiles,
          counts: report.counts,
        },
        severity: "warning",
        fingerprint: "content.reconcile_drift",
      })
    }

    process.exitCode = report.ok ? 0 : 1
  } catch (error) {
    await reportOperationFailure({
      event: "content.reconcile_failed",
      component: "script.reconcile",
      action: "reconcile",
      error,
      severity: "error",
      fingerprint: "content.reconcile_failed",
    })
    process.exitCode = 2
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(error => {
  console.error("Content reconciliation failed:", error instanceof Error ? error.message : error)
  process.exitCode = 2
})
