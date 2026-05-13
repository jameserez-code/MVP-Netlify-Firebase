import Fastify from 'fastify'
import { initFirebase } from './lib/firebase.js'
import { log } from './lib/logger.js'
import { sign, verify } from './lib/jwt.js'

import agentsRoutes from './routes/agents.js'
import policiesRoutes from './routes/policies.js'
import enforceRoutes from './routes/enforce.js'

// ---------------------------------------------------------------------------
// Firebase
// ---------------------------------------------------------------------------
const db = initFirebase()
const app = Fastify({ logger: false })

// ---------------------------------------------------------------------------
// CORS — allow browser access from any origin
// ---------------------------------------------------------------------------
app.addHook('onRequest', async (request, reply) => {
  reply.header('Access-Control-Allow-Origin', '*')
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Agent-Key')
  if (request.method === 'OPTIONS') {
    reply.code(204).send()
  }
})

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------
interface Claims { sub: string; role: string; iat: number; exp: number; jti: string }

/** Decorate request with authenticated user. If no valid token, reply with 401. */
async function requireAuth(request: any, reply: any): Promise<Claims | null> {
  const header = (request.headers.authorization || '') as string
  const token = header.startsWith('Bearer ') ? header.substring(7) : null

  if (!token) {
    reply.code(401).send({ error: { code: 'unauthorized', message: 'missing Authorization header' } })
    return null
  }

  const claims = verify(token)
  if (!claims) {
    reply.code(401).send({ error: { code: 'unauthorized', message: 'invalid or expired token' } })
    return null
  }

  return claims as Claims
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
async function fetchDoc(collection: string, id: string) {
  const snap = await db.collection(collection).doc(id).get()
  return snap.exists ? { id, ...snap.data() } : null
}

function err(reply: any, code: number, category: string, message: string, detail?: Record<string, unknown>) {
  reply.code(code)
  return { error: { code: category, message, ...(detail || {}) } }
}

// ---------------------------------------------------------------------------
// POST /auth/login
// ---------------------------------------------------------------------------
app.post('/auth/login', async (request, reply) => {
  const { email, password } = (request.body || {}) as { email?: string; password?: string }

  if (!email || !password) return err(reply, 400, 'validation', 'email and password are required')

  try {
    const snap = await db.collection('users').where('email', '==', email).limit(1).get()
    if (snap.empty || password !== 'admin') {
      return err(reply, 401, 'unauthorized', 'invalid credentials')
    }

    const userDoc = snap.docs[0]
    const user = { id: userDoc.id, ...userDoc.data() }
    const role = (user as any).role || 'org_admin'

    const token = sign({ sub: email, role })
    log.success('login', { user: email, role })
    return { token, user: { email, role } }
  } catch (e: any) {
    log.error('login failed', { error: e.message })
    return err(reply, 503, 'firestore', 'auth service unavailable')
  }
})

// ---------------------------------------------------------------------------
// POST /task (protected)
// ---------------------------------------------------------------------------
app.post('/task', async (request, reply) => {
  const claims = await requireAuth(request, reply)
  if (!claims) return err(reply, 401, 'unauthorized', 'missing or invalid token')

  const { payload } = (request.body || {}) as { payload?: Record<string, unknown> }

  if (!payload) return err(reply, 400, 'validation', 'payload is required')

  try {
    const docRef = db.collection('tasks').doc()
    const doc = {
      payload,
      status: 'created',
      createdAt: new Date().toISOString(),
    }
    await docRef.set(doc)

    log.success('task created', { taskId: docRef.id })
    reply.code(201)
    return { id: docRef.id, ...doc }
  } catch (e: any) {
    log.error('task create failed', { error: e.message })
    return err(reply, 503, 'firestore', 'write failed, try again')
  }
})

// ---------------------------------------------------------------------------
// GET /task/:id
// ---------------------------------------------------------------------------
app.get('/task/:id', async (request, reply) => {
  const { id } = request.params as { id: string }

  try {
    const doc = await fetchDoc('tasks', id)
    if (!doc) return err(reply, 404, 'not_found', `task ${id} not found`)

    log.info('task read', { taskId: id })
    return doc
  } catch (e: any) {
    log.error('task read failed', { taskId: id, error: e.message })
    return err(reply, 503, 'firestore', 'read failed, try again')
  }
})

// ---------------------------------------------------------------------------
// POST /agent/run
// ---------------------------------------------------------------------------
app.post('/agent/run', async (request, reply) => {
  const claims = await requireAuth(request, reply)
  if (!claims) return err(reply, 401, 'unauthorized', 'missing or invalid token')

  const { agentId, taskId } = (request.body || {}) as { agentId?: string; taskId?: string }

  if (!agentId || !taskId) return err(reply, 400, 'validation', 'agentId and taskId are required')

  try {
    // Verify referential integrity
    const agent = await fetchDoc('agents', agentId)
    if (!agent) return err(reply, 400, 'agent_not_found', `agent ${agentId} not found`)

    const task = await fetchDoc('tasks', taskId)
    if (!task) return err(reply, 400, 'task_not_found', `task ${taskId} not found`)

    // State machine: only 'created' tasks can be run
    if ((task as any).status !== 'created') {
      return err(reply, 409, 'conflict', `task ${taskId} is already ${(task as any).status}`, { currentStatus: (task as any).status })
    }

    const docRef = db.collection('runs').doc()
    const now = new Date().toISOString()
    const runDoc = {
      agentId,
      taskId,
      sessionId: `sess_${docRef.id}`,
      status: 'running',
      startedAt: now,
      endedAt: null,
      error: null,
    }

    // Atomically: create run + set task to running
    await db.runTransaction(async (tx) => {
      tx.set(docRef, runDoc)
      tx.update(db.collection('tasks').doc(taskId), { status: 'running' })
    })

    log.success('run started', { runId: docRef.id, agentId, taskId })
    reply.code(201)
    return { id: docRef.id, ...runDoc }
  } catch (e: any) {
    log.error('run create failed', { agentId, taskId, error: e.message })
    return err(reply, 503, 'firestore', 'write failed, try again')
  }
})

// ---------------------------------------------------------------------------
// POST /run/:id/log — append an action log to a run (agent reports tool calls)
// ---------------------------------------------------------------------------
app.post('/run/:id/log', async (request, reply) => {
  const claims = await requireAuth(request, reply)
  if (!claims) return err(reply, 401, 'unauthorized', 'missing or invalid token')

  const { id } = request.params as { id: string }
  const { tool, decision, parameters, reason } = (request.body || {}) as {
    tool?: string; decision?: string; parameters?: Record<string, unknown>; reason?: string
  }

  if (!tool || !decision) return err(reply, 400, 'validation', 'tool and decision are required')

  const run = await fetchDoc('runs', id)
  if (!run) return err(reply, 404, 'not_found', `run ${id} not found`)
  if ((run as any).status !== 'running') return err(reply, 409, 'conflict', `run ${id} is ${(run as any).status}`)

  const logRef = db.collection('logs').doc()
  const logDoc = {
    agentId: (run as any).agentId,
    runId: id,
    tool,
    decision,
    reason: reason || null,
    parameters: parameters || {},
    timestamp: new Date().toISOString(),
  }

  // Atomic: write log + increment run counters
  const delta = { totalActions: 1, allowedActions: decision === 'allow' ? 1 : 0, deniedActions: decision === 'deny' ? 1 : 0 }
  await db.runTransaction(async (tx) => {
    tx.set(logRef, logDoc)
    tx.update(db.collection('runs').doc(id), {
      totalActions: (run as any).totalActions + delta.totalActions,
      allowedActions: (run as any).allowedActions + delta.allowedActions,
      deniedActions: (run as any).deniedActions + delta.deniedActions,
    })
  })

  log.success('action logged', { runId: id, tool, decision })
  reply.code(201)
  return { id: logRef.id, ...logDoc }
})

// ---------------------------------------------------------------------------
// PATCH /run/:id/complete — mark a run as completed
// ---------------------------------------------------------------------------
app.patch('/run/:id/complete', async (request, reply) => {
  const claims = await requireAuth(request, reply)
  if (!claims) return err(reply, 401, 'unauthorized', 'missing or invalid token')

  const { id } = request.params as { id: string }
  const run = await fetchDoc('runs', id)
  if (!run) return err(reply, 404, 'not_found', `run ${id} not found`)

  await db.runTransaction(async (tx) => {
    tx.update(db.collection('runs').doc(id), {
      status: 'completed',
      endedAt: new Date().toISOString(),
    })
    tx.update(db.collection('tasks').doc((run as any).taskId), {
      status: 'completed',
      completedAt: new Date().toISOString(),
    })
  })

  log.success('run completed', { runId: id, taskId: (run as any).taskId })
  return { id, status: 'completed', taskId: (run as any).taskId }
})

// ---------------------------------------------------------------------------
// PATCH /run/:id/fail — mark a run as failed
// ---------------------------------------------------------------------------
app.patch('/run/:id/fail', async (request, reply) => {
  const claims = await requireAuth(request, reply)
  if (!claims) return err(reply, 401, 'unauthorized', 'missing or invalid token')

  const { id } = request.params as { id: string }
  const { error: runError } = (request.body || {}) as { error?: string }

  const run = await fetchDoc('runs', id)
  if (!run) return err(reply, 404, 'not_found', `run ${id} not found`)

  await db.runTransaction(async (tx) => {
    tx.update(db.collection('runs').doc(id), {
      status: 'failed',
      endedAt: new Date().toISOString(),
      error: runError || null,
    })
    tx.update(db.collection('tasks').doc((run as any).taskId), {
      status: 'failed',
      failedAt: new Date().toISOString(),
      error: runError || null,
    })
  })

  log.success('run failed', { runId: id, error: runError })
  return { id, status: 'failed', taskId: (run as any).taskId }
})

// ---------------------------------------------------------------------------
// GET /audit — query action intents (public, for activity feeds)
// ---------------------------------------------------------------------------
app.get('/audit', async (request, reply) => {
  try {
    const { decision, agentId, limit } = (request.query || {}) as { decision?: string; agentId?: string; limit?: string }
    let q = db.collection('actionIntents').orderBy('createdAt', 'desc')
    if (decision) q = q.where('decision', '==', decision)
    if (agentId) q = q.where('agentId', '==', agentId)
    const snap = await q.limit(parseInt(limit || '20', 10)).get()
    return { data: snap.docs.map(d => ({ id: d.id, ...d.data() })) }
  } catch (e: any) {
    reply.code(503)
    return { error: { code: 'firestore', message: 'audit query failed' } }
  }
})

// ---------------------------------------------------------------------------
// GET /sessions — list recent sessions
// ---------------------------------------------------------------------------
app.get('/sessions', async (request, reply) => {
  try {
    const snap = await db.collection('sessions').orderBy('startedAt', 'desc').limit(20).get()
    return { data: snap.docs.map(d => ({ id: d.id, ...d.data() })) }
  } catch (e: any) {
    reply.code(503)
    return { error: { code: 'firestore', message: 'read failed' } }
  }
})

// ---------------------------------------------------------------------------
// GET /sessions/:id — get session details with related runs
// ---------------------------------------------------------------------------
app.get('/sessions/:id', async (request, reply) => {
  try {
    const id = (request.params as any).id
    const sessionSnap = await db.collection('sessions').doc(id).get()
    if (!sessionSnap.exists) { reply.code(404); return { error: { code: 'not_found' } } }

    const runs = await db.collection('runs').where('sessionId', '==', id).get()
    const logs = await db.collection('logs').where('runId', 'in', runs.docs.map(d => d.id)).get()

    return {
      session: { id, ...sessionSnap.data() },
      runs: runs.docs.map(d => ({ id: d.id, ...d.data() })),
      logs: logs.docs.map(d => ({ id: d.id, ...d.data() })),
    }
  } catch (e: any) {
    reply.code(503)
    return { error: { code: 'firestore', message: 'read failed' } }
  }
})

// ---------------------------------------------------------------------------
// Register agent system routes
// ---------------------------------------------------------------------------
agentsRoutes(app, db)
policiesRoutes(app, db)
enforceRoutes(app, db)

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
const PORT = parseInt(process.env.PORT || '3000', 10)

app.listen({ port: PORT }, (listenErr) => {
  if (listenErr) {
    log.error('server start failed', { error: listenErr.message })
    process.exit(1)
  }
  console.log(`\n  server  → http://localhost:${PORT}`)
  console.log(`  POST   /auth/login      — get token`)
  console.log(`  POST   /task             — create task        [auth]`)
  console.log(`  GET    /task/:id         — read task          [public]`)
  console.log(`  POST   /agent/run        — start run          [auth]`)
  console.log(`  POST   /run/:id/log      — log agent action   [auth]`)
  console.log(`  PATCH  /run/:id/complete — complete run        [auth]`)
  console.log(`  PATCH  /run/:id/fail     — fail run            [auth]\n`)
})

// Graceful shutdown
process.on('SIGINT', async () => {
  log.info('shutting down')
  await app.close()
  process.exit(0)
})
