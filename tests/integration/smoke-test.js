import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { randomBytes } from 'node:crypto'
import { mkdirSync, rmSync, existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

// Set env vars BEFORE any dist/ module imports (which run top-level checks)
process.env.NODE_ENV = 'development'
process.env.JWT_SECRET = randomBytes(32).toString('hex')
process.env.ENGINE_SECRET = randomBytes(32).toString('hex')
process.env.DEFAULT_ORG_ID = 'org_smoke_test'
delete process.env.FIREBASE_PROJECT_ID

// Dynamic imports to ensure env vars are set before module evaluation
const { LocalFirestore } = await import('../../dist/lib/local-store.js')
const { hashPassword, verifyPassword } = await import('../../dist/lib/password.js')
const { sign, verify } = await import('../../dist/lib/jwt.js')
const { generateId, hashKey, verifyKey } = await import('../../dist/lib/crypto.js')

const require = createRequire(import.meta.url)
const { evaluateIntent } = require('../../netlify/functions/src/engine/evaluator.js')

const DATA_DIR = resolve(process.cwd(), 'data')
const TEST_ORG_ID = 'org_smoke_test'

function ensureCleanDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
    return
  }
  // Remove stale data from prior runs
  try {
    for (const file of readdirSync(DATA_DIR)) {
      if (file.endsWith('.json')) rmSync(resolve(DATA_DIR, file))
    }
  } catch {}
}

ensureCleanDataDir()
const db = new LocalFirestore()

