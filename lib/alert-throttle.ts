/**
 * Small in-process throttle used to avoid alert storms when the same
 * operation fails repeatedly (for example a broken webhook hit by every
 * request). Serverless instances each keep their own window, which is an
 * acceptable trade-off: at worst one alert per instance per cooldown period.
 */

export interface AlertThrottle {
  shouldSend(key: string, now?: number): boolean
  reset(): void
  size(): number
}

export const DEFAULT_ALERT_COOLDOWN_MS = 5 * 60 * 1_000

export function resolveAlertCooldownMs(raw: string | undefined): number {
  if (!raw) return DEFAULT_ALERT_COOLDOWN_MS
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_ALERT_COOLDOWN_MS
  return parsed * 1_000
}

export function createAlertThrottle(cooldownMs: number = DEFAULT_ALERT_COOLDOWN_MS): AlertThrottle {
  const lastSentAt = new Map<string, number>()
  const windowMs = Number.isFinite(cooldownMs) && cooldownMs >= 0 ? cooldownMs : DEFAULT_ALERT_COOLDOWN_MS

  return {
    shouldSend(key: string, now: number = Date.now()): boolean {
      const previous = lastSentAt.get(key)
      if (previous !== undefined && now - previous < windowMs) return false
      lastSentAt.set(key, now)
      return true
    },
    reset(): void {
      lastSentAt.clear()
    },
    size(): number {
      return lastSentAt.size
    },
  }
}
