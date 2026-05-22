// Rate limiting with Redis fallback to in-memory
// Supports endpoint-specific limits and burst detection

import { redis } from './redis.js'
import { log } from './logger.js'

export interface RateLimitEntry {
  count: number
  resetAt: number
  remaining: number
}

export interface RateLimiterOptions {
  endpointLimits?: Record<string, number>
  defaultLimit?: number
  windowMs?: number
  burstThreshold?: number
  burstWindowMs?: number
}

export class RateLimiter {
  private memoryMap = new Map<string, RateLimitEntry>()
  private burstMap = new Map<string, number>()
  private options: Required<RateLimiterOptions>
  private redisAvailable = true

  constructor(options: RateLimiterOptions = {}) {
    this.options = {
      endpointLimits: options.endpointLimits || {},
      defaultLimit: options.defaultLimit || 200,
      windowMs: options.windowMs || 60_000,
      burstThreshold: options.burstThreshold || 50,
      burstWindowMs: options.burstWindowMs || 10_000,
    }
  }

  private getLimit(path: string): number {
    for (const [prefix, limit] of Object.entries(this.options.endpointLimits)) {
      if (path.startsWith(prefix)) return limit
    }
    return this.options.defaultLimit
  }

  private getWindowMs(path: string): number {
    // Stricter auth endpoints get custom windows
    if (path.startsWith('/auth/login')) return 15 * 60_000 // 15 minutes
    if (path.startsWith('/auth/forgot-password')) return 60 * 60_000 // 1 hour
    if (path.startsWith('/auth/register')) return 60 * 60_000 // 1 hour
    return this.options.windowMs
  }

  private isBurstAttack(ip: string): boolean {
    const now = Date.now()
    const count = (this.burstMap.get(ip) || 0) + 1
    this.burstMap.set(ip, count)
    if (count > this.options.burstThreshold) {
      setTimeout(() => this.burstMap.delete(ip), this.options.burstWindowMs)
      return true
    }
    setTimeout(() => this.burstMap.set(ip, Math.max(0, (this.burstMap.get(ip) || 1) - 1)), this.options.burstWindowMs)
    return false
  }

  async check(ip: string, path: string): Promise<{ allowed: boolean; remaining: number; resetAt: number; retryAfter?: number }> {
    if (this.isBurstAttack(ip)) {
      const retryAfter = Math.ceil(this.options.burstWindowMs / 1000)
      return { allowed: false, remaining: 0, resetAt: Date.now() + this.options.burstWindowMs, retryAfter }
    }

    const limit = this.getLimit(path)
    const windowMs = this.getWindowMs(path)
    const now = Date.now()
    const key = `rate_limit:${ip}:${path}`

    if (this.redisAvailable) {
      try {
        const lua = `
          local current = redis.call('incr', KEYS[1])
          if current == 1 then
            redis.call('pexpire', KEYS[1], ARGV[1])
          end
          return {current, redis.call('pttl', KEYS[1])}
        `
        const result = await redis.eval(lua, 1, key, windowMs) as [number, number]
        const count = result[0]
        const ttl = result[1]
        const resetAt = ttl > 0 ? now + ttl : now + windowMs

        if (count > limit) {
          const retryAfter = Math.ceil((resetAt - now) / 1000)
          return { allowed: false, remaining: 0, resetAt, retryAfter }
        }
        return { allowed: true, remaining: limit - count, resetAt }
      } catch (err) {
        log.warn('Redis rate limit error, falling back to memory', { error: (err as Error).message })
        this.redisAvailable = false
        setTimeout(() => { this.redisAvailable = true }, 5000)
      }
    }

    // In-memory fallback
    const entry = this.memoryMap.get(key)
    if (!entry || now > entry.resetAt) {
      const newEntry: RateLimitEntry = { count: 1, resetAt: now + windowMs, remaining: limit - 1 }
      this.memoryMap.set(key, newEntry)
      return { allowed: true, remaining: newEntry.remaining, resetAt: newEntry.resetAt }
    }
    if (entry.count >= limit) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
      return { allowed: false, remaining: 0, resetAt: entry.resetAt, retryAfter }
    }
    entry.count++
    entry.remaining = limit - entry.count
    return { allowed: true, remaining: entry.remaining, resetAt: entry.resetAt }
  }
}
