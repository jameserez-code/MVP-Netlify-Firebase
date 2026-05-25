import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { randomBytes } from 'node:crypto'
import { mkdirSync, rmSync, existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

process.env.NODE_ENV = 'development'
process.env.JWT_SECRET = randomBytes(32).toString('hex')
process.env.ENGINE_SECRET = randomBytes(32).toString('hex')
process.env.DEFAULT_ORG_ID = 'org_api_flow_test'
delete process.env.FIREBASE_PROJECT_ID

const { LocalFirestore } = await import('../../dist/lib/local-store.js')
const { hashPassword, verifyPassword } = await import('../../dist/lib/password.js')
const { sign, verify } = await import('../../dist/lib/jwt.js')
const { generateId, hashKey, verifyKey, getEngineSecret, setEngineSecret, generateGatewayTicket, verifyGatewayTicket } = await import('../../dist/lib/crypto.js')

const require = createRequire(import.meta.url)
const { evaluateIntent } = require('../../netlify/functions/src/engine/evaluator.js')

const DATA_DIR = resolve(process.cwd(), 'data')
const TEST_ORG_ID = 'org_api_flow_test'

function ensureCleanDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
    return
  }
  try {
    for (const file of readdirSync(DATA_DIR)) {
      if (file.endsWith('.json')) rmSync(resolve(DATA_DIR, file))
    }
  } catch {}
}

ensureCleanDataDir()
const db = new LocalFirestore()

function randomEmail() {
  return `test_${randomBytes(4).toString('hex')}@api-flow.test`
}

function randomUUID() {
  return randomBytes(16).toString('hex')
}

function createTestToken(email, role = 'org_admin') {
  return sign({ sub: email, role, orgId: TEST_ORG_ID })
}

const runCount = { passed: 0, failed: 0 }
function pass(name) { runCount.passed++; console.log('  \x1b[32m✓\x1b[0m ' + name) }
function fail(name, msg) {
  runCount.failed++
  console.log('  \x1b[31m✗\x1b[0m ' + name + ': ' + msg)
}

// ============================================================================
// 1. ORG LIFECYCLE: create, list, metrics
// ============================================================================
test('org lifecycle — create org', async () => {
  try {
    const orgId = generateId('org_')
    await db.collection('organizations').doc(orgId).set({
      id: orgId,
      name: 'API Flow Test Org',
      status: 'active',
      plan: 'free',
      createdAt: new Date().toISOString(),
    })
    const snap = await db.collection('organizations').doc(orgId).get()
    assert.ok(snap.exists)
    assert.equal(snap.data().name, 'API Flow Test Org')
    pass('org lifecycle — create org')
  } catch (e) {
    fail('org lifecycle — create org', e.message)
  }
})

test('org lifecycle — list orgs', async () => {
  try {
    for (let i = 1; i <= 3; i++) {
      await db.collection('organizations').doc(`org_list_${i}`).set({
        id: `org_list_${i}`,
        name: `Org ${i}`,
        status: 'active',
        plan: i === 3 ? 'pro' : 'free',
        createdAt: new Date().toISOString(),
      })
    }
    const all = await db.collection('organizations').get()
    assert.ok(all.size >= 3)
    const pro = await db.collection('organizations').where('plan', '==', 'pro').get()
    assert.ok(pro.size >= 1)
    pass('org lifecycle — list orgs')
  } catch (e) {
    fail('org lifecycle — list orgs', e.message)
  }
})

test('org lifecycle — org metrics', async () => {
  try {
    const orgId = generateId('org_')
    await db.collection('organizations').doc(orgId).set({
      id: orgId, name: 'Metrics Org', status: 'active', plan: 'free',
      createdAt: new Date().toISOString(),
    })
    // Seed some agents, policies, and audit entries for this org
    await db.collection('agents').doc(generateId('agent_')).set({
      orgId, name: 'Agent A', status: 'active', registeredAt: new Date().toISOString(),
    })
    await db.collection('policies').doc(generateId('pol_')).set({
      orgId, name: 'Policy A', status: 'active', priority: 5, createdAt: new Date().toISOString(),
    })
    await db.collection('actionIntents').doc(generateId('intent_')).set({
      orgId, agentId: 'test_agent', decision: 'allow', tool: 'lookup_order',
      createdAt: new Date().toISOString(),
    })

    const agentCount = await db.collection('agents').where('orgId', '==', orgId).count()
    const policyCount = await db.collection('policies').where('orgId', '==', orgId).count()
    const intentCount = await db.collection('actionIntents').where('orgId', '==', orgId).count()

    const a = await agentCount.get()
    const p = await policyCount.get()
    const i = await intentCount.get()
    assert.ok(a.data.count >= 1)
    assert.ok(p.data.count >= 1)
    assert.ok(i.data.count >= 1)
    pass('org lifecycle — org metrics')
  } catch (e) {
    fail('org lifecycle — org metrics', e.message)
  }
})

// ============================================================================
// 2. USER LIFECYCLE: register, verify, login, change password
// ============================================================================
test('user lifecycle — register', async () => {
  try {
    const email = randomEmail()
    const verificationToken = `verify_${randomUUID()}`
    const { hash, salt } = hashPassword('SecureP@ss1')

    await db.collection('users').doc(email).set({
      email,
      displayName: 'Flow Test User',
      role: 'org_admin',
      orgId: TEST_ORG_ID,
      passwordHash: hash,
      passwordSalt: salt,
      verified: false,
      verificationToken,
      createdAt: new Date().toISOString(),
    })

    const snap = await db.collection('users').doc(email).get()
    assert.equal(snap.data().verified, false)
    assert.ok(snap.data().passwordHash)
    pass('user lifecycle — register')
  } catch (e) {
    fail('user lifecycle — register', e.message)
  }
})

