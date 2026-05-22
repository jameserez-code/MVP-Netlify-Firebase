import Redis from 'ioredis'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const isProd = process.env.NODE_ENV === 'production'
const hasExplicitRedisUrl = !!process.env.REDIS_URL
const shouldLog = isProd || hasExplicitRedisUrl

export const redis = new Redis(redisUrl, {
  retryStrategy: (times) => {
    if (times > 3 && !isProd) return null // stop retrying in dev
    return Math.min(times * 50, 2000)
  },
  maxRetriesPerRequest: shouldLog ? 3 : 0,
  enableOfflineQueue: true,
  lazyConnect: !shouldLog, // don't connect at all unless explicitly configured
})

if (shouldLog) {
  redis.on('error', (err) => console.error('Redis error:', err))
  redis.on('connect', () => console.log('Redis connected'))
  redis.on('reconnecting', () => console.log('Redis reconnecting...'))
}

export function isRedisReady(): boolean {
  return redis.status === 'ready'
}
