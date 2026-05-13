import { Firestore } from 'firebase-admin/firestore'
import { isValidTransition, type TaskStatus, type RunStatus, TASK_TRANSITIONS, RUN_TRANSITIONS } from './state-machine.js'
import { log } from './lib/logger.js'

// ---------------------------------------------------------------------------
// Centralized atomic transition helpers.
// Every state change goes through these — never write status directly.
// All transitions are Firestore transactions + emit structured log entries.
// ---------------------------------------------------------------------------

export async function transitionTask(
  db: Firestore,
  taskId: string,
  nextStatus: TaskStatus,
  extra: Record<string, unknown> = {},
  requestId?: string,
) {
  const ref = db.collection('tasks').doc(taskId)

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) throw new Error(`TASK_NOT_FOUND: ${taskId}`)

    const current = snap.data()?.status as string
    if (!isValidTransition(current, nextStatus, TASK_TRANSITIONS)) {
      throw new Error(`INVALID_TASK_TRANSITION: ${taskId} ${current} → ${nextStatus}`)
    }

    const timestamp = new Date().toISOString()
    const update: Record<string, unknown> = {
      status: nextStatus,
      updatedAt: timestamp,
      ...extra,
    }

    // Attach lifecycle timestamps
    if (nextStatus === 'queued') update.queuedAt = timestamp
    if (nextStatus === 'running') update.startedAt = timestamp
    if (nextStatus === 'completed') update.completedAt = timestamp
    if (nextStatus === 'failed') update.failedAt = timestamp
    if (nextStatus === 'cancelled') update.cancelledAt = timestamp

    tx.update(ref, update)

    // Emit transition log
    const logRef = db.collection('logs').doc()
    tx.set(logRef, {
      taskId, runId: extra.runId || null, agentId: extra.agentId || null,
      tool: 'system.transition',
      decision: 'allow',
      reason: `task: ${current} → ${nextStatus}`,
      parameters: { previousStatus: current, nextStatus, ...extra },
      timestamp,
      requestId: requestId || 'system',
    })
  })

  log.info('task transition', { taskId, previousStatus: '?', nextStatus, requestId })
}

export async function transitionRun(
  db: Firestore,
  runId: string,
  nextStatus: RunStatus,
  extra: Record<string, unknown> = {},
  requestId?: string,
) {
  const ref = db.collection('runs').doc(runId)

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) throw new Error(`RUN_NOT_FOUND: ${runId}`)

    const current = snap.data()?.status as string
    if (!isValidTransition(current, nextStatus, RUN_TRANSITIONS)) {
      throw new Error(`INVALID_RUN_TRANSITION: ${runId} ${current} → ${nextStatus}`)
    }

    const timestamp = new Date().toISOString()
    const update: Record<string, unknown> = {
      status: nextStatus,
      updatedAt: timestamp,
      ...extra,
    }

    if (nextStatus === 'running') {
      update.startedAt = timestamp
      if (!update.taskId) update.taskId = snap.data()?.taskId
    }
    if (nextStatus === 'completed' || nextStatus === 'failed' || nextStatus === 'timed_out') {
      update.endedAt = timestamp
      // Calculate duration
      const startedAt = snap.data()?.startedAt
      if (startedAt) {
        update.durationMs = Date.now() - new Date(startedAt as string).getTime()
      }
    }

    tx.update(ref, update)

    const logRef = db.collection('logs').doc()
    tx.set(logRef, {
      taskId: snap.data()?.taskId || null,
      runId,
      agentId: snap.data()?.agentId || null,
      tool: 'system.transition',
      decision: 'allow',
      reason: `run: ${current} → ${nextStatus}`,
      parameters: { previousStatus: current, nextStatus, ...extra },
      timestamp,
      requestId: requestId || 'system',
    })
  })

  log.info('run transition', { runId, previousStatus: '?', nextStatus, requestId })
}

export async function failRunWithError(
  db: Firestore,
  runId: string,
  error: string,
  requestId?: string,
) {
  const ref = db.collection('runs').doc(runId)

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) throw new Error(`RUN_NOT_FOUND: ${runId}`)

    const current = snap.data()?.status as string
    if (!isValidTransition(current, 'failed', RUN_TRANSITIONS)) {
      // Force-fail: override if already timed_out
      if (current !== 'failed' && current !== 'timed_out') {
        throw new Error(`INVALID_RUN_TRANSITION: ${runId} ${current} → failed`)
      }
    }

    const taskId = snap.data()?.taskId as string
    const timestamp = new Date().toISOString()
    const update: Record<string, unknown> = {
      status: 'failed',
      endedAt: timestamp,
      error,
      updatedAt: timestamp,
    }

    tx.update(ref, update)

    // Mirror failure to the task
    if (taskId) {
      const taskRef = db.collection('tasks').doc(taskId)
      tx.update(taskRef, {
        status: 'failed',
        failedAt: timestamp,
        error,
        updatedAt: timestamp,
      })
    }

    const logRef = db.collection('logs').doc()
    tx.set(logRef, {
      taskId, runId, agentId: snap.data()?.agentId || null,
      tool: 'system.error',
      decision: 'deny',
      reason: `run failed: ${error}`,
      parameters: { error },
      timestamp,
      requestId: requestId || 'system',
    })
  })

  log.error('run failed', { runId, error, requestId })
}
