import { existsSync } from 'fs'
import { resolve } from 'path'
import type { LocalFirestore } from './local-store.js'
import { hashPassword } from './password.js'

export async function seedDemoData(db: LocalFirestore) {
  const dataDir = resolve(process.cwd(), 'data')
  const agentsFile = resolve(dataDir, 'agents.json')

  if (existsSync(agentsFile)) {
    return
  }

  const password = process.env.ADMIN_PASSWORD || 'demo123'
  const { hash, salt } = hashPassword(password)
  const now = new Date().toISOString()
  const orgId = process.env.DEFAULT_ORG_ID || 'org_demo'

  console.log('\n  No local data found. Seeding demo data...')

  await db.collection('users').doc('admin@demo.com').set({
    email: 'admin@demo.com',
    displayName: 'Admin',
    role: 'org_admin',
    orgId,
    passwordHash: hash,
    passwordSalt: salt,
    verified: true,
    createdAt: now,
    failedLoginAttempts: 0,
    lockedUntil: null,
  })

  await db.collection('agents').doc('agent_demo').set({
    id: 'agent_demo',
    name: 'Demo Bot',
    model: 'gpt-4o',
    provider: 'openai',
    orgId,
    status: 'active',
    registeredAt: now,
    lastSeenAt: null,
    revokedAt: null,
    revokedBy: null,
    revokedReason: null,
    metadata: {},
    passport: {
      passportNumber: 'PP-DEM1-DEM1',
      model: 'gpt-4o',
      provider: 'openai',
      modelVersion: 'gpt-4o',
      systemPromptHash: 'sha256:demo',
      origin: {
        createdBy: 'seed',
        createdAt: now,
        environment: 'demo',
      },
    },
    signingKey: {
      keyId: 'ak_live_demo_a',
      secretHash: hash,
      secretSalt: salt,
      algorithm: 'hmac-sha256',
      iterations: 50000,
      rotatedAt: null,
    },
    capabilities: ['task:execute', 'network:http'],
  })

  await db.collection('policies').doc('policy_demo_1').set({
    id: 'policy_demo_1',
    name: 'Demo Support Policy',
    orgId,
    status: 'active',
    priority: 10,
    scope: { agentId: '*', environment: ['*'] },
    rules: {
      allowedTools: [
        { toolName: 'lookup_order', parameterConstraints: { orderId: { type: 'string', minLength: 1 } } },
        { toolName: 'check_inventory', parameterConstraints: { sku: { type: 'string', minLength: 1 } } },
        { toolName: 'http_request', parameterConstraints: { url: { type: 'string' } } },
      ],
      deniedTools: ['send_email', 'delete_record', 'exec_code'],
      allowedDomains: [
        { pattern: '*.demo.com', methods: ['GET'] },
        { pattern: '*.internal.com', methods: ['GET', 'POST'] },
      ],
      deniedDomains: ['*.evil.com', '169.254.169.254', 'localhost', '127.0.0.1'],
      dataRestrictions: { denyPiiInParameters: true, denySecretsInParameters: true },
    },
    createdAt: now,
    updatedAt: now,
  })

  await db.collection('policies').doc('policy_demo_2').set({
    id: 'policy_demo_2',
    name: 'Read-Only API Policy',
    orgId,
    status: 'active',
    priority: 20,
    scope: { agentId: '*', environment: ['*'] },
    rules: {
      allowedTools: [
        { toolName: 'read_file', parameterConstraints: {} },
        { toolName: 'search_docs', parameterConstraints: {} },
      ],
      deniedTools: ['write_file', 'delete_file'],
      allowedDomains: [],
      deniedDomains: [],
      dataRestrictions: { denyPiiInParameters: true, denySecretsInParameters: true },
    },
    createdAt: now,
    updatedAt: now,
  })

  await db.collection('policies').doc('policy_demo_3').set({
    id: 'policy_demo_3',
    name: 'Default Deny All',
    orgId,
    status: 'active',
    priority: 99,
    scope: { agentId: '*', environment: ['*'] },
    rules: {
      allowedTools: [],
      deniedTools: ['*'],
      allowedDomains: [],
      deniedDomains: ['*'],
      dataRestrictions: { denyPiiInParameters: true, denySecretsInParameters: true },
    },
    createdAt: now,
    updatedAt: now,
  })

  for (let i = 0; i < 10; i++) {
    const intentId = `intent_demo_${i}`
    const tools = ['lookup_order', 'check_inventory', 'http_request', 'read_file', 'send_email']
    const decisions = i < 7 ? 'allow' : 'deny'
    const tool = tools[i % tools.length]
    const ts = new Date(Date.now() - (10 - i) * 60000).toISOString()

    await db.collection('actionIntents').doc(intentId).set({
      intentId,
      orgId,
      agentId: 'agent_demo',
      tool,
      parameters: { orderId: 'ORD-42', sku: 'SKU-8821' },
      decision: decisions,
      decisionReason: decisions === 'deny' ? 'Policy violation: tool not allowed' : 'Allowed by policy',
      violatedRule: decisions === 'deny' ? 'deniedTools' : null,
      createdAt: ts,
      executed: decisions === 'allow',
    })
  }

  console.log(`  Demo data seeded. Admin login: admin@demo.com / ${password}\n`)
}
