// System diagnostics — introspection, consistency checker, repair utilities
import type { Firestore } from 'firebase-admin/firestore'
import { log } from './lib/logger.js'

// ---------------------------------------------------------------------------
// GET /diagnostics — full system health check
// ---------------------------------------------------------------------------
export async function systemDiagnostics(db: Firestore) {
  const start = Date.now()

  const [tasksSnap, runsSnap, agentsSnap, policiesSnap] = await Promise.all([
    db.collection('tasks').limit(1).get(),
    db.collection('runs').limit(1).get(),
    db.collection('agents').limit(1).get(),
    db.collection('policies').limit(1).get(),
  ])

  return {
    status: 'healthy',
    firestore: { connected: true, latencyMs: Date.now() - start },
    collections: {
      tasks: { accessible: true, count: (await db.collection('tasks').count().get()).data().count },
      runs: { accessible: true, count: (await db.collection('runs').count().get()).data().count },
      agents: { accessible: true, count: (await db.collection('agents').count().get()).data().count },
      policies: { accessible: true, count: (await db.collection('policies').count().get()).data().count },
      logs: { accessible: true, count: (await db.collection('logs').count().get()).data().count },
    },
    config: {
      env: process.env.NODE_ENV || 'development',
      port: process.env.PORT || '3000',
      jwtConfigured: !!process.env.JWT_SECRET,
      engineSecretConfigured: !!process.env.ENGINE_SECRET,
    },
    checkedAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Consistency checker — detect orphaned/invalid states
// ---------------------------------------------------------------------------
export async function checkConsistency(db: Firestore) {
  const issues: Array<{ severity: 'warn' | 'error'; resource: string; id: string; description: string }> = []

  // 1. Orphaned runs (runs with taskId that doesn't exist)
  const runsSnap = await db.collection('runs').limit(100).get()
  for (const doc of runsSnap.docs) {
    const run = doc.data() as any
    if (run.taskId) {
      const taskSnap = await db.collection('tasks').doc(run.taskId).get()
      if (!taskSnap.exists) {
        issues.push({ severity: 'error', resource: 'run', id: doc.id, description: `Orphaned: task ${run.taskId} not found` })
      }
    }
  }

  // 2. Tasks stuck in running without active runs
  const tasksSnap = await db.collection('tasks').where('status', '==', 'running').limit(50).get()
  for (const doc of tasksSnap.docs) {
    const task = doc.data() as any
    const activeRuns = await db.collection('runs').where('taskId', '==', doc.id).where('status', '==', 'running').limit(1).get()
    if (activeRuns.empty) {
      issues.push({ severity: 'warn', resource: 'task', id: doc.id, description: `Task running but no active runs` })
    }
  }

  // 3. Tasks with invalid status
  const validTaskStatuses = ['pending', 'queued', 'running', 'completed', 'failed', 'cancelled']
  const allTasks = await db.collection('tasks').limit(100).get()
  for (const doc of allTasks.docs) {
    const status = doc.data().status
    if (!validTaskStatuses.includes(status)) {
      issues.push({ severity: 'error', resource: 'task', id: doc.id, description: `Invalid status: ${status}` })
    }
  }

  // 4. Missing timestamps on completed tasks
  for (const doc of allTasks.docs) {
    const task = doc.data() as any
    if (task.status === 'completed' && !task.completedAt) {
      issues.push({ severity: 'warn', resource: 'task', id: doc.id, description: 'Completed task missing completedAt' })
    }
    if (task.status === 'failed' && !task.failedAt) {
      issues.push({ severity: 'warn', resource: 'task', id: doc.id, description: 'Failed task missing failedAt' })
    }
  }

  log.info('consistency check', { issues: issues.length })
  return { issues, ranAt: new Date().toISOString() }
}

// ---------------------------------------------------------------------------
// Repair utilities — safely fix common inconsistencies
// ---------------------------------------------------------------------------
export async function repairOrphanedRuns(db: Firestore) {
  const runsSnap = await db.collection('runs').where('status', '==', 'running').limit(50).get()
  const batch = db.batch()
  let repaired = 0

  for (const doc of runsSnap.docs) {
    const run = doc.data() as any
    if (run.taskId) {
      const taskSnap = await db.collection('tasks').doc(run.taskId).get()
      if (!taskSnap.exists) {
        batch.update(doc.ref, { status: 'failed', error: 'Orphaned — task not found', endedAt: new Date().toISOString() })
        repaired++
      }
    }
  }

  if (repaired > 0) await batch.commit()
  log.success('repaired orphaned runs', { repaired })
  return { repaired }
}

export async function repairStuckTasks(db: Firestore) {
  const staleThreshold = new Date(Date.now() - 300_000).toISOString()
  const snap = await db.collection('tasks')
    .where('status', '==', 'running')
    .where('startedAt', '<=', staleThreshold)
    .get()

  const batch = db.batch()
  for (const doc of snap.docs) {
    batch.update(doc.ref, { status: 'failed', error: 'Repaired: stuck task (no active run)', failedAt: new Date().toISOString() })
  }

  if (snap.size > 0) await batch.commit()
  log.success('repaired stuck tasks', { repaired: snap.size })
  return { repaired: snap.size }
}

// ---------------------------------------------------------------------------
// Operational report generator
// ---------------------------------------------------------------------------
export async function generateReport(db: Firestore) {
  const [tasksSnap, runsSnap, logsSnap] = await Promise.all([
    db.collection('tasks').get(),
    db.collection('runs').get(),
    db.collection('logs').orderBy('timestamp', 'desc').limit(100).get(),
  ])

  const tasks = tasksSnap.docs.map(d => d.data())
  const runs = runsSnap.docs.map(d => d.data())

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalTasks: tasks.length,
      completed: tasks.filter(t => (t as any).status === 'completed').length,
      failed: tasks.filter(t => (t as any).status === 'failed').length,
      totalRuns: runs.length,
      completedRuns: runs.filter(r => (r as any).status === 'completed').length,
      avgDurationMs: Math.round(runs.filter(r => (r as any).durationMs).reduce((a, r) => a + (r as any).durationMs, 0) / Math.max(1, runs.filter(r => (r as any).durationMs).length)),
      retryRate: tasks.filter(t => (t as any).retryCount > 0).length / Math.max(1, tasks.length),
    },
    topFailures: tasks.filter(t => (t as any).status === 'failed').slice(0, 5).map(t => ({ error: (t as any).error, count: 1 })),
    recentLogCount: logsSnap.size,
  }
}
