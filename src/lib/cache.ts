// Simple in-memory cache with TTL for API response caching

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

export const cache = new MemoryCache()

// Helper to wrap a Fastify GET handler with caching
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

    const cacheKey = keyGenerator ? keyGenerator(request) : `${request.method}:${request.url}`
    const cached = cache.get<T>(cacheKey)
    if (cached !== undefined) {
      reply.header('Cache-Control', `max-age=${ttlSeconds}`)
      reply.header('X-Cache', 'HIT')
      return cached
    }

    const result = await handler(request, reply)
    cache.set(cacheKey, result, ttlSeconds)
    reply.header('Cache-Control', `max-age=${ttlSeconds}`)
    reply.header('X-Cache', 'MISS')
    return result
  }
}