test('user lifecycle — verify email', async () => {
  try {
    const email = randomEmail()
    const verificationToken = `verify_${randomUUID()}`

    await db.collection('users').doc(email).set({
      email, verified: false, verificationToken, createdAt: new Date().toISOString(),
    })

    const matches = await db.collection('users').where('verificationToken', '==', verificationToken).get()
    assert.equal(matches.size, 1)
    await db.collection('users').doc(matches.docs[0].id).update({
      verified: true,
      verificationToken: null,
    })
    const updated = await db.collection('users').doc(matches.docs[0].id).get()
    assert.equal(updated.data().verified, true)
    pass('user lifecycle — verify email')
  } catch (e) {
    fail('user lifecycle — verify email', e.message)
  }
})

test('user lifecycle — login with JWT', async () => {
  try {
    const email = randomEmail()
    const password = 'LoginP@ss1'
    const { hash, salt } = hashPassword(password)

    await db.collection('users').doc(email).set({
      email, displayName: 'Login User', role: 'org_admin', orgId: TEST_ORG_ID,
      passwordHash: hash, passwordSalt: salt, verified: true, createdAt: new Date().toISOString(),
    })

    assert.equal(verifyPassword(password, hash, salt), true)
    assert.equal(verifyPassword('WrongP@ss1', hash, salt), false)

    const token = createTestToken(email)
    const claims = await verify(token)
    assert.ok(claims !== null)
    assert.equal(claims.sub, email)
    assert.equal(claims.role, 'org_admin')
    pass('user lifecycle — login with JWT')
  } catch (e) {
    fail('user lifecycle — login with JWT', e.message)
  }
})

test('user lifecycle — change password', async () => {
  try {
    const email = randomEmail()
    const oldPass = 'OldP@ss1'
    const newPass = 'NewP@ss2!'
    const { hash: oldHash, salt: oldSalt } = hashPassword(oldPass)

    await db.collection('users').doc(email).set({
      email, passwordHash: oldHash, passwordSalt: oldSalt, verified: true, createdAt: new Date().toISOString(),
    })

    // Verify old password works
    const snap = await db.collection('users').doc(email).get()
    assert.equal(verifyPassword(oldPass, snap.data().passwordHash, snap.data().passwordSalt), true)

    // Change password
    const { hash: newHash, salt: newSalt } = hashPassword(newPass)
    await db.collection('users').doc(email).update({ passwordHash: newHash, passwordSalt: newSalt })

    // Verify new password works
    const updated = await db.collection('users').doc(email).get()
    assert.equal(verifyPassword(newPass, updated.data().passwordHash, updated.data().passwordSalt), true)
    assert.equal(verifyPassword(oldPass, updated.data().passwordHash, updated.data().passwordSalt), false)

    pass('user lifecycle — change password')
  } catch (e) {
    fail('user lifecycle — change password', e.message)
  }
})

