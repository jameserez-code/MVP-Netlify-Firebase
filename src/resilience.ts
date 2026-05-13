// Failure resilience — recovery, retry, idempotency
// Shared between worker recovery and server-side enforcement

import type { Firestore } from 'firebase-admin/firestore'
import { log } from './lib/logger.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const RUN_STUCK_THRESHOLD_MS = 120_000     // 2 minutes = stuck
const TASK_STALE_THRESHOLD_MS = 300_000    // 5 minutes = dead
const MAX_RETRIES = 3
const RETRY_BASE_DELAY_MS = 1000
const RETRY_MAX_DELAY_MS = 30_000

// ---------------------------------------------------------------------------
// Dead task detection
// ---------------------------------------------------------------------------

/** Find tasks stuck in running state longer than threshold */
export async function findStuckTasks(db: Firestore) {
  const cutoff = new Date(Date.now() - TASK_STALE_THRESHOLD_MS).toISOString()
  const snap = await db.collection('tasks')
    .where('status', '==', 'running')
    .where('startedAt', '<=', cutoff)
    .get()
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/** Find runs stuck in starting/running state longer than threshold */
export async function findStuckRuns(db: Firestore) {
  const cutoff = new Date(Date.now() - RUN_STUCK_THRESHOLD_MS).toISOString()
  const snap = await db.collection('runs')
    .where('status', 'in', ['starting', 'running'])
    .where('startedAt', '<=', cutoff)
    .get()
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ---------------------------------------------------------------------------
// Crash recovery — reconcile stuck runs/tasks on worker boot
// ---------------------------------------------------------------------------

export async function recoverOnStartup(db: Firestore) {
  log.info('running startup recovery')

  const stuckRuns = await findStuckRuns(db)
  const stuckTasks = await findStuckTasks(db)

  const batch = db.batch()
  let recovered = 0

  for (const run of stuckRuns as any[]) {
    const retryCount = (run.retryCount || 0)
    const canRetry = retryCount < MAX_RETRIES

    if (canRetry && run.taskId) {
      // Retry: reset task to pending, increment retry counter
      batch.update(db.collection('tasks').doc(run.taskId), {
        status: 'pending',
        error: 'Recovered from stuck run (worker restart)',
        retryCount: retryCount + 1,
        updatedAt: new Date().toISOString(),
      })
    }

    // Mark run as timed_out
    batch.update(db.collection('runs').doc(run.id), {
      status: 'timed_out',
      endedAt: new Date().toISOString(),
      error: canRetry ? 'Timed out — task requeued for retry' : 'Timed out — max retries exceeded',
      updatedAt: new Date().toISOString(),
    })

    recovered++
  }

  // Timed-out tasks with no retries left
  for (const task of stuckTasks as any[]) {
    const retryCount = (task.retryCount || 0)
    if (retryCount >= MAX_RETRIES) {
      batch.update(db.collection('tasks').doc(task.id), {
        status: 'failed',
        error: 'Max retries exceeded after crash recovery',
        failedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      recovered++
    }
  }

  if (recovered > 0) await batch.commit()

  log.success('startup recovery complete', { stuckRuns: stuckRuns.length, stuckTasks: stuckTasks.length, recovered })
  return recovered
}

// ---------------------------------------------------------------------------
// Idempotent execution guard
// ---------------------------------------------------------------------------

/** Prevent duplicate run creation for the same task + agent combination */
export async function ensureSingleActiveRun(db: Firestore, taskId: string, agentId: string): Promise<boolean> {
  const snap = await db.collection('runs')
    .where('taskId', '==', taskId)
    .where('agentId', '==', agentId)
    .where('status', 'in', ['starting', 'running'])
    .limit(1)
    .get()

  if (!snap.empty) {
    log.warn('duplicate run prevented', { taskId, agentId, existingRun: snap.docs[0].id })
    return false
  }
  return true
}

/** Idempotent task creation — prevent duplicate tasks with same idempotency key */
export async function idempotentTaskCreate(
  db: Firestore,
  idempotencyKey: string,
  payload: Record<string, unknown>,
): Promise<{ id: string; created: boolean }> {
  const snap = await db.collection('tasks')
    .where('idempotencyKey', '==', idempotencyKey)
    .limit(1)
    .get()

  if (!snap.empty) {
    return { id: snap.docs[0].id, created: false }
  }

  const docRef = db.collection('tasks').doc()
  await docRef.set({
    payload,
    status: 'pending',
    idempotencyKey,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    runCount: 0,
    retryCount: 0,
  })

  return { id: docRef.id, created: true }
}

// ---------------------------------------------------------------------------
// Retry policy — exponential backoff
// ---------------------------------------------------------------------------

export function calculateRetryDelay(retryCount: number): number {
  const delay = RETRY_BASE_DELAY_MS * Math.pow(2, retryCount)
  return Math.min(delay, RETRY_MAX_DELAY_MS)
}

export async function retryTask(
  db: Firestore,
  taskId: string,
  error: string,
): Promise<{ retried: boolean; retryCount: number }> {
  const snap = await db.collection('tasks').doc(taskId).get()
  if (!snap.exists) throw new Error(`Task ${taskId} not found`)

  const task = snap.data() as any
  const retryCount = (task.retryCount || 0) + 1

  if (retryCount > MAX_RETRIES) {
    await db.collection('tasks').doc(taskId).update({
      status: 'failed',
      error: `Max retries (${MAX_RETRIES}) exceeded: ${error}`,
      retryCount,
      failedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    log.error('task permanently failed', { taskId, retryCount, error })
    return { retried: false, retryCount }
  }

  const delay = calculateRetryDelay(retryCount)
  await db.collection('tasks').doc(taskId).update({
    status: 'pending',
    error: null,
    retryCount,
    retryAt: new Date(Date.now() + delay).toISOString(),
    updatedAt: new Date().toISOString(),
  })

  log.info('task retried', { taskId, retryCount, delayMs: delay, error })
  return { retried: true, retryCount }
}
