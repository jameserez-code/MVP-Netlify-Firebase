import Fastify from 'fastify'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { initFirebase } from './lib/firebase.js'
import { log } from './lib/logger.js'
import { sign, verify } from './lib/jwt.js'
import { transitionTask, transitionRun, failRunWithError } from './transitions.js'
import { generateId } from './lib/crypto.js'
import { attachRequestId, auditTimeline, runTrace, metrics } from './observability.js'
import { hardenAuth } from './security.js'
import { systemDiagnostics, checkConsistency, repairOrphanedRuns, repairStuckTasks, generateReport } from './diagnostics.js'
import { checkCapability, seedOrg, getOrgMetrics } from './capabilities.js'
import { verifyPassword } from './lib/password.js'
import { registerValidationHooks } from './lib/input-validation.js'
import { validateEnv } from './lib/env.js'

import agentsRoutes from './routes/agents.js'
import policiesRoutes from './routes/policies.js'
import enforceRoutes from './routes/enforce.js'

// Validate environment before starting
validateEnv()

const db = initFirebase()
const app = Fastify({ logger: false })

// Input validation + secure headers
registerValidationHooks(app)

// Rate limiting — per-IP sliding window, endpoint-specific limits
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const ENDPOINT_LIMITS: Record<string, number> = {
  '/auth/login': 20,        // prevent credential brute-force
  '/enforce': 100,          // enforcement in hot path but per-agent
  '/gateway/execute': 50,   // gateway execution — sensitive
  default: 200,             // general API limit
}

function getEndpointLimit(path: string): number {
  for (const [prefix, limit] of Object.entries(ENDPOINT_LIMITS)) {
    if (path.startsWith(prefix)) return limit
  }
  return ENDPOINT_LIMITS.default
}

const ipBurstMap = new Map<string, number>()
function isBurstAttack(ip: string): boolean {
  const now = Date.now()
  const count = (ipBurstMap.get(ip) || 0) + 1
  ipBurstMap.set(ip, count)
  // Reset every 10 seconds
  if (count > 50) {
    setTimeout(() => ipBurstMap.delete(ip), 10_000)
    return true
  }
  setTimeout(() => ipBurstMap.set(ip, (ipBurstMap.get(ip) || 1) - 1), 10_000)
  return false
}

function checkRateLimit(ip: string, path: string): boolean {
  if (isBurstAttack(ip)) return false
  const limit = getEndpointLimit(path)
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) { rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 }); return true }
  if (entry.count >= limit) return false
  entry.count++; return true
}

// CORS + rate limiting hook
const isDev = process.env.NODE_ENV !== 'production'
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : []

