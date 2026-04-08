import { Redis } from "@upstash/redis"

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
})

export async function getCachedOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = 300
): Promise<T> {
  try {
    const cached = await redis.get<T>(key)
    if (cached) return cached
  } catch {}
  const data = await fetcher()
  try {
    await redis.set(key, JSON.stringify(data), { ex: ttl })
  } catch {}
  return data
}
