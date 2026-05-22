import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client'

export const register = new Registry()

// Enable default Node.js metrics (GC, event loop, memory, etc.)
collectDefaultMetrics({ register })

// HTTP request metrics
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
})

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
})

// Business metrics
export const enforcementsTotal = new Counter({
  name: 'enforcements_total',
  help: 'Total policy enforcements',
  labelNames: ['decision', 'org_id'],
  registers: [register],
})

export const activeAgents = new Gauge({
  name: 'active_agents',
  help: 'Number of active agents',
  labelNames: ['org_id'],
  registers: [register],
})

export const queueDepth = new Gauge({
  name: 'queue_depth',
  help: 'Current queue depth',
  labelNames: ['queue_name'],
  registers: [register],
})

// ---------------------------------------------------------------------------
// In-memory metrics collection with 1-hour TTL (backward compatibility)
// ---------------------------------------------------------------------------

interface RequestRecord {
  method: string
  path: string
  status: number
  duration: number
  timestamp: number
}

interface ErrorRecord {
  message: string
  endpoint: string
  timestamp: number
}

const requests: RequestRecord[] = []
const errors: ErrorRecord[] = []

const HOUR_MS = 60 * 60 * 1000

function cleanupOldRecords() {
  const cutoff = Date.now() - HOUR_MS
  while (requests.length > 0 && requests[0].timestamp < cutoff) {
    requests.shift()
  }
  while (errors.length > 0 && errors[0].timestamp < cutoff) {
    errors.shift()
  }
}

export function recordRequest(method: string, path: string, status: number, duration: number) {
  cleanupOldRecords()
  requests.push({ method, path, status, duration, timestamp: Date.now() })

  // Prometheus metrics
  httpRequestsTotal.inc({ method, route: path, status_code: String(status) })
  httpRequestDuration.observe({ method, route: path }, duration / 1000)
}

export function recordError(error: Error | string, endpoint: string) {
  cleanupOldRecords()
  const message = typeof error === 'string' ? error : error.message
  errors.push({ message, endpoint, timestamp: Date.now() })
}

export interface AggregatedMetrics {
  requestsTotal: number
  requestsPerMinute: number
  avgResponseTime: number
  errorRate: number
  errorCount: number
  statusBreakdown: Record<string, number>
}

export function getMetrics(): AggregatedMetrics {
  cleanupOldRecords()

  const now = Date.now()
  const oneMinuteAgo = now - 60_000

  const recentRequests = requests.filter(r => r.timestamp >= oneMinuteAgo)
  const recentErrors = errors.filter(e => e.timestamp >= oneMinuteAgo)

  const totalDuration = requests.reduce((sum, r) => sum + r.duration, 0)
  const avgResponseTime = requests.length > 0 ? Math.round(totalDuration / requests.length) : 0

  const statusBreakdown: Record<string, number> = {}
  for (const r of requests) {
    const bucket = `${r.status}`
    statusBreakdown[bucket] = (statusBreakdown[bucket] || 0) + 1
  }

  return {
    requestsTotal: requests.length,
    requestsPerMinute: recentRequests.length,
    avgResponseTime,
    errorRate: requests.length > 0 ? Math.round((errors.length / requests.length) * 1000) / 1000 : 0,
    errorCount: errors.length,
    statusBreakdown,
  }
}

export function resetMetrics() {
  requests.length = 0
  errors.length = 0
}