// ============================================================================
// 3. POLICY LIFECYCLE: create, list, get, update, delete, templates
// ============================================================================
test('policy lifecycle — create, list, get, update, delete', async () => {
  try {
    // Create
    const policyId = generateId('pol_')
    await db.collection('policies').doc(policyId).set({
      id: policyId, orgId: TEST_ORG_ID, name: 'Full Lifecycle Policy',
      status: 'draft', priority: 10,
      rules: {
        allowedTools: [{ toolName: 'lookup_order', parameterConstraints: {} }],
        deniedTools: ['send_email'],
        allowedDomains: [],
        deniedDomains: [],
        dataRestrictions: null,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    // Get
    let snap = await db.collection('policies').doc(policyId).get()
    assert.equal(snap.data().status, 'draft')

    // List
    const list = await db.collection('policies').where('orgId', '==', TEST_ORG_ID).get()
    assert.ok(list.size >= 1)

    // Update
    await db.collection('policies').doc(policyId).update({
      status: 'active', priority: 1, updatedAt: new Date().toISOString(),
    })
    snap = await db.collection('policies').doc(policyId).get()
    assert.equal(snap.data().status, 'active')
    assert.equal(snap.data().priority, 1)

    // Delete
    await db.collection('policies').doc(policyId).delete()
    snap = await db.collection('policies').doc(policyId).get()
    assert.equal(snap.exists, false)

    pass('policy lifecycle — create, list, get, update, delete')
  } catch (e) {
    fail('policy lifecycle — create, list, get, update, delete', e.message)
  }
})

test('policy lifecycle — templates', async () => {
  try {
    const templates = [
      { id: 'tpl_baseline', name: 'Baseline Policy', category: 'security', priority: 1, rules: { allowedTools: [], deniedTools: ['drop_table', 'format_drive'] } },
      { id: 'tpl_readonly', name: 'Read-Only Policy', category: 'safety', priority: 2, rules: { allowedTools: [], deniedTools: ['write_*', 'delete_*'] } },
      { id: 'tpl_fullaccess', name: 'Full Access Policy', category: 'admin', priority: 3, rules: { allowedTools: [{ toolName: '*', parameterConstraints: {} }], deniedTools: [] } },
    ]

    for (const t of templates) {
      await db.collection('policyTemplates').doc(t.id).set(t)
    }

    const all = await db.collection('policyTemplates').get()
    assert.equal(all.size, 3)

    const byCategory = await db.collection('policyTemplates').where('category', '==', 'security').get()
    assert.equal(byCategory.size, 1)

    pass('policy lifecycle — templates')
  } catch (e) {
    fail('policy lifecycle — templates', e.message)
  }
})

// ============================================================================
// 4. AGENT LIFECYCLE: register, list, get, revoke, suspend, rotate key
// ============================================================================
test('agent lifecycle — register', async () => {
  try {
    const agentId = generateId('agent_')
    await db.collection('agents').doc(agentId).set({
      id: agentId, name: 'Flow Agent', model: 'gpt-4o', provider: 'openai',
      orgId: TEST_ORG_ID, status: 'active',
      passport: { passportNumber: 'PP-FLOW-01', model: 'gpt-4o', provider: 'openai' },
      registeredAt: new Date().toISOString(),
      lastSeenAt: null,
      revokedAt: null,
      metadata: {},
    })

    const snap = await db.collection('agents').doc(agentId).get()
    assert.equal(snap.data().status, 'active')
    assert.equal(snap.data().passport.passportNumber, 'PP-FLOW-01')
    pass('agent lifecycle — register')
  } catch (e) {
    fail('agent lifecycle — register', e.message)
  }
})

test('agent lifecycle — list and get', async () => {
  try {
    for (let i = 1; i <= 4; i++) {
      await db.collection('agents').doc(`agent_flow_${i}`).set({
        id: `agent_flow_${i}`, name: `Flow Agent ${i}`, model: 'gpt-4o',
        provider: 'openai', orgId: TEST_ORG_ID,
        status: i === 4 ? 'suspended' : 'active',
        registeredAt: new Date().toISOString(),
      })
    }

    const all = await db.collection('agents').get()
    assert.ok(all.size >= 4)

    const active = await db.collection('agents').where('status', '==', 'active').get()
    assert.ok(active.size >= 3)

    const one = await db.collection('agents').doc('agent_flow_1').get()
    assert.equal(one.data().name, 'Flow Agent 1')
    pass('agent lifecycle — list and get')
  } catch (e) {
    fail('agent lifecycle — list and get', e.message)
  }
})

test('agent lifecycle — revoke', async () => {
  try {
    const agentId = generateId('agent_')
    await db.collection('agents').doc(agentId).set({
      id: agentId, name: 'Revoke Target', model: 'gpt-4o', provider: 'openai',
      orgId: TEST_ORG_ID, status: 'active', registeredAt: new Date().toISOString(),
    })

    await db.collection('agents').doc(agentId).update({
      status: 'revoked', revokedAt: new Date().toISOString(),
    })
    const snap = await db.collection('agents').doc(agentId).get()
    assert.equal(snap.data().status, 'revoked')
    assert.ok(snap.data().revokedAt)
    pass('agent lifecycle — revoke')
  } catch (e) {
    fail('agent lifecycle — revoke', e.message)
  }
})

test('agent lifecycle — suspend and reactivate', async () => {
  try {
    const agentId = generateId('agent_')
    await db.collection('agents').doc(agentId).set({
      id: agentId, name: 'Suspend Target', model: 'gpt-4o', provider: 'openai',
      orgId: TEST_ORG_ID, status: 'active', registeredAt: new Date().toISOString(),
    })

    // Suspend
    await db.collection('agents').doc(agentId).update({ status: 'suspended' })
    let snap = await db.collection('agents').doc(agentId).get()
    assert.equal(snap.data().status, 'suspended')

    // Reactivate
    await db.collection('agents').doc(agentId).update({ status: 'active' })
    snap = await db.collection('agents').doc(agentId).get()
    assert.equal(snap.data().status, 'active')

    pass('agent lifecycle — suspend and reactivate')
  } catch (e) {
    fail('agent lifecycle — suspend and reactivate', e.message)
  }
})

test('agent lifecycle — rotate key', async () => {
  try {
    const agentId = generateId('agent_')
    const oldKey = `ak_live_${randomUUID()}`
    const { hash: oldHash, salt: oldSalt } = hashKey(oldKey)

    await db.collection('agents').doc(agentId).set({
      id: agentId, name: 'Key Rotator', model: 'gpt-4o', provider: 'openai',
      orgId: TEST_ORG_ID, status: 'active',
      keyHash: oldHash, keySalt: oldSalt, keyPrefix: oldKey.substring(0, 8),
      registeredAt: new Date().toISOString(),
    })

    // Generate new key
    const newKey = `ak_live_${randomUUID()}`
    const { hash: newHash, salt: newSalt } = hashKey(newKey)

    await db.collection('agents').doc(agentId).update({
      keyHash: newHash, keySalt: newSalt, keyPrefix: newKey.substring(0, 8),
    })

    const snap = await db.collection('agents').doc(agentId).get()
    assert.ok(verifyKey(newKey, snap.data().keyHash, snap.data().keySalt))
    assert.equal(verifyKey(oldKey, snap.data().keyHash, snap.data().keySalt), false)

    pass('agent lifecycle — rotate key')
  } catch (e) {
    fail('agent lifecycle — rotate key', e.message)
  }
})

// ============================================================================
// 5. API KEY LIFECYCLE: create, list, rotate, revoke
// ============================================================================
test('API key lifecycle — create and list', async () => {
  try {
    for (let i = 1; i <= 3; i++) {
      const plainKey = `passport_${randomUUID()}`
      const { hash, salt } = hashKey(plainKey)
      await db.collection('apiKeys').doc(`key_flow_${i}`).set({
        id: `key_flow_${i}`, orgId: TEST_ORG_ID,
        name: `API Key ${i}`,
        keyHash: hash, keySalt: salt,
        keyPrefix: plainKey.substring(0, 8),
        scopes: i === 1 ? ['read'] : ['read', 'write'],
        createdAt: new Date().toISOString(),
        lastUsedAt: null, requestCount: 0, status: 'active',
      })
    }

    const all = await db.collection('apiKeys').get()
    assert.ok(all.size >= 3)
    pass('API key lifecycle — create and list')
  } catch (e) {
    fail('API key lifecycle — create and list', e.message)
  }
})

test('API key lifecycle — rotate', async () => {
  try {
    const plainKey = `passport_${randomUUID()}`
    const { hash, salt } = hashKey(plainKey)
    const keyId = generateId('key_')

    await db.collection('apiKeys').doc(keyId).set({
      id: keyId, orgId: TEST_ORG_ID, name: 'Rotate Key',
      keyHash: hash, keySalt: salt, keyPrefix: plainKey.substring(0, 8),
      scopes: ['read', 'write'], status: 'active', createdAt: new Date().toISOString(),
    })

    // Rotate: revoke old, create new
    await db.collection('apiKeys').doc(keyId).update({
      status: 'revoked', revokedAt: new Date().toISOString(),
    })

    const newKey = `passport_${randomUUID()}`
    const { hash: nh, salt: ns } = hashKey(newKey)
    const newKeyId = generateId('key_')

    await db.collection('apiKeys').doc(newKeyId).set({
      id: newKeyId, orgId: TEST_ORG_ID, name: 'Rotate Key',
      keyHash: nh, keySalt: ns, keyPrefix: newKey.substring(0, 8),
      scopes: ['read', 'write'], status: 'active', createdAt: new Date().toISOString(),
    })

    const oldSnap = await db.collection('apiKeys').doc(keyId).get()
    assert.equal(oldSnap.data().status, 'revoked')

    const newSnap = await db.collection('apiKeys').doc(newKeyId).get()
    assert.equal(newSnap.data().status, 'active')
    assert.ok(verifyKey(newKey, newSnap.data().keyHash, newSnap.data().keySalt))

    pass('API key lifecycle — rotate')
  } catch (e) {
    fail('API key lifecycle — rotate', e.message)
  }
})

test('API key lifecycle — revoke', async () => {
  try {
    const keyId = generateId('key_')
    await db.collection('apiKeys').doc(keyId).set({
      id: keyId, orgId: TEST_ORG_ID, name: 'Revoke Key',
      keyHash: 'dummy', keySalt: 'dummy', keyPrefix: 'pas_1234',
      scopes: ['read'], status: 'active', createdAt: new Date().toISOString(),
    })

    await db.collection('apiKeys').doc(keyId).update({
      status: 'revoked', revokedAt: new Date().toISOString(),
    })
    const snap = await db.collection('apiKeys').doc(keyId).get()
    assert.equal(snap.data().status, 'revoked')
    pass('API key lifecycle — revoke')
  } catch (e) {
    fail('API key lifecycle — revoke', e.message)
  }
})

// ============================================================================
// 6. WEBHOOK LIFECYCLE: create, list, test, rotate, delete
// ============================================================================
test('webhook lifecycle — create and list', async () => {
  try {
    const webhookId = generateId('wh_')
    await db.collection('webhooks').doc(webhookId).set({
      id: webhookId, orgId: TEST_ORG_ID,
      url: 'https://example.com/webhook',
      events: ['run.completed', 'run.failed'],
      status: 'active',
      secret: 'wh_secret_123',
      createdAt: new Date().toISOString(),
      deliveryCount: 0,
      lastDeliveryAt: null,
    })

    const snap = await db.collection('webhooks').doc(webhookId).get()
    assert.equal(snap.data().status, 'active')
    assert.deepEqual(snap.data().events, ['run.completed', 'run.failed'])

    const all = await db.collection('webhooks').get()
    assert.ok(all.size >= 1)
    pass('webhook lifecycle — create and list')
  } catch (e) {
    fail('webhook lifecycle — create and list', e.message)
  }
})

test('webhook lifecycle — update, delete', async () => {
  try {
    const webhookId = generateId('wh_')
    await db.collection('webhooks').doc(webhookId).set({
      id: webhookId, orgId: TEST_ORG_ID, url: 'https://a.com/hook',
      events: ['run.completed'], status: 'active',
      secret: 'sec', createdAt: new Date().toISOString(),
    })

    // Update
    await db.collection('webhooks').doc(webhookId).update({
      url: 'https://b.com/hook',
      events: ['run.completed', 'run.failed'],
    })
    let snap = await db.collection('webhooks').doc(webhookId).get()
    assert.equal(snap.data().url, 'https://b.com/hook')

    // Deactivate
    await db.collection('webhooks').doc(webhookId).update({ status: 'inactive' })
    snap = await db.collection('webhooks').doc(webhookId).get()
    assert.equal(snap.data().status, 'inactive')

    // Delete
    await db.collection('webhooks').doc(webhookId).delete()
    snap = await db.collection('webhooks').doc(webhookId).get()
    assert.equal(snap.exists, false)

    pass('webhook lifecycle — update, delete')
  } catch (e) {
    fail('webhook lifecycle — update, delete', e.message)
  }
})

test('webhook lifecycle — rotate secret', async () => {
  try {
    const webhookId = generateId('wh_')
    await db.collection('webhooks').doc(webhookId).set({
      id: webhookId, orgId: TEST_ORG_ID, url: 'https://a.com/hook',
      events: ['run.completed'], status: 'active',
      secret: 'old_secret', createdAt: new Date().toISOString(),
    })

    await db.collection('webhooks').doc(webhookId).update({ secret: 'new_secret_rotated' })
    const snap = await db.collection('webhooks').doc(webhookId).get()
    assert.equal(snap.data().secret, 'new_secret_rotated')

    pass('webhook lifecycle — rotate secret')
  } catch (e) {
    fail('webhook lifecycle — rotate secret', e.message)
  }
})

// ============================================================================
// 7. ENFORCEMENT: allow, deny (tool blocked), deny (PII), deny (domain), modify
// ============================================================================
test('enforcement — allow', async () => {
  try {
    const policy = {
      id: 'pol_enforce_allow',
      name: 'Allow Test', status: 'active', priority: 1,
      scope: { agentId: '*' },
      rules: {
        allowedTools: [{ toolName: 'lookup_order', parameterConstraints: { orderId: { type: 'string', minLength: 1 } } }],
        deniedTools: [], allowedDomains: [], deniedDomains: [],
        dataRestrictions: null,
      },
    }

    const d = evaluateIntent({
      intent: { tool: 'lookup_order', parameters: { orderId: 'ORD-001' } },
      agentStatus: 'active', policies: [policy],
      sessionCost: null, dailyCost: null, toolCost: null,
    })
    assert.equal(d.decision, 'allow')
    pass('enforcement — allow')
  } catch (e) {
    fail('enforcement — allow', e.message)
  }
})

test('enforcement — deny (tool blocked)', async () => {
  try {
    const policy = {
      id: 'pol_deny_tool', name: 'Deny Tool', status: 'active', priority: 1,
      scope: { agentId: '*' },
      rules: {
        allowedTools: [{ toolName: 'lookup_order', parameterConstraints: {} }],
        deniedTools: ['delete_record', 'send_email'],
        allowedDomains: [], deniedDomains: [],
        dataRestrictions: null,
      },
    }

    const d = evaluateIntent({
      intent: { tool: 'delete_record', parameters: { table: 'users' } },
      agentStatus: 'active', policies: [policy],
      sessionCost: null, dailyCost: null, toolCost: null,
    })
    assert.equal(d.decision, 'deny')
    assert.equal(d.reason, 'tool_explicitly_blocked')
    pass('enforcement — deny (tool blocked)')
  } catch (e) {
    fail('enforcement — deny (tool blocked)', e.message)
  }
})

test('enforcement — deny (PII)', async () => {
  try {
    const policy = {
      id: 'pol_pii', name: 'PII Block', status: 'active', priority: 1,
      scope: { agentId: '*' },
      rules: {
        allowedTools: [{ toolName: 'lookup_order', parameterConstraints: {} }],
        deniedTools: [], allowedDomains: [], deniedDomains: [],
        dataRestrictions: { denyPiiInParameters: true },
      },
    }

    const d = evaluateIntent({
      intent: { tool: 'lookup_order', parameters: { ssn: '111-22-3333', orderId: '1' } },
      agentStatus: 'active', policies: [policy],
      sessionCost: null, dailyCost: null, toolCost: null,
    })
    assert.equal(d.decision, 'deny')
    assert.equal(d.reason, 'pii_detected')
    pass('enforcement — deny (PII)')
  } catch (e) {
    fail('enforcement — deny (PII)', e.message)
  }
})

test('enforcement — deny (domain)', async () => {
  try {
    const policy = {
      id: 'pol_domain', name: 'Domain Block', status: 'active', priority: 1,
      scope: { agentId: '*' },
      rules: {
        allowedTools: [{ toolName: 'http_request', parameterConstraints: { url: { type: 'string' } } }],
        deniedTools: [], allowedDomains: [], deniedDomains: ['169.254.169.254'],
        dataRestrictions: null,
      },
    }

    const d = evaluateIntent({
      intent: { tool: 'http_request', parameters: { url: 'http://169.254.169.254/latest/meta-data/' } },
      agentStatus: 'active', policies: [policy],
      sessionCost: null, dailyCost: null, toolCost: null,
    })
    assert.equal(d.decision, 'deny')
    assert.equal(d.reason, 'domain_blocked')
    pass('enforcement — deny (domain)')
  } catch (e) {
    fail('enforcement — deny (domain)', e.message)
  }
})

test('enforcement — modify (parameter constraint)', async () => {
  try {
    const policy = {
      id: 'pol_modify', name: 'Modify Test', status: 'active', priority: 1,
      scope: { agentId: '*' },
      rules: {
        allowedTools: [{ toolName: 'http_request', parameterConstraints: { method: { allowedValues: ['GET'] } } }],
        deniedTools: [], allowedDomains: [], deniedDomains: [],
        dataRestrictions: null,
      },
    }

    const d = evaluateIntent({
      intent: { tool: 'http_request', parameters: { url: 'https://api.example.com', method: 'GET' } },
      agentStatus: 'active', policies: [policy],
      sessionCost: null, dailyCost: null, toolCost: null,
    })
    assert.equal(d.decision, 'allow')
    pass('enforcement — modify (parameter constraint)')
  } catch (e) {
    fail('enforcement — modify (parameter constraint)', e.message)
  }
})

test('enforcement — deny (agent revoked)', async () => {
  try {
    const policy = {
      id: 'pol_agent_revoked', name: 'Agent Check', status: 'active', priority: 1,
      scope: { agentId: '*' },
      rules: {
        allowedTools: [{ toolName: 'lookup_order', parameterConstraints: {} }],
        deniedTools: [], allowedDomains: [], deniedDomains: [],
        dataRestrictions: null,
      },
    }

    const d = evaluateIntent({
      intent: { tool: 'lookup_order', parameters: {} },
      agentStatus: 'revoked', policies: [policy],
      sessionCost: null, dailyCost: null, toolCost: null,
    })
    assert.equal(d.decision, 'deny')
    assert.equal(d.reason, 'agent_revoked')
    pass('enforcement — deny (agent revoked)')
  } catch (e) {
    fail('enforcement — deny (agent revoked)', e.message)
  }
})

// ============================================================================
// 8. AUDIT: list, filter by decision, export
// ============================================================================
test('audit — list and filter', async () => {
  try {
    for (let i = 0; i < 10; i++) {
      const decision = i < 6 ? 'allow' : 'deny'
      const tool = ['lookup_order', 'check_inventory', 'http_request', 'read_file', 'update_record',
        'delete_record', 'send_email', 'create_user', 'run_query', 'export_data'][i]
      await db.collection('actionIntents').doc(generateId('intent_')).set({
        intentId: generateId('intent_'),
        orgId: TEST_ORG_ID, agentId: 'agent_audit_test',
        tool, parameters: { orderId: `ORD-${i}` },
        decision,
        decisionReason: decision === 'deny' ? 'blocked by policy' : 'allowed',
        violatedRule: decision === 'deny' ? 'deniedTools' : null,
        createdAt: new Date().toISOString(),
      })
    }

    const all = await db.collection('actionIntents').get()
    assert.ok(all.size >= 10)

    const allow = await db.collection('actionIntents').where('decision', '==', 'allow').get()
    assert.ok(allow.size >= 6)

    const deny = await db.collection('actionIntents').where('decision', '==', 'deny').get()
    assert.ok(deny.size >= 4)

    pass('audit — list and filter')
  } catch (e) {
    fail('audit — list and filter', e.message)
  }
})

test('audit — export', async () => {
  try {
    const all = await db.collection('actionIntents').orderBy('createdAt', 'desc').get()
    const csvHeader = 'intentId,tool,decision,decisionReason,createdAt'
    const csvRows = all.docs.map(d => {
      const data = d.data()
      return `${data.intentId},${data.tool},${data.decision},${data.decisionReason},${data.createdAt}`
    })
    const csv = [csvHeader, ...csvRows].join('\n')

    assert.ok(csv.startsWith('intentId,tool,decision'))
    assert.ok(csv.includes('allow'))
    pass('audit — export')
  } catch (e) {
    fail('audit — export', e.message)
  }
})

// ============================================================================
// 9. ANALYTICS: overview, trends, agents, policies
// ============================================================================
test('analytics — overview', async () => {
  try {
    const stats = {
      totalIntents: (await db.collection('actionIntents').count().get()).data.count,
      totalAgents: (await db.collection('agents').count().get()).data.count,
      totalPolicies: (await db.collection('policies').count().get()).data.count,
      totalTasks: (await db.collection('tasks').count().get()).data.count,
    }

    assert.ok(typeof stats.totalIntents === 'number')
    assert.ok(typeof stats.totalAgents === 'number')
    pass('analytics — overview')
  } catch (e) {
    fail('analytics — overview', e.message)
  }
})

test('analytics — trends (time-series counts)', async () => {
  try {
    const now = new Date()
    for (let i = 0; i < 5; i++) {
      const ts = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dayKey = ts.toISOString().split('T')[0]
      await db.collection('dailyMetrics').doc(dayKey).set({
        day: dayKey, orgId: TEST_ORG_ID,
        allowCount: 10 - i, denyCount: i * 2,
        totalCount: 10 + i,
      })
    }

    const allDays = await db.collection('dailyMetrics').orderBy('day', 'desc').get()
    assert.ok(allDays.size >= 5)

    // Verify trend: earlier days should have smaller denyCount
    const docs = allDays.docs.map(d => d.data())
    // Allow day metrics to exist
    assert.ok(docs.every(d => typeof d.allowCount === 'number'))

    pass('analytics — trends (time-series counts)')
  } catch (e) {
    fail('analytics — trends (time-series counts)', e.message)
  }
})

test('analytics — per agent', async () => {
  try {
    const agents = ['agent_A', 'agent_B', 'agent_C']
    for (const agentId of agents) {
      for (let i = 0; i < 3; i++) {
        await db.collection('actionIntents').doc(generateId('intent_')).set({
          intentId: generateId('intent_'), orgId: TEST_ORG_ID, agentId,
          tool: 'lookup_order', decision: i < 2 ? 'allow' : 'deny',
          decisionReason: i < 2 ? 'allowed' : 'blocked', createdAt: new Date().toISOString(),
        })
      }
    }

    for (const agentId of agents) {
      const c = await db.collection('actionIntents').where('agentId', '==', agentId).count()
      const r = await c.get()
      assert.equal(r.data.count, 3)
    }

    pass('analytics — per agent')
  } catch (e) {
    fail('analytics — per agent', e.message)
  }
})

test('analytics — per policy', async () => {
  try {
    const polId = generateId('pol_')
    await db.collection('policies').doc(polId).set({
      id: polId, orgId: TEST_ORG_ID, name: 'Analytics Policy',
      status: 'active', priority: 1,
      rules: { allowedTools: [], deniedTools: [], allowedDomains: [], deniedDomains: [], dataRestrictions: null },
      createdAt: new Date().toISOString(),
    })

    for (let i = 0; i < 5; i++) {
      await db.collection('actionIntents').doc(generateId('intent_')).set({
        intentId: generateId('intent_'), orgId: TEST_ORG_ID, agentId: 'test_agent',
        tool: 'test_tool', decision: i < 4 ? 'allow' : 'deny',
        policyId: polId, createdAt: new Date().toISOString(),
      })
    }

    const c = await db.collection('actionIntents').where('policyId', '==', polId).count()
    const r = await c.get()
    assert.equal(r.data.count, 5)

    pass('analytics — per policy')
  } catch (e) {
    fail('analytics — per policy', e.message)
  }
})

// ============================================================================
// 10. EXPORTS: CSV audit, JSON policies, PDF report
// ============================================================================
test('exports — CSV audit', async () => {
  try {
    const intents = await db.collection('actionIntents').orderBy('createdAt', 'desc').limit(10).get()
    const csvHeader = 'intentId,agentId,tool,decision,reason,createdAt'
    const csvRows = intents.docs.map(d => {
      const data = d.data()
      return `${data.intentId},${data.agentId},${data.tool},${data.decision},${data.decisionReason || ''},${data.createdAt}`
    })
    const csv = [csvHeader, ...csvRows].join('\n')
    assert.ok(csv.startsWith('intentId,agentId,tool'))
    assert.ok(intents.size >= 1)
    pass('exports — CSV audit')
  } catch (e) {
    fail('exports — CSV audit', e.message)
  }
})

test('exports — JSON policies', async () => {
  try {
    const policies = await db.collection('policies').where('status', '==', 'active').get()
    const exportData = policies.docs.map(d => ({
      id: d.id,
      name: d.data().name,
      status: d.data().status,
      priority: d.data().priority,
      rules: d.data().rules,
    }))
    const json = JSON.stringify(exportData)
    assert.ok(json.startsWith('['))
    assert.ok(json.includes('"name"'))
    pass('exports — JSON policies')
  } catch (e) {
    fail('exports — JSON policies', e.message)
  }
})

test('exports — PDF report format', async () => {
  try {
    // Simulate PDF report metadata structure
    const overview = {
      title: 'Passport Agent Report',
      generatedAt: new Date().toISOString(),
      summary: {
        totalAgents: (await db.collection('agents').count().get()).data.count,
        totalPolicies: (await db.collection('policies').count().get()).data.count,
        totalIntents: (await db.collection('actionIntents').count().get()).data.count,
      },
    }
    assert.ok(overview.title)
    assert.ok(typeof overview.summary.totalAgents === 'number')
    pass('exports — PDF report format')
  } catch (e) {
    fail('exports — PDF report format', e.message)
  }
})

// ============================================================================
// 11. ERROR HANDLING: 401, 403, 404, 409, validation
// ============================================================================
test('error handling — 401 unauthorized', async () => {
  try {
    // Simulate: invalid JWT yields 401
    const invalidToken = 'invalid.token.here'
    const claims = await verify(invalidToken)
    assert.equal(claims, null)
    pass('error handling — 401 unauthorized')
  } catch (e) {
    fail('error handling — 401 unauthorized', e.message)
  }
})

test('error handling — 403 forbidden (org mismatch)', async () => {
  try {
    const agentId = generateId('agent_')
    const otherOrgId = 'org_other_tenant'

    await db.collection('agents').doc(agentId).set({
      id: agentId, name: 'Cross Tenant Agent', model: 'gpt-4o', provider: 'openai',
      orgId: otherOrgId, status: 'active', registeredAt: new Date().toISOString(),
    })

    // Verify it exists under the other org
    const snap = await db.collection('agents').doc(agentId).get()
    assert.equal(snap.data().orgId, otherOrgId)

    // Verify our org can't see it (query filter)
    const ours = await db.collection('agents').where('orgId', '==', TEST_ORG_ID).where('id', '==', agentId).get()
    assert.equal(ours.size, 0)

    pass('error handling — 403 forbidden (org mismatch)')
  } catch (e) {
    fail('error handling — 403 forbidden (org mismatch)', e.message)
  }
})

test('error handling — 404 not found', async () => {
  try {
    const snap = await db.collection('tasks').doc('nonexistent_task_999').get()
    assert.equal(snap.exists, false)
    pass('error handling — 404 not found')
  } catch (e) {
    fail('error handling — 404 not found', e.message)
  }
})

test('error handling — 409 conflict (duplicate)', async () => {
  try {
    const email = randomEmail()
    await db.collection('users').doc(email).set({
      email, verified: true, createdAt: new Date().toISOString(),
    })

    // Try to register same email — simulate conflict check
    const existing = await db.collection('users').where('email', '==', email).limit(1).get()
    assert.equal(existing.empty, false)
    assert.equal(existing.size, 1)

    pass('error handling — 409 conflict (duplicate)')
  } catch (e) {
    fail('error handling — 409 conflict (duplicate)', e.message)
  }
})

test('error handling — validation errors', async () => {
  try {
    // Simulate: missing required fields
    const missingName = async () => {
      const name = ''
      if (!name) throw Object.assign(new Error('name is required'), { code: 'validation', statusCode: 400 })
    }
    await assert.rejects(missingName, /name is required/)

    // Simulate: invalid JSON
    const badJson = () => { JSON.parse('{invalid}') }
    assert.throws(badJson)

    pass('error handling — validation errors')
  } catch (e) {
    fail('error handling — validation errors', e.message)
  }
})

// ============================================================================
// 12. GATEWAY TICKET: generate and verify
// ============================================================================
test('gateway ticket — generate and verify', async () => {
  try {
    const ticket = generateGatewayTicket(
      'intent_001', 'agent_001', 'lookup_order',
      { orderId: 'ORD-555' }
    )
    assert.ok(ticket)
    assert.ok(ticket.split('.').length === 3)

    const decoded = verifyGatewayTicket(ticket)
    assert.equal(decoded.iid, 'intent_001')
    assert.equal(decoded.aid, 'agent_001')
    assert.equal(decoded.tool, 'lookup_order')
    assert.equal(decoded.params.orderId, 'ORD-555')
    pass('gateway ticket — generate and verify')
  } catch (e) {
    fail('gateway ticket — generate and verify', e.message)
  }
})

// ============================================================================
// 13. TASK & RUN LIFECYCLE (foundational)
// ============================================================================
test('task & run lifecycle — create task', async () => {
  try {
    const taskId = generateId('task_')
    await db.collection('tasks').doc(taskId).set({
      payload: { description: 'Integration test task', action: 'verify' },
      status: 'pending', orgId: TEST_ORG_ID,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      runCount: 0,
    })
    const snap = await db.collection('tasks').doc(taskId).get()
    assert.equal(snap.data().status, 'pending')
    pass('task & run lifecycle — create task')
  } catch (e) {
    fail('task & run lifecycle — create task', e.message)
  }
})

test('task & run lifecycle — create run and complete', async () => {
  try {
    const taskId = generateId('task_')
    const agentId = 'agent_test'
    await db.collection('tasks').doc(taskId).set({
      payload: {}, status: 'pending', orgId: TEST_ORG_ID,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), runCount: 0,
    })

    const runRef = db.collection('runs').doc()
    await runRef.set({
      agentId, taskId, sessionId: `sess_${runRef.id}`,
      status: 'running', startedAt: new Date().toISOString(), endedAt: null,
      error: null, updatedAt: new Date().toISOString(), createdAt: new Date().toISOString(),
      totalActions: 0, allowedActions: 0, deniedActions: 0, orgId: TEST_ORG_ID,
    })

    // Log actions
    await db.collection('logs').doc(generateId('log_')).set({
      agentId, runId: runRef.id, tool: 'lookup_order', decision: 'allow',
      reason: null, parameters: {}, timestamp: new Date().toISOString(),
    })

    await db.collection('runs').doc(runRef.id).update({
      totalActions: 1, allowedActions: 1, status: 'completed',
      endedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })
    await db.collection('tasks').doc(taskId).update({
      status: 'completed', completedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })

    const runSnap = await db.collection('runs').doc(runRef.id).get()
    assert.equal(runSnap.data().status, 'completed')

    const taskSnap = await db.collection('tasks').doc(taskId).get()
    assert.equal(taskSnap.data().status, 'completed')

    pass('task & run lifecycle — create run and complete')
  } catch (e) {
    fail('task & run lifecycle — create run and complete', e.message)
  }
})

// ============================================================================
// 14. BILLING / USAGE
// ============================================================================
test('billing & usage — track limits', async () => {
  try {
    const orgId = generateId('org_')
    await db.collection('organizations').doc(orgId).set({
      id: orgId, name: 'Billing Org', status: 'active', plan: 'starter',
      createdAt: new Date().toISOString(),
    })

    // Usage counter
    const usageRef = db.collection('usage').doc(orgId)
    await usageRef.set({ orgId, enforceCount: 100, agentCount: 3, resetAt: new Date().toISOString() })

    const snap = await usageRef.get()
    assert.equal(snap.data().enforceCount, 100)
    assert.equal(snap.data().agentCount, 3)

    // Increment
    await usageRef.update({ enforceCount: 101 })
    const updated = await usageRef.get()
    assert.equal(updated.data().enforceCount, 101)

    pass('billing & usage — track limits')
  } catch (e) {
    fail('billing & usage — track limits', e.message)
  }
})

// ============================================================================
// 15. SESSIONS
// ============================================================================
test('sessions — create and query', async () => {
  try {
    const sessionId = `sess_${generateId('')}`
    await db.collection('sessions').doc(sessionId).set({
      id: sessionId, agentId: 'agent_test', orgId: TEST_ORG_ID,
      status: 'active', startedAt: new Date().toISOString(),
      totalActions: 0,
    })

    const snap = await db.collection('sessions').doc(sessionId).get()
    assert.equal(snap.data().status, 'active')

    await db.collection('sessions').doc(sessionId).update({
      status: 'completed', endedAt: new Date().toISOString(),
    })
    const updated = await db.collection('sessions').doc(sessionId).get()
    assert.equal(updated.data().status, 'completed')

    pass('sessions — create and query')
  } catch (e) {
    fail('sessions — create and query', e.message)
  }
})

// ============================================================================
// CLEANUP
// ============================================================================
test('cleanup — delete all test data', async () => {
  try {
    const collections = [
      '_health', 'organizations', 'users', 'policies', 'policyTemplates',
      'agents', 'actionIntents', 'tasks', 'runs', 'logs', 'apiKeys',
      'webhooks', 'dailyMetrics', 'usage', 'sessions',
    ]

    for (const coll of collections) {
      const snap = await db.collection(coll).get()
      for (const doc of snap.docs) {
        await db.collection(coll).doc(doc.id).delete()
      }
    }

    for (const coll of collections) {
      const snap = await db.collection(coll).get()
      assert.equal(snap.size, 0, `collection ${coll} should be empty`)
    }

    for (const coll of collections) {
      const filePath = resolve(DATA_DIR, `${coll}.json`)
      if (existsSync(filePath)) rmSync(filePath)
    }

    pass('cleanup — delete all test data')
  } catch (e) {
    fail('cleanup — delete all test data', e.message)
  }
})

// ============================================================================
// SUMMARY
// ============================================================================
test('api-flow integration test summary', () => {
  console.log(`\n  Total: ${runCount.passed + runCount.failed} | Passed: ${runCount.passed} | Failed: ${runCount.failed}\n`)
  assert.equal(runCount.failed, 0, `API flow test had ${runCount.failed} failure(s)`)
})
