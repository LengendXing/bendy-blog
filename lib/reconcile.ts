export interface DbPostRecord {
  id: string
  slug: string
  githubPath: string
  title: string
  published: boolean
  [key: string]: unknown
}

export interface RepoFileRecord {
  path: string
  sha?: string
  size?: number
  [key: string]: unknown
}

export type ReconcileFindingType =
  | "missing_in_repo"
  | "missing_in_db"
  | "path_mismatch"
  | "duplicate_github_path"
  | "invalid_github_path"

export interface ReconcileFinding {
  type: ReconcileFindingType
  severity: "error" | "warning"
  message: string
  slug?: string
  path?: string
}

export interface ReconcileSummary {
  dbPosts: number
  repoFiles: number
  matched: number
  missingInRepo: number
  missingInDb: number
  pathMismatches: number
  duplicatePaths: number
}

export interface ReconcileReport {
  generatedAt: string
  ok: boolean
  summary: ReconcileSummary
  findings: ReconcileFinding[]
}

export function normalizeRepoPath(path: string): string {
  return path
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\/+/, "")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/")
}

function isPostMarkdown(path: string): boolean {
  return /^posts\/[^/]+\.md$/i.test(path)
}

const FINDING_ORDER: Record<ReconcileFindingType, number> = {
  invalid_github_path: 0,
  missing_in_repo: 1,
  missing_in_db: 2,
  path_mismatch: 3,
  duplicate_github_path: 4,
}

function sortFindings(findings: ReconcileFinding[]): ReconcileFinding[] {
  return findings.sort((left, right) => {
    const typeDiff = FINDING_ORDER[left.type] - FINDING_ORDER[right.type]
    if (typeDiff !== 0) return typeDiff
    const pathDiff = (left.path ?? "").localeCompare(right.path ?? "")
    if (pathDiff !== 0) return pathDiff
    return (left.slug ?? "").localeCompare(right.slug ?? "")
  })
}

export function reconcileContent(
  dbPosts: DbPostRecord[],
  repoFiles: RepoFileRecord[],
  options: { generatedAt?: string } = {},
): ReconcileReport {
  const findings: ReconcileFinding[] = []
  const postsByPath = new Map<string, DbPostRecord[]>()
  const repoPaths = new Set<string>()
  let matched = 0
  let pathMismatches = 0
  let duplicatePaths = 0

  for (const file of repoFiles) {
    const path = normalizeRepoPath(file.path)
    if (isPostMarkdown(path)) repoPaths.add(path)
  }

  for (const post of dbPosts) {
    const path = normalizeRepoPath(String(post.githubPath ?? ""))
    const expected = `posts/${post.slug}.md`

    if (!path) {
      findings.push({
        type: "invalid_github_path",
        severity: "error",
        slug: post.slug,
        message: `数据库文章 ${post.slug} 的 githubPath 为空`,
      })
      continue
    }

    const entries = postsByPath.get(path) ?? []
    entries.push(post)
    postsByPath.set(path, entries)

    if (path !== expected) {
      pathMismatches += 1
      findings.push({
        type: "path_mismatch",
        severity: "error",
        slug: post.slug,
        path,
        message: `数据库文章 ${post.slug} 的 githubPath 为 ${path}，与约定路径 ${expected} 不一致`,
      })
    }

    if (repoPaths.has(path)) {
      matched += 1
    } else {
      findings.push({
        type: "missing_in_repo",
        severity: "error",
        slug: post.slug,
        path,
        message: `数据库文章 ${post.slug} 引用的文件 ${path} 在内容仓库中不存在`,
      })
    }
  }

  for (const [path, posts] of postsByPath) {
    if (posts.length <= 1) continue
    duplicatePaths += posts.length - 1
    for (const post of posts.slice(1)) {
      findings.push({
        type: "duplicate_github_path",
        severity: "error",
        slug: post.slug,
        path,
        message: `多个数据库文章共用 githubPath ${path}（重复项：${post.slug}）`,
      })
    }
  }

  let missingInDb = 0
  for (const path of repoPaths) {
    if (postsByPath.has(path)) continue
    missingInDb += 1
    const slug = path.replace(/^posts\//i, "").replace(/\.md$/i, "")
    findings.push({
      type: "missing_in_db",
      severity: "error",
      slug,
      path,
      message: `内容仓库文件 ${path} 没有对应的数据库文章记录`,
    })
  }

  const sorted = sortFindings(findings)
  return {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    ok: sorted.every(finding => finding.severity !== "error"),
    summary: {
      dbPosts: dbPosts.length,
      repoFiles: repoPaths.size,
      matched,
      missingInRepo: sorted.filter(finding => finding.type === "missing_in_repo").length,
      missingInDb,
      pathMismatches,
      duplicatePaths,
    },
    findings: sorted,
  }
}

export function formatReconcileMarkdown(report: ReconcileReport): string {
  const lines = [
    "# 内容仓库对账报告",
    "",
    `- 生成时间：${report.generatedAt}`,
    `- 结果：${report.ok ? "通过（无阻断项）" : "发现不一致"}`,
    "",
    "## 汇总",
    "",
    "| 指标 | 数量 |",
    "| --- | ---: |",
    `| 数据库文章 | ${report.summary.dbPosts} |`,
    `| 仓库 Markdown 文件 | ${report.summary.repoFiles} |`,
    `| 已匹配 | ${report.summary.matched} |`,
    `| 数据库有、仓库缺失 | ${report.summary.missingInRepo} |`,
    `| 仓库有、数据库缺失 | ${report.summary.missingInDb} |`,
    `| 路径与 slug 约定不一致 | ${report.summary.pathMismatches} |`,
    `| 重复 githubPath | ${report.summary.duplicatePaths} |`,
    "",
    "## 明细",
    "",
  ]

  if (report.findings.length === 0) {
    lines.push("未发现不一致。")
  } else {
    lines.push("| 类型 | 严重度 | slug | 路径 | 说明 |", "| --- | --- | --- | --- | --- |")
    for (const finding of report.findings) {
      lines.push(
        `| ${finding.type} | ${finding.severity} | ${finding.slug ?? "—"} | ${finding.path ?? "—"} | ${finding.message} |`,
      )
    }
  }

  return `${lines.join("\n")}\n`
}
