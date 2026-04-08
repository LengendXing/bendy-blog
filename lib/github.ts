const REPO = process.env.GITHUB_CONTENT_REPO || ""
const TOKEN = process.env.GITHUB_TOKEN || ""

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
}

export async function getFileContent(path: string): Promise<{ content: string; sha: string } | null> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, { headers, cache: "no-store" })
  if (!res.ok) return null
  const data = await res.json()
  return {
    content: Buffer.from(data.content, "base64").toString("utf-8"),
    sha: data.sha,
  }
}

export async function saveFileContent(path: string, content: string, sha?: string, message?: string) {
  const body: Record<string, string> = {
    message: message || `Update ${path}`,
    content: Buffer.from(content).toString("base64"),
  }
  if (sha) body.sha = sha
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  })
  return res.json()
}

export async function listFiles(path: string): Promise<Array<{ name: string; path: string; sha: string }>> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, { headers, cache: "no-store" })
  if (!res.ok) return []
  return res.json()
}

export async function deleteFile(path: string, sha: string) {
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    method: "DELETE",
    headers,
    body: JSON.stringify({ message: `Delete ${path}`, sha }),
  })
  return res.ok
}
