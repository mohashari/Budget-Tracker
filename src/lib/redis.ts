import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as { redis: Redis | undefined }

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL || 'redis://localhost:6381', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  })

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis

export const CACHE_TTL = {
  ANALYTICS_SUMMARY: 300,    // 5 min
  ANALYTICS_CATEGORY: 300,   // 5 min
  ANALYTICS_TREND: 600,      // 10 min
  BUDGET_STATUS: 120,        // 2 min
}

export function cacheKey(type: string, workspaceId: string, ...parts: string[]) {
  return `bt:${type}:${workspaceId}:${parts.join(':')}`
}

export async function invalidateWorkspaceCache(workspaceId: string) {
  const pattern = `bt:*:${workspaceId}:*`
  const keys = await redis.keys(pattern)
  if (keys.length > 0) {
    await redis.del(...keys)
  }
}
