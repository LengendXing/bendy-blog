import test, { afterEach, beforeEach } from "node:test"
import assert from "node:assert/strict"
import { deleteFile, getFileContent, GitHubApiError, listFiles, saveFileContent } from "./github"

const originalFetch = globalThis.fetch
const originalRepo = process.env.GITHUB_CONTENT_REPO
const originalToken = process.env.GITHUB_TOKEN

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name]
  } else {
    process.env[name] = value
  }
}

beforeEach(() => {
  process.env.GITHUB_CONTENT_REPO = "owner/content"
  process.env.GITHUB_TOKEN = "test-token"
})

afterEach(() => {
  globalThis.fetch = originalFetch
  restoreEnv("GITHUB_CONTENT_REPO", originalRepo)
  restoreEnv("GITHUB_TOKEN", originalToken)
})

test("getFileContent throws when the content repository is not configured", async () => {
  delete process.env.GITHUB_CONTENT_REPO
  await assert.rejects(
    () => getFileContent("posts/a.md"),
    (error: unknown) => error instanceof GitHubApiError && error.code === "github_not_configured",
  )
})

test("getFileContent returns null for a missing file", async () => {
  globalThis.fetch = async () => new Response("{}", { status: 404 })
  assert.equal(await getFileContent("posts/missing.md"), null)
})

test("getFileContent decodes base64 content", async () => {
  globalThis.fetch = async () => new Response(
    JSON.stringify({ content: Buffer.from("# Hello").toString("base64"), sha: "abc" }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  )
  assert.deepEqual(await getFileContent("posts/a.md"), { content: "# Hello", sha: "abc" })
})

test("getFileContent throws a typed error for non-2xx responses", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ message: "Bad credentials" }), { status: 401 })
  await assert.rejects(
    () => getFileContent("posts/a.md"),
    (error: unknown) => {
      assert.ok(error instanceof GitHubApiError)
      assert.equal(error.status, 401)
      assert.equal(error.code, "github_api_error")
      assert.match(error.message, /Bad credentials/)
      return true
    },
  )
})

test("getFileContent rejects malformed payloads", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ content: "", sha: "" }), { status: 200 })
  await assert.rejects(
    () => getFileContent("posts/a.md"),
    (error: unknown) => error instanceof GitHubApiError && error.code === "github_invalid_response",
  )
})

test("saveFileContent sends a PUT with base64 content and sha", async () => {
  let capturedUrl = ""
  let capturedInit: RequestInit | undefined
  globalThis.fetch = async (input, init) => {
    capturedUrl = String(input)
    capturedInit = init
    return new Response(JSON.stringify({ content: { sha: "new-sha" } }), { status: 200 })
  }

  const result = await saveFileContent("posts/a.md", "# Updated", "old-sha", "Update post")
  assert.equal(capturedUrl, "https://api.github.com/repos/owner/content/contents/posts/a.md")
  assert.equal(capturedInit?.method, "PUT")
  const body = JSON.parse(String(capturedInit?.body))
  assert.equal(body.sha, "old-sha")
  assert.equal(body.message, "Update post")
  assert.equal(Buffer.from(body.content, "base64").toString("utf-8"), "# Updated")
  assert.deepEqual(result, { content: { sha: "new-sha" } })
})

test("saveFileContent throws when GitHub rejects the write", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ message: "Resource not accessible" }), { status: 403 })
  await assert.rejects(
    () => saveFileContent("posts/a.md", "# Updated"),
    (error: unknown) => error instanceof GitHubApiError && error.status === 403,
  )
})

test("listFiles returns an empty array for a missing directory", async () => {
  globalThis.fetch = async () => new Response("{}", { status: 404 })
  assert.deepEqual(await listFiles("posts"), [])
})

test("deleteFile throws when the delete fails", async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ message: "Not found" }), { status: 404 })
  await assert.rejects(
    () => deleteFile("posts/a.md", "sha"),
    (error: unknown) => error instanceof GitHubApiError && error.status === 404,
  )
})

test("network errors are wrapped as GitHubApiError", async () => {
  globalThis.fetch = async () => {
    throw new TypeError("fetch failed")
  }
  await assert.rejects(
    () => getFileContent("posts/a.md"),
    (error: unknown) => error instanceof GitHubApiError && error.code === "github_network_error",
  )
})
