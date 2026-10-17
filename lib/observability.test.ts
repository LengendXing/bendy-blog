import test from "node:test"
import assert from "node:assert/strict"
import { formatLogEntry, redactValue, serializeError } from "./observability"

test("serializeError keeps message, name, code and status", () => {
  const error = Object.assign(new Error("boom"), { code: "github_api_error", status: 502 })
  const serialized = serializeError(error)
  assert.equal(serialized.name, "Error")
  assert.equal(serialized.message, "boom")
  assert.equal(serialized.code, "github_api_error")
  assert.equal(serialized.status, 502)
})

test("serializeError handles non-Error values", () => {
  assert.deepEqual(serializeError("plain failure"), { name: "Error", message: "plain failure" })
  assert.equal(serializeError({ reason: "bad" }).message, '{"reason":"bad"}')
})

test("redactValue removes credential-like keys at any depth", () => {
  const redacted = redactValue({
    token: "secret-token",
    nested: { password: "p", apiKey: "k", safe: "visible" },
    list: [{ authorization: "Bearer x" }],
  }) as Record<string, any>

  assert.equal(redacted.token, "[redacted]")
  assert.equal(redacted.nested.password, "[redacted]")
  assert.equal(redacted.nested.apiKey, "[redacted]")
  assert.equal(redacted.nested.safe, "visible")
  assert.equal(redacted.list[0].authorization, "[redacted]")
})

test("redactValue survives circular references", () => {
  const value: Record<string, unknown> = { name: "root" }
  value.self = value
  const redacted = redactValue(value) as Record<string, unknown>
  assert.equal(redacted.name, "root")
  assert.equal(redacted.self, "[circular]")
})

test("formatLogEntry emits one JSON line with standard fields", () => {
  const line = formatLogEntry(
    "error",
    {
      event: "content.publish_failed",
      component: "api.blog",
      action: "create",
      outcome: "failure",
      context: { slug: "hello", token: "must-not-leak" },
      error: new Error("GitHub API 500"),
    },
    new Date("2026-10-17T00:00:00.000Z"),
  )

  const entry = JSON.parse(line)
  assert.equal(entry.ts, "2026-10-17T00:00:00.000Z")
  assert.equal(entry.level, "error")
  assert.equal(entry.event, "content.publish_failed")
  assert.equal(entry.component, "api.blog")
  assert.equal(entry.action, "create")
  assert.equal(entry.outcome, "failure")
  assert.equal(entry.context.token, "[redacted]")
  assert.equal(entry.context.slug, "hello")
  assert.equal(entry.error.message, "GitHub API 500")
  assert.equal(line.includes("\n"), false)
})
