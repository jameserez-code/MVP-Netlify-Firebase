import { initFirebase } from './lib/firebase.js'
import { log } from './lib/logger.js'

const db = initFirebase()

async function seed() {
  const now = new Date().toISOString()

  const collections: Record<string, Record<string, Record<string, unknown>>> = {
    users: {
      user_seed_001: {
        email: 'admin@acmecorp.com',
        displayName: 'Admin User',
        role: 'org_admin',
        orgId: 'org_seed_001',
        createdAt: now,
      },
    },
    agents: {
      agent_seed_001: {
        name: 'Customer Support Bot',
        model: 'gpt-4o',
        provider: 'openai',
        orgId: 'org_seed_001',
        status: 'active',
        passport: {
          passportNumber: 'PP-SEED-TEST',
          systemPromptHash: 'sha256:def456...',
        },
        registeredAt: now,
      },
    },
    tasks: {
      task_seed_001: {
        payload: { description: 'Sample task for system testing' },
        status: 'created',
        createdAt: now,
      },
    },
    runs: {
      run_seed_001: {
        agentId: 'agent_seed_001',
        taskId: 'task_seed_001',
        sessionId: 'sess_seed_001',
        status: 'completed',
        startedAt: now,
        endedAt: now,
        totalActions: 3,
        allowedActions: 2,
        deniedActions: 1,
        error: null,
      },
    },
    logs: {
      log_seed_001: {
        agentId: 'agent_seed_001',
        runId: 'run_seed_001',
        tool: 'lookup_order',
        decision: 'allow',
        parameters: { orderId: 'ORD-12345' },
        timestamp: now,
      },
    },
  }

  for (const [coll, docs] of Object.entries(collections)) {
    for (const [id, data] of Object.entries(docs)) {
      await db.collection(coll).doc(id).set(data)
      log.success('seeded', { collection: coll, id })
    }
  }

  log.success('all collections seeded', { count: Object.keys(collections).length })
  process.exit(0)
}

seed().catch((err) => {
  log.error('seed failed', { error: err.message })
  process.exit(1)
})
