import test from "node:test"
import assert from "node:assert/strict"
import { SITE_CONFIG_KEYS, parseSiteConfigPayload } from "./site-config"

const validPayload = {
  blogTitle: "Bendy Blog",
  footerText: "Built with Next.js",
  dufsEnabled: "true",
  dufsUrl: "https://dufs.example.com",
  dufsUser: "admin",
  dufsPass: "secret",
  githubImageRepo: "owner/blog-images",
  githubImageToken: "ghp_example",
}

test("accepts every configuration key used by the admin settings page", () => {
  const result = parseSiteConfigPayload(validPayload)

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.deepEqual(result.values, validPayload)
  assert.deepEqual(
    [...SITE_CONFIG_KEYS].sort(),
    Object.keys(validPayload).sort(),
  )
})

test("normalizes boolean config values to the stored string form", () => {
  const enabled = parseSiteConfigPayload({ dufsEnabled: true })
  const disabled = parseSiteConfigPayload({ dufsEnabled: "false" })

  assert.deepEqual(enabled, { ok: true, values: { dufsEnabled: "true" } })
  assert.deepEqual(disabled, { ok: true, values: { dufsEnabled: "false" } })
})

test("rejects unknown keys instead of silently persisting typos", () => {
  const result = parseSiteConfigPayload({ typoKey: "x" })

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.error.error, "unknown_config_key")
  assert.equal(result.error.key, "typoKey")
})

test("rejects the reserved administrator key", () => {
  const result = parseSiteConfigPayload({ adminGithubUsernames: "[]" })

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.error.error, "unknown_config_key")
  assert.equal(result.error.key, "adminGithubUsernames")
})

test("rejects non-object payloads", () => {
  for (const payload of [null, [], "text", 42]) {
    const result = parseSiteConfigPayload(payload)
    assert.equal(result.ok, false)
    if (result.ok) continue
    assert.equal(result.error.error, "invalid_payload")
  }
})

test("rejects non-string values for text keys", () => {
  const result = parseSiteConfigPayload({ blogTitle: 123 })

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.error.error, "invalid_config_value")
  assert.equal(result.error.key, "blogTitle")
})

test("rejects boolean values that are not true or false", () => {
  for (const value of ["yes", "1", 1, null]) {
    const result = parseSiteConfigPayload({ dufsEnabled: value })
    assert.equal(result.ok, false)
    if (result.ok) continue
    assert.equal(result.error.error, "invalid_config_value")
    assert.equal(result.error.key, "dufsEnabled")
  }
})

test("accepts only http(s) Dufs URLs or an empty value", () => {
  for (const value of ["ftp://dufs.example.com", "not a url", "javascript:alert(1)"]) {
    const result = parseSiteConfigPayload({ dufsUrl: value })
    assert.equal(result.ok, false)
    if (result.ok) continue
    assert.equal(result.error.error, "invalid_config_value")
    assert.equal(result.error.key, "dufsUrl")
  }

  assert.deepEqual(parseSiteConfigPayload({ dufsUrl: "" }), { ok: true, values: { dufsUrl: "" } })
  assert.deepEqual(
    parseSiteConfigPayload({ dufsUrl: "http://dufs.example.com:8080/base" }),
    { ok: true, values: { dufsUrl: "http://dufs.example.com:8080/base" } },
  )
})

test("accepts only owner/repo GitHub image repository names or an empty value", () => {
  for (const value of ["no-slash", "../images", "owner/repo/extra", "owner/repo with space"]) {
    const result = parseSiteConfigPayload({ githubImageRepo: value })
    assert.equal(result.ok, false)
    if (result.ok) continue
    assert.equal(result.error.error, "invalid_config_value")
    assert.equal(result.error.key, "githubImageRepo")
  }

  assert.deepEqual(parseSiteConfigPayload({ githubImageRepo: "" }), { ok: true, values: { githubImageRepo: "" } })
  assert.deepEqual(
    parseSiteConfigPayload({ githubImageRepo: "owner/blog-images" }),
    { ok: true, values: { githubImageRepo: "owner/blog-images" } },
  )
})

test("enforces maximum lengths for text values", () => {
  const result = parseSiteConfigPayload({ blogTitle: "x".repeat(201) })

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.error.error, "invalid_config_value")
  assert.equal(result.error.key, "blogTitle")
})

test("allows empty values to clear optional settings", () => {
  const result = parseSiteConfigPayload({
    blogTitle: "",
    footerText: "",
    dufsUrl: "",
    dufsUser: "",
    dufsPass: "",
    githubImageRepo: "",
    githubImageToken: "",
  })

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.deepEqual(result.values, {
    blogTitle: "",
    footerText: "",
    dufsUrl: "",
    dufsUser: "",
    dufsPass: "",
    githubImageRepo: "",
    githubImageToken: "",
  })
})
