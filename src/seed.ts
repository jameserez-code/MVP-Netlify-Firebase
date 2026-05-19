import { initFirebase } from './lib/firebase.js'
import { log } from './lib/logger.js'
import { hashPassword, generateSecurePassword } from './lib/password.js'

const db = initFirebase()

async function seed() {
  const now = new Date().toISOString()
  const password = process.env.ADMIN_PASSWORD || generateSecurePassword()
  const { hash, salt } = hashPassword(password)
  const orgId = process.env.DEFAULT_ORG_ID
  const reset = process.argv.includes('--reset')
  const demo = process.argv.includes('--demo')

  if (!orgId) {
    console.error('DEFAULT_ORG_ID environment variable is required')
    process.exit(1)
  }

  if (!process.env.ADMIN_PASSWORD) {
    console.warn(`[SECURITY] ADMIN_PASSWORD not set. Generated random password for seed: ${password}`)
  }

  if (reset) {
    console.warn('[RESET] Clearing existing seed collections...')
    const collections = ['users', 'agents', 'tasks', 'runs', 'logs', 'policies', 'actionIntents']
    for (const coll of collections) {
      const snap = await db.collection(coll).limit(500).get()
      const batch = db.batch()
      for (const doc of snap.docs) {
        batch.delete(doc.ref)
      }
      if (snap.size > 0) await batch.commit()
      log.info('cleared', { collection: coll, count: snap.size })
    }
  }

  // Check if already seeded (idempotency)
  const existingUser = await db.collection('users').doc('user_seed_001').get()
  const existingAgent = await db.collection('agents').doc('agent_seed_001').get()

  if (!reset && existingUser.exists && existingAgent.exists) {
    log.warn('seed already applied; skipping. Use --reset to re-seed.')
    process.exit(0)
  }

  const demoSuffix = demo ? ' [DEMO]' : ''

  const collections: Record<string, Record<string, Record<string, unknown>>> = {
    users: {
      user_seed_001: {
        email: 'admin@acmecorp.com',
        displayName: 'Admin User',
        role: 'org_admin',
        orgId,
        passwordHash: hash,
        passwordSalt: salt,
        passwordIterations: 100_000,
        createdAt: now,
      },
    },
    agents: {},
    tasks: {},
    runs: {},
    logs: {},
    policies: {},
  }

  // 5 sample agents
  const agents = [
    { id: 'agent_seed_001', name: 'Customer Support Bot', model: 'gpt-4o', provider: 'openai' },
    { id: 'agent_seed_002', name: 'Data Analyst', model: 'claude-3-sonnet', provider: 'anthropic' },
    { id: 'agent_seed_003', name: 'Code Reviewer', model: 'gpt-4o-mini', provider: 'openai' },
    { id: 'agent_seed_004', name: 'Sales Assistant', model: 'gemini-1.5-pro', provider: 'google' },
    { id: 'agent_seed_005', name: 'Security Scanner', model: 'llama-3-70b', provider: 'meta' },
  ]

  for (const a of agents) {
    collections.agents[a.id] = {
      name: a.name + demoSuffix,
      model: a.model,
      provider: a.provider,
      orgId,
      status: 'active',
      passport: {
        passportNumber: `PP-${a.id.split('_')[2].toUpperCase()}-${Date.now().toString(16).substring(0, 4).toUpperCase()}`,
        systemPromptHash: 'sha256:def456...',
      },
      registeredAt: now,
      capabilities: ['task:execute', 'network:http', 'audit:read'],
    }
  }

  // 10 sample policies
  const policies = [
    { id: 'pol_seed_001', name: 'Default Allow', priority: 10 },
    { id: 'pol_seed_002', name: 'Block External Email', priority: 5 },
    { id: 'pol_seed_003', name: 'Restrict SSRF', priority: 1 },
    { id: 'pol_seed_004', name: 'PII Protection', priority: 2 },
    { id: 'pol_seed_005', name: 'Cost Cap', priority: 3 },
    { id: 'pol_seed_006', name: 'Sandbox Mode', priority: 4 },
    { id: 'pol_seed_007', name: 'Admin Override', priority: 0 },
    { id: 'pol_seed_008', name: 'Read-Only Agent', priority: 6 },
    { id: 'pol_seed_009', name: 'Allow Internal APIs', priority: 7 },
    { id: 'pol_seed_010', name: 'Deny File Write', priority: 8 },
  ]

  for (const p of policies) {
    collections.policies[p.id] = {
      id: p.id,
      orgId,
      name: p.name + demoSuffix,
      description: `Sample policy: ${p.name}`,
      status: 'active',
      scope: { agentId: '*', environment: ['*'] },
      rules: {
        allowedTools: p.priority % 2 === 0 ? [{ toolName: 'lookup_order', parameterConstraints: { orderId: { type: 'string' } } }] : [],
        deniedTools: p.priority === 1 ? ['http_request'] : p.priority === 2 ? ['send_email'] : [],
        allowedDomains: [{ pattern: '*.internal.com', methods: ['GET'] }],
        deniedDomains: p.priority === 1 ? ['169.254.169.254'] : p.priority === 2 ? ['*.leak.com'] : [],
        costLimit: p.priority === 3 ? { maxUsdPerSession: 1.0, maxUsdPerDay: 5.0 } : null,
        dataRestrictions: p.priority === 2 ? { denyPiiInParameters: true, denySecretsInParameters: true } : null,
      },
      priority: p.priority,
      createdAt: now,
      updatedAt: now,
    }
  }

  // 5 sample tasks in various states
  const tasks = [
    { id: 'task_seed_001', payload: { description: 'Sample task for system testing' }, status: 'pending' },
    { id: 'task_seed_002', payload: { description: 'Analyze Q3 revenue data' }, status: 'running' },
    { id: 'task_seed_003', payload: { description: 'Review PR #42' }, status: 'completed' },
    { id: 'task_seed_004', payload: { description: 'Scan dependencies for CVEs' }, status: 'failed' },
    { id: 'task_seed_005', payload: { description: 'Generate weekly report' }, status: 'pending' },
  ]

  for (const t of tasks) {
    collections.tasks[t.id] = {
      payload: t.payload,
      status: t.status,
      createdAt: now,
      updatedAt: now,
      runCount: t.status === 'completed' || t.status === 'failed' ? 1 : 0,
      retryCount: t.status === 'failed' ? 1 : 0,
    }
  }

  // 5 sample runs
  const runs = [
    { id: 'run_seed_001', agentId: 'agent_seed_001', taskId: 'task_seed_003', status: 'completed', totalActions: 3, allowedActions: 2, deniedActions: 1 },
    { id: 'run_seed_002', agentId: 'agent_seed_002', taskId: 'task_seed_002', status: 'running', totalActions: 1, allowedActions: 1, deniedActions: 0 },
    { id: 'run_seed_003', agentId: 'agent_seed_003', taskId: 'task_seed_004', status: 'failed', totalActions: 2, allowedActions: 1, deniedActions: 1 },
    { id: 'run_seed_004', agentId: 'agent_seed_004', taskId: 'task_seed_005', status: 'running', totalActions: 0, allowedActions: 0, deniedActions: 0 },
    { id: 'run_seed_005', agentId: 'agent_seed_005', taskId: 'task_seed_001', status: 'completed', totalActions: 5, allowedActions: 5, deniedActions: 0 },
  ]

  for (const r of runs) {
    collections.runs[r.id] = {
      agentId: r.agentId,
      taskId: r.taskId,
      sessionId: `sess_${r.id}`,
      status: r.status,
      startedAt: now,
      endedAt: r.status === 'completed' || r.status === 'failed' ? now : null,
      totalActions: r.totalActions,
      allowedActions: r.allowedActions,
      deniedActions: r.deniedActions,
      error: r.status === 'failed' ? 'Simulated failure' : null,
    }
  }

  // 20 sample audit log entries
  const tools = ['lookup_order', 'send_email', 'http_request', 'delete_record', 'search_docs', 'calculate_price', 'create_invoice', 'update_profile']
  const decisions = ['allow', 'allow', 'allow', 'deny', 'allow', 'deny', 'allow', 'allow', 'allow', 'deny', 'allow', 'allow', 'deny', 'allow', 'allow', 'allow', 'allow', 'deny', 'allow', 'allow']

  for (let i = 1; i <= 20; i++) {
    const tool = tools[i % tools.length]
    const decision = decisions[i - 1]
    collections.logs[`log_seed_${String(i).padStart(3, '0')}`] = {
      agentId: `agent_seed_00${(i % 5) + 1}`,
      runId: `run_seed_00${(i % 5) + 1}`,
      tool,
      decision,
      parameters: { query: `sample param ${i}` },
      timestamp: new Date(Date.now() - i * 60_000).toISOString(),
    }
  }

  // 20 sample actionIntents
  const actionIntents: Record<string, Record<string, unknown>> = {}
  for (let i = 1; i <= 20; i++) {
    const tool = tools[i % tools.length]
    const decision = decisions[i - 1]
    actionIntents[`intent_seed_${String(i).padStart(3, '0')}`] = {
      intentId: `intent_seed_${String(i).padStart(3, '0')}`,
      orgId,
      agentId: `agent_seed_00${(i % 5) + 1}`,
      tool,
      parameters: { query: `sample param ${i}` },
      decision,
      decisionReason: decision === 'deny' ? (i % 2 === 0 ? 'tool_explicitly_blocked' : 'pii_detected') : null,
      violatedRule: decision === 'deny' ? (i % 2 === 0 ? 'denied_tool' : 'pii_rule') : null,
      createdAt: new Date(Date.now() - i * 60_000).toISOString(),
    }
  }

  for (const [coll, docs] of Object.entries(collections)) {
    for (const [id, data] of Object.entries(docs)) {
      await db.collection(coll).doc(id).set(data)
      log.success('seeded', { collection: coll, id })
    }
  }

  for (const [id, data] of Object.entries(actionIntents)) {
    await db.collection('actionIntents').doc(id).set(data)
    log.success('seeded', { collection: 'actionIntents', id })
  }

  const totalDocs = Object.values(collections).reduce((sum, c) => sum + Object.keys(c).length, 0) + Object.keys(actionIntents).length
  log.success('all collections seeded', { count: totalDocs, reset, demo })
  process.exit(0)
}

seed().catch((err) => {
  log.error('seed failed', { error: err.message })
  process.exit(1)
})
