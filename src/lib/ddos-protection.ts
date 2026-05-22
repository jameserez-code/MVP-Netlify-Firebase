// DDoS Protection — IP-based request throttling with Redis fallback
// Max 100 requests/minute per IP, max 10 concurrent connections per IP,
// block IPs with > 500 errors/hour

import { log } from './logger.js'
import Redis from 'ioredis'

interface DdosState {
  requests: number
  windowStart: number
  concurrent: number
  errors: number
  errorWindowStart: number
  blocked: boolean
  blockedUntil?: number
}

export class DdosProtection {
  private redis: Redis | null = null
  private localMap = new Map<string, DdosState>()
  private readonly maxRequestsPerMinute = 100
  private readonly maxConcurrent = 10
  private readonly maxErrorsPerHour = 500

  constructor() {
    this.initRedis()
  }

  private async initRedis() {
    const redisUrl = process.env.REDIS_URL
    if (!redisUrl) return
    try {
      this.redis = new Redis(redisUrl)
      log.success('ddos protection redis connected')
    } catch {
      log.warn('redis not available for ddos, falling back to in-memory')
    }
  }

  async check(ip: string): Promise<{ allowed: boolean; reason?: string }> {
    const now = Date.now()
    const minuteWindow = Math.floor(now / 60_000)
    const hourWindow = Math.floor(now / 3_600_000)

    const keyReq = `ddos:req:${ip}:${minuteWindow}`
    const keyErr = `ddos:err:${ip}:${hourWindow}`
    const keyConc = `ddos:conc:${ip}`

    if (this.redis) {
      try {
        // Check if IP is already blocked
        const blocked = await this.redis.get(`ddos:blocked:${ip}`)
        if (blocked) {
          const blockedUntil = parseInt(blocked, 10)
          if (now < blockedUntil) {
            return { allowed: false, reason: 'IP blocked due to excessive errors' }
          }
          await this.redis.del(`ddos:blocked:${ip}`)
        }

        const pipeline = this.redis.pipeline()
        pipeline.get(keyReq)
        pipeline.get(keyErr)
        pipeline.get(keyConc)
        const results = await pipeline.exec()
        if (!results) return { allowed: true }

        const requests = parseInt((results[0]?.[1] as string) || '0', 10)
        const errors = parseInt((results[1]?.[1] as string) || '0', 10)
        const concurrent = parseInt((results[2]?.[1] as string) || '0', 10)

        if (requests >= this.maxRequestsPerMinute) {
          return { allowed: false, reason: 'Rate limit exceeded: 100 req/min' }
        }
        if (concurrent >= this.maxConcurrent) {
          return { allowed: false, reason: 'Too many concurrent connections' }
        }
        if (errors >= this.maxErrorsPerHour) {
          await this.redis.set(`ddos:blocked:${ip}`, String(now + 3_600_000), 'EX', 3_600)
          return { allowed: false, reason: 'IP blocked due to excessive errors' }
        }

        const multi = this.redis.multi()
        multi.incr(keyReq)
        multi.expire(keyReq, 60)
        multi.incr(keyConc)
        multi.expire(keyConc, 60)
        await multi.exec()

        return { allowed: true }
      } catch (e) {
        log.error('redis ddos check failed', { error: (e as Error).message })
        // Fall through to memory
      }
    }

    // In-memory fallback
    const state = this.localMap.get(ip) || {
      requests: 0,
      windowStart: now,
      concurrent: 0,
      errors: 0,
      errorWindowStart: now,
      blocked: false,
    }

    // Reset windows
    if (now - state.windowStart > 60_000) {
      state.requests = 0
      state.windowStart = now
    }
    if (now - state.errorWindowStart > 3_600_000) {
      state.errors = 0
      state.errorWindowStart = now
    }

    if (state.blocked && state.blockedUntil && now < state.blockedUntil) {
      return { allowed: false, reason: 'IP blocked due to excessive errors' }
    }
    state.blocked = false

    if (state.requests >= this.maxRequestsPerMinute) {
      return { allowed: false, reason: 'Rate limit exceeded: 100 req/min' }
    }
    if (state.concurrent >= this.maxConcurrent) {
      return { allowed: false, reason: 'Too many concurrent connections' }
    }
    if (state.errors >= this.maxErrorsPerHour) {
      state.blocked = true
      state.blockedUntil = now + 3_600_000
      return { allowed: false, reason: 'IP blocked due to excessive errors' }
    }

    state.requests++
    state.concurrent++
    this.localMap.set(ip, state)

    return { allowed: true }
  }

  async release(ip: string) {
    if (this.redis) {
      try {
        const keyConc = `ddos:conc:${ip}`
        const val = await this.redis.decr(keyConc)
        if (val < 0) await this.redis.set(keyConc, '0')
      } catch {
        // silent
      }
      return
    }

    const state = this.localMap.get(ip)
    if (state) {
      state.concurrent = Math.max(0, state.concurrent - 1)
      this.localMap.set(ip, state)
    }
  }

  async recordError(ip: string) {
    const now = Date.now()
    const hourWindow = Math.floor(now / 3_600_000)
    const keyErr = `ddos:err:${ip}:${hourWindow}`

    if (this.redis) {
      try {
        await this.redis.incr(keyErr)
        await this.redis.expire(keyErr, 3_600)
      } catch {
        // silent
      }
      return
    }

    const state = this.localMap.get(ip) || {
      requests: 0,
      windowStart: now,
      concurrent: 0,
      errors: 0,
      errorWindowStart: now,
      blocked: false,
    }

    if (now - state.errorWindowStart > 3_600_000) {
      state.errors = 0
      state.errorWindowStart = now
    }
    state.errors++
    this.localMap.set(ip, state)
  }
}
