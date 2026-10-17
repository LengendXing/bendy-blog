import { prisma } from "./prisma"
import { listFiles } from "./github"
import {
  countContentDrift,
  hasContentDrift,
  reconcileContent,
  type ContentDrift,
  type ContentDriftCounts,
} from "./reconcile"

export const POSTS_DIRECTORY = "posts"

export interface ReconcileReport {
  checkedAt: string
  posts: number
  repositoryFiles: number
  drift: ContentDrift
  counts: ContentDriftCounts
  ok: boolean
}

/**
 * Read both stores and produce a drift report. Shared by the CLI script and
 * the cron endpoint so scheduled checks and manual checks cannot diverge.
 */
export async function runContentReconciliation(): Promise<ReconcileReport> {
  const posts = await prisma.blogPost.findMany({
    select: { id: true, slug: true, githubPath: true },
    orderBy: { slug: "asc" },
  })
  const files = await listFiles(POSTS_DIRECTORY)
  const drift = reconcileContent(posts, files)
  const counts = countContentDrift(drift)

  return {
    checkedAt: new Date().toISOString(),
    posts: posts.length,
    repositoryFiles: files.length,
    drift,
    counts,
    ok: !hasContentDrift(drift),
  }
}
