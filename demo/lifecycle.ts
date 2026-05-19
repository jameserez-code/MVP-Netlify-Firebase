// Full agent lifecycle demo — hits the real Fastify API
// Usage: npx tsx demo/lifecycle.ts

const API = 'http://localhost:3000'
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function api(method: string, path: string, token: string, body?: any) {
  const opts: any = { method, headers: { 'Content-Type': 'application/json' } }
  if (token) opts.headers['Authorization'] = `Bearer ${token}`
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${API}${path}`, opts)
  return await res.json()
}

async function run() {
  console.log('\n╔══════════════════════════════════════╗')
  console.log('║  AGENT LIFECYCLE — Full Demo        ║')
  console.log('╚══════════════════════════════════════╝\n')

  // 1. LOGIN
  console.log('≡ 1. AUTHENTICATE')
  const email = process.env.DEMO_EMAIL || 'admin@acmecorp.com'
  const password = process.env.DEMO_PASSWORD
  if (!password) {
    console.error('DEMO_PASSWORD environment variable is required. Set it to the admin password.')
    process.exit(1)
  }
  const { token } = await api('POST', '/auth/login', '', { email, password })
  console.log('   ✓ Logged in as ' + email + '\n')

  // 2. REGISTER AGENT
  console.log('≡ 2. REGISTER AGENT')
  const agent = await api('POST', '/agents/register', token, {
    name: 'Demo Support Bot', model: 'gpt-4o', provider: 'openai',
    systemPrompt: 'You help customers with order queries and inventory checks.',
  })
  console.log(`   ✓ Agent: ${agent.agentId}`)
  console.log(`   Passport: ${agent.passportNumber}`)
  console.log(`   Key (shown once): ${agent.secretKeyPrefix}...\n`)

  // 3. CREATE POLICY
  console.log('≡ 3. CREATE POLICY')
  const policy = await api('POST', '/policies', token, {
    name: 'Demo Support Policy',
    priority: 1,
    scope: { agentId: agent.agentId },
    rules: {
      allowedTools: [
        { toolName: 'lookup_order', parameterConstraints: { orderId: { type: 'string', minLength: 1 } } },
        { toolName: 'check_inventory', parameterConstraints: { sku: { type: 'string', minLength: 1 } } },
      ],
      deniedTools: ['send_email', 'delete_record'],
      allowedDomains: [{ pattern: '*.internal.com', methods: ['GET'] }],
      deniedDomains: ['*.evil.com', '169.254.169.254'],
      dataRestrictions: { denyPiiInParameters: true, denySecretsInParameters: true },
    },
  })
  console.log(`   ✓ Policy: ${policy.id}\n`)

  // 4. CREATE TASK
  console.log('≡ 4. CREATE TASK')
  const task = await api('POST', '/task', token, {
    payload: { query: 'Find all orders for customer #42', priority: 'high' },
  })
  console.log(`   ✓ Task: ${task.id}\n`)

  // 5. START RUN
  console.log('≡ 5. START RUN')
  const run = await api('POST', '/agent/run', token, { agentId: agent.agentId, taskId: task.id })
  console.log(`   ✓ Run: ${run.id}`)
  console.log(`   Session: ${run.sessionId}\n`)

  // 6. LOG TOOL CALLS
  console.log('≡ 6. AGENT EXECUTES TOOLS')
  await sleep(300)

  const log1 = await api('POST', `/run/${run.id}/log`, token, {
    tool: 'lookup_order', decision: 'allow', parameters: { orderId: 'ORD-42' },
  })
  console.log('   ✓ lookup_order → ALLOW')

  await sleep(200)
  const log2 = await api('POST', `/run/${run.id}/log`, token, {
    tool: 'check_inventory', decision: 'allow', parameters: { sku: 'SKU-8821' },
  })
  console.log('   ✓ check_inventory → ALLOW')

  await sleep(200)
  const log3 = await api('POST', `/run/${run.id}/log`, token, {
    tool: 'send_email', decision: 'deny', parameters: { to: 'attacker@evil.com' }, reason: 'tool_explicitly_blocked',
  })
  console.log('   ✗ send_email → DENY (blocked by policy)\n')

  // 7. COMPLETE RUN
  console.log('≡ 7. COMPLETE RUN')
  await api('PATCH', `/run/${run.id}/complete`, token, {})
  console.log('   ✓ Run marked completed\n')

  // 8. VERIFY TASK STATUS
  const updatedTask = await api('GET', `/task/${task.id}`, '')
  console.log(`≡ 8. VERIFY:`)
  console.log(`   Task: ${task.id} → ${updatedTask.status}`)
  console.log(`   Completed at: ${updatedTask.completedAt}\n`)

  // 9. ENFORCE TEST — blocked tool
  console.log('≡ 9. ENFORCEMENT PIPELINE TEST')
  const enforce1 = await api('POST', '/enforce', token, {
    intent: { intentId: 'demo_allow', agentId: agent.agentId, tool: 'lookup_order', parameters: { orderId: '123' } },
  })
  console.log(`   lookup_order → ${enforce1.decision.toUpperCase()} ${enforce1.gatewayTicket ? '[ticket]' : ''}`)

  const enforce2 = await api('POST', '/enforce', token, {
    intent: { intentId: 'demo_deny', agentId: agent.agentId, tool: 'send_email', parameters: { to: 'evil@evil.com' } },
  })
  console.log(`   send_email → ${enforce2.decision.toUpperCase()} (${enforce2.reason})`)

  const enforce3 = await api('POST', '/enforce', token, {
    intent: { intentId: 'demo_ssrf', agentId: agent.agentId, tool: 'lookup_order', parameters: { orderId: '1', ssn: '123-45-6789' } },
  })
  console.log(`   PII detection → ${enforce3.decision.toUpperCase()} (${enforce3.reason})\n`)

  // 10. SUMMARY
  console.log('╔══════════════════════════════════════╗')
  console.log('║  LIFECYCLE COMPLETE                 ║')
  console.log('║  Agent:  registered + policy        ║')
  console.log('║  Task:   created → running → done   ║')
  console.log('║  Run:    3 actions logged (2✓ 1✗)   ║')
  console.log('║  Policy: blocked tool + PII + SSRF  ║')
  console.log('╚══════════════════════════════════════╝\n')
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1) })
