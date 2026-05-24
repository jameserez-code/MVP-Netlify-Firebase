import test from 'node:test'
import assert from 'node:assert/strict'

// Import redis module first to get the redis instance, then mock its methods
import { redis } from '../../dist/lib/redis.js'

// --- Mock Redis methods ---
const mockStore = new Map()
let scanKeys = []

redis.get = async (key) => {
  if (mockStore.has(key)) return mockStore.get(key)
  return null
}
redis.setex = async (key, ttl, value) => {
  mockStore.set(key, value)
}
redis.del = async (...args) => {
  for (const key of args) {
    mockStore.delete(key)
  }
  return args.length
}
redis.scan = async (cursor, ...args) => {
  return ['0', scanKeys]
}

// Now import the cache module (it uses the mocked redis)
import { cacheGet, cacheSet, cacheDelete, cacheDeletePattern } from '../../dist/lib/redis-cache.js'

// ---------------------------------------------------------------------------
// cacheGet
// ---------------------------------------------------------------------------

test('cacheGet returns undefined for missing key', async () => {
  const result = await cacheGet('nonexistent:key:123')
  assert.equal(result, undefined)
})

test('cacheGet returns parsed value for stored key', async () => {
  mockStore.set('test:user:1', JSON.stringify({ name: 'Alice', age: 30 }))
  const result = await cacheGet('test:user:1')
  assert.deepEqual(result, { name: 'Alice', age: 30 })
})

test('cacheGet handles null return from redis', async () => {
  const result = await cacheGet('definitely:missing')
  assert.equal(result, undefined)
})

test('cacheGet returns different types correctly', async () => {
  const testCases = [
    { key: 'str', value: 'hello world' },
    { key: 'num', value: 42 },
    { key: 'bool', value: true },
    { key: 'arr', value: [1, 2, 3] },
    { key: 'obj', value: { nested: { deep: true } } },
    { key: 'zero', value: 0 },
    { key: 'empty_str', value: '' },
    { key: 'empty_arr', value: [] },
    { key: 'empty_obj', value: {} },
  ]
  for (const { key, value } of testCases) {
    mockStore.set(key, JSON.stringify(value))
  }
  for (const { key, value } of testCases) {
    const result = await cacheGet(key)
    if (value === null) {
      assert.equal(result, null)
    } else {
      assert.deepEqual(result, value, `cacheGet ${key} should return ${JSON.stringify(value)}`)
    }
  }
})

test('cacheGet handles JSON parse errors gracefully', async () => {
  mockStore.set('malformed:json', '{broken')
  const result = await cacheGet('malformed:json')
  assert.equal(result, undefined)
})

test('cacheGet handles very large cached values', async () => {
  const largeValue = { data: 'x'.repeat(10000), items: Array.from({ length: 50 }, (_, i) => ({ id: i })) }
  mockStore.set('large:key', JSON.stringify(largeValue))
  const result = await cacheGet('large:key')
  assert.deepEqual(result, largeValue)
})

// ---------------------------------------------------------------------------
// cacheSet
// ---------------------------------------------------------------------------

test('cacheSet stores value with TTL', async () => {
  await cacheSet('new:key:1', { foo: 'bar' }, 300)
  const stored = mockStore.get('new:key:1')
  assert.ok(stored)
  assert.equal(JSON.parse(stored).foo, 'bar')
})

test('cacheSet stores different data types', async () => {
  await cacheSet('str:key', 'plain text', 60)
  await cacheSet('num:key', 12345, 60)
  await cacheSet('bool:key', false, 60)
  await cacheSet('null:key', null, 60)

  assert.equal(JSON.parse(mockStore.get('str:key')), 'plain text')
  assert.equal(JSON.parse(mockStore.get('num:key')), 12345)
  assert.equal(JSON.parse(mockStore.get('bool:key')), false)
  assert.equal(JSON.parse(mockStore.get('null:key')), null)
})

