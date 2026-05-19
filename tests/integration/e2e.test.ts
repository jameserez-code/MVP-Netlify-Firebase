// E2E integration tests — full lifecycle scenarios
// Run: ADMIN_PASSWORD=your-password npx tsx tests/integration/e2e.test.ts
// Requires: demo server running on localhost:3000

const API = 'http://localhost:3000'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
if (!ADMIN_PASSWORD) {
  console.error('\n[ERROR] ADMIN_PASSWORD environment variable is required.')
  console.error('Set it to the admin password configured on the server.')
  console.error('Example: ADMIN_PASSWORD=your-password npx tsx tests/integration/e2e.test.ts\n')
  process.exit(1)
}

let token = ''
let pass = 0, fail = 0
function p(n: string) { pass++; console.log('  ✓ ' + n) }
function f(n: string, m: string) { fail++; console.log('  ✗ ' + n + ': ' + m) }

async function api(method: string, path: string, body?: any) {
  const opts: any = { method, headers: { 'Content-Type': 'application/json' } }
  if (token) opts.headers['Authorization'] = 'Bearer ' + token
  if (body) opts.body = JSON.stringify(body)
  try { const r = await fetch(API + path, opts); return await r.json() }
  catch (e: any) { return { error: { code: 'network', message: e.message } } }
}

async function run() {
  console.log('\nE2E Lifecycle Tests\n')

  // 1. Login
  const login = await api('POST', '/auth/login', { email: 'admin@acmecorp.com', password: ADMIN_PASSWORD })
  if (login.token) { token = login.token; p('login') } else { f('login', JSON.stringify(login)); return }

  // 2. Health check
  const health = await api('GET', '/health')
  if (health.status) p('health: ' + health.status)
  else f('health', JSON.stringify(health))

  // 3. Register agent
  const agent = await api('POST', '/agents/register', { name: 'E2E Test Agent', model: 'gpt-4o', provider: 'openai' })
  if (agent.agentId) p('agent registered')
  else f('agent', JSON.stringify(agent))

  const agentId = agent.agentId || 'agent_demo'

  // 4. Create policy
  const pol = await api('POST', '/policies', {
    name: 'E2E Policy', priority: 1, scope: { agentId },
    rules: {
      allowedTools: [{ toolName: 'lookup_order', parameterConstraints: { orderId: { type: 'string', minLength: 1 } } }],
      deniedTools: ['send_email'],
      allowedDomains: [{ pattern: '*.internal.com', methods: ['GET'] }],
      deniedDomains: ['*.evil.com', '169.254.169.254'],
      dataRestrictions: { denyPiiInParameters: true },
    },
  })
  if (pol.id) p('policy created')
  else f('policy', JSON.stringify(pol))

  // 5. Create task → wait for worker → verify completion
  const task = await api('POST', '/task', { payload: { description: 'E2E test', testId: Date.now() } })
  if (task.id) p('task created: ' + task.id.substring(0, 12))
  else { f('task', JSON.stringify(task)); return }

  // Wait for worker
  await new Promise(r => setTimeout(r, 8000))

  const taskAfter = await api('GET', '/task/' + task.id)
  if (taskAfter.status === 'completed') p('task completed by worker')
  else { f('task status', taskAfter.status); return }

  // 6. Timeline has events
  const tl = await api('GET', '/audit/timeline?limit=20')
  if (tl.timeline && tl.timeline.length > 0) p(`timeline: ${tl.timeline.length} events`)
  else f('timeline', 'no events')

  // 7. Explain works
  const explain = await api('GET', `/explain/${task.id}`)
  if (explain.explainable && explain.summary.totalSteps > 0) p(`explain: ${explain.summary.totalSteps} steps, ${explain.summary.denied} denied`)
  else f('explain', JSON.stringify(explain))

  // 8. Metrics
  const m = await api('GET', '/metrics')
  if (m.tasks && m.tasks.total > 0) p(`metrics: ${m.tasks.total} tasks`)
  else f('metrics', JSON.stringify(m))

  // 9. Diagnostics
  const diag = await api('GET', '/diagnostics')
  if (diag.status === 'healthy') p('diagnostics healthy')
  else f('diagnostics', JSON.stringify(diag))

  // 10. Report
  const report = await api('GET', '/report')
  if (report.summary) p(`report: ${report.summary.totalTasks} tasks, ${report.summary.failed} failed`)
  else f('report', JSON.stringify(report))

  console.log(`\n${pass}/${pass + fail} tests passed\n`)
  process.exit(fail > 0 ? 1 : 0)
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1) })
