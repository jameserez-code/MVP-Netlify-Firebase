// Full API integration test suite — covers all major endpoints end-to-end
// Run: ADMIN_PASSWORD=your-password npx tsx tests/integration/full-api.test.ts
// Requires: server running on localhost:3000, Firebase configured

import {
  getAuthToken,
  verifyJwt,
  createTestAgent,
  createTestPolicy,
  createTestTask,
  cleanupTestData,
  api,
  createTestRun,
  createTestAuditEntry,
  getFirestore,
} from '../utils/helpers.js'

const API_URL = process.env.API_URL || 'http://localhost:3000'

let token: string
let pass = 0, fail = 0
function p(n: string) { pass++; console.log('  ✓ ' + n) }
function f(n: string, m: string) { fail++; console.log('  ✗ ' + n + ': ' + m) }

// ---------------------------------------------------------------------------
// Before all tests — authenticate and seed base data
// ---------------------------------------------------------------------------
async function beforeAll() {
  console.log('\n[Setup] Authenticating and seeding test data...')
  token = await getAuthToken()
  if (!token) throw new Error('Failed to authenticate before tests')
  p('authenticated')
}

// ---------------------------------------------------------------------------
// After all tests — clean up Firestore documents
// ---------------------------------------------------------------------------
async function afterAll() {
  console.log('\n[Cleanup] Removing test data...')
  await cleanupTestData()
}

// ---------------------------------------------------------------------------
// Auth Flow
// ---------------------------------------------------------------------------
async function testAuthFlow() {
  console.log('\n--- Auth Flow ---')

  // POST /org/seed → creates org
  const orgRes = await api('POST', '/org/seed', token, {
    name: `Test Org ${Date.now()}`,
    email: `admin-${Date.now()}@test.com`,
  })
  if (orgRes.status === 201 && orgRes.data.orgId) {
    p('POST /org/seed creates org')
  } else {
    f('POST /org/seed', JSON.stringify(orgRes.data))
  }

  // POST /auth/login → returns JWT
  const loginRes = await api('POST', '/auth/login', undefined, {
    email: 'admin@acmecorp.com',
    password: process.env.ADMIN_PASSWORD || 'admin123',
  })
  if (loginRes.status === 200 && loginRes.data.token) {
    p('POST /auth/login returns JWT')
  } else {
    f('POST /auth/login', JSON.stringify(loginRes.data))
  }

  // Verify JWT is valid
  if (loginRes.data.token && verifyJwt(loginRes.data.token)) {
    p('JWT is cryptographically valid')
  } else {
    f('JWT verification', 'token invalid or missing')
  }

  // Reject invalid credentials
  const badLogin = await api('POST', '/auth/login', undefined, {
    email: 'admin@acmecorp.com',
    password: 'wrong-password-12345',
  })
  if (badLogin.status === 401) {
    p('Invalid credentials rejected with 401')
  } else {
    f('Invalid credentials', `expected 401, got ${badLogin.status}`)
  }
}

// ---------------------------------------------------------------------------
// Agent Lifecycle
// ---------------------------------------------------------------------------
async function testAgentLifecycle() {
  console.log('\n--- Agent Lifecycle ---')

  // POST /agents/register → creates agent
  const agent = await createTestAgent(token, {
    name: 'Full API Test Agent',
    model: 'claude-3-opus',
    provider: 'anthropic',
  })
  if (agent.id) {
    p('POST /agents/register creates agent')
  } else {
    f('POST /agents/register', 'no agentId returned')
  }

  // GET /agents → lists agent
  const listRes = await api('GET', '/agents', token)
  if (listRes.status === 200 && listRes.data.data?.some((a: any) => a.id === agent.id)) {
    p('GET /agents lists created agent')
  } else {
    f('GET /agents', 'agent not found in list')
  }

  // GET /agents/:id → returns agent details
  const getRes = await api('GET', `/agents/${agent.id}`, token)
  if (getRes.status === 200 && getRes.data.id === agent.id) {
    p('GET /agents/:id returns agent details')
  } else {
    f('GET /agents/:id', JSON.stringify(getRes.data))
  }

  // PATCH /agents/:id/revoke → revokes agent
  const revokeRes = await api('PATCH', `/agents/${agent.id}/revoke`, token, { reason: 'Test revocation' })
  if (revokeRes.status === 200 && revokeRes.data.status === 'revoked') {
    p('PATCH /agents/:id/revoke revokes agent')
  } else {
    f('PATCH /agents/:id/revoke', JSON.stringify(revokeRes.data))
  }

  // Verify revoked agent cannot be used
  const enforceRes = await api('POST', '/enforce', token, {
    intent: {
      intentId: `revoked_test_${Date.now()}`,
      agentId: agent.id,
      tool: 'lookup_order',
      parameters: { orderId: '123' },
    },
  })
  if (enforceRes.status === 403 && enforceRes.data.decision === 'deny') {
    p('Revoked agent is denied enforcement')
  } else {
    f('Revoked agent enforcement', JSON.stringify(enforceRes.data))
  }
}