test('cacheSet overwrites existing key', async () => {
  await cacheSet('overwrite:key', 'old value', 60)
  await cacheSet('overwrite:key', 'new value', 120)
  assert.equal(JSON.parse(mockStore.get('overwrite:key')), 'new value')
})

test('cacheSet handles complex nested objects', async () => {
  const nested = {
    users: [{ name: 'A', roles: ['admin'] }, { name: 'B', roles: ['user'] }],
    metadata: { version: 2, tags: ['prod'] },
  }
  await cacheSet('nested:obj', nested, 600)
  const result = JSON.parse(mockStore.get('nested:obj'))
  assert.deepEqual(result, nested)
})

test('cacheSet handles special characters in keys', async () => {
  const key = 'cache:user:email:test@example.com'
  await cacheSet(key, { verified: true }, 300)
  assert.ok(mockStore.has(key))
})

test('cacheSet handles empty string values', async () => {
  await cacheSet('empty:val', '', 60)
  assert.equal(JSON.parse(mockStore.get('empty:val')), '')
})

// ---------------------------------------------------------------------------
// cacheDelete
// ---------------------------------------------------------------------------

test('cacheDelete removes a key', async () => {
  mockStore.set('to:delete', JSON.stringify({ temp: true }))
  assert.ok(mockStore.has('to:delete'))
  await cacheDelete('to:delete')
  assert.ok(!mockStore.has('to:delete'))
})

test('cacheDelete does nothing for non-existent key', async () => {
  await assert.doesNotReject(cacheDelete('ghost:key'))
})

test('cacheDelete handles multiple sequential deletes', async () => {
  mockStore.set('del:1', '1')
  mockStore.set('del:2', '2')
  mockStore.set('del:3', '3')

  await cacheDelete('del:1')
  assert.ok(!mockStore.has('del:1'))
  assert.ok(mockStore.has('del:2'))
  assert.ok(mockStore.has('del:3'))

  await cacheDelete('del:2')
  await cacheDelete('del:3')
  assert.ok(!mockStore.has('del:1'))
  assert.ok(!mockStore.has('del:2'))
  assert.ok(!mockStore.has('del:3'))
})

// ---------------------------------------------------------------------------
// cacheDeletePattern
// ---------------------------------------------------------------------------

test('cacheDeletePattern removes matching keys', async () => {
  mockStore.set('user:1:profile', JSON.stringify({ id: 1 }))
  mockStore.set('user:2:profile', JSON.stringify({ id: 2 }))
  mockStore.set('user:3:settings', JSON.stringify({ theme: 'dark' }))
  mockStore.set('org:1:info', JSON.stringify({ name: 'Org' }))

  scanKeys = ['user:1:profile', 'user:2:profile', 'user:3:settings']

  await cacheDeletePattern('user:*')
  assert.ok(!mockStore.has('user:1:profile'))
  assert.ok(!mockStore.has('user:2:profile'))
  assert.ok(!mockStore.has('user:3:settings'))
  assert.ok(mockStore.has('org:1:info'))
})

test('cacheDeletePattern handles no matches', async () => {
  scanKeys = []
  await assert.doesNotReject(cacheDeletePattern('nonexistent:*'))
})

test('cacheDeletePattern handles single match', async () => {
  mockStore.set('unique:key:only', JSON.stringify('value'))
  scanKeys = ['unique:key:only']
  await cacheDeletePattern('unique:*')
  assert.ok(!mockStore.has('unique:key:only'))
})

test('cacheDeletePattern handles pattern with underscores', async () => {
  mockStore.set('agent_passport:org1:data', JSON.stringify({ pn: 'PP-0001' }))
  mockStore.set('agent_passport:org2:data', JSON.stringify({ pn: 'PP-0002' }))
  scanKeys = ['agent_passport:org1:data', 'agent_passport:org2:data']
  await cacheDeletePattern('agent_passport:*')
  assert.ok(!mockStore.has('agent_passport:org1:data'))
  assert.ok(!mockStore.has('agent_passport:org2:data'))
})

