import Fastify from 'fastify'
import { initFirebase } from './lib/firebase.js'
import { log } from './lib/logger.js'
import { sign, verify } from './lib/jwt.js'
import { transitionTask, transitionRun, failRunWithError } from './transitions.js'
import { generateId } from './lib/crypto.js'
import { attachRequestId, auditTimeline, runTrace, metrics } from './observability.js'
import { hardenAuth } from './security.js'

import agentsRoutes from './routes/agents.js'
import policiesRoutes from './routes/policies.js'
import enforceRoutes from './routes/enforce.js'

const db = initFirebase()
const app = Fastify({ logger: false })

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
function checkRateLimit(ip: string, maxPerMin: number): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) { rateLimitMap.set(ip, { count: 1, resetAt: now + 60000 }); return true }
  if (entry.count >= maxPerMin) return false
  entry.count++; return true
}

// CORS + rate limiting hook
app.addHook('onRequest', async (request, reply) => {
  reply.header('Access-Control-Allow-Origin', '*')
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Agent-Key')
  if (request.method === 'OPTIONS') { reply.code(204).send(); return }
  const ip = (request.headers['x-forwarded-for'] as string || request.ip || '127.0.0.1').split(',')[0].trim()
  if (!checkRateLimit(ip, 200)) { reply.code(429).send({ error: { code: 'rate_limited', message: 'Too many requests' } }) }
})

// Request ID middleware
attachRequestId(app)

// Auth middleware
interface Claims { sub: string; role: string; iat: number; exp: number; jti: string }
async function requireAuth(request: any, reply: any): Promise<Claims | null> {
  const header = (request.headers.authorization || '') as string
  const token = header.startsWith('Bearer ') ? header.substring(7) : null
  if (!token) { reply.code(401).send({ error: { code: 'unauthorized', message: 'missing Authorization header' } }); return null }
  const claims = verify(token)
  if (!claims) { reply.code(401).send({ error: { code: 'unauthorized', message: 'invalid or expired token' } }); return null }
  return claims as Claims
}

function err(reply: any, code: number, category: string, message: string, detail?: Record<string, unknown>) {
  reply.code(code)
  return { error: { code: category, message, ...(detail || {}) } }
}

async function fetchDoc(collection: string, id: string) {
  const snap = await db.collection(collection).doc(id).get()
  return snap.exists ? { id, ...snap.data() } : null
}

// ==================== ENDPOINTS ====================

// POST /auth/login
app.post('/auth/login', async (request, reply) => {
  const { email, password } = (request.body || {}) as { email?: string; password?: string }
  if (!email || !password) return err(reply, 400, 'validation', 'email and password are required')
  try {
    const snap = await db.collection('users').where('email', '==', email).limit(1).get()
    if (snap.empty || password !== 'admin') return err(reply, 401, 'unauthorized', 'invalid credentials')
    const userDoc = snap.docs[0]; const user = { id: userDoc.id, ...userDoc.data() }
    const token = sign({ sub: email, role: (user as any).role || 'org_admin' })
    log.success('login', { user: email })
    return { token, user: { email, role: (user as any).role } }
  } catch (e: any) { return err(reply, 503, 'firestore', 'auth service unavailable') }
})

// POST /task
app.post('/task', async (request, reply) => {
  const claims = await requireAuth(request, reply); if (!claims) return
  const { payload } = (request.body || {}) as { payload?: Record<string, unknown> }
  if (!payload) return err(reply, 400, 'validation', 'payload is required')
  try {
    const docRef = db.collection('tasks').doc()
    const now = new Date().toISOString()
    await docRef.set({ payload, status: 'pending', createdAt: now, updatedAt: now, queuedAt: null, startedAt: null, completedAt: null, failedAt: null, cancelledAt: null, error: null, runCount: 0 })
    log.success('task created', { taskId: docRef.id })
    reply.code(201); return { id: docRef.id, payload, status: 'pending', createdAt: now }
  } catch (e: any) { return err(reply, 503, 'firestore', 'write failed') }
})

// GET /task/:id
app.get('/task/:id', async (request, reply) => {
  const { id } = request.params as { id: string }
  try {
    const doc = await fetchDoc('tasks', id)
    if (!doc) return err(reply, 404, 'not_found', `task ${id} not found`)
    return doc
  } catch (e: any) { return err(reply, 503, 'firestore', 'read failed') }
})

// POST /agent/run
app.post('/agent/run', async (request, reply) => {
  const claims = await requireAuth(request, reply); if (!claims) return
  const { agentId, taskId } = (request.body || {}) as { agentId?: string; taskId?: string }
  if (!agentId || !taskId) return err(reply, 400, 'validation', 'agentId and taskId are required')
  try {
    const agent = await fetchDoc('agents', agentId); if (!agent) return err(reply, 400, 'agent_not_found', `agent ${agentId} not found`)
    const task = await fetchDoc('tasks', taskId) as any; if (!task) return err(reply, 400, 'task_not_found', `task ${taskId} not found`)
    if (task.status !== 'pending') return err(reply, 409, 'conflict', `task ${taskId} is ${task.status}`, { currentStatus: task.status })
    const requestId = generateId('req_', 8)
    await transitionTask(db, taskId, 'queued', {}, requestId)
    const docRef = db.collection('runs').doc(); const now = new Date().toISOString()
    await db.runTransaction(async (tx) => {
      tx.update(db.collection('tasks').doc(taskId), { status: 'running', startedAt: now, updatedAt: now })
      tx.set(docRef, { agentId, taskId, sessionId: `sess_${docRef.id}`, status: 'running', startedAt: now, endedAt: null, error: null, updatedAt: now, createdAt: now, totalActions: 0, allowedActions: 0, deniedActions: 0 })
    })
    await db.collection('tasks').doc(taskId).update({ runCount: (task.runCount || 0) + 1 })
    log.success('run started', { runId: docRef.id, agentId, taskId, requestId })
    reply.code(201); return { id: docRef.id, agentId, taskId, sessionId: `sess_${docRef.id}`, status: 'running', startedAt: now }
  } catch (e: any) { return err(reply, 503, 'firestore', 'write failed') }
})

