import Fastify from 'fastify'
import admin from 'firebase-admin'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// ---------------------------------------------------------------------------
// Firebase init
// ---------------------------------------------------------------------------
const keyPath = resolve(process.cwd(), 'service-account.json')
if (!existsSync(keyPath)) {
  console.error('FATAL: service-account.json not found')
  process.exit(1)
}

const sa = JSON.parse(readFileSync(keyPath, 'utf-8'))
if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.cert(sa) })
}

const db = admin.firestore()
const app = Fastify({ logger: false })

// ---------------------------------------------------------------------------
// POST /task — create a task
// ---------------------------------------------------------------------------
app.post('/task', async (request) => {
  const { payload } = request.body as { payload?: Record<string, unknown> }

  if (!payload) {
    return { error: 'payload is required' }
  }

  const docRef = db.collection('tasks').doc()
  const doc = {
    payload,
    status: 'created',
    createdAt: new Date().toISOString(),
  }

  await docRef.set(doc)
  console.log(`POST /task → ${docRef.id}`)
  return { id: docRef.id, ...doc }
})

// ---------------------------------------------------------------------------
// GET /task/:id — read a task
// ---------------------------------------------------------------------------
app.get('/task/:id', async (request) => {
  const { id } = request.params as { id: string }

  const snapshot = await db.collection('tasks').doc(id).get()

  if (!snapshot.exists) {
    return { error: 'not_found', id }
  }

  console.log(`GET /task/${id} → ${snapshot.data()?.status}`)
  return { id, ...snapshot.data() }
})

// ---------------------------------------------------------------------------
// POST /agent/run — create a run (agent executes a task)
// ---------------------------------------------------------------------------
app.post('/agent/run', async (request) => {
  const { agentId, taskId } = request.body as { agentId?: string; taskId?: string }

  if (!agentId || !taskId) {
    return { error: 'agentId and taskId are required' }
  }

  // Verify agent exists
  const agentSnapshot = await db.collection('agents').doc(agentId).get()
  if (!agentSnapshot.exists) {
    return { error: 'agent_not_found', agentId }
  }

  // Verify task exists
  const taskSnapshot = await db.collection('tasks').doc(taskId).get()
  if (!taskSnapshot.exists) {
    return { error: 'task_not_found', taskId }
  }

  const docRef = db.collection('runs').doc()
  const now = new Date().toISOString()
  const doc = {
    agentId,
    taskId,
    sessionId: `sess_${docRef.id}`,
    status: 'started',
    startedAt: now,
    endedAt: null,
    totalActions: 0,
    allowedActions: 0,
    deniedActions: 0,
  }

  await docRef.set(doc)
  console.log(`POST /agent/run → ${docRef.id} (agent: ${agentId}, task: ${taskId})`)
  return { id: docRef.id, ...doc }
})

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
const PORT = parseInt(process.env.PORT || '3000', 10)

app.listen({ port: PORT }, (err) => {
  if (err) {
    console.error('Server failed to start:', err.message)
    process.exit(1)
  }
  console.log(`\n  Server running on http://localhost:${PORT}`)
  console.log(`  POST /task  — create task`)
  console.log(`  GET  /task/:id — read task`)
  console.log(`  POST /agent/run — create run\n`)
})
