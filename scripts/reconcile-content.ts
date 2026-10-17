import { mkdir, readdir, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import {
  formatReconcileMarkdown,
  reconcileContent,
  type DbPostRecord,
  type RepoFileRecord,
} from "../lib/reconcile"
import { createPrismaClient } from "./lib/db-backup"
import { argValue, hasFlag } from "./lib/cli"

async function listLocalFiles(directory: string): Promise<RepoFileRecord[]> {
  const postsDir = path.join(directory, "posts")
  const entries = await readdir(postsDir, { withFileTypes: true })
  const files: RepoFileRecord[] = []
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) continue
    const info = await stat(path.join(postsDir, entry.name))
    files.push({ path: `posts/${entry.name}`, size: info.size })
  }
  return files
}

async function listGithubFiles(repo: string, branch: string | undefined, token: string | undefined): Promise<RepoFileRecord[]> {
  const url = new URL(`https://api.github.com/repos/${repo}/contents/posts`)
  if (branch) url.searchParams.set("ref", branch)

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(url, { headers, cache: "no-store" })
  if (!response.ok) {
    throw new Error(`GitHub API 返回 ${response.status}：${(await response.text()).slice(0, 300)}`)
  }

  const data = await response.json()
  if (!Array.isArray(data)) throw new Error("GitHub contents API 返回格式异常")

  return data
    .filter(item => item?.type === "file" && typeof item.name === "string" && item.name.toLowerCase().endsWith(".md"))
    .map(item => ({
      path: `posts/${item.name}`,
      sha: typeof item.sha === "string" ? item.sha : undefined,
      size: typeof item.size === "number" ? item.size : undefined,
    }))
}

async function loadRepoFiles(): Promise<RepoFileRecord[]> {
  const contentDir = argValue("--content-dir")
  if (contentDir) return listLocalFiles(path.resolve(process.cwd(), contentDir))

  const repo = process.env.GITHUB_CONTENT_REPO
  if (!repo) throw new Error("缺少 GITHUB_CONTENT_REPO，或使用 --content-dir 指定本地内容仓库")
  return listGithubFiles(repo, argValue("--branch") ?? process.env.GITHUB_CONTENT_BRANCH, process.env.GITHUB_TOKEN)
}

async function loadDbPosts(): Promise<DbPostRecord[]> {
  const prisma = createPrismaClient()
  try {
    return (await prisma.blogPost.findMany({
      select: { id: true, slug: true, githubPath: true, title: true, published: true },
      orderBy: { id: "asc" },
    })) as DbPostRecord[]
  } finally {
    await prisma.$disconnect()
  }
}

async function main() {
  const [posts, files] = await Promise.all([loadDbPosts(), loadRepoFiles()])
  const report = reconcileContent(posts, files)
  const output = hasFlag("--json") ? `${JSON.stringify(report, null, 2)}\n` : formatReconcileMarkdown(report)
  const outFile = argValue("--out")

  if (outFile) {
    const target = path.resolve(process.cwd(), outFile)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, output, "utf8")
    console.error(`[reconcile] 报告已写入 ${target}`)
  } else {
    process.stdout.write(output)
  }

  console.error(
    `[reconcile] ${report.ok ? "通过" : "发现不一致"}：db=${report.summary.dbPosts} repo=${report.summary.repoFiles} matched=${report.summary.matched} missingInRepo=${report.summary.missingInRepo} missingInDb=${report.summary.missingInDb}`,
  )

  if (hasFlag("--strict") && !report.ok) process.exitCode = 1
}

main().catch(error => {
  console.error(`[reconcile] 失败：${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
