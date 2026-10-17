import test from "node:test"
import assert from "node:assert/strict"
import {
  GitHubApiError,
  deleteFile,
  getFileContent,
  listFiles,
  saveFileContent,
} from "./github"

const originalFetch = globalThis.fetch
const originalRepo = process.env.GITHUB_CONTENT_REPO
const originalToken = process.env.GITHUB_TOKEN

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

test.beforeEach(() => {
  process.env.GITHUB_CONTENT_REPO = "owner/repo"
  process.env.GITHUB_TOKEN = "test-token"
})

test.afterEach(() => {
  globalThis.fetch = originalFetch
  if (originalRepo === undefined) delete process.env.GITHUB_CONTENT_REPO
  else process.env.GITHUB_CONTENT_REPO = originalRepo
  if (originalToken === undefined) delete process.env.GITHUB_TOKEN
  else process.env.GITHUB_TOKEN = originalToken
})

test("getFileContent decodes base64 content and returns the sha", async () => {
  let requestedUrl = ""
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    requestedUrl = String(input)
    return jsonResponse({ content: Buffer.from("# Hello").toString("base64"), sha: "abc123" })
  }) as typeof fetch

  const file = await getFileContent("posts/hello.md")

  assert.equal(requestedUrl, "https://api.github.com/repos/owner/repo/contents/posts/hello.md")
  assert.deepEqual(file, { content: "# Hello", sha: "abc123" })
})

test("getFileContent returns null when the file does not exist", async () => {
  globalThis.fetch = (async () => jsonResponse({ message: "Not Found" }, 404)) as typeof fetch

  assert.equal(await getFileContent("posts/missing.md"), null)
})

test("getFileContent throws GitHubApiError for non-404 failures", async () => {
  globalThis.fetch = (async () => jsonResponse({ message: "Bad credentials" }, 401)) as typeof fetch

  await assert.rejects(getFileContent("posts/hello.md"), (error: unknown) => {
    assert.ok(error instanceof GitHubApiError)
    assert.equal(error.status, 401)
    assert.equal(error.operation, "read")
    assert.match(error.message, /Bad credentials/)
    return true
  })
})

test("saveFileContent sends a PUT with sha and returns the GitHub response", async () => {
  let request: { url: string; init?: RequestInit } = { url: "" }
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    request = { url: String(input), init }
    return jsonResponse({ content: { sha: "new-sha" }, commit: { sha: "commit-sha" } }, 200)
  }) as typeof fetch

  const result = await saveFileContent("posts/hello world.md", "# Updated", "old-sha", "Update post")

  assert.equal(request.url, "https://api.github.com/repos/owner/repo/contents/posts/hello%20world.md")
  assert.equal(request.init?.method, "PUT")
  const body = JSON.parse(String(request.init?.body))
  assert.equal(body.message, "Update post")
  assert.equal(body.sha, "old-sha")
  assert.equal(Buffer.from(body.content, "base64").toString("utf-8"), "# Updated")
  assert.deepEqual(result, { content: { sha: "new-sha" }, commit: { sha: "commit-sha" } })
})

test("saveFileContent throws when GitHub rejects the write", async () => {
  globalThis.fetch = (async () =>
    jsonResponse({ message: "Invalid request. sha is required" }, 422)) as typeof fetch

  await assert.rejects(saveFileContent("posts/hello.md", "# Updated"), (error: unknown) => {
    assert.ok(error instanceof GitHubApiError)
    assert.equal(error.status, 422)
    assert.equal(error.operation, "write")
    assert.match(error.message, /sha is required/)
    return true
  })
})

test("deleteFile resolves on success and throws on failure", async () => {
  globalThis.fetch = (async () => new Response(null, { status: 204 })) as typeof fetch
  await assert.doesNotReject(deleteFile("posts/hello.md", "sha"))

  globalThis.fetch = (async () => jsonResponse({ message: "rate limit exceeded" }, 403)) as typeof fetch
  await assert.rejects(deleteFile("posts/hello.md", "sha"), (error: unknown) => {
    assert.ok(error instanceof GitHubApiError)
    assert.equal(error.status, 403)
    assert.equal(error.operation, "delete")
    return true
  })
})

test("network failures are wrapped as GitHubApiError", async () => {
  globalThis.fetch = (async () => {
    throw new Error("socket hang up")
  }) as typeof fetch

  await assert.rejects(getFileContent("posts/hello.md"), (error: unknown) => {
    assert.ok(error instanceof GitHubApiError)
    assert.equal(error.status, 0)
    assert.match(error.message, /socket hang up/)
    return true
  })
})

test("listFiles throws on repository errors instead of returning an empty list", async () => {
  globalThis.fetch = (async () => jsonResponse({ message: "Not Found" }, 404)) as typeof fetch

  await assert.rejects(listFiles("posts"), (error: unknown) => {
    assert.ok(error instanceof GitHubApiError)
    assert.equal(error.status, 404)
    assert.equal(error.operation, "list")
    return true
  })
})

test("missing repository configuration is reported explicitly", async () => {
  delete process.env.GITHUB_CONTENT_REPO

  await assert.rejects(saveFileContent("posts/hello.md", "# Hello"), (error: unknown) => {
    assert.ok(error instanceof GitHubApiError)
    assert.equal(error.operation, "config")
    assert.match(error.message, /GITHUB_CONTENT_REPO/)
    return true
  })
})