app.addHook('onRequest', async (request, reply) => {
  const origin = (request.headers.origin as string) || ''
  if (isDev) {
    reply.header('Access-Control-Allow-Origin', '*')
  } else if (allowedOrigins.includes(origin)) {
    reply.header('Access-Control-Allow-Origin', origin)
  }
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Agent-Key')
  if (request.method === 'OPTIONS') { reply.code(204).send(); return }
  const ip = (request.headers['x-forwarded-for'] as string || request.ip || '127.0.0.1').split(',')[0].trim()
  if (!checkRateLimit(ip, request.url)) { reply.code(429).send({ error: { code: 'rate_limited', message: 'Too many requests' } }) }
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

// GET / — root (live mini-dashboard)
app.get('/', async (_request, reply) => {
  reply.header('Content-Type', 'text/html')
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Passport Agent</title>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Geist,sans-serif;background:#0d1117;color:#c9d1d9;min-height:100vh;overflow-x:hidden}
body::after{content:"";position:fixed;inset:0;background:linear-gradient(to bottom,transparent 50%,rgba(46,160,67,.008) 50%);background-size:100% 4px;pointer-events:none;z-index:9999}
header{background:rgba(13,17,23,.92);backdrop-filter:blur(20px);border-bottom:1px solid rgba(46,160,67,.15);position:sticky;top:0;z-index:100;padding:14px 32px;display:flex;justify-content:space-between;align-items:center}
h1{font-family:"JetBrains Mono",monospace;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#2ea043;text-shadow:0 0 12px rgba(46,160,67,.3)}
.status{display:flex;align-items:center;gap:8px;font-family:"JetBrains Mono",monospace;font-size:11px;color:#8b949e}
.status-dot{width:8px;height:8px;border-radius:50%;background:#2ea043;box-shadow:0 0 6px rgba(46,160,67,.5);animation:pulse 2s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes countIn{from{opacity:0}to{opacity:1}}
@keyframes borderPulse{0%,100%{border-color:rgba(46,160,67,.15)}50%{border-color:rgba(46,160,67,.35)}}
.card{background:rgba(22,27,34,.7);border:1px solid rgba(48,54,61,.5);border-radius:6px;padding:18px 20px;transition:all .2s ease;animation:slideUp .4s ease both}
.card:hover{border-color:rgba(46,160,67,.25);transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.3)}
.card:nth-child(1){animation-delay:.05s}.card:nth-child(2){animation-delay:.1s}.card:nth-child(3){animation-delay:.15s}.card:nth-child(4){animation-delay:.2s}.card:nth-child(5){animation-delay:.25s}.card:nth-child(6){animation-delay:.3s}
.card-label{font-family:"JetBrains Mono",monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#8b949e;margin-bottom:8px}
.card-value{font-family:"JetBrains Mono",monospace;font-size:28px;font-weight:700;animation:countIn .6s ease}
.link-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:rgba(46,160,67,.06);border:1px solid rgba(46,160,67,.15);border-radius:4px;font-family:"JetBrains Mono",monospace;font-size:11px;color:#2ea043;text-decoration:none;transition:all .2s ease}
.link-btn:hover{background:rgba(46,160,67,.12);border-color:rgba(46,160,67,.35);box-shadow:0 0 12px rgba(46,160,67,.1);transform:translateY(-1px)}
.link-btn-secondary{border-color:rgba(48,54,61,.4);color:#8b949e}
.link-btn-secondary:hover{border-color:rgba(139,148,158,.3);color:#c9d1d9}
.shimmer-bar{position:fixed;top:0;left:0;width:100%;height:2px;background:linear-gradient(90deg,transparent,#2ea043,transparent);background-size:200% 100%;animation:shimmer 3s infinite linear;z-index:200}
.endpoint-table td{transition:background .15s}
.endpoint-table tr:hover td{background:rgba(46,160,67,.03)}
.method-tag{transition:transform .15s}
tr:hover .method-tag{transform:scale(1.1)}
.endpoint-table{width:100%;border-collapse:collapse;font-family:"JetBrains Mono",monospace;font-size:12px}
.endpoint-table th{text-align:left;padding:8px 14px;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#8b949e;border-bottom:1px solid rgba(48,54,61,.3);font-weight:600}
.endpoint-table td{padding:7px 14px;border-bottom:1px solid rgba(48,54,61,.15);color:#c9d1d9}
.method-tag{display:inline-block;width:44px;text-align:center;padding:2px 0;border-radius:3px;font-size:10px;font-weight:700;letter-spacing:1px}
.g{background:rgba(46,160,67,.12);color:#2ea043}.p{background:rgba(210,153,29,.12);color:#d2991d}.pt{background:rgba(88,166,255,.12);color:#58a6ff}
.auth-yes{color:#2ea043;font-size:10px}.auth-no{color:#484f58;font-size:10px}
.path-mono{color:#c9d1d9}.desc-cell{color:#8b949e;font-size:11px}
.refresh{font-family:"JetBrains Mono",monospace;font-size:10px;color:#484f58}
footer{text-align:center;padding:24px;font-family:"JetBrains Mono",monospace;font-size:10px;color:#30363d}
</style></head><body>
<div class="shimmer-bar"></div>
<header>
<h1>Passport Agent</h1>
<div class="status"><span class="status-dot" id="dot"></span><span id="statusText">initializing</span></div>
</header>
<main>
<div class="grid" id="stats"></div>
<div class="section">
<div class="section-title">Console Pages</div>
<div class="link-row">
<a class="link-btn" href="/landing.html">&#9654; Landing</a>
<a class="link-btn" href="/operator.html">&#9632; Operator Console</a>
<a class="link-btn" href="/agents.html">&#9783; Agent Manager</a>
<a class="link-btn" href="/admin-portal.html">&#9881; Admin Portal</a>
<a class="link-btn" href="/dev-dashboard.html">&#9776; Dev Dashboard</a>
<a class="link-btn link-btn-secondary" href="/sdk-demo.html">SDK Demo</a>
<a class="link-btn link-btn-secondary" href="/verify-demo.html">Verify Demo</a>
</div>
</div>
<div class="section">
<div class="section-title">API Endpoints</div>
<table class="endpoint-table">
<tr><th></th><th>Path</th><th>Auth</th><th>Purpose</th></tr>
<tr><td><span class="method-tag p">POST</span></td><td class="path-mono">/auth/login</td><td class="auth-no">—</td><td class="desc-cell">Get JWT token</td></tr>
<tr><td><span class="method-tag p">POST</span></td><td>/task</td><td class="auth-yes">JWT</td><td class="desc-cell">Create task</td></tr>
<tr><td><span class="method-tag g">GET</span></td><td>/task/:id</td><td class="auth-no">—</td><td class="desc-cell">Read task</td></tr>
<tr><td><span class="method-tag p">POST</span></td><td>/agent/run</td><td class="auth-yes">JWT</td><td class="desc-cell">Start run</td></tr>
<tr><td><span class="method-tag p">POST</span></td><td>/run/:id/log</td><td class="auth-yes">JWT</td><td class="desc-cell">Log action</td></tr>
<tr><td><span class="method-tag pt">PATCH</span></td><td>/run/:id/complete</td><td class="auth-yes">JWT</td><td class="desc-cell">Complete run</td></tr>
<tr><td><span class="method-tag pt">PATCH</span></td><td>/run/:id/fail</td><td class="auth-yes">JWT</td><td class="desc-cell">Fail run</td></tr>
<tr><td><span class="method-tag p">POST</span></td><td>/agents/register</td><td class="auth-yes">JWT</td><td class="desc-cell">Register agent</td></tr>
<tr><td><span class="method-tag g">GET</span></td><td>/agents</td><td class="auth-no">—</td><td class="desc-cell">List agents</td></tr>
<tr><td><span class="method-tag p">POST</span></td><td>/policies</td><td class="auth-yes">JWT</td><td class="desc-cell">Create policy</td></tr>
<tr><td><span class="method-tag g">GET</span></td><td>/policies</td><td class="auth-no">—</td><td class="desc-cell">List policies</td></tr>
<tr><td><span class="method-tag p">POST</span></td><td>/enforce</td><td class="auth-yes">JWT</td><td class="desc-cell">Evaluate intent</td></tr>
<tr><td><span class="method-tag p">POST</span></td><td>/gateway/execute</td><td class="auth-no">—</td><td class="desc-cell">Execute with ticket</td></tr>
<tr><td><span class="method-tag g">GET</span></td><td>/audit</td><td class="auth-no">—</td><td class="desc-cell">Query intents</td></tr>
<tr><td><span class="method-tag g">GET</span></td><td>/metrics</td><td class="auth-no">—</td><td class="desc-cell">Operational metrics</td></tr>
<tr><td><span class="method-tag g">GET</span></td><td>/diagnostics</td><td class="auth-no">—</td><td class="desc-cell">System health</td></tr>
</table>
</div>
<div class="refresh">auto-refreshing every 10s</div>
</main>
<footer>Passport Agent v2.0 &middot; 2 runtime deps &middot; 18 endpoints &middot; Zero frameworks</footer>
<script>
function countUp(el,target){if(!el)return;var cur=parseInt(el.textContent)||0;if(cur===target)return;var step=Math.ceil(Math.abs(target-cur)/20);if(step<1)step=1;var go=function(){cur+=step;if((step>0&&cur>=target)||(step<0&&cur<=target)){el.textContent=target;return}el.textContent=cur;requestAnimationFrame(go)};go()}
async function refresh(){try{var r=await fetch("/metrics"),d=await r.json();if(!d.error){var t=d.tasks||{},ra=d.runs||{},ag=d.agents||{};
document.getElementById("stats").innerHTML=
'<div class=card><div class=card-label>Total Tasks</div><div class="card-value val-green" id=tTotal>0</div></div>'+
'<div class=card><div class=card-label>Pending</div><div class="card-value val-amber" id=tPending>0</div></div>'+
'<div class=card><div class=card-label>Active</div><div class="card-value val-cyan" id=tActive>0</div></div>'+
'<div class=card><div class=card-label>Failed</div><div class="card-value val-red" id=tFailed>0</div></div>'+
'<div class=card><div class=card-label>Active Runs</div><div class="card-value val-white" id=tRuns>0</div></div>'+
'<div class=card><div class=card-label>Active Agents</div><div class="card-value val-white" id=tAgents>0</div></div>';
countUp(document.getElementById("tTotal"),t.total||0);countUp(document.getElementById("tPending"),t.pending||0);
countUp(document.getElementById("tActive"),t.active||0);countUp(document.getElementById("tFailed"),t.failed||0);
countUp(document.getElementById("tRuns"),ra.active||0);countUp(document.getElementById("tAgents"),ag.active||0);
document.getElementById("dot").style.background="#2ea043";document.getElementById("statusText").textContent="healthy"}}catch(e){document.getElementById("dot").style.background="#f85149";document.getElementById("statusText").textContent="offline"}}
refresh();setInterval(refresh,10000)
</script></body></html>`
})

// GET /health — liveness probe (no auth)
app.get('/health', async (_request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// POST /auth/login
app.post('/auth/login', async (request, reply) => {
  const { email, password } = (request.body || {}) as { email?: string; password?: string }
  if (!email || !password) return err(reply, 400, 'validation', 'email and password are required')
  try {
    const snap = await db.collection('users').where('email', '==', email).limit(1).get()

    // Check against stored PBKDF2 hash
    let authenticated = false
    if (!snap.empty) {
      const userData = snap.docs[0].data() as any
      if (userData.passwordHash && userData.passwordSalt) {
        authenticated = verifyPassword(password, userData.passwordHash, userData.passwordSalt)
      }
    }

    if (!authenticated) return err(reply, 401, 'unauthorized', 'invalid credentials')
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

// GET /diagnostics — full system health
app.get('/diagnostics', async (_req, reply) => {
  try { return await systemDiagnostics(db) }
  catch (e: any) { reply.code(500); return { error: { code: 'diagnostics_failed', message: e.message } } }
})

// GET /consistency — detect bad states
app.get('/consistency', async (_req, reply) => {
  try { return await checkConsistency(db) }
  catch (e: any) { reply.code(500); return { error: { code: 'consistency_failed', message: e.message } } }
})

// POST /repair — safely repair common inconsistency
app.post('/repair', async (request, reply) => {
  const claims = await requireAuth(request, reply); if (!claims) return
  const { action } = (request.body || {}) as { action?: string }
  try {
    if (action === 'orphaned') return await repairOrphanedRuns(db)
    if (action === 'stuck') return await repairStuckTasks(db)
    return { repaired: 0, message: 'Specify action: "orphaned" or "stuck"' }
  } catch (e: any) { reply.code(500); return { error: { code: 'repair_failed', message: e.message } } }
})

// GET /report — operational summary
app.get('/report', async (_req, reply) => {
  try { return await generateReport(db) }
  catch (e: any) { reply.code(500); return { error: { code: 'report_failed', message: e.message } } }
})

// POST /org/seed — create isolated demo org
app.post('/org/seed', async (request, reply) => {
  const claims = await requireAuth(request, reply); if (!claims) return
  const { name, email } = (request.body || {}) as { name?: string; email?: string }
  if (!name || !email) return err(reply, 400, 'validation', 'name and email are required')
  try {
    const result = await seedOrg(db, name, email)
    reply.code(201); return result
  } catch (e: any) { reply.code(500); return { error: { code: 'seed_failed', message: e.message } } }
})

// GET /org/metrics — org-scoped metrics
app.get('/org/metrics', async (request, reply) => {
  const { orgId } = (request.query || {}) as { orgId?: string }
  if (!orgId) return err(reply, 400, 'validation', 'orgId query parameter required')
  try { return await getOrgMetrics(db, orgId) }
  catch (e: any) { reply.code(500); return { error: { code: 'metrics_failed', message: e.message } } }
})

// Register sub-routes, security, observability
agentsRoutes(app, db)
policiesRoutes(app, db)
enforceRoutes(app, db)
hardenAuth(app, db)
auditTimeline(app, db)
runTrace(app, db)
metrics(app, db)

// Serve static HTML files (catch-all for unmatched GETs)
app.get('/*', async (request, reply) => {
  const url = (request.url || '/').split('?')[0]
  const staticFiles = ['index.html', 'landing.html', 'operator.html', 'admin-portal.html',
    'agents.html', 'dev-dashboard.html', 'verify-demo.html', 'sdk-demo.html']
  if (staticFiles.includes(url.substring(1))) {
    try {
      const path = resolve(process.cwd(), url.substring(1))
      if (existsSync(path)) {
        reply.header('Content-Type', 'text/html')
        return readFileSync(path, 'utf-8')
      }
    } catch {}
  }
  reply.code(404).send({ error: { code: 'not_found', message: `Route ${request.method}:${url} not found` } })
})

// Start
const PORT = parseInt(process.env.PORT || '3000', 10)
const HOST = '0.0.0.0'
app.listen({ port: PORT, host: HOST }, (listenErr) => {
  if (listenErr) { log.error('server start failed', { error: listenErr.message }); process.exit(1) }
  console.log(`\n  server → http://${HOST}:${PORT}`)
})
