import admin from 'firebase-admin'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const keyPath = resolve(process.cwd(), 'service-account.json')
if (!existsSync(keyPath)) {
  console.error('FATAL: service-account.json not found')
  process.exit(1)
}

const sa = JSON.parse(readFileSync(keyPath, 'utf-8'))
if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.cert(sa) })
}

const db = admin.firestore()

// ---------------------------------------------------------------------------
// Seed one document per collection
// ---------------------------------------------------------------------------
async function seed() {
  const now = new Date().toISOString()

  // users
  const uRef = db.collection('users').doc('user_seed_001')
  await uRef.set({
    email: 'admin@acmecorp.com',
    displayName: 'Admin User',
    role: 'org_admin',
    orgId: 'org_seed_001',
    createdAt: now,
  })
  console.log('users/user_seed_001 — written')

  // agents
  const aRef = db.collection('agents').doc('agent_seed_001')
  await aRef.set({
    name: 'Customer Support Bot',
    model: 'gpt-4o',
    provider: 'openai',
    orgId: 'org_seed_001',
    status: 'active',
    passport: {
      passportNumber: 'PP-SEED-TEST',
      systemPromptHash: 'sha256:abc123...',
    },
    registeredAt: now,
  })
  console.log('agents/agent_seed_001 — written')

  // tasks (verify existing write works)
  const tRef = db.collection('tasks').doc('task_seed_001')
  await tRef.set({
    payload: { description: 'Seed task', type: 'sample' },
    status: 'created',
    createdAt: now,
  })
  console.log('tasks/task_seed_001 — written')

  // runs
  const runRef = db.collection('runs').doc('run_seed_001')
  await runRef.set({
    agentId: 'agent_seed_001',
    taskId: 'task_seed_001',
    sessionId: 'sess_seed_001',
    status: 'completed',
    startedAt: now,
    endedAt: now,
    totalActions: 4,
    allowedActions: 3,
    deniedActions: 1,
  })
  console.log('runs/run_seed_001 — written')

  // logs
  const logRef = db.collection('logs').doc('log_seed_001')
  await logRef.set({
    agentId: 'agent_seed_001',
    runId: 'run_seed_001',
    tool: 'lookup_order',
    decision: 'allow',
    parameters: { orderId: '12345' },
    timestamp: now,
  })
  console.log('logs/log_seed_001 — written')

  console.log('\n✅ All 5 collections seeded')
  await admin.app().delete()
  process.exit(0)
}

seed().catch((err) => {
  console.error('SEED FAILED:', err.message)
  process.exit(1)
})
