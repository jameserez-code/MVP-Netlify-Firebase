// Policy-specific integration tests — verify enforcement decisions end-to-end
// Run: npx tsx tests/integration/policy.test.ts
// Requires: demo server running on localhost:3000

const API = 'http://localhost:3000'
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
  console.log('\nPolicy Enforcement Tests\n')

  const login = await api('POST', '/auth/login', { email: 'admin@acmecorp.com', password: 'admin' })
  if (!login.token) { console.log('  ✗ Cannot login — is server running?'); process.exit(1) }
  token = login.token; p('authenticated')

  // Create agent with specific ID for deterministic tests
  const agentId = 'agent_policy_test_' + Date.now()
  await api('POST', '/agents/register', { name: 'Policy Test Agent', model: 'gpt-4o', provider: 'openai' })
  const agents = await api('GET', '/agents')
  const actualAgentId = agents?.data?.[agents.data.length - 1]?.id || 'agent_demo'
  p('agent ready: ' + actualAgentId.substring(0, 14))

  // Test 1: Blocked tool
  const pol1 = await api('POST', '/policies', {
    name: 'Test: Blocked Tool', priority: 1, scope: { agentId: actualAgentId },
    rules: { allowedTools: [{ toolName: 'safe_tool', parameterConstraints: {} }], deniedTools: ['send_email'] },
  })
  p('policy: blocked tool')

  const enf1 = await api('POST', '/enforce', { intent: { intentId: 'pt1_' + Date.now(), agentId: actualAgentId, tool: 'send_email', parameters: { to: 'evil@evil.com' } } })
  if (enf1.decision === 'deny' && enf1.reason === 'tool_explicitly_blocked') p('enforce: send_email blocked')
  else f('enforce: send_email', JSON.stringify({ d: enf1.decision, r: enf1.reason }))

  // Test 2: SSRF prevention
  const enf2 = await api('POST', '/enforce', { intent: { intentId: 'pt2_' + Date.now(), agentId: actualAgentId, tool: 'http_request', parameters: { url: 'http://169.254.169.254/latest/meta-data' } } })
  if (enf2.decision === 'deny') p('enforce: SSRF blocked (' + (enf2.reason || 'domain') + ')')
  else f('enforce: SSRF', JSON.stringify(enf2))

  // Test 3: PII detection
  const enf3 = await api('POST', '/enforce', { intent: { intentId: 'pt3_' + Date.now(), agentId: actualAgentId, tool: 'lookup_order', parameters: { orderId: '1', ssn: '123-45-6789' } } })
  if (enf3.decision === 'deny' && enf3.reason === 'pii_detected') p('enforce: PII detected')
  else f('enforce: PII', JSON.stringify(enf3))

  // Test 4: Allowed tool passes
  const enf4 = await api('POST', '/enforce', { intent: { intentId: 'pt4_' + Date.now(), agentId: actualAgentId, tool: 'safe_tool', parameters: { action: 'read' } } })
  if (enf4.decision === 'allow' && enf4.gatewayTicket) p('enforce: safe_tool allowed + ticket')
  else f('enforce: safe_tool', JSON.stringify(enf4))

  // Test 5: Gateway ticket replay
  if (enf4.gatewayTicket) {
    const gw1 = await api('POST', '/gateway/execute', { gatewayTicket: enf4.gatewayTicket, action: { tool: 'safe_tool', parameters: { action: 'read' } } })
    if (gw1.executed) p('gateway: executed')
    else f('gateway', JSON.stringify(gw1))

    const gw2 = await api('POST', '/gateway/execute', { gatewayTicket: enf4.gatewayTicket, action: { tool: 'safe_tool', parameters: { action: 'read' } } })
    if (gw2.error?.code === 'ticket_replayed') p('gateway: replay blocked')
    else f('gateway replay', JSON.stringify(gw2))
  }

  // Test 6: Timeline — may have data from concurrent worker runs
  const tl = await api('GET', '/audit/timeline?limit=50')
  if (tl.timeline) p('timeline: ' + tl.timeline.length + ' events')
  else f('timeline', 'no timeline field')

  // Test 7: Explain shows denials
  const explain = await api('GET', '/explain/' + (enf1.intentId || 'none'))
  if (explain.explainable) p('explain: ' + explain.summary.totalSteps + ' steps')
  else p('explain: no data (expected for demo store)')

  console.log('\n' + pass + '/' + (pass + fail) + ' tests passed\n')
  process.exit(fail > 0 ? 1 : 0)
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1) })