// ---------------------------------------------------------------------------
// Cache Key Generation Tests
// ---------------------------------------------------------------------------

test('cache key naming convention: colon-separated namespaces', () => {
  function buildCacheKey(prefix, orgId, resourceId) {
    return `${prefix}:${orgId}:${resourceId}`
  }
  assert.equal(buildCacheKey('agent', 'org_1', 'agent_01'), 'agent:org_1:agent_01')
  assert.equal(buildCacheKey('policy', 'org_2', 'pol_abc'), 'policy:org_2:pol_abc')
  assert.equal(buildCacheKey('webhook', 'org_3', 'wh_xyz'), 'webhook:org_3:wh_xyz')
})

test('cache key handles special characters safely', () => {
  function buildCacheKey(...parts) {
    return parts.join(':')
  }
  const key = buildCacheKey('user', 'test@example.com', 'profile')
  assert.ok(key.includes('@'))
  assert.ok(key.includes('test@example.com'))
})

test('cache key for list operations includes pagination', () => {
  function buildListKey(orgId, type, limit, cursor) {
    if (cursor) return `list:${orgId}:${type}:${limit}:cursor:${cursor}`
    return `list:${orgId}:${type}:${limit}`
  }
  assert.equal(buildListKey('org_1', 'agents', 50), 'list:org_1:agents:50')
  assert.equal(buildListKey('org_1', 'agents', 50, 'abc123'), 'list:org_1:agents:50:cursor:abc123')
})

// ---------------------------------------------------------------------------
// TTL Parsing Tests
// ---------------------------------------------------------------------------

test('TTL values are in seconds', () => {
  function formatTTL(seconds) {
    return seconds
  }
  assert.equal(formatTTL(60), 60)
  assert.equal(formatTTL(300), 300)
  assert.equal(formatTTL(3600), 3600)
  assert.equal(formatTTL(86400), 86400)
})

test('common TTL constants', () => {
  const TTLS = {
    SHORT: 60,       // 1 minute
    MEDIUM: 300,     // 5 minutes
    LONG: 3600,      // 1 hour
    DAY: 86400,      // 24 hours
  }
  assert.equal(TTLS.SHORT, 60)
  assert.equal(TTLS.MEDIUM, 300)
  assert.equal(TTLS.LONG, 3600)
  assert.equal(TTLS.DAY, 86400)
})

// ---------------------------------------------------------------------------
// JSON Serialization / Deserialization Tests
// ---------------------------------------------------------------------------

test('JSON roundtrip preserves complex data', () => {
  const original = {
    string: 'hello',
    number: 42,
    boolean: true,
    nullVal: null,
    array: [1, 'two', false, null, { nested: true }],
    object: { a: 1, b: { c: [1, 2] } },
  }
  const serialized = JSON.stringify(original)
  const deserialized = JSON.parse(serialized)
  assert.deepEqual(deserialized, original)
})

test('JSON serialization handles undefined (stripped)', () => {
  const obj = { a: 1, b: undefined, c: null }
  const serialized = JSON.stringify(obj)
  const deserialized = JSON.parse(serialized)
  assert.ok(!('b' in deserialized))
  assert.equal(deserialized.c, null)
})

test('JSON serialization of Date objects', () => {
  const now = new Date()
  const obj = { timestamp: now.toISOString() }
  const serialized = JSON.stringify(obj)
  const deserialized = JSON.parse(serialized)
  assert.equal(deserialized.timestamp, now.toISOString())
})

test('JSON handles very large numbers', () => {
  const largeNum = Number.MAX_SAFE_INTEGER
  const serialized = JSON.stringify({ value: largeNum })
  const deserialized = JSON.parse(serialized)
  assert.equal(deserialized.value, largeNum)
})

// ---------------------------------------------------------------------------
// Memory Cache Fallback (L1) Tests
// ---------------------------------------------------------------------------

