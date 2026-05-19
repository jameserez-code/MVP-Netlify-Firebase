import { initFirebase } from '../src/lib/firebase.js'
import { log } from '../src/lib/logger.js'
import { hashPassword, generateSecurePassword } from '../src/lib/password.js'
import { generateId } from '../src/lib/crypto.js'

const db = initFirebase()

const DEMO_ORG_ID = process.env.DEFAULT_ORG_ID || 'org_prod_001'
const DEMO_EMAIL = 'admin@passport-agent.dev'
const USER_ID = 'user_prod_admin'

const FORCE = process.argv.includes('--force')

async function setupProduction() {
  const now = new Date().toISOString()

  // Check if any orgs exist (more robust than checking just the user)
  const orgsSnap = await db.collection('organizations').limit(1).get()
  const hasOrgs = !orgsSnap.empty

  if (hasOrgs && !FORCE) {
    log.info('Production database already seeded. Skipping.')
    console.log('\n  ✓ Organizations already exist. No changes made.')
    console.log('  Run with --force to re-seed (destructive).')
    process.exit(0)
  }

  if (FORCE && hasOrgs) {
    console.warn('\n⚠️  FORCE MODE: Clearing existing seed data...')
    const collections = ['users', 'agents', 'tasks', 'runs', 'logs', 'policies', 'actionIntents', 'organizations', 'apiKeys']
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

  // Generate secure admin password
  const password = process.env.ADMIN_PASSWORD || generateSecurePassword(24)
  const { hash, salt } = hashPassword(password)

  // Create admin org
  await db.collection('organizations').doc(DEMO_ORG_ID).set({
    id: DEMO_ORG_ID,
    name: 'Production Admin',
    slug: 'production-admin',
    plan: 'free',
    monthlyCredentialLimit: 100,
    credentialsIssuedThisMonth: 0,
    ownerId: DEMO_EMAIL,
    members: [DEMO_EMAIL],
    stripeCustomerId: null,
    subscriptionStatus: 'active',
    createdAt: now,
  })
  log.success('Created admin org', { orgId: DEMO_ORG_ID })

  // Create admin user
  await db.collection('users').doc(USER_ID).set({
    email: DEMO_EMAIL,
    displayName: 'Production Admin',
    role: 'org_admin',
    orgId: DEMO_ORG_ID,
    verified: true,
    verificationToken: null,
    passwordHash: hash,
    passwordSalt: salt,
    passwordIterations: 100_000,
    createdAt: now,
  })
  log.success('Created admin user', { email: DEMO_EMAIL, userId: USER_ID })

  // Create 3 demo policies
  const policies = [
    {
      id: 'pol_prod_001',
      name: 'Default Allow Internal',
      description: 'Allow all tools on internal domains by default.',
      status: 'active',
      scope: { agentId: '*', environment: ['production'] },
      rules: {
        allowedTools: [{ toolName: '*', parameterConstraints: {} }],
        deniedTools: [],
        allowedDomains: [{ pattern: '*.internal.com', methods: ['GET', 'POST'] }],
        deniedDomains: [],
        costLimit: null,
        dataRestrictions: null,
      },
      priority: 10,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'pol_prod_002',
      name: 'Block SSRF',
      description: 'Deny requests to internal/cloud metadata IPs.',
      status: 'active',
      scope: { agentId: '*', environment: ['production'] },
      rules: {
        allowedTools: [],
        deniedTools: ['http_request'],
        allowedDomains: [],
        deniedDomains: ['169.254.169.254', 'metadata.google.internal', 'localhost'],
        costLimit: null,
        dataRestrictions: null,
      },
      priority: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'pol_prod_003',
      name: 'PII Protection',
      description: 'Deny tool calls that may leak PII or secrets.',
      status: 'active',
      scope: { agentId: '*', environment: ['production'] },
      rules: {
        allowedTools: [],
        deniedTools: ['send_email'],
        allowedDomains: [],
        deniedDomains: ['*.leak.com'],
        costLimit: null,
        dataRestrictions: { denyPiiInParameters: true, denySecretsInParameters: true },
      },
      priority: 2,
      createdAt: now,
      updatedAt: now,
    },
  ]

  for (const p of policies) {
    await db.collection('policies').doc(p.id).set({ ...p, orgId: DEMO_ORG_ID })
    log.success('Created policy', { policyId: p.id, name: p.name })
  }

  // Create 1 demo agent
  const agentId = generateId('agent_')
  await db.collection('agents').doc(agentId).set({
    id: agentId,
    name: 'Production Support Bot',
    model: 'gpt-4o',
    provider: 'openai',
    orgId: DEMO_ORG_ID,
    status: 'active',
    passport: {
      passportNumber: 'PP-' + Date.now().toString(16).substring(0, 8).toUpperCase(),
      systemPromptHash: 'sha256:default',
    },
    capabilities: ['task:execute', 'network:http', 'audit:read'],
    registeredAt: now,
  })
  log.success('Created demo agent', { agentId })

  // Mark seeding as complete
  await db.collection('_config').doc('seed').set({
    seededAt: now,
    seededBy: 'setup-production',
    force: FORCE,
    orgId: DEMO_ORG_ID,
  })

  console.log('\n============================================')
  console.log('  PRODUCTION DATABASE SEEDED')
  console.log('============================================\n')
  console.log('  Email:    ', DEMO_EMAIL)
  console.log('  Password: ', password)
  console.log('  Org ID:   ', DEMO_ORG_ID)
  console.log('\n⚠️  SAVE THESE CREDENTIALS NOW — they will not be shown again.')
  console.log('\nNext steps:')
  console.log('  npm run test:integration')
  console.log('')
  process.exit(0)
}

setupProduction().catch((err) => {
  log.error('setup:prod failed', { error: err.message })
  console.error(err)
  process.exit(1)
})