// POST /run/:id/log
app.post('/run/:id/log', async (request, reply) => {
  const claims = await requireAuth(request, reply); if (!claims) return
  const { id } = request.params as { id: string }
  const { tool, decision, parameters, reason } = (request.body || {}) as any
  if (!tool || !decision) return err(reply, 400, 'validation', 'tool and decision are required')
  const run = await fetchDoc('runs', id) as any; if (!run) return err(reply, 404, 'not_found', `run ${id} not found`)
  if (run.status !== 'running') return err(reply, 409, 'conflict', `run ${id} is ${run.status}`)
  const logRef = db.collection('logs').doc()
  const logDoc = { agentId: run.agentId, runId: id, tool, decision, reason: reason || null, parameters: parameters || {}, timestamp: new Date().toISOString(), requestId: generateId('req_', 8) }
  await db.runTransaction(async (tx) => {
    tx.set(logRef, logDoc)
    tx.update(db.collection('runs').doc(id), { totalActions: run.totalActions + 1, allowedActions: run.allowedActions + (decision === 'allow' ? 1 : 0), deniedActions: run.deniedActions + (decision === 'deny' ? 1 : 0) })
  })
  log.success('action logged', { runId: id, tool, decision })
  reply.code(201); return { id: logRef.id, ...logDoc }
})

// PATCH /run/:id/complete
app.patch('/run/:id/complete', async (request, reply) => {
  const claims = await requireAuth(request, reply); if (!claims) return
  const { id } = request.params as { id: string }
  const requestId = generateId('req_', 8)
  const run = await fetchDoc('runs', id) as any; if (!run) return err(reply, 404, 'not_found', `run ${id} not found`)
  try {
    await transitionRun(db, id, 'completed', {}, requestId)
    if (run.taskId) await transitionTask(db, run.taskId, 'completed', { runId: id }, requestId)
    return { id, status: 'completed', taskId: run.taskId }
  } catch (e: any) { return err(reply, 409, 'conflict', e.message) }
})

// PATCH /run/:id/fail
app.patch('/run/:id/fail', async (request, reply) => {
  const claims = await requireAuth(request, reply); if (!claims) return
  const { id } = request.params as { id: string }
  const { error: runError } = (request.body || {}) as { error?: string }
  const requestId = generateId('req_', 8)
  try {
    await failRunWithError(db, id, runError || 'Unknown error', requestId)
    return { id, status: 'failed' }
  } catch (e: any) { return err(reply, 409, 'conflict', e.message) }
})

// GET /audit
app.get('/audit', async (request, reply) => {
  try {
    const { decision, limit } = (request.query || {}) as { decision?: string; limit?: string }
    let q = db.collection('actionIntents').orderBy('createdAt', 'desc')
    if (decision) q = q.where('decision', '==', decision)
    const snap = await q.limit(parseInt(limit || '20', 10)).get()
    return { data: snap.docs.map(d => ({ id: d.id, ...d.data() })) }
  } catch (e: any) { reply.code(503); return { error: { code: 'firestore', message: 'audit query failed' } } }
})

// GET /sessions, GET /sessions/:id
app.get('/sessions', async (_request, reply) => {
  try { const snap = await db.collection('sessions').orderBy('startedAt', 'desc').limit(20).get(); return { data: snap.docs.map(d => ({ id: d.id, ...d.data() })) } }
  catch (e: any) { reply.code(503); return { error: { code: 'firestore' } } }
})

app.get('/sessions/:id', async (request, reply) => {
  try {
    const id = (request.params as any).id
    const ssn = await db.collection('sessions').doc(id).get(); if (!ssn.exists) { reply.code(404); return { error: { code: 'not_found' } } }
    const runs = await db.collection('runs').where('sessionId', '==', id).get()
    const logs = runs.docs.length > 0 ? await db.collection('logs').where('runId', 'in', runs.docs.map(d => d.id)).get() : { docs: [] }
    return { session: { id, ...ssn.data() }, runs: runs.docs.map(d => ({ id: d.id, ...d.data() })), logs: logs.docs.map(d => ({ id: d.id, ...d.data() })) }
  } catch (e: any) { reply.code(503); return { error: { code: 'firestore' } } }
})

// Register sub-routes, security, observability
agentsRoutes(app, db)
policiesRoutes(app, db)
enforceRoutes(app, db)
hardenAuth(app, db)
auditTimeline(app, db)
runTrace(app, db)
metrics(app, db)

// Start
const PORT = parseInt(process.env.PORT || '3000', 10)
app.listen({ port: PORT }, (listenErr) => {
  if (listenErr) { log.error('server start failed', { error: listenErr.message }); process.exit(1) }
  console.log(`\n  server → http://localhost:${PORT}`)
})
