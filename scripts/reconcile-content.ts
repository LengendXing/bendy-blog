import { loadEnvConfig } from "@next/env"
import { hasContentDrift, reconcileContent } from "../lib/reconcile"

loadEnvConfig(process.cwd())

const POSTS_DIR = "posts"

function printList(title: string, items: string[]) {
  console.log(`${title}: ${items.length}`)
  for (const item of items) console.log(`  - ${item}`)
}

async function main() {
  const [{ prisma }, { listFiles }] = await Promise.all([
    import("../lib/prisma"),
    import("../lib/github"),
  ])

  try {
    const posts = await prisma.blogPost.findMany({
      select: { id: true, slug: true, githubPath: true },
      orderBy: { slug: "asc" },
    })
    const files = await listFiles(POSTS_DIR)
    const drift = reconcileContent(posts, files)
    const result = {
      checkedAt: new Date().toISOString(),
      posts: posts.length,
      repositoryFiles: files.length,
      drift,
      ok: !hasContentDrift(drift),
    }

    if (process.argv.includes("--json")) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`Content reconciliation at ${result.checkedAt}`)
      console.log(`Database posts: ${result.posts}; repository files: ${result.repositoryFiles}`)
      printList("Missing in repository", drift.missingInRepository.map(post => `${post.slug} (${post.githubPath})`))
      printList("Orphan files in repository", drift.orphanInRepository.map(file => file.path))
      printList(
        "Duplicate githubPath",
        drift.duplicatePaths.map(item => `${item.githubPath} -> ${item.records.map(record => record.slug).join(", ")}`),
      )
      printList("Invalid githubPath", drift.invalidPaths.map(post => `${post.slug} (${post.githubPath ?? "null"})`))
      console.log(result.ok ? "Result: OK" : "Result: DRIFT FOUND")
    }

    process.exitCode = result.ok ? 0 : 1
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(error => {
  console.error("Content reconciliation failed:", error instanceof Error ? error.message : error)
  process.exitCode = 2
})
