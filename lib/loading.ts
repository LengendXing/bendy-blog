export const LIST_SKELETON_DELAY_MS = 1500
export const CONTENT_SWAP_DURATION_MS = 200

/**
 * Keep the visibility rule in one place so list pages and their tests use the
 * same threshold. A request that completes exactly at the threshold does not
 * need a skeleton because its real content is ready to paint.
 */
export function shouldShowSkeleton(startedAt: number, now: number, delay = LIST_SKELETON_DELAY_MS) {
  return Math.max(0, now - startedAt) > delay
}

export function clampDelay(delay: number) {
  return Number.isFinite(delay) ? Math.max(0, delay) : LIST_SKELETON_DELAY_MS
}