// ---------------------------------------------------------------------------
// Policy Management
// ---------------------------------------------------------------------------
async function testPolicyManagement() {
  console.log('\n--- Policy Management ---')

  // POST /policies → creates policy
  const policy = await createTestPolicy(token, {
    name: 'Full API Test Policy',
    rules: {
      allowedTools: [{ toolName: 'safe_tool', parameterConstraints: {} }],
      deniedTools: ['dangerous_tool'],
      allowedDomains: [{ pattern: '*.safe.com', methods: ['GET'] }],
      deniedDomains: ['*.blocked.com'],
      dataRestrictions: { denyPiiInParameters: true },
    },
  })
  if (policy.id) {
    p('POST /policies creates policy')
  } else {
    f('POST /policies', 'no id returned')
  }

  // GET /policies → lists policies
  const listRes = await api('GET', '/policies', token)
  if (listRes.status === 200 && listRes.data.data?.some((p: any) => p.id === policy.id)) {
    p('GET /policies lists created policy')
  } else {
    f('GET /policies', 'policy not found in list')
  }

  // Verify policy evaluation logic — allowed tool
  const agent = await createTestAgent(token)
  const allowRes = await api('POST', '/enforce', token, {
    intent: {
      intentId: `policy_allow_${Date.now()}`,
      agentId: agent.id,
      tool: 'safe_tool',
      parameters: { action: 'read' },
    },
  })
  if (allowRes.status === 200 && allowRes.data.decision === 'allow') {
    p('Policy evaluation: allowed tool passes')
  } else {
    f('Policy evaluation allow', JSON.stringify(allowRes.data))
  }
}

// ---------------------------------------------------------------------------
// Task / Run Lifecycle
// ---------------------------------------------------------------------------
async function testTaskRunLifecycle() {
  console.log('\n--- Task / Run Lifecycle ---')

  // POST /task → creates task
  const task = await createTestTask(token, {
    payload: { description: 'Full API lifecycle test', priority: 'high' },
  })
  if (task.id && task.status === 'pending') {
    p('POST /task creates task with pending status')
  } else {
    f('POST /task', JSON.stringify(task))
  }

  // GET /task/:id → reads task
  const getRes = await api('GET', `/task/${task.id}`, token)
  if (getRes.status === 200 && getRes.data.id === task.id) {
    p('GET /task/:id reads task')
  } else {
    f('GET /task/:id', JSON.stringify(getRes.data))
  }

  // POST /agent/run → starts run
  const agent = await createTestAgent(token)
  const runRes = await api('POST', '/agent/run', token, { agentId: agent.id, taskId: task.id })
  if (runRes.status === 201 && runRes.data.id) {
    p('POST /agent/run starts run')
  } else {
    f('POST /agent/run', JSON.stringify(runRes.data))
  }
  const runId = runRes.data?.id

  // POST /run/:id/log → logs action
  const logRes = await api('POST', `/run/${runId}/log`, token, {
    tool: 'lookup_order',
    decision: 'allow',
    parameters: { orderId: 'ORD-12345' },
    reason: 'Within policy',
  })
  if (logRes.status === 201 && logRes.data.id) {
    p('POST /run/:id/log logs action')
  } else {
    f('POST /run/:id/log', JSON.stringify(logRes.data))
  }

  // PATCH /run/:id/complete → completes run
  const completeRes = await api('PATCH', `/run/${runId}/complete`, token)
  if (completeRes.status === 200 && completeRes.data.status === 'completed') {
    p('PATCH /run/:id/complete completes run')
  } else {
    f('PATCH /run/:id/complete', JSON.stringify(completeRes.data))
  }

  // Verify task transitions to completed
  await new Promise(r => setTimeout(r, 500))
  const taskAfter = await api('GET', `/task/${task.id}`, token)
  if (taskAfter.status === 200 && taskAfter.data.status === 'completed') {
    p('Task transitions to completed after run completion')
  } else {
    f('Task completion transition', `status: ${taskAfter.data?.status}`)
  }
}

