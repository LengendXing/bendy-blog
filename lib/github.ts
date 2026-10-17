const GITHUB_API_BASE = "https://api.github.com"

type GitHubOperation = "read" | "list" | "write" | "delete" | "config"

export class GitHubApiError extends Error {
  readonly operation: GitHubOperation
  readonly path: string
  readonly status: number

  constructor(operation: GitHubOperation, path: string, status: number, detail: string) {
    super(`GitHub ${operation} failed${path ? ` for ${path}` : ""} (status ${status}): ${detail}`)
    this.name = "GitHubApiError"
    this.operation = operation
    this.path = path
    this.status = status
  }
}

export type GitHubFile = {
  content: string
  sha: string
}

export type GitHubWriteResult = {
  content?: { sha?: string }
  commit?: { sha?: string }
  [key: string]: unknown
}

function getConfig(): { repo: string; token: string } {
  const repo = process.env.GITHUB_CONTENT_REPO?.trim()
  const token = process.env.GITHUB_TOKEN?.trim()
  if (!repo || !token) {
    throw new GitHubApiError("config", "", 0, "GITHUB_CONTENT_REPO and GITHUB_TOKEN must be configured")
  }
  return { repo, token }
}

function buildHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  }
}

function encodeContentPath(path: string): string {
  return path
    .split("/")
    .filter(Boolean)
    .map(segment => encodeURIComponent(segment))
    .join("/")
}

async function readErrorDetail(res: Response): Promise<string> {
  try {
    const payload = await res.json()
    if (payload && typeof payload.message === "string" && payload.message.trim()) {
      return payload.message.trim()
    }
  } catch {
    // The response body is not JSON; fall back to the status text below.
  }
  return res.statusText || `request failed with status ${res.status}`
}

async function githubFetch(
  operation: GitHubOperation,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const { repo, token } = getConfig()
  const url = `${GITHUB_API_BASE}/repos/${repo}/contents/${encodeContentPath(path)}`

  let res: Response
  try {
    res = await fetch(url, {
      ...init,
      headers: { ...buildHeaders(token), ...(init.headers || {}) },
      cache: "no-store",
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : "network request failed"
    throw new GitHubApiError(operation, path, 0, detail)
  }

  if (!res.ok) {
    throw new GitHubApiError(operation, path, res.status, await readErrorDetail(res))
  }
  return res
}

export async function getFileContent(path: string): Promise<GitHubFile | null> {
  try {
    const res = await githubFetch("read", path, { method: "GET" })
    const data = await res.json()
    return {
      content: Buffer.from(data.content, "base64").toString("utf-8"),
      sha: data.sha,
    }
  } catch (error) {
    if (error instanceof GitHubApiError && error.status === 404) return null
    throw error
  }
}

export async function saveFileContent(
  path: string,
  content: string,
  sha?: string,
  message?: string,
): Promise<GitHubWriteResult> {
  const body: Record<string, string> = {
    message: message || `Update ${path}`,
    content: Buffer.from(content).toString("base64"),
  }
  if (sha) body.sha = sha

  const res = await githubFetch("write", path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return res.json()
}

export async function listFiles(path: string): Promise<Array<{ name: string; path: string; sha: string }>> {
  const res = await githubFetch("list", path, { method: "GET" })
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export async function deleteFile(path: string, sha: string): Promise<void> {
  await githubFetch("delete", path, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: `Delete ${path}`, sha }),
  })
}
