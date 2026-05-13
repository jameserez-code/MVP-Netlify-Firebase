// Deterministic execution worker — polls for pending tasks and processes them.
// Single-process, sequential, no queue infrastructure.
// Run via: npx tsx src/worker.ts

import { initFirebase } from './lib/firebase.js'
import { log } from './lib/logger.js'

const db = initFirebase()
const POLL_INTERVAL_MS = 5000          // Check every 5 seconds
const EXECUTION_TIMEOUT_MS = 30000     // 30 second timeout per run

let running = false

async function poll() {
  if (running) return
  running = true

  try {
    // Find pending tasks that need execution
    const snap = await db.collection('tasks')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'asc')
      .limit(1)
      .get()

    if (snap.empty) {
      running = false
      return
    }

    const taskDoc = snap.docs[0]
    const task = { id: taskDoc.id, ...taskDoc.data() }
    log.info('worker picked task', { taskId: task.id })

    // Check: does this task have timeout?
    await checkExpiredTasks()

    // Execute if there's an agent available (just use first active agent for now)
    const agentSnap = await db.collection('agents')
      .where('status', '==', 'active')
      .limit(1)
      .get()

    if (agentSnap.empty) {
      log.warn('worker: no active agents')
      running = false
      return
    }

    const agent = { id: agentSnap.docs[0].id, ...agentSnap.docs[0].data() }

    // Create run
    const runRef = db.collection('runs').doc()
    const now = new Date().toISOString()

    // Transition task: pending → queued → running
    await db.runTransaction(async (tx) => {
      tx.update(db.collection('tasks').doc(task.id), {
        status: 'running', startedAt: now, updatedAt: now,
      })
      tx.set(runRef, {
        agentId: agent.id, taskId: task.id,
        sessionId: `sess_${runRef.id}`,
        status: 'running', startedAt: now,
        endedAt: null, error: null, updatedAt: now, createdAt: now,
        totalActions: 0, allowedActions: 0, deniedActions: 0,
      })
    })

    log.success('worker started run', { runId: runRef.id, taskId: task.id, agentId: agent.id })

    // Simulate execution (in production: call the agent via SDK + enforce pipeline)
    await new Promise(r => setTimeout(r, 1000))

    // Complete the run
    await db.runTransaction(async (tx) => {
      tx.update(db.collection('runs').doc(runRef.id), {
        status: 'completed', endedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      tx.update(db.collection('tasks').doc(task.id), {
        status: 'completed', completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    })

    log.success('worker completed run', { runId: runRef.id, taskId: task.id })

  } catch (e: any) {
    log.error('worker error', { error: e.message })
  } finally {
    running = false
  }
}

async function checkExpiredTasks() {
  const timeoutAgo = new Date(Date.now() - EXECUTION_TIMEOUT_MS).toISOString()
  const snap = await db.collection('tasks')
    .where('status', '==', 'running')
    .where('startedAt', '<=', timeoutAgo)
    .get()

  for (const doc of snap.docs) {
    const task = { id: doc.id, ...doc.data() }
    log.warn('worker: timed out task', { taskId: task.id })

    // Find associated run and mark both as timed out
    const runSnap = await db.collection('runs')
      .where('taskId', '==', task.id)
      .where('status', '==', 'running')
      .limit(1)
      .get()

    const batch = db.batch()
    batch.update(db.collection('tasks').doc(task.id), {
      status: 'failed', failedAt: new Date().toISOString(),
      error: 'execution timed out', updatedAt: new Date().toISOString(),
    })

    for (const runDoc of runSnap.docs) {
      batch.update(db.collection('runs').doc(runDoc.id), {
        status: 'timed_out', endedAt: new Date().toISOString(),
        error: 'execution timed out', updatedAt: new Date().toISOString(),
      })
    }

    await batch.commit()
  }
}

// Start polling
log.info('worker started', { intervalMs: POLL_INTERVAL_MS, timeoutMs: EXECUTION_TIMEOUT_MS })
setInterval(poll, POLL_INTERVAL_MS)
poll() // Immediate first poll

process.on('SIGINT', () => {
  log.info('worker stopped')
  process.exit(0)
})
