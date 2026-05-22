// Multi-tier cache: Memory (L1, 5s) + Redis (L2, configurable TTL)

import { cacheGet, cacheSet, cacheDelete, cacheDeletePattern } from './redis-cache.js'

interface CacheEntry {
  value: unknown
  expiresAt: number
}

class MemoryCache {
  private store = new Map<string, CacheEntry>()

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }
    return entry.value as T
  }

  set(key: string, value: unknown, ttlSeconds: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
  }

  delete(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }
}

export const memoryCache = new MemoryCache()

export { cacheGet, cacheSet, cacheDelete, cacheDeletePattern }

// Helper to wrap a Fastify GET handler with multi-tier caching
export function withCache<T>(
  handler: (request: any, reply: any) => Promise<T>,
  ttlSeconds: number,
  keyGenerator?: (request: any) => string,
) {
  return async (request: any, reply: any): Promise<T> => {
    const nocache = request.query?.nocache === '1' || request.query?.nocache === 'true'
    if (nocache) {
      return handler(request, reply)
    }

    const cacheKey = 'cache:' + (keyGenerator ? keyGenerator(request) : `${request.method}:${request.url}`)

    // L1: Memory cache (5s TTL max)
    const memoryTtl = Math.min(ttlSeconds, 5)
    const memCached = memoryCache.get<T>(cacheKey)
    if (memCached !== undefined) {
      reply.header('Cache-Control', `max-age=${memoryTtl}`)
      reply.header('X-Cache', 'HIT-L1')
      return memCached
    }

    // L2: Redis cache (full TTL)
    const redisCached = await cacheGet<T>(cacheKey)
    if (redisCached !== undefined) {
      memoryCache.set(cacheKey, redisCached, memoryTtl)
      reply.header('Cache-Control', `max-age=${memoryTtl}`)
      reply.header('X-Cache', 'HIT-L2')
      return redisCached
    }

    // L3: Database (handler)
    const result = await handler(request, reply)
    memoryCache.set(cacheKey, result, memoryTtl)
    await cacheSet(cacheKey, result, ttlSeconds)
    reply.header('Cache-Control', `max-age=${memoryTtl}`)
    reply.header('X-Cache', 'MISS')
    return result
  }
}
