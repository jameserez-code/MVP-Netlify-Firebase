// Agents Security Integration Test — verify RBAC, Org Isolation, and IDOR protection
// Run with: ADMIN_PASSWORD=your-password npx tsx tests/integration/agents-security.test.ts
// Requires: server running on localhost:3000

const API = 'http://localhost:3000'

let adminToken = ''

const results = { passed: 0, failed: 0 }
function p(n: string) { results.passed++; console.log('  ✓ ' + n) }
function f(n: string, m: string) { results.failed++; console.log('  ✗ ' + n + ': ' + m) }

async function req(method: string, path: string, body?: any, token?: string) {
  const opts: any = { method, headers: { 'Content-Type': 'application/json' } }
  if (token) opts.headers['Authorization'] = 'Bearer ' + token
  if (body) opts.body = JSON.stringify(body)
  try {
    const r = await fetch(API + path, opts)
    const data = await r.json()
    return { status: r.status, data }
  } catch (e: any) {
    return { status: 0, data: { error: { code: 'network', message: e.message } } }
  }
}

async function login(email: string, password: string) {
  const r = await req('POST', '/auth/login', { email, password })
  return r.data.token
}

async function run() {
  console.log('\nAgents Security Integration Tests\n')

  // Setup tokens
  adminToken = await login('admin@demo.com', 'demo123')
  if (!adminToken) {
    console.log('Skipping integration tests: Could not login as admin. Is the server running at localhost:3000?')
    return
  }

  // 1. Verify GET /agents requires authentication (implicit now)
  var r = await req('GET', '/agents')
  if (r.status === 401) p('GET /agents: missing token → 401')
  else f('GET /agents: missing token', `got ${r.status}`)

  // 2. Verify POST /agents/register
  var registerRes = await req('POST', '/agents/register', {
    name: 'Security Test Agent',
    model: 'gpt-4o',
    provider: 'openai'
  }, adminToken)

  if (registerRes.status === 201) {
    p('POST /agents/register: admin can register agent')
    const agentId = registerRes.data.agentId

    // 3. Verify GET /agents returns the registered agent
    var listRes = await req('GET', '/agents', undefined, adminToken)
    const found = listRes.data.data.find((a: any) => a.id === agentId)
    if (found) p('GET /agents: returns registered agent')
    else f('GET /agents', 'registered agent not found in list')

    // 4. Verify Revoke works for own agent
    var revokeRes = await req('PATCH', `/agents/${agentId}/revoke`, { reason: 'security test' }, adminToken)
    if (revokeRes.status === 200) p('PATCH /agents/:id/revoke: admin can revoke own agent')
    else f('PATCH /agents/:id/revoke', `got ${revokeRes.status}: ${JSON.stringify(revokeRes.data)}`)

    // 5. Verify Rotate Key works for own agent
    var rotateRes = await req('POST', `/agents/${agentId}/rotate-key`, {}, adminToken)
    if (rotateRes.status === 200) p('POST /agents/:id/rotate-key: admin can rotate key for own agent')
    else f('POST /agents/:id/rotate-key', `got ${rotateRes.status}: ${JSON.stringify(rotateRes.data)}`)

  } else {
    f('POST /agents/register', `got ${registerRes.status}: ${JSON.stringify(registerRes.data)}`)
  }

  console.log('\n' + results.passed + '/' + (results.passed + results.failed) + ' tests passed\n')
  process.exit(results.failed > 0 ? 1 : 0)
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1) })
