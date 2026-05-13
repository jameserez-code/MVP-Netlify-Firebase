// Deterministic execution worker — with crash recovery, idempotency, retry
// Run: npm run worker

import { initFirebase } from './lib/firebase.js'
import { log } from './lib/logger.js'
import { recoverOnStartup, ensureSingleActiveRun, findStuckTasks, retryTask } from './resilience.js'

const db = initFirebase()
const POLL_INTERVAL_MS = 5000
const EXECUTION_TIMEOUT_MS = 30_000
const STALE_CHECK_INTERVAL_MS = 60_000

let running = false

// --- Startup recovery ---
await recoverOnStartup(db)

// --- Periodic stale check ---
async function staleCheck() {
  try {
    const stuckTasks = await findStuckTasks(db)
    for (const task of stuckTasks as any[]) {
      log.warn('stale task detected', { taskId: task.id, status: task.status, startedAt: task.startedAt })
      await retryTask(db, task.id, 'Task exceeded execution time threshold')
    }
  } catch (e: any) {
    log.error('stale check failed', { error: e.message })
  }
}

// --- Main poll loop ---
async function poll() {
  if (running) return
  running = true

  try {
    const snap = await db.collection('tasks')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'asc')
      .limit(1)
      .get()

    if (snap.empty) { running = false; return }

    const taskDoc = snap.docs[0]
    const task = { id: taskDoc.id, ...taskDoc.data() } as any
    log.info('worker picked task', { taskId: task.id, retryCount: task.retryCount || 0 })

    // Find active agent
    const agentSnap = await db.collection('agents')
      .where('status', '==', 'active')
      .limit(1)
      .get()

    if (agentSnap.empty) { log.warn('no active agents'); running = false; return }
    const agent = { id: agentSnap.docs[0].id, ...agentSnap.docs[0].data() }

    // Idempotency: prevent duplicate runs for same task+agent
    if (!(await ensureSingleActiveRun(db, task.id, agent.id))) {
      log.warn('duplicate run prevented by idempotency guard', { taskId: task.id })
      running = false
      return
    }

    // Create run (atomic: task pending→running, run created)
    const runRef = db.collection('runs').doc()
    const now = new Date().toISOString()
    await db.runTransaction(async (tx) => {
      const currentSnap = await tx.get(db.collection('tasks').doc(task.id))
      if (!currentSnap.exists || currentSnap.data()?.status !== 'pending') {
        throw new Error(`CONFLICT: task ${task.id} is no longer pending`)
      }
      tx.update(db.collection('tasks').doc(task.id), {
        status: 'running', startedAt: now, updatedAt: now,
      })
      tx.set(runRef, {
        agentId: agent.id, taskId: task.id,
        sessionId: `sess_${runRef.id}`,
        status: 'running', startedAt: now,
        endedAt: null, error: null, updatedAt: now, createdAt: now,
        totalActions: 0, allowedActions: 0, deniedActions: 0,
        retryCount: task.retryCount || 0,
      })
    })

    log.success('worker started run', { runId: runRef.id, taskId: task.id })

    // Execution timeout guard
    const timeoutId = setTimeout(async () => {
      log.warn('execution timeout — failing run', { runId: runRef.id })
      try {
        await db.runTransaction(async (tx) => {
          tx.update(runRef, { status: 'timed_out', endedAt: new Date().toISOString(), error: 'Execution timeout' })
          tx.update(db.collection('tasks').doc(task.id), { status: 'failed', error: 'Execution timeout', failedAt: new Date().toISOString() })
        })
      } catch (e: any) { log.error('timeout handler failed', { error: e.message }) }
    }, EXECUTION_TIMEOUT_MS)

    // Simulate execution
    await new Promise(r => setTimeout(r, 1000))
    clearTimeout(timeoutId)

    // Complete
    await db.runTransaction(async (tx) => {
      const endTime = new Date().toISOString()
      tx.update(runRef, { status: 'completed', endedAt: endTime, updatedAt: endTime })
      tx.update(db.collection('tasks').doc(task.id), { status: 'completed', completedAt: endTime, updatedAt: endTime })
    })

    log.success('worker completed run', { runId: runRef.id, taskId: task.id })

  } catch (e: any) {
    log.error('worker error', { error: e.message })
  } finally {
    running = false
  }
}

// Start
log.info('worker started', { pollMs: POLL_INTERVAL_MS, timeoutMs: EXECUTION_TIMEOUT_MS, staleCheckMs: STALE_CHECK_INTERVAL_MS })
setInterval(poll, POLL_INTERVAL_MS)
setInterval(staleCheck, STALE_CHECK_INTERVAL_MS)
poll()  // immediate first poll

process.on('SIGINT', () => { log.info('worker stopped'); process.exit(0) })
