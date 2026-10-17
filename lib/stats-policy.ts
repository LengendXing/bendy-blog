import { createHash } from "node:crypto"
import { MAX_SLUG_LENGTH, normalizeSlug } from "./public-input"

/** Only these events are accepted by POST /api/stats. */
export const STATS_EVENTS = ["view", "share"] as const

export type StatsEvent = (typeof STATS_EVENTS)[number]

/** A visitor only adds one count per post/event inside this window. */
export const STATS_DEDUP_WINDOW_SECONDS = 10 * 60

/** Blog slugs are short; cap the input so Redis keys stay bounded. */
export const STATS_SLUG_MAX_LENGTH = MAX_SLUG_LENGTH

/** The public stats payload is tiny; reject anything that could be abusive. */
export const MAX_STATS_BODY_BYTES = 4 * 1024

export const STATS_RATE_LIMITS: Record<StatsEvent, { limit: number; windowSeconds: number }> = {
  view: { limit: 20, windowSeconds: 60 * 60 },
  share: { limit: 5, windowSeconds: 60 * 60 },
}

/** Rejects unknown event names (including the old forged "comment" event). */
export function parseStatsEvent(value: unknown): StatsEvent | null {
  return value === "view" || value === "share" ? value : null
}

/** Trims and validates a slug with the same rules as the public routes. */
export function normalizeStatsSlug(value: unknown): string | null {
  return normalizeSlug(value)
}

export interface StatsViewer {
  id?: string | null
  email?: string | null
  githubUsername?: string | null
}

/** Prefers a stable session identity, then falls back to the request IP. */
export function statsViewerIdentity(viewer: StatsViewer | null | undefined, ip: string): string {
  const userId = viewer?.id || viewer?.email || viewer?.githubUsername
  return userId ? `user:${userId}` : `ip:${ip}`
}

export function statsDedupKey(event: StatsEvent, slug: string, identity: string): string {
  return `stats:dedup:${event}:${slug}:${hashIdentity(identity)}`
}

export function statsRateLimitKey(event: StatsEvent, slug: string, ip: string): string {
  return `stats:rate:${event}:${slug}:${ip}`
}

/** Share events notify once per counted share; views notify on 100/200/... */
export function shouldNotifyStats(event: StatsEvent, views: number): boolean {
  if (event === "share") return true
  if (event !== "view") return false
  return Number.isInteger(views) && views > 0 && views % 100 === 0
}

function hashIdentity(identity: string): string {
  return createHash("sha256").update(identity).digest("hex").slice(0, 16)
}
