import { redis } from './redis.js'

export async function cacheGet<T>(key: string): Promise<T | undefined> {
  try {
    const value = await redis.get(key)
    if (value === null) return undefined
    return JSON.parse(value) as T
  } catch (err) {
    console.error('Redis cacheGet error:', err)
    return undefined
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value))
  } catch (err) {
    console.error('Redis cacheSet error:', err)
  }
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    await redis.del(key)
  } catch (err) {
    console.error('Redis cacheDelete error:', err)
  }
}

export async function cacheDeletePattern(pattern: string): Promise<void> {
  try {
    const keys: string[] = []
    let cursor = '0'
    do {
      const result = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
      cursor = result[0]
      keys.push(...result[1])
    } while (cursor !== '0')

    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch (err) {
    console.error('Redis cacheDeletePattern error:', err)
  }
}
