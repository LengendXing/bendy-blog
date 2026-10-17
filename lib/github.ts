const API_BASE = "https://api.github.com"

const REQUEST_TIMEOUT_MS = 15_000

export interface GitHubFile {
  content: string
  sha: string
}

export interface GitHubWriteResult {
  content?: { sha?: string; path?: string }
  commit?: { sha?: string }
  [key: string]: unknown
}

export class GitHubApiError extends Error {
  readonly status: number
  readonly code: string
  readonly detail?: string

  constructor(message: string, options: { status: number; code: string; detail?: string }) {
    super(message)
    this.name = "GitHubApiError"
    this.status = options.status
    this.code = options.code
    this.detail = options.detail
  }
}

function getConfig() {
  const repo = process.env.GITHUB_CONTENT_REPO || ""
  const token = process.env.GITHUB_TOKEN || ""
  if (!repo || !token) {
    throw new GitHubApiError("GitHub content repository is not configured", {
      status: 0,
      code: "github_not_configured",
    })
  }
  return { repo, token }
}

async function githubFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { repo, token } = getConfig()
  const url = `${API_BASE}/repos/${repo}/contents/${path}`

  try {
    return await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(init.headers || {}),
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    if (error instanceof GitHubApiError) throw error
    const message = error instanceof Error ? error.message : String(error)
    throw new GitHubApiError(`GitHub request failed for ${path}: ${message}`, {
      status: 0,
      code: "github_network_error",
    })
  }
}

async function throwForResponse(path: string, response: Response): Promise<never> {
  const detail = await response.text().catch(() => "")
  let message = `GitHub API ${response.status} for ${path}`
  try {
    const parsed = JSON.parse(detail)
    if (parsed?.message) message += `: ${parsed.message}`
  } catch {
    if (detail) message += `: ${detail.slice(0, 200)}`
  }

  throw new GitHubApiError(message, {
    status: response.status,
    code: "github_api_error",
    detail: detail.slice(0, 500),
  })
}

export async function getFileContent(path: string): Promise<GitHubFile | null> {
  const response = await githubFetch(path, { cache: "no-store" })
  if (response.status === 404) return null
  if (!response.ok) await throwForResponse(path, response)

  const data = await response.json()
  if (!data?.content || typeof data.content !== "string" || !data?.sha) {
    throw new GitHubApiError(`GitHub returned an invalid file payload for ${path}`, {
      status: response.status,
      code: "github_invalid_response",
    })
  }

  return {
    content: Buffer.from(data.content, "base64").toString("utf-8"),
    sha: data.sha,
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

  const response = await githubFetch(path, {
    method: "PUT",
    body: JSON.stringify(body),
  })
  if (!response.ok) await throwForResponse(path, response)
  return response.json()
}

export async function listFiles(path: string): Promise<Array<{ name: string; path: string; sha: string }>> {
  const response = await githubFetch(path, { cache: "no-store" })
  if (response.status === 404) return []
  if (!response.ok) await throwForResponse(path, response)

  const data = await response.json()
  return Array.isArray(data) ? data : []
}

export async function deleteFile(path: string, sha: string): Promise<boolean> {
  const response = await githubFetch(path, {
    method: "DELETE",
    body: JSON.stringify({ message: `Delete ${path}`, sha }),
  })
  if (!response.ok) await throwForResponse(path, response)
  return true
}
