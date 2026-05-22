import type { Firestore } from 'firebase-admin/firestore'
import { register } from './metrics.js'
import { Gauge, Counter, Histogram } from 'prom-client'

// ---------------------------------------------------------------------------
// System metrics — Node.js + Firestore
// ---------------------------------------------------------------------------

// Node.js memory breakdown
export const nodeMemoryHeapUsed = new Gauge({
  name: 'nodejs_memory_heap_used_bytes',
  help: 'Node.js heap used in bytes',
  registers: [register],
})

export const nodeMemoryHeapTotal = new Gauge({
  name: 'nodejs_memory_heap_total_bytes',
  help: 'Node.js heap total in bytes',
  registers: [register],
})

export const nodeMemoryRss = new Gauge({
  name: 'nodejs_memory_rss_bytes',
  help: 'Node.js RSS in bytes',
  registers: [register],
})

export const nodeMemoryExternal = new Gauge({
  name: 'nodejs_memory_external_bytes',
  help: 'Node.js external memory in bytes',
  registers: [register],
})

// CPU usage (user + system time since last check)
export const nodeCpuUser = new Gauge({
  name: 'nodejs_cpu_user_seconds_total',
  help: 'Node.js CPU user time in seconds',
  registers: [register],
})

export const nodeCpuSystem = new Gauge({
  name: 'nodejs_cpu_system_seconds_total',
  help: 'Node.js CPU system time in seconds',
  registers: [register],
})

// Event loop lag
export const nodeEventLoopLag = new Gauge({
  name: 'nodejs_eventloop_lag_seconds',
  help: 'Node.js event loop lag in seconds',
  registers: [register],
})

// Active handles / requests (best effort)
export const nodeActiveHandles = new Gauge({
  name: 'nodejs_active_handles',
  help: 'Number of active handles',
  registers: [register],
})

export const nodeActiveRequests = new Gauge({
  name: 'nodejs_active_requests',
  help: 'Number of active requests',
  registers: [register],
})

// Firestore metrics
export const firestoreQueriesTotal = new Counter({
  name: 'firestore_queries_total',
  help: 'Total Firestore queries executed',
  labelNames: ['collection'],
  registers: [register],
})

export const firestoreReadsTotal = new Counter({
  name: 'firestore_reads_total',
  help: 'Total Firestore document reads',
  labelNames: ['collection'],
  registers: [register],
})

export const firestoreWritesTotal = new Counter({
  name: 'firestore_writes_total',
  help: 'Total Firestore document writes',
  labelNames: ['collection', 'operation'],
  registers: [register],
})

export const firestoreLatency = new Histogram({
  name: 'firestore_operation_duration_seconds',
  help: 'Firestore operation latency',
  labelNames: ['operation', 'collection'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
})

// ---------------------------------------------------------------------------
// Periodic collector
// ---------------------------------------------------------------------------

let lastCpuUsage = process.cpuUsage()
let eventLoopLagStart = process.hrtime.bigint()

function updateNodeMetrics() {
  const mem = process.memoryUsage()
  nodeMemoryHeapUsed.set(mem.heapUsed)
  nodeMemoryHeapTotal.set(mem.heapTotal)
  nodeMemoryRss.set(mem.rss)
  nodeMemoryExternal.set(mem.external)

  const cpu = process.cpuUsage(lastCpuUsage)
  lastCpuUsage = process.cpuUsage()
  nodeCpuUser.set(cpu.user / 1_000_000)
  nodeCpuSystem.set(cpu.system / 1_000_000)

  // Active handles/requests (best effort — internal APIs)
  try {
    nodeActiveHandles.set((process as any)._getActiveHandles?.().length ?? 0)
    nodeActiveRequests.set((process as any)._getActiveRequests?.().length ?? 0)
  } catch {
    // silently skip on platforms that don't expose these
  }
}

function measureEventLoopLag() {
  const start = eventLoopLagStart
  const end = process.hrtime.bigint()
  const lagSeconds = Number(end - start) / 1e9 - 1 // subtract the 1s interval
  nodeEventLoopLag.set(Math.max(0, lagSeconds))
  eventLoopLagStart = process.hrtime.bigint()
}

let intervalId: ReturnType<typeof setInterval> | null = null

export function startSystemMetrics(db?: Firestore) {
  // Update Node.js gauges every 30 seconds
  intervalId = setInterval(() => {
    updateNodeMetrics()
    measureEventLoopLag()
  }, 30_000)

  // Immediate first update
  updateNodeMetrics()
  measureEventLoopLag()
}

export function stopSystemMetrics() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

// ---------------------------------------------------------------------------
// Helpers to instrument Firestore calls
// ---------------------------------------------------------------------------

export async function instrumentFirestoreRead<T>(
  collection: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now()
  try {
    const result = await fn()
    firestoreReadsTotal.inc({ collection })
    return result
  } finally {
    firestoreLatency.observe({ operation: 'read', collection }, (Date.now() - start) / 1000)
  }
}

export async function instrumentFirestoreWrite<T>(
  collection: string,
  operation: 'create' | 'update' | 'delete' | 'set',
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now()
  try {
    const result = await fn()
    firestoreWritesTotal.inc({ collection, operation })
    return result
  } finally {
    firestoreLatency.observe({ operation, collection }, (Date.now() - start) / 1000)
  }
}

export async function instrumentFirestoreQuery<T>(
  collection: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now()
  try {
    const result = await fn()
    firestoreQueriesTotal.inc({ collection })
    return result
  } finally {
    firestoreLatency.observe({ operation: 'query', collection }, (Date.now() - start) / 1000)
  }
}
