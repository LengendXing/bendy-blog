import test from "node:test"
import assert from "node:assert/strict"
import {
  normalizeStatsSlug,
  parseStatsEvent,
  shouldNotifyStats,
  statsDedupKey,
  statsRateLimitKey,
  statsViewerIdentity,
  STATS_DEDUP_WINDOW_SECONDS,
  STATS_RATE_LIMITS,
  STATS_SLUG_MAX_LENGTH,
} from "./stats-policy"

test("stats events only accept view and share", () => {
  assert.equal(parseStatsEvent("view"), "view")
  assert.equal(parseStatsEvent("share"), "share")
  assert.equal(parseStatsEvent("comment"), null)
  assert.equal(parseStatsEvent("VIEW"), null)
  assert.equal(parseStatsEvent(undefined), null)
  assert.equal(parseStatsEvent({ event: "view" }), null)
})

test("stats slug validation trims input and enforces bounds", () => {
  assert.equal(normalizeStatsSlug(" hello "), "hello")
  assert.equal(normalizeStatsSlug("中文-slug-1"), "中文-slug-1")
  assert.equal(normalizeStatsSlug(""), null)
  assert.equal(normalizeStatsSlug("   "), null)
  assert.equal(normalizeStatsSlug("a".repeat(STATS_SLUG_MAX_LENGTH)), "a".repeat(STATS_SLUG_MAX_LENGTH))
  assert.equal(normalizeStatsSlug("a".repeat(STATS_SLUG_MAX_LENGTH + 1)), null)
  assert.equal(normalizeStatsSlug("bad\nslug"), null)
  assert.equal(normalizeStatsSlug(123), null)
})

test("stats dedup window is ten minutes", () => {
  assert.equal(STATS_DEDUP_WINDOW_SECONDS, 600)
})

test("dedup keys are namespaced and hide raw identities", () => {
  const key = statsDedupKey("view", "hello", "user@example.com")
  assert.match(key, /^stats:dedup:view:hello:[0-9a-f]{16}$/)
  assert.ok(!key.includes("user@example.com"))
  assert.equal(key, statsDedupKey("view", "hello", "user@example.com"))
  assert.notEqual(key, statsDedupKey("share", "hello", "user@example.com"))
  assert.notEqual(key, statsDedupKey("view", "other", "user@example.com"))
})

test("rate limit keys are namespaced per event, slug and ip", () => {
  assert.equal(statsRateLimitKey("view", "hello", "1.2.3.4"), "stats:rate:view:hello:1.2.3.4")
  assert.notEqual(
    statsRateLimitKey("view", "hello", "1.2.3.4"),
    statsRateLimitKey("view", "other", "1.2.3.4")
  )
  assert.notEqual(
    statsRateLimitKey("view", "hello", "1.2.3.4"),
    statsRateLimitKey("share", "hello", "1.2.3.4")
  )
})

test("viewer identity prefers session and falls back to ip", () => {
  assert.equal(statsViewerIdentity({ id: "u1", email: "a@b.c" }, "1.2.3.4"), "user:u1")
  assert.equal(statsViewerIdentity({ email: "a@b.c" }, "1.2.3.4"), "user:a@b.c")
  assert.equal(statsViewerIdentity({ githubUsername: "octocat" }, "1.2.3.4"), "user:octocat")
  assert.equal(statsViewerIdentity(null, "1.2.3.4"), "ip:1.2.3.4")
})

test("notifications only fire for shares or every hundredth view", () => {
  assert.equal(shouldNotifyStats("share", 1), true)
  assert.equal(shouldNotifyStats("view", 99), false)
  assert.equal(shouldNotifyStats("view", 100), true)
  assert.equal(shouldNotifyStats("view", 200), true)
  assert.equal(shouldNotifyStats("view", 0), false)
  assert.equal(shouldNotifyStats("view", Number.NaN), false)
  assert.equal(shouldNotifyStats("comment" as any, 100), false)
})

test("rate limits keep the documented budgets", () => {
  assert.equal(STATS_RATE_LIMITS.view.limit, 20)
  assert.equal(STATS_RATE_LIMITS.view.windowSeconds, 3600)
  assert.equal(STATS_RATE_LIMITS.share.limit, 5)
  assert.equal(STATS_RATE_LIMITS.share.windowSeconds, 3600)
})
