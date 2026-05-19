import { initFirebase } from '../src/lib/firebase.js'
import { log } from '../src/lib/logger.js'
import { hashPassword, generateSecurePassword } from '../src/lib/password.js'

const db = initFirebase()

const DEMO_ORG_ID = process.env.DEFAULT_ORG_ID || 'org_prod_001'
const DEMO_EMAIL = 'admin@passport-agent.dev'
const USER_ID = 'user_prod_admin'

async function setupProduction() {
  const now = new Date().toISOString()

  // Check if demo org / user already exists
  const existingUser = await db.collection('users').doc(USER_ID).get()
  if (existingUser.exists) {
    log.info('Production database already seeded. Skipping.')
    console.log('\n  ✓ Demo org already exists. No changes made.')
    process.exit(0)
  }

  // Generate secure admin password
  const password = process.env.ADMIN_PASSWORD || generateSecurePassword(24)
  const { hash, salt } = hashPassword(password)

  // Create admin user
  await db.collection('users').doc(USER_ID).set({
    email: DEMO_EMAIL,
    displayName: 'Production Admin',
    role: 'org_admin',
    orgId: DEMO_ORG_ID,
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