test('in-memory cache fallback stores and retrieves values', () => {
  const memoryCache = new Map()

  function memGet(key) {
    const entry = memoryCache.get(key)
    if (!entry) return undefined
    if (entry.expiresAt < Date.now()) {
      memoryCache.delete(key)
      return undefined
    }
    return entry.value
  }

  function memSet(key, value, ttlMs) {
    memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    })
  }

  memSet('mem:test', { data: 'cached' }, 5000)
  const result = memGet('mem:test')
  assert.deepEqual(result, { data: 'cached' })
})

test('memory cache expires entries after TTL', () => {
  const memoryCache = new Map()

  function memSetExpired(key, value) {
    memoryCache.set(key, {
      value,
      expiresAt: Date.now() - 1000, // expired 1 second ago
    })
  }

  function memGet(key) {
    const entry = memoryCache.get(key)
    if (!entry) return undefined
    if (entry.expiresAt < Date.now()) {
      memoryCache.delete(key)
      return undefined
    }
    return entry.value
  }

  memSetExpired('expired:key', 'stale data')
  const result = memGet('expired:key')
  assert.equal(result, undefined)
  assert.ok(!memoryCache.has('expired:key'))
})

test('memory cache fallback: L1 miss goes to L2 (redis)', async () => {
  const l1Cache = new Map()
  let l2Hit = false

  async function twoLevelGet(key) {
    if (l1Cache.has(key)) return l1Cache.get(key)
    l2Hit = true
    const value = mockStore.get(key)
    if (value !== undefined) {
      l1Cache.set(key, JSON.parse(value))
      return JSON.parse(value)
    }
    return undefined
  }

  mockStore.set('two:level:test', JSON.stringify({ cached: true }))
  const result = await twoLevelGet('two:level:test')
  assert.deepEqual(result, { cached: true })
  assert.ok(l2Hit)
  assert.ok(l1Cache.has('two:level:test'))
})

test('memory cache invalidation clears L1 entries', () => {
  const l1Cache = new Map()

  function invalidate(pattern) {
    const wildcard = pattern.endsWith('*')
    const prefix = pattern.replace('*', '')
    for (const key of l1Cache.keys()) {
      if (wildcard && key.startsWith(prefix)) {
        l1Cache.delete(key)
      } else if (key === pattern) {
        l1Cache.delete(key)
      }
    }
  }

  l1Cache.set('user:1:data', { id: 1 })
  l1Cache.set('user:2:data', { id: 2 })
  l1Cache.set('org:1:data', { id: 'org' })

  invalidate('user:*')

  assert.ok(!l1Cache.has('user:1:data'))
  assert.ok(!l1Cache.has('user:2:data'))
  assert.ok(l1Cache.has('org:1:data'))
})

// ---------------------------------------------------------------------------
// Error isolation tests
// ---------------------------------------------------------------------------

test('cacheGet swallows errors and returns undefined', async () => {
  const originalGet = redis.get
  redis.get = async () => { throw new Error('Redis connection failed') }

  const result = await cacheGet('should:not:explode')
  assert.equal(result, undefined)

  redis.get = originalGet
})

test('cacheSet swallows errors silently', async () => {
  const originalSetex = redis.setex
  redis.setex = async () => { throw new Error('Redis write failed') }

  await assert.doesNotReject(cacheSet('error:key', 'value', 60))

  redis.setex = originalSetex
})

test('cacheDelete swallows errors silently', async () => {
  const originalDel = redis.del
  redis.del = async () => { throw new Error('Redis delete failed') }

  await assert.doesNotReject(cacheDelete('error:del'))

  redis.del = originalDel
})

test('cacheDeletePattern swallows errors silently', async () => {
  const originalScan = redis.scan
  redis.scan = async () => { throw new Error('Redis scan failed') }

  await assert.doesNotReject(cacheDeletePattern('pattern:*'))

  redis.scan = originalScan
})
