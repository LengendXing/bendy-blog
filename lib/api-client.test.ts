import test from "node:test"
import assert from "node:assert/strict"
import { ApiError, apiFetch, apiJson, apiJsonWithRetry, getApiErrorMessage, isAbortError } from "./api-client"

const messages = {
  requestFailed: "request failed",
  networkError: "network error",
  sessionExpired: "session expired",
  permissionDenied: "permission denied",
}

function stubFetch(handler: typeof fetch): () => void {
  const original = globalThis.fetch
  globalThis.fetch = handler
  return () => {
    globalThis.fetch = original
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

test("apiFetch returns the original response for 2xx", async () => {
  const restore = stubFetch(async () => jsonResponse({ ok: true }))
  try {
    const response = await apiFetch("/api/test")
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { ok: true })
  } finally {
    restore()
  }
})

test("apiJson parses successful JSON responses", async () => {
  const restore = stubFetch(async () => jsonResponse([{ id: "post-1" }]))
  try {
    const data = await apiJson<{ id: string }[]>("/api/blog")
    assert.deepEqual(data, [{ id: "post-1" }])
  } finally {
    restore()
  }
})

test("apiFetch rejects non-2xx responses with status and server code", async () => {
  const restore = stubFetch(async () => jsonResponse({ error: "forbidden" }, 403))
  try {
    await assert.rejects(apiFetch("/api/test"), (error: unknown) => {
      assert.ok(error instanceof ApiError)
      assert.equal(error.status, 403)
      assert.equal(error.code, "forbidden")
      assert.equal(error.message, "forbidden")
      return true
    })
  } finally {
    restore()
  }
})

test("apiFetch prefers a human-readable message field", async () => {
  const restore = stubFetch(async () => jsonResponse({ error: "github_api_error", message: "GitHub write failed" }, 502))
  try {
    await assert.rejects(apiFetch("/api/test"), (error: unknown) => {
      assert.ok(error instanceof ApiError)
      assert.equal(error.status, 502)
      assert.equal(error.code, "github_api_error")
      assert.equal(error.message, "GitHub write failed")
      return true
    })
  } finally {
    restore()
  }
})

test("apiFetch falls back to a generic message for non-JSON error bodies", async () => {
  const restore = stubFetch(async () => new Response("upstream exploded", { status: 500 }))
  try {
    await assert.rejects(apiFetch("/api/test"), (error: unknown) => {
      assert.ok(error instanceof ApiError)
      assert.equal(error.status, 500)
      assert.equal(error.message, "Request failed with status 500")
      return true
    })
  } finally {
    restore()
  }
})

test("getApiErrorMessage maps auth failures to localized text", () => {
  assert.equal(getApiErrorMessage(new ApiError("unauthorized", 401), messages), "session expired")
  assert.equal(getApiErrorMessage(new ApiError("forbidden", 403), messages), "permission denied")
})

test("getApiErrorMessage keeps human messages and hides machine codes", () => {
  assert.equal(getApiErrorMessage(new ApiError("Name already exists", 400), messages), "Name already exists")
  assert.equal(getApiErrorMessage(new ApiError("github_api_error", 502), messages), "request failed")
})

test("getApiErrorMessage maps network errors and unknown values", () => {
  assert.equal(getApiErrorMessage(new TypeError("fetch failed"), messages), "network error")
  assert.equal(getApiErrorMessage("boom", messages), "request failed")
})

test("isAbortError only matches AbortError instances", () => {
  assert.equal(isAbortError(new DOMException("aborted", "AbortError")), true)
  assert.equal(isAbortError(new Error("aborted")), false)
})

test("apiJsonWithRetry retries transient GET failures until success", async () => {
  let calls = 0
  const restore = stubFetch(async () => {
    calls += 1
    return calls < 3 ? jsonResponse({ error: "unavailable" }, 503) : jsonResponse({ ok: true })
  })
  try {
    const data = await apiJsonWithRetry<{ ok: boolean }>("/api/test", undefined, { retries: 2, baseDelayMs: 0 })
    assert.deepEqual(data, { ok: true })
    assert.equal(calls, 3)
  } finally {
    restore()
  }
})

test("apiJsonWithRetry retries network failures", async () => {
  let calls = 0
  const restore = stubFetch(async () => {
    calls += 1
    if (calls === 1) throw new TypeError("fetch failed")
    return jsonResponse({ ok: true })
  })
  try {
    const data = await apiJsonWithRetry<{ ok: boolean }>("/api/test", undefined, { retries: 1, baseDelayMs: 0 })
    assert.deepEqual(data, { ok: true })
    assert.equal(calls, 2)
  } finally {
    restore()
  }
})

test("apiJsonWithRetry does not retry non-idempotent methods", async () => {
  let calls = 0
  const restore = stubFetch(async () => {
    calls += 1
    return jsonResponse({ error: "unavailable" }, 503)
  })
  try {
    await assert.rejects(
      apiJsonWithRetry("/api/test", { method: "POST" }, { retries: 3, baseDelayMs: 0 }),
      (error: unknown) => error instanceof ApiError && error.status === 503,
    )
    assert.equal(calls, 1)
  } finally {
    restore()
  }
})

test("apiJsonWithRetry does not retry client errors", async () => {
  let calls = 0
  const restore = stubFetch(async () => {
    calls += 1
    return jsonResponse({ error: "bad request" }, 400)
  })
  try {
    await assert.rejects(apiJsonWithRetry("/api/test", undefined, { retries: 2, baseDelayMs: 0 }))
    assert.equal(calls, 1)
  } finally {
    restore()
  }
})

test("apiJsonWithRetry gives up after the configured retry budget", async () => {
  let calls = 0
  const restore = stubFetch(async () => {
    calls += 1
    return jsonResponse({ error: "unavailable" }, 502)
  })
  try {
    await assert.rejects(
      apiJsonWithRetry("/api/test", undefined, { retries: 2, baseDelayMs: 0 }),
      (error: unknown) => error instanceof ApiError && error.status === 502,
    )
    assert.equal(calls, 3)
  } finally {
    restore()
  }
})

test("apiJsonWithRetry stops when the caller aborts during backoff", async () => {
  let calls = 0
  const controller = new AbortController()
  const restore = stubFetch(async () => {
    calls += 1
    return jsonResponse({ error: "unavailable" }, 503)
  })
  try {
    const pending = apiJsonWithRetry("/api/test", { signal: controller.signal }, { retries: 3, baseDelayMs: 50 })
    setTimeout(() => controller.abort(), 5)
    await assert.rejects(pending, (error: unknown) => isAbortError(error))
    assert.equal(calls, 1)
  } finally {
    restore()
  }
})
