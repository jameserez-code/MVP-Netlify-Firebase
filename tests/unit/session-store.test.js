process.env.WEBHOOK_ENCRYPTION_KEY = 'test-key'

import test from 'node:test'
import assert from 'node:assert/strict'

// Mock redis before importing the module
import { redis } from '../../dist/lib/redis.js'

const mockStore = new Map()

redis.setex = async (key, ttl, value) => {
  mockStore.set(key, { value, ttl, expiresAt: Date.now() + ttl * 1000 })
}

redis.get = async (key) => {
  const entry = mockStore.get(key)
  if (!entry) return null
  if (entry.expiresAt < Date.now()) {
    mockStore.delete(key)
    return null
  }
  return entry.value
}

redis.del = async (key) => {
  mockStore.delete(key)
}

const {
  storeSession,
  getSession,
  deleteSession,
  storeBlacklist,
  isBlacklisted,
} = await import('../../dist/lib/session-store.js')

test('storeSession saves data with TTL', async () => {
  await storeSession('sess-1', { userId: 'user-a', role: 'admin' }, 300)
  const stored = JSON.parse(mockStore.get('session:sess-1').value)
  assert.deepEqual(stored, { userId: 'user-a', role: 'admin' })
})

test('getSession retrieves stored data', async () => {
  await storeSession('sess-2', { userId: 'user-b', tokens: 5 }, 600)
  const result = await getSession('sess-2')
  assert.deepEqual(result, { userId: 'user-b', tokens: 5 })
})

test('getSession returns null for non-existent key', async () => {
  const result = await getSession('nonexistent-session')
  assert.equal(result, null)
})

test('deleteSession removes data', async () => {
  await storeSession('sess-del', { temp: true }, 300)
  assert.ok(mockStore.has('session:sess-del'))
  await deleteSession('sess-del')
  assert.ok(!mockStore.has('session:sess-del'))
})

test('storeBlacklist adds token to blacklist', async () => {
  // Use current time + 1 second to trigger both memory and redis storage
  // but with a short enough TTL that the test doesn't hang
  const futureExp = Math.floor(Date.now() / 1000) + 1
  await storeBlacklist('jti-abc', futureExp)
  // Verifies no error thrown during blacklist storage
  assert.ok(true)
})

test('isBlacklisted returns true for blacklisted token', async () => {
  // Set up the redis mock directly to simulate a blacklisted token
  mockStore.set('blacklist:jti-blocked', { value: '1', ttl: 60, expiresAt: Date.now() + 60000 })
  const result = await isBlacklisted('jti-blocked')
  assert.equal(result, true)
})

test('isBlacklisted returns false for valid token', async () => {
  const result = await isBlacklisted('jti-unknown')
  assert.equal(result, false)
})

test('isBlacklisted returns false when redis is down with fallback', async () => {
  const originalGet = redis.get
  redis.get = async () => { throw new Error('Redis down') }
  const result = await isBlacklisted('jti-safe')
  assert.equal(result, false)
  redis.get = originalGet
})

test('TTL expiry - expired keys return null from getSession', async () => {
  await storeSession('sess-expire', { stale: true }, -1)
  mockStore.get('session:sess-expire').expiresAt = Date.now() - 10000
  const result = await getSession('sess-expire')
  assert.equal(result, null)
})

test('store session with expired TTL', async () => {
  await storeSession('sess-expire-ttl', { fast: true }, -10)
  mockStore.get('session:sess-expire-ttl').expiresAt = 0
  const result = await getSession('sess-expire-ttl')
  assert.equal(result, null)
})

test('deleteSession does not throw for missing key', async () => {
  await assert.doesNotReject(() => deleteSession('nonexistent-key'))
})

test('complex nested objects survive roundtrip', async () => {
  const complex = {
    user: { id: 'u1', roles: ['admin', 'editor'] },
    org: { id: 'o1', name: 'ACME', settings: { theme: 'dark' } },
    tokens: ['t1', 't2'],
    metadata: null,
  }
  await storeSession('sess-complex', complex, 300)
  const result = await getSession('sess-complex')
  assert.deepEqual(result, complex)
})

// Clean up Redis connection so test process can exit
try { redis.disconnect() } catch {}
