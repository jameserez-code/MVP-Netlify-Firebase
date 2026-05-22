// API Abuse Detection — detects suspicious patterns and auto-blocks traffic
import { log } from './logger.js'
import Redis from 'ioredis'

interface RequestLog {
  timestamp: number
  path: string
  method: string
  userAgent: string
}

interface AbuseState {
  requests: RequestLog[]
  blocked: boolean
  blockedUntil?: number
  alertSent: boolean
}

// Known bad IP ranges / patterns (simplified reputation list)
const KNOWN_BAD_PATTERNS = [
  /^192\.0\.2\./, // TEST-NET-1
  /^198\.51\.100\./, // TEST-NET-2
  /^203\.0\.113\./, // TEST-NET-3
]

export class AbuseDetection {
  private redis: Redis | null = null
  private localMap = new Map<string, AbuseState>()
  private readonly rapidRequestThreshold = 50
  private readonly rapidWindowMs = 10_000 // 50 requests in 10 seconds
  private readonly minRequestsForTimeAnomaly = 20

  constructor() {
    this.initRedis()
  }

  private async initRedis() {
    const redisUrl = process.env.REDIS_URL
    if (!redisUrl) return
    try {
      this.redis = new Redis(redisUrl)
    } catch {
      log.warn('redis not available for abuse detection, falling back to in-memory')
    }
  }

  async check(ip: string, request: any): Promise<{ allowed: boolean; reason?: string }> {
    const now = Date.now()
    const path = request.url || ''
    const method = request.method || ''
    const userAgent = request.headers['user-agent'] || ''

    // Check known bad IPs
    if (this.isKnownBadIp(ip)) {
      log.warn('abuse: known bad IP', { ip })
      return { allowed: false, reason: 'IP reputation block' }
    }

    if (this.redis) {
      try {
        const key = `abuse:${ip}`
        const data = await this.redis.get(key)
        let state: AbuseState = data
          ? JSON.parse(data)
          : { requests: [], blocked: false, alertSent: false }

        if (state.blocked && state.blockedUntil && now < state.blockedUntil) {
          return { allowed: false, reason: 'Blocked by abuse detection' }
        }
        state.blocked = false

        // Add current request
        state.requests.push({ timestamp: now, path, method, userAgent })
        // Keep only last 10 minutes
        state.requests = state.requests.filter((r) => now - r.timestamp < 600_000)

        const result = this.analyze(state, ip, now)
        if (result.blocked) {
          state.blocked = true
          state.blockedUntil = now + 3_600_000 // Block for 1 hour
          if (!state.alertSent) {
            state.alertSent = true
            this.alertAdmins(ip, result.reason || 'abuse detected')
          }
        }

        await this.redis.set(key, JSON.stringify(state), 'EX', 600)
        return { allowed: !result.blocked, reason: result.reason }
      } catch (e) {
        log.error('redis abuse check failed', { error: (e as Error).message })
      }
    }

    // In-memory fallback
    const state = this.localMap.get(ip) || { requests: [], blocked: false, alertSent: false }

    if (state.blocked && state.blockedUntil && now < state.blockedUntil) {
      return { allowed: false, reason: 'Blocked by abuse detection' }
    }
    state.blocked = false

    state.requests.push({ timestamp: now, path, method, userAgent })
    state.requests = state.requests.filter((r) => now - r.timestamp < 600_000)

    const result = this.analyze(state, ip, now)
    if (result.blocked) {
      state.blocked = true
      state.blockedUntil = now + 3_600_000
      if (!state.alertSent) {
        state.alertSent = true
        this.alertAdmins(ip, result.reason || 'abuse detected')
      }
    }

    this.localMap.set(ip, state)
    return { allowed: !result.blocked, reason: result.reason }
  }

  private isKnownBadIp(ip: string): boolean {
    for (const pattern of KNOWN_BAD_PATTERNS) {
      if (pattern.test(ip)) return true
    }
    return false
  }

  private analyze(state: AbuseState, ip: string, now: number): { blocked: boolean; reason?: string } {
    const recent = state.requests.filter((r) => now - r.timestamp < this.rapidWindowMs)
    if (recent.length >= this.rapidRequestThreshold) {
      log.warn('abuse: rapid requests detected', { ip, count: recent.length, window: '10s' })
      return { blocked: true, reason: 'Rapid sequential requests detected (bot behavior)' }
    }

    // Time-of-day anomaly: if most requests are at unusual hours (e.g., 2am-5am UTC)
    if (state.requests.length >= this.minRequestsForTimeAnomaly) {
      const unusualHours = state.requests.filter((r) => {
        const hour = new Date(r.timestamp).getUTCHours()
        return hour >= 2 && hour <= 5
      }).length
      if (unusualHours / state.requests.length > 0.8) {
        log.warn('abuse: unusual time pattern', { ip, ratio: unusualHours / state.requests.length })
        return { blocked: false, reason: 'Unusual time-of-day pattern detected' }
      }
    }

    // Frequent User-Agent changes (possible spoofing)
    const uniqueUAs = new Set(state.requests.map((r) => r.userAgent)).size
    if (state.requests.length > 10 && uniqueUAs / state.requests.length > 0.7) {
      log.warn('abuse: frequent UA changes', { ip, uniqueUAs })
      return { blocked: false, reason: 'Frequent User-Agent changes detected' }
    }

    return { blocked: false }
  }

  private alertAdmins(ip: string, reason: string) {
    log.error('SECURITY ALERT: potential attack detected', {
      ip,
      reason,
      timestamp: new Date().toISOString(),
    })
    // In production, integrate with PagerDuty/Slack/Email here
  }
}
