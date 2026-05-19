// Test utilities — helpers for creating and cleaning up test data
// These helpers use Firestore directly for fast, reliable test setup/teardown

import { initFirebase } from '../../src/lib/firebase.js'
import { log } from '../../src/lib/logger.js'
import { verify } from '../../src/lib/jwt.js'
import { generateId } from '../../src/lib/crypto.js'

const db = initFirebase()
const API = process.env.API_URL || 'http://localhost:3000'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'
const TEST_EMAIL = process.env.TEST_EMAIL || 'admin@acmecorp.com'

export interface TestAgent {
  id: string
  name: string
  model: string
  provider: string
  secretKey: string
}

export interface TestPolicy {
  id: string
  name: string
  rules: Record<string, unknown>
}

export interface TestTask {
  id: string
  payload: Record<string, unknown>
  status: string
}

// Track all test-created document IDs for cleanup
const testDocIds: { collection: string; id: string }[] = []

export async function getAuthToken(): Promise<string> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: ADMIN_PASSWORD }),
  })
  const data = await res.json()
  if (!data.token) {
    throw new Error(`Login failed: ${JSON.stringify(data)}`)
  }
  return data.token
}

export function verifyJwt(token: string): boolean {
  const claims = verify(token)
  return claims !== null
}

export async function createTestAgent(token: string, overrides?: Partial<TestAgent>): Promise<TestAgent> {
  const res = await fetch(`${API}/agents/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: overrides?.name || `Test Agent ${Date.now()}`,
      model: overrides?.model || 'gpt-4o',
      provider: overrides?.provider || 'openai',
    }),
  })
  const data = await res.json()
  if (!data.agentId) {
    throw new Error(`Agent creation failed: ${JSON.stringify(data)}`)
  }
  testDocIds.push({ collection: 'agents', id: data.agentId })
  return {
    id: data.agentId,
    name: data.name || overrides?.name || 'Test Agent',
    model: data.model || overrides?.model || 'gpt-4o',
    provider: data.provider || overrides?.provider || 'openai',
    secretKey: data.secretKey || '',
  }
}

export async function createTestPolicy(token: string, overrides?: Partial<TestPolicy>): Promise<TestPolicy> {
  const res = await fetch(`${API}/policies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: overrides?.name || `Test Policy ${Date.now()}`,
      priority: 1,
      scope: { agentId: '*' },
      rules: overrides?.rules || {
        allowedTools: [{ toolName: 'lookup_order', parameterConstraints: {} }],
        deniedTools: ['send_email'],
        allowedDomains: [{ pattern: '*.internal.com', methods: ['GET'] }],
        deniedDomains: ['*.evil.com', '169.254.169.254'],
        dataRestrictions: { denyPiiInParameters: true },
      },
    }),
  })
  const data = await res.json()
  if (!data.id) {
    throw new Error(`Policy creation failed: ${JSON.stringify(data)}`)
  }
  testDocIds.push({ collection: 'policies', id: data.id })
  return {
    id: data.id,
    name: data.name || overrides?.name || 'Test Policy',
    rules: data.rules || overrides?.rules || {},
  }
}

export async function createTestTask(token: string, overrides?: Partial<TestTask>): Promise<TestTask> {
  const res = await fetch(`${API}/task`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      payload: overrides?.payload || { description: `Test task ${Date.now()}`, testId: generateId('test_') },
    }),
  })
  const data = await res.json()
  if (!data.id) {
    throw new Error(`Task creation failed: ${JSON.stringify(data)}`)
  }
  testDocIds.push({ collection: 'tasks', id: data.id })
  return {
    id: data.id,
    payload: data.payload || overrides?.payload || {},
    status: data.status || 'pending',
  }
}

export async function cleanupTestData(): Promise<void> {
  const batch = db.batch()
  let count = 0

  for (const { collection, id } of testDocIds) {
    try {
      batch.delete(db.collection(collection).doc(id))
      count++
    } catch (e: any) {
      log.warn('cleanup failed for doc', { collection, id, error: e.message })
    }
  }

  if (count > 0) {
    await batch.commit()
    log.success('test data cleaned up', { deleted: count })
  }

  testDocIds.length = 0
}

export async function api(method: string, path: string, token?: string, body?: any) {
  const opts: any = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (token) opts.headers['Authorization'] = `Bearer ${token}`
  if (body) opts.body = JSON.stringify(body)
  try {
    const res = await fetch(`${API}${path}`, opts)
    return { status: res.status, data: await res.json() }
  } catch (e: any) {
    return { status: 0, data: { error: { code: 'network', message: e.message } } }
  }
}

// Firestore helpers for direct database operations in tests
export function getFirestore() {
  return db
}

export async function createTestRun(agentId: string, taskId: string): Promise<string> {
  const runRef = db.collection('runs').doc()
  const now = new Date().toISOString()
  await runRef.set({
    agentId,
    taskId,
    sessionId: `sess_${runRef.id}`,
    status: 'running',
    startedAt: now,
    endedAt: null,
    error: null,
    updatedAt: now,
    createdAt: now,
    totalActions: 0,
    allowedActions: 0,
    deniedActions: 0,
  })
  testDocIds.push({ collection: 'runs', id: runRef.id })
  return runRef.id
}

export async function createTestSession(agentId: string): Promise<string> {
  const sessionRef = db.collection('sessions').doc()
  const now = new Date().toISOString()
  await sessionRef.set({
    agentId,
    status: 'active',
    startedAt: now,
    updatedAt: now,
  })
  testDocIds.push({ collection: 'sessions', id: sessionRef.id })
  return sessionRef.id
}

export async function createTestAuditEntry(agentId: string, overrides?: any): Promise<string> {
  const intentRef = db.collection('actionIntents').doc()
  const now = new Date().toISOString()
  await intentRef.set({
    intentId: intentRef.id,
    agentId,
    tool: overrides?.tool || 'lookup_order',
    parameters: overrides?.parameters || { orderId: '123' },
    decision: overrides?.decision || 'allow',
    decisionReason: overrides?.reason || null,
    violatedRule: null,
    createdAt: now,
    ...overrides,
  })
  testDocIds.push({ collection: 'actionIntents', id: intentRef.id })
  return intentRef.id
}