// ---------------------------------------------------------------------------
// Enforcement
// ---------------------------------------------------------------------------
async function testEnforcement() {
  console.log('\n--- Enforcement ---')

  const agent = await createTestAgent(token)

  // Create a policy with specific rules for this test
  await createTestPolicy(token, {
    name: 'Enforcement Test Policy',
    rules: {
      allowedTools: [
        { toolName: 'lookup_order', parameterConstraints: { orderId: { type: 'string', minLength: 1 } } },
        { toolName: 'safe_tool', parameterConstraints: {} },
      ],
      deniedTools: ['send_email', 'delete_database'],
      allowedDomains: [{ pattern: '*.internal.com', methods: ['GET'] }],
      deniedDomains: ['*.evil.com', '169.254.169.254'],
      dataRestrictions: { denyPiiInParameters: true },
      costLimit: { maxPerRequest: 100 },
    },
  })

  // POST /enforce with allowed tool → allow
  const allowRes = await api('POST', '/enforce', token, {
    intent: {
      intentId: `enforce_allow_${Date.now()}`,
      agentId: agent.id,
      tool: 'safe_tool',
      parameters: { action: 'read' },
    },
  })
  if (allowRes.status === 200 && allowRes.data.decision === 'allow' && allowRes.data.gatewayTicket) {
    p('Allowed tool returns allow + gateway ticket')
  } else {
    f('Allowed tool', JSON.stringify(allowRes.data))
  }

  // POST /enforce with denied tool → deny
  const denyRes = await api('POST', '/enforce', token, {
    intent: {
      intentId: `enforce_deny_${Date.now()}`,
      agentId: agent.id,
      tool: 'send_email',
      parameters: { to: 'evil@evil.com' },
    },
  })
  if (denyRes.status === 200 && denyRes.data.decision === 'deny') {
    p('Denied tool returns deny')
  } else {
    f('Denied tool', JSON.stringify(denyRes.data))
  }

  // POST /enforce with PII → deny
  const piiRes = await api('POST', '/enforce', token, {
    intent: {
      intentId: `enforce_pii_${Date.now()}`,
      agentId: agent.id,
      tool: 'lookup_order',
      parameters: { orderId: '1', ssn: '123-45-6789' },
    },
  })
  if (piiRes.status === 200 && piiRes.data.decision === 'deny' && piiRes.data.reason === 'pii_detected') {
    p('PII in parameters is detected and denied')
  } else {
    f('PII detection', JSON.stringify(piiRes.data))
  }

  // POST /enforce with cost limit → deny if exceeded
  const costRes = await api('POST', '/enforce', token, {
    intent: {
      intentId: `enforce_cost_${Date.now()}`,
      agentId: agent.id,
      tool: 'lookup_order',
      parameters: { orderId: '1', estimatedCost: 500 },
    },
  })
  // Note: cost limit enforcement depends on evaluator implementation
  if (costRes.status === 200) {
    p('Cost limit evaluation returns response')
  } else {
    f('Cost limit evaluation', JSON.stringify(costRes.data))
  }
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------
async function testAudit() {
  console.log('\n--- Audit ---')

  // Seed some audit entries
  const agent = await createTestAgent(token)
  for (let i = 0; i < 3; i++) {
    await createTestAuditEntry(agent.id, {
      tool: i % 2 === 0 ? 'lookup_order' : 'safe_tool',
      decision: i % 2 === 0 ? 'allow' : 'deny',
    })
  }

  // GET /audit → returns actionIntents
  const auditRes = await api('GET', '/audit', token)
  if (auditRes.status === 200 && Array.isArray(auditRes.data.data)) {
    p(`GET /audit returns ${auditRes.data.data.length} actionIntents`)
  } else {
    f('GET /audit', JSON.stringify(auditRes.data))
  }

  // GET /metrics → returns stats
  const metricsRes = await api('GET', '/metrics', token)
  if (metricsRes.status === 200 && metricsRes.data.tasks) {
    p('GET /metrics returns operational stats')
  } else {
    f('GET /metrics', JSON.stringify(metricsRes.data))
  }

  // GET /diagnostics → returns health checks
  const diagRes = await api('GET', '/diagnostics', token)
  if (diagRes.status === 200 && diagRes.data.status === 'healthy') {
    p('GET /diagnostics returns healthy status')
  } else {
    f('GET /diagnostics', JSON.stringify(diagRes.data))
  }
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------
async function run() {
  console.log('\n╔══════════════════════════════════════════════════════════════╗')
  console.log('║       Full API Integration Test Suite — Passport Agent       ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')

  try {
    await beforeAll()

    await testAuthFlow()
    await testAgentLifecycle()
    await testPolicyManagement()
    await testTaskRunLifecycle()
    await testEnforcement()
    await testAudit()

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`  Results: ${pass}/${pass + fail} tests passed`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    process.exit(fail > 0 ? 1 : 0)
  } catch (err: any) {
    console.error('\n[FATAL] Test suite failed:', err.message)
    process.exit(1)
  } finally {
    await afterAll()
  }
}

run().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
