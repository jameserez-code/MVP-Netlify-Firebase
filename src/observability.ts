import type { FastifyInstance } from 'fastify'
import type { Firestore } from 'firebase-admin/firestore'
import { generateId } from './lib/crypto.js'
import { log } from './lib/logger.js'
import { withCache } from './lib/cache.js'

// ---------------------------------------------------------------------------
// Request ID middleware — every API call gets a unique ID propagated to logs
// ---------------------------------------------------------------------------
export function attachRequestId(app: FastifyInstance) {
  app.addHook('onRequest', async (request) => {
    (request as any).requestId = generateId('req_', 8)
  })
}

export function getRequestId(request: any): string {
  return request.requestId || 'unknown'
}

// ---------------------------------------------------------------------------
// GET /audit/timeline — chronological execution history
// ---------------------------------------------------------------------------
export async function auditTimeline(app: FastifyInstance, db: Firestore) {
  app.get('/audit/timeline', async (request, reply) => {
    const { limit } = (request.query || {}) as { limit?: string }
    try {
      const snap = await db.collection('logs')
        .where('tool', '==', 'system.transition')
        .orderBy('timestamp', 'desc')
        .limit(parseInt(limit || '50', 10))
        .get()

      return { timeline: snap.docs.map(d => ({ id: d.id, ...d.data() })) }
    } catch (e: any) {
      reply.code(503)
      return { error: { code: 'firestore', message: e.message } }
    }
  })
}

// ---------------------------------------------------------------------------
// GET /run/:id/trace — full execution trace for a single run
// ---------------------------------------------------------------------------
export async function runTrace(app: FastifyInstance, db: Firestore) {
  app.get('/run/:id/trace', async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const runSnap = await db.collection('runs').doc(id).get()
      if (!runSnap.exists) { reply.code(404); return { error: { code: 'not_found' } } }

      const run: any = { id: runSnap.id, ...runSnap.data() }

      // Fetch all logs for this run (both system.transition and tool calls)
      const logSnap = await db.collection('logs')
        .where('runId', '==', id)
        .orderBy('timestamp', 'asc')
        .get()

      // Fetch the task
      const taskSnap = run.taskId ? await db.collection('tasks').doc(run.taskId as string).get() : null

      return {
        run,
        task: taskSnap?.exists ? { id: taskSnap.id, ...taskSnap.data() } : null,
        events: logSnap.docs.map(d => ({
          id: d.id, tool: d.data().tool, decision: d.data().decision,
          reason: d.data().reason, timestamp: d.data().timestamp, requestId: d.data().requestId,
        })),
      }
    } catch (e: any) {
      reply.code(503)
      return { error: { code: 'firestore', message: e.message } }
    }
  })
}

// ---------------------------------------------------------------------------
// Metrics helper (reused by WebSocket publisher)
// ---------------------------------------------------------------------------
export async function getMetricsData(db: Firestore) {
  const [tasksSnap, runsSnap, agentsSnap, logsSnap] = await Promise.all([
    db.collection('tasks').get(),
    db.collection('runs').where('status', '==', 'running').get(),
    db.collection('agents').where('status', '==', 'active').get(),
    db.collection('logs').orderBy('timestamp', 'desc').limit(100).get(),
  ])

  const tasks = tasksSnap.docs.map(d => d.data())
  const total = tasks.length
  const completed = tasks.filter((t: any) => t.status === 'completed').length
  const failed = tasks.filter((t: any) => t.status === 'failed').length
  const active = tasks.filter((t: any) => t.status === 'running').length

  const completedRuns = await db.collection('runs').where('status', '==', 'completed').get()
  const durations = completedRuns.docs
    .map(d => d.data().durationMs as number)
    .filter(Boolean)
  const avgDurationMs = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0

  return {
    tasks: { total, completed, failed, active, pending: total - completed - failed - active },
    runs: { active: runsSnap.size },
    agents: { active: agentsSnap.size },
    avgDurationMs,
    recentLogs: logsSnap.size,
  }
}

// ---------------------------------------------------------------------------
// GET /metrics — lightweight operational metrics (cached 30s)
// ---------------------------------------------------------------------------
export async function metrics(app: FastifyInstance, db: Firestore) {
  app.get('/metrics', {
    handler: withCache(async (_request, reply) => {
      try {
        return await getMetricsData(db)
      } catch (e: any) {
        reply.code(503)
        return { error: { code: 'firestore', message: e.message } }
      }
    }, 30),
  })
}
