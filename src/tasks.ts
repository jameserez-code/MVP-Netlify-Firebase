import { getDb } from './lib/firebase.js'
import { log } from './lib/logger.js'

const db = getDb()

// ---------------------------------------------------------------------------
// createTask(payload) → { id, payload, status: "created", createdAt }
// ---------------------------------------------------------------------------
export async function createTask(payload: Record<string, unknown>) {
  try {
    const docRef = db.collection('tasks').doc()
    const doc = {
      payload,
      status: 'created',
      createdAt: new Date().toISOString(),
    }

    await docRef.set(doc)
    log.success('task created', { taskId: docRef.id })
    return { id: docRef.id, ...doc }
  } catch (e: any) {
    log.error('task create failed', { error: e.message })
    throw new Error(`createTask failed: ${e.message}`)
  }
}

// ---------------------------------------------------------------------------
// getTask(id) → task | null
// ---------------------------------------------------------------------------
export async function getTask(id: string) {
  try {
    const snap = await db.collection('tasks').doc(id).get()

    if (!snap.exists) {
      log.warn('task not found', { taskId: id })
      return null
    }

    log.info('task read', { taskId: id, status: snap.data()?.status })
    return { id, ...snap.data() }
  } catch (e: any) {
    log.error('task read failed', { taskId: id, error: e.message })
    throw new Error(`getTask failed: ${e.message}`)
  }
}

// Self-test (tsx src/tasks.ts)
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const task = await createTask({ message: 'self-test', source: 'cli' })
    const found = await getTask(task.id)
    log.success(found ? 'self-test passed' : 'self-test FAILED')
    process.exit(found ? 0 : 1)
  })().catch((err) => {
    log.error('self-test failed', { error: err.message })
    process.exit(1)
  })
}
