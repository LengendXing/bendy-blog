import { redis } from "@/lib/redis"

/** A best-effort fixed-window limiter backed by the existing Redis instance. */
export async function isRateLimited(key: string, limit: number, windowSeconds: number) {
  try {
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, windowSeconds)
    return count > limit
  } catch {
    return false
  }
}

export function requestIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown"
}
