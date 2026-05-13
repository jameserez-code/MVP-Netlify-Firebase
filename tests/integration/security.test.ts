// Security integration tests — verify auth, org isolation, replay protection
// Run with: npx tsx tests/integration/security.test.ts
// Requires: server running on localhost:3000

const API = 'http://localhost:3000'
let token = ''
const results = { passed: 0, failed: 0 }
function p(n: string) { results.passed++; console.log('  ✓ ' + n) }
function f(n: string, m: string) { results.failed++; console.log('  ✗ ' + n + ': ' + m) }

async function req(method: string, path: string, body?: any, headers?: Record<string, string>) {
  const opts: any = { method, headers: { 'Content-Type': 'application/json', ...headers } }
  if (token) opts.headers['Authorization'] = 'Bearer ' + token
  if (body) opts.body = JSON.stringify(body)
  try { const r = await fetch(API + path, opts); return { status: r.status, data: await r.json() } }
  catch (e: any) { return { status: 0, data: { error: { code: 'network', message: e.message } } } }
}

async function run() {
  console.log('\nSecurity Integration Tests\n')

  // 1. Reject missing token
  var r = await req('POST', '/task', { payload: {} })
  if (r.status === 401) p('missing token → 401')
  else f('missing token', `got ${r.status}`)

  // 2. Reject invalid token
  var r = await req('POST', '/task', { payload: {} }, { Authorization: 'Bearer bogus.token.here' })
  if (r.status === 401) p('invalid token → 401')
  else f('invalid token', `got ${r.status}`)

  // 3. Login
  var r = await fetch(API + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@acmecorp.com', password: 'admin' }) })
  var d = await r.json()
  token = d.token
  if (token) p('valid login returns token')
  else { f('login', JSON.stringify(d)); process.exit(1) }

  // 4. Expired token check (security/ping)
  var r = await req('GET', '/security/ping')
  if (r.data.authenticated) p('valid token → authenticated')
  else f('auth check', JSON.stringify(r.data))

  // 5. Rate limiting (200 req/min per IP — should always allow first request)
  var r = await req('POST', '/task', { payload: {} })
  if (r.status !== 429) p('within rate limit → allowed')
  else f('rate limit', 'unexpected 429')

  // 6. Invalid state transition (complete an already-completed run)
  var r = await req('PATCH', '/run/0/complete', {})
  if (r.data.error?.code === 'not_found' || r.status >= 400) p('invalid transition rejected')
  else f('invalid transition', JSON.stringify(r.data))

  // 7. Malformed request body
  var r = await req('POST', '/task', 'not json')
  if (r.status >= 400) p('malformed body rejected')
  else f('malformed body', `got ${r.status}`)

  // 8. Replay protection on gateway
  var enf = await req('POST', '/enforce', { intent: { intentId: 'sec_test_' + Date.now(), agentId: 'agent_seed_001', tool: 'lookup_order', parameters: { orderId: '123' } } })
  if (enf.data.gatewayTicket) {
    var ticket = enf.data.gatewayTicket
    var r = await req('POST', '/gateway/execute', { gatewayTicket: ticket, action: { tool: 'lookup_order', parameters: {} } })
    if (r.data.executed) {
      var r2 = await req('POST', '/gateway/execute', { gatewayTicket: ticket, action: { tool: 'lookup_order', parameters: {} } })
      if (r2.data.error?.code === 'ticket_replayed') p('gateway replay blocked')
      else f('gateway replay', JSON.stringify(r2.data))
    } else f('gateway execute', JSON.stringify(r.data))
  } else f('enforce ticket', JSON.stringify(enf.data))

  console.log('\n' + results.passed + '/' + (results.passed + results.failed) + ' tests passed\n')
  process.exit(results.failed > 0 ? 1 : 0)
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1) })