function randomEmail() {
  return `test_${randomBytes(4).toString('hex')}@smoke.test`
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
// Test 1: Health check
// ============================================================================
test('health check — local store is operational', async () => {
  try {
    const healthRef = db.collection('_health').doc('check')
    await healthRef.set({ status: 'ok', ts: new Date().toISOString() })
    const snap = await healthRef.get()
    assert.ok(snap.exists)
    assert.equal(snap.data().status, 'ok')
    pass('health check — local store is operational')
  } catch (e) {
    fail('health check — local store is operational', e.message)
  }
})

// ============================================================================
// Test 2: Organization creation (seed)
// ============================================================================
test('organization creation — seed org data', async () => {
  try {
    const orgId = generateId('org_')
    await db.collection('organizations').doc(orgId).set({
      id: orgId,
      name: 'Smoke Test Org',
      status: 'active',
      plan: 'free',
      createdAt: new Date().toISOString(),
    })
    const snap = await db.collection('organizations').doc(orgId).get()
    assert.ok(snap.exists)
    assert.equal(snap.data().name, 'Smoke Test Org')
    pass('organization creation — seed org data')
  } catch (e) {
    fail('organization creation — seed org data', e.message)
  }
})

// ============================================================================
// Test 3: User registration
// ============================================================================
test('user registration — create user with hashed password', async () => {
  try {
    const email = randomEmail()
    const { hash, salt } = hashPassword('securePass1!')
    const verificationToken = `verify_${randomUUID()}`

    await db.collection('users').doc(email).set({
      email,
      displayName: 'Smoke Test User',
      role: 'org_admin',
      orgId: TEST_ORG_ID,
      passwordHash: hash,
      passwordSalt: salt,
      verified: false,
      verificationToken,
      createdAt: new Date().toISOString(),
    })

    const snap = await db.collection('users').doc(email).get()
    assert.ok(snap.exists)
    assert.equal(snap.data().verified, false)
    assert.ok(snap.data().passwordHash)
    assert.ok(snap.data().passwordSalt)
    pass('user registration — create user with hashed password')
  } catch (e) {
    fail('user registration — create user with hashed password', e.message)
  }
})

// ============================================================================
// Test 4: User login (get JWT)
// ============================================================================
test('user login — verify password and issue JWT', async () => {
  try {
    const email = randomEmail()
    const password = 'loginPass1!'
    const { hash, salt } = hashPassword(password)

    await db.collection('users').doc(email).set({
      email,
      displayName: 'Login User',
      role: 'org_admin',
      orgId: TEST_ORG_ID,
      passwordHash: hash,
      passwordSalt: salt,
      verified: true,
      createdAt: new Date().toISOString(),
    })

    // Verify password
    assert.equal(verifyPassword(password, hash, salt), true)
    assert.equal(verifyPassword('wrongPass1!', hash, salt), false)

    // Issue JWT
    const token = createTestToken(email)
    assert.ok(token.length > 20)
    assert.ok(token.includes('.'))

    // Verify JWT
    const claims = await verify(token)
    assert.ok(claims !== null)
    assert.equal(claims.sub, email)
    assert.equal(claims.role, 'org_admin')
    pass('user login — verify password and issue JWT')
  } catch (e) {
    fail('user login — verify password and issue JWT', e.message)
  }
})

// ============================================================================
// Test 5: Email verification
// ============================================================================
test('email verification — update verified flag', async () => {
  try {
    const email = randomEmail()
    const verificationToken = `verify_${randomUUID()}`

    await db.collection('users').doc(email).set({
      email,
      verified: false,
      verificationToken,
      createdAt: new Date().toISOString(),
    })

    const snap = await db.collection('users').where('verificationToken', '==', verificationToken).get()
    assert.equal(snap.size, 1)
    assert.equal(snap.docs[0].data().verified, false)

    await db.collection('users').doc(snap.docs[0].id).update({
      verified: true,
      verificationToken: null,
    })

    const updatedSnap = await db.collection('users').doc(snap.docs[0].id).get()
    assert.equal(updatedSnap.data().verified, true)
    assert.equal(updatedSnap.data().verificationToken, null)
    pass('email verification — update verified flag')
  } catch (e) {
    fail('email verification — update verified flag', e.message)
  }
})

// ============================================================================
// Test 6: Create policy
// ============================================================================
test('create policy — store policy in local store', async () => {
  try {
    const policyId = generateId('pol_')
    await db.collection('policies').doc(policyId).set({
      id: policyId,
      orgId: TEST_ORG_ID,
      name: 'Smoke Test Policy',
      status: 'active',
      priority: 10,
      scope: { agentId: '*', environment: ['*'] },
      rules: {
        allowedTools: [
          { toolName: 'lookup_order', parameterConstraints: { orderId: { type: 'string', minLength: 1 } } },
          { toolName: 'http_request', parameterConstraints: { url: { type: 'string' } } },
        ],
        deniedTools: ['send_email', 'delete_record'],
        allowedDomains: [
          { pattern: '*.internal.com', methods: ['GET'] },
        ],
        deniedDomains: ['*.evil.com', '169.254.169.254'],
        dataRestrictions: { denyPiiInParameters: true },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    const snap = await db.collection('policies').doc(policyId).get()
    assert.ok(snap.exists)
    assert.equal(snap.data().name, 'Smoke Test Policy')
    assert.equal(snap.data().status, 'active')
    assert.deepEqual(snap.data().rules.deniedTools, ['send_email', 'delete_record'])
    pass('create policy — store policy in local store')
  } catch (e) {
    fail('create policy — store policy in local store', e.message)
  }
})

// ============================================================================
// Test 7: List policies
// ============================================================================
test('list policies — query policies', async () => {
  try {
    for (let i = 1; i <= 3; i++) {
      await db.collection('policies').doc(`pol_list_${i}`).set({
        id: `pol_list_${i}`,
        orgId: TEST_ORG_ID,
        name: `List Policy ${i}`,
        status: i === 3 ? 'draft' : 'active',
        priority: i * 10,
        createdAt: new Date().toISOString(),
      })
    }

    // Active = 2 from this test + any from prior tests
    const activeSnap = await db.collection('policies').where('status', '==', 'active').get()
    assert.ok(activeSnap.size >= 2)
    assert.ok(activeSnap.docs.every(d => d.data().status === 'active'))

    const limitedSnap = await db.collection('policies').limit(2).get()
    assert.equal(limitedSnap.size, 2)
    pass('list policies — query policies')
  } catch (e) {
    fail('list policies — query policies', e.message)
  }
})

// ============================================================================
// Test 8: Register agent
// ============================================================================
test('register agent — store agent in local store', async () => {
  try {
    const agentId = generateId('agent_')
    await db.collection('agents').doc(agentId).set({
      id: agentId,
      name: 'Smoke Test Agent',
      model: 'gpt-4o',
      provider: 'openai',
      orgId: TEST_ORG_ID,
      status: 'active',
      passport: {
        passportNumber: 'PP-TEST-X1',
        model: 'gpt-4o',
        provider: 'openai',
      },
      registeredAt: new Date().toISOString(),
      lastSeenAt: null,
      revokedAt: null,
      metadata: {},
    })

    const snap = await db.collection('agents').doc(agentId).get()
    assert.ok(snap.exists)
    assert.equal(snap.data().status, 'active')
    assert.equal(snap.data().name, 'Smoke Test Agent')
    assert.equal(snap.data().passport.passportNumber, 'PP-TEST-X1')
    pass('register agent — store agent in local store')
  } catch (e) {
    fail('register agent — store agent in local store', e.message)
  }
})

// ============================================================================
// Test 9: List agents
// ============================================================================
test('list agents — query agents', async () => {
  try {
    for (let i = 1; i <= 3; i++) {
      await db.collection('agents').doc(`agent_list_${i}`).set({
        id: `agent_list_${i}`,
        name: `List Agent ${i}`,
        model: 'gpt-4o',
        provider: 'openai',
        orgId: TEST_ORG_ID,
        status: i === 2 ? 'revoked' : 'active',
        registeredAt: new Date().toISOString(),
      })
    }

    const activeSnap = await db.collection('agents').where('status', '==', 'active').get()
    assert.ok(activeSnap.size >= 2)

    const allSnap = await db.collection('agents').get()
    assert.ok(allSnap.size >= 3)
    pass('list agents — query agents')
  } catch (e) {
    fail('list agents — query agents', e.message)
  }
})

// ============================================================================
// Test 10: Enforce (allow)
// ============================================================================
test('enforce (allow) — evaluate allowed intent', async () => {
  try {
    const policyId = generateId('pol_')
    await db.collection('policies').doc(policyId).set({
      id: policyId,
      name: 'Allow Policy',
      orgId: TEST_ORG_ID,
      status: 'active',
      priority: 1,
      scope: { agentId: '*' },
      rules: {
        allowedTools: [
          { toolName: 'lookup_order', parameterConstraints: { orderId: { type: 'string', minLength: 1 } } },
        ],
        deniedTools: [],
        allowedDomains: [],
        deniedDomains: [],
        dataRestrictions: null,
      },
      createdAt: new Date().toISOString(),
    })

    const decision = evaluateIntent({
      intent: { tool: 'lookup_order', parameters: { orderId: 'ORD-123' } },
      agentStatus: 'active',
      policies: [{
        id: policyId,
        name: 'Allow Policy',
        status: 'active',
        priority: 1,
        scope: { agentId: '*' },
        rules: {
          allowedTools: [
            { toolName: 'lookup_order', parameterConstraints: { orderId: { type: 'string', minLength: 1 } } },
          ],
          deniedTools: [],
          allowedDomains: [],
          deniedDomains: [],
          dataRestrictions: null,
        },
      }],
      sessionCost: null,
      dailyCost: null,
      toolCost: null,
    })

    assert.equal(decision.decision, 'allow')
    pass('enforce (allow) — evaluate allowed intent')
  } catch (e) {
    fail('enforce (allow) — evaluate allowed intent', e.message)
  }
})

// ============================================================================
// Test 11: Enforce (deny)
// ============================================================================
test('enforce (deny) — block denied tool, SSRF, PII', async () => {
  try {
    const policyWithDeny = {
      id: 'pol_deny_test',
      name: 'Deny Test Policy',
      status: 'active',
      priority: 1,
      scope: { agentId: '*' },
      rules: {
        allowedTools: [
          { toolName: 'lookup_order', parameterConstraints: {} },
        ],
        deniedTools: ['send_email', 'delete_record'],
        allowedDomains: [],
        deniedDomains: ['*.evil.com'],
        dataRestrictions: null,
      },
    }

    // Denied tool blocked
    const d1 = evaluateIntent({
      intent: { tool: 'send_email', parameters: { to: 'evil@evil.com' } },
      agentStatus: 'active', policies: [policyWithDeny],
      sessionCost: null, dailyCost: null, toolCost: null,
    })
    assert.equal(d1.decision, 'deny')
    assert.equal(d1.reason, 'tool_explicitly_blocked')

    // Unknown tool
    const d2 = evaluateIntent({
      intent: { tool: 'unknown_tool', parameters: {} },
      agentStatus: 'active', policies: [policyWithDeny],
      sessionCost: null, dailyCost: null, toolCost: null,
    })
    assert.equal(d2.decision, 'deny')
    assert.equal(d2.reason, 'tool_not_permitted')

    // PII detection
    const policyPii = {
      id: 'pol_pii_test', name: 'PII Test', status: 'active', priority: 1,
      scope: { agentId: '*' },
      rules: {
        allowedTools: [{ toolName: 'lookup_order', parameterConstraints: {} }],
        deniedTools: [], allowedDomains: [], deniedDomains: [],
        dataRestrictions: { denyPiiInParameters: true },
      },
    }
    const d3 = evaluateIntent({
      intent: { tool: 'lookup_order', parameters: { orderId: '1', ssn: '123-45-6789' } },
      agentStatus: 'active', policies: [policyPii],
      sessionCost: null, dailyCost: null, toolCost: null,
    })
    assert.equal(d3.decision, 'deny')
    assert.equal(d3.reason, 'pii_detected')

    // SSRF prevention
    const policySsr = {
      id: 'pol_ssrf', name: 'SSRF Test', status: 'active', priority: 1,
      scope: { agentId: '*' },
      rules: {
        allowedTools: [{ toolName: 'http_request', parameterConstraints: { url: { type: 'string' } } }],
        deniedTools: [], allowedDomains: [], deniedDomains: ['169.254.169.254'],
        dataRestrictions: null,
      },
    }
    const d4 = evaluateIntent({
      intent: { tool: 'http_request', parameters: { url: 'http://169.254.169.254/latest/meta-data' } },
      agentStatus: 'active', policies: [policySsr],
      sessionCost: null, dailyCost: null, toolCost: null,
    })
    assert.equal(d4.decision, 'deny')
    assert.equal(d4.reason, 'domain_blocked')

    // Agent status check
    const d5 = evaluateIntent({
      intent: { tool: 'lookup_order', parameters: {} },
      agentStatus: 'revoked', policies: [policyWithDeny],
      sessionCost: null, dailyCost: null, toolCost: null,
    })
    assert.equal(d5.decision, 'deny')
    assert.equal(d5.reason, 'agent_revoked')

    pass('enforce (deny) — block denied tool, SSRF, PII')
  } catch (e) {
    fail('enforce (deny) — block denied tool, SSRF, PII', e.message)
  }
})

// ============================================================================
// Test 12: Audit log
// ============================================================================
test('audit log — create and query actionIntents', async () => {
  try {
    for (let i = 0; i < 5; i++) {
      const intentId = generateId('intent_')
      const decision = i < 3 ? 'allow' : 'deny'
      const tool = ['lookup_order', 'check_inventory', 'http_request', 'send_email', 'read_file'][i]
      await db.collection('actionIntents').doc(intentId).set({
        intentId, orgId: TEST_ORG_ID, agentId: 'agent_smoke_test',
        tool, parameters: { orderId: `ORD-${i}` },
        decision,
        decisionReason: decision === 'deny' ? 'blocked by policy' : 'allowed',
        violatedRule: decision === 'deny' ? 'deniedTools' : null,
        createdAt: new Date().toISOString(),
      })
    }

    const allSnap = await db.collection('actionIntents').get()
    assert.ok(allSnap.size >= 5)

    const allowSnap = await db.collection('actionIntents').where('decision', '==', 'allow').get()
    assert.ok(allowSnap.size >= 3)

    const denySnap = await db.collection('actionIntents').where('decision', '==', 'deny').get()
    assert.ok(denySnap.size >= 2)
    pass('audit log — create and query actionIntents')
  } catch (e) {
    fail('audit log — create and query actionIntents', e.message)
  }
})

// ============================================================================
// Test 13: Task creation & lifecycle
// ============================================================================
test('task creation & lifecycle — create and transition task', async () => {
  try {
    const taskRef = db.collection('tasks').doc()
    const now = new Date().toISOString()
    await taskRef.set({
      payload: { description: 'Test task', action: 'analyze' },
      status: 'pending', orgId: TEST_ORG_ID,
      createdAt: now, updatedAt: now, runCount: 0,
    })

    const taskId = taskRef.id
    let snap = await db.collection('tasks').doc(taskId).get()
    assert.equal(snap.data().status, 'pending')

    // pending -> queued -> running -> completed
    await db.collection('tasks').doc(taskId).update({
      status: 'queued', queuedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })
    snap = await db.collection('tasks').doc(taskId).get()
    assert.equal(snap.data().status, 'queued')

    await db.collection('tasks').doc(taskId).update({
      status: 'running', startedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), runCount: 1,
    })
    snap = await db.collection('tasks').doc(taskId).get()
    assert.equal(snap.data().status, 'running')

    await db.collection('tasks').doc(taskId).update({
      status: 'completed', completedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })
    snap = await db.collection('tasks').doc(taskId).get()
    assert.equal(snap.data().status, 'completed')

    // Failed path
    const failRef = db.collection('tasks').doc()
    await failRef.set({ payload: {}, status: 'pending', orgId: TEST_ORG_ID, createdAt: now })
    await failRef.update({ status: 'failed', failedAt: new Date().toISOString() })
    const failSnap = await failRef.get()
    assert.equal(failSnap.data().status, 'failed')

    pass('task creation & lifecycle — create and transition task')
  } catch (e) {
    fail('task creation & lifecycle — create and transition task', e.message)
  }
})

// ============================================================================
// Test 14: Run lifecycle
// ============================================================================
test('run lifecycle — create run, log actions, complete', async () => {
  try {
    const agentId = 'agent_smoke_test'
    const taskId = generateId('task_')
    const runRef = db.collection('runs').doc()
    const now = new Date().toISOString()

    await runRef.set({
      agentId, taskId, sessionId: `sess_${runRef.id}`,
      status: 'running', startedAt: now, endedAt: null, error: null,
      updatedAt: now, createdAt: now,
      totalActions: 0, allowedActions: 0, deniedActions: 0, orgId: TEST_ORG_ID,
    })

    const runId = runRef.id
    let runSnap = await db.collection('runs').doc(runId).get()
    assert.equal(runSnap.data().status, 'running')

    // Log allowed + denied actions
    await db.collection('logs').doc(generateId('log_')).set({
      agentId, runId, tool: 'lookup_order', decision: 'allow',
      reason: null, parameters: { orderId: '123' }, timestamp: new Date().toISOString(),
    })
    await db.collection('logs').doc(generateId('log_')).set({
      agentId, runId, tool: 'send_email', decision: 'deny',
      reason: 'tool_explicitly_blocked', parameters: { to: 'evil@evil.com' }, timestamp: new Date().toISOString(),
    })

    await db.collection('runs').doc(runId).update({
      totalActions: 2, allowedActions: 1, deniedActions: 1,
    })

    // Complete
    await db.collection('runs').doc(runId).update({
      status: 'completed', endedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })

    runSnap = await db.collection('runs').doc(runId).get()
    assert.equal(runSnap.data().status, 'completed')
    assert.equal(runSnap.data().totalActions, 2)

    const logSnap = await db.collection('logs').where('runId', '==', runId).get()
    assert.equal(logSnap.size, 2)
    pass('run lifecycle — create run, log actions, complete')
  } catch (e) {
    fail('run lifecycle — create run, log actions, complete', e.message)
  }
})

// ============================================================================
// Test 15: API key creation & rotation
// ============================================================================
test('API key creation & rotation — create, verify, rotate', async () => {
  try {
    const plaintextKey = `passport_${randomUUID()}`
    const { hash, salt } = hashKey(plaintextKey)
    const keyId = generateId('key_')

    await db.collection('apiKeys').doc(keyId).set({
      id: keyId, orgId: TEST_ORG_ID, name: 'Smoke Test Key',
      keyHash: hash, keySalt: salt, keyPrefix: plaintextKey.substring(0, 8),
      scopes: ['read', 'write'], createdAt: new Date().toISOString(),
      lastUsedAt: null, requestCount: 0, status: 'active',
    })

    const keySnap = await db.collection('apiKeys').doc(keyId).get()
    assert.ok(verifyKey(plaintextKey, keySnap.data().keyHash, keySnap.data().keySalt))
    assert.equal(verifyKey('wrong_key_value_123', keySnap.data().keyHash, keySnap.data().keySalt), false)

    // Rotate
    await db.collection('apiKeys').doc(keyId).update({
      status: 'revoked', revokedAt: new Date().toISOString(),
    })

    const newKey = `passport_${randomUUID()}`
    const { hash: nh, salt: ns } = hashKey(newKey)
    const newKeyId = generateId('key_')

    await db.collection('apiKeys').doc(newKeyId).set({
      id: newKeyId, orgId: TEST_ORG_ID, name: 'Smoke Test Key',
      keyHash: nh, keySalt: ns, keyPrefix: newKey.substring(0, 8),
      scopes: ['read', 'write'], createdAt: new Date().toISOString(),
      lastUsedAt: null, requestCount: 0, status: 'active',
    })

    assert.ok(verifyKey(newKey, (await db.collection('apiKeys').doc(newKeyId).get()).data().keyHash,
      (await db.collection('apiKeys').doc(newKeyId).get()).data().keySalt))
    assert.equal((await db.collection('apiKeys').doc(keyId).get()).data().status, 'revoked')
    pass('API key creation & rotation — create, verify, rotate')
  } catch (e) {
    fail('API key creation & rotation — create, verify, rotate', e.message)
  }
})

// ============================================================================
// Test 16: Cleanup
// ============================================================================
test('cleanup — delete test data', async () => {
  try {
    const collections = ['_health', 'organizations', 'users', 'policies', 'agents',
      'actionIntents', 'tasks', 'runs', 'logs', 'apiKeys']

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

    pass('cleanup — delete test data')
  } catch (e) {
    fail('cleanup — delete test data', e.message)
  }
})

// ============================================================================
// Summary
// ============================================================================
test('smoke test summary', () => {
  console.log(`\n  Total: ${runCount.passed + runCount.failed} | Passed: ${runCount.passed} | Failed: ${runCount.failed}\n`)
  assert.equal(runCount.failed, 0, `Smoke test had ${runCount.failed} failure(s)`)
})
