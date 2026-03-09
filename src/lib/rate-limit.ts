import { redis } from '@/lib/redis'

export async function rateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `rl:${identifier}`

  const count = await redis.incr(key)

  if (count === 1) {
    await redis.expire(key, windowSeconds)
  }

  if (count > limit) {
    return { allowed: false, remaining: 0 }
  }

  return { allowed: true, remaining: limit - count }
}
