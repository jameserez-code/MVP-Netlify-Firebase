import test from 'node:test'
import assert from 'node:assert/strict'
import { buildListQuery, attachQueryMetrics, executeListQuery } from '../../dist/lib/query-builder.js'

// Helpers: mock Firestore query chain
function createMockDb() {
  let collectionName = null

  function mockQuery(name) {
    const calls = []
    const chain = {
      _name: name || collectionName,
      _calls: calls,
      where(field, op, value) {
        calls.push({ method: 'where', args: [field, op, value] })
        return this
      },
      orderBy(field, dir) {
        calls.push({ method: 'orderBy', args: [field, dir] })
        return this
      },
      limit(n) {
        calls.push({ method: 'limit', args: [n] })
        return this
      },
      startAfter(cursor) {
        calls.push({ method: 'startAfter', args: [cursor] })
        return this
      },
      get: async () => {
        calls.push({ method: 'get', args: [] })
        return { docs: [], size: 0, empty: true }
      },
    }
    return chain
  }

  return {
    collection(name) {
      collectionName = name
      // Return an object whose .where() method returns a chainable query
      const base = mockQuery(name)
      return {
        where(field, op, value) {
          base._calls.push({ method: 'where', args: [field, op, value] })
          return base
        },
      }
    },
  }
}

// --- orgId filter ---

test('buildListQuery always applies orgId filter', () => {
  const db = createMockDb()
  const query = buildListQuery(db, 'agents', 'org_123')
  assert.ok(query._calls.some(c => c.method === 'where' && c.args[0] === 'orgId' && c.args[2] === 'org_123'))
})

test('buildListQuery uses correct collection name', () => {
  const db = createMockDb()
  const query = buildListQuery(db, 'actionIntents', 'org_1')
  assert.equal(query._name, 'actionIntents')
})

test('buildListQuery with different collection', () => {
  const db = createMockDb()
  const query = buildListQuery(db, 'webhooks', 'org_x')
  assert.equal(query._name, 'webhooks')
})

// --- Status filter ---

test('buildListQuery applies status filter when provided', () => {
  const db = createMockDb()
  const query = buildListQuery(db, 'agents', 'org_1', { status: 'active' })
  const statusCall = query._calls.find(c => c.method === 'where' && c.args[0] === 'status')
  assert.ok(statusCall)
  assert.equal(statusCall.args[2], 'active')
})

test('buildListQuery applies status filter with different values', () => {
  for (const status of ['active', 'revoked', 'suspended', 'pending']) {
    const db = createMockDb()
    const query = buildListQuery(db, 'agents', 'org_1', { status })
    const statusCall = query._calls.find(c => c.method === 'where' && c.args[0] === 'status')
    assert.ok(statusCall, `status ${status} should have a where call`)
    assert.equal(statusCall.args[2], status)
  }
})

test('buildListQuery omits status filter when not provided', () => {
  const db = createMockDb()
  const query = buildListQuery(db, 'agents', 'org_1', {})
  const statusCall = query._calls.find(c => c.method === 'where' && c.args[0] === 'status')
  assert.ok(!statusCall)
})

test('buildListQuery omits status filter when empty string', () => {
  const db = createMockDb()
  const query = buildListQuery(db, 'agents', 'org_1', { status: '' })
  const statusCall = query._calls.find(c => c.method === 'where' && c.args[0] === 'status')
  assert.ok(!statusCall)
})

// --- Custom filter ---

test('buildListQuery applies custom filter when field and value provided', () => {
  const db = createMockDb()
  const query = buildListQuery(db, 'intents', 'org_1', { filterField: 'agentId', filterValue: 'agent_01' })
  const filterCall = query._calls.find(c => c.method === 'where' && c.args[0] === 'agentId')
  assert.ok(filterCall)
  assert.equal(filterCall.args[1], '==')
  assert.equal(filterCall.args[2], 'agent_01')
})

test('buildListQuery applies custom filter with numeric value', () => {
  const db = createMockDb()
  const query = buildListQuery(db, 'items', 'org_1', { filterField: 'version', filterValue: 3 })
  const filterCall = query._calls.find(c => c.method === 'where' && c.args[0] === 'version')
  assert.ok(filterCall)
  assert.equal(filterCall.args[2], 3)
})

test('buildListQuery applies custom filter with boolean value', () => {
  const db = createMockDb()
  const query = buildListQuery(db, 'items', 'org_1', { filterField: 'isActive', filterValue: true })
  const filterCall = query._calls.find(c => c.method === 'where' && c.args[0] === 'isActive')
  assert.ok(filterCall)
  assert.equal(filterCall.args[2], true)
})

test('buildListQuery omits custom filter when filterValue is undefined', () => {
  const db = createMockDb()
  const query = buildListQuery(db, 'items', 'org_1', { filterField: 'agentId' })
  const filterCall = query._calls.find(c => c.method === 'where' && c.args[0] === 'agentId')
  assert.ok(!filterCall)
})

test('buildListQuery omits custom filter when filterField is missing', () => {
  const db = createMockDb()
  const query = buildListQuery(db, 'items', 'org_1', { filterValue: 'something' })
  // filterField is undefined, so no custom where() is added beyond orgId
  const whereCalls = query._calls.filter(c => c.method === 'where')
  // Only orgId where should be present
  assert.equal(whereCalls.length, 1)
  assert.equal(whereCalls[0].args[0], 'orgId')
})

// --- Date range filter ---

test('buildListQuery applies date range when both startDate and endDate provided', () => {
  const db = createMockDb()
  const query = buildListQuery(db, 'events', 'org_1', { startDate: '2024-01-01', endDate: '2024-12-31' })
  const startCall = query._calls.find(c => c.method === 'where' && c.args[0] === 'createdAt' && c.args[1] === '>=')
  const endCall = query._calls.find(c => c.method === 'where' && c.args[0] === 'createdAt' && c.args[1] === '<=')
  assert.ok(startCall)
  assert.ok(endCall)
  assert.equal(startCall.args[2], '2024-01-01')
  assert.equal(endCall.args[2], '2024-12-31')
})

test('buildListQuery omits date filter when only startDate provided', () => {
  const db = createMockDb()
  const query = buildListQuery(db, 'events', 'org_1', { startDate: '2024-01-01' })
  const dateRangeCall = query._calls.find(c => c.method === 'where' && c.args[0] === 'createdAt' && c.args[1] === '>=')
  assert.ok(!dateRangeCall)
})

test('buildListQuery omits date filter when only endDate provided', () => {
  const db = createMockDb()
  const query = buildListQuery(db, 'events', 'org_1', { endDate: '2024-12-31' })
  const dateRangeCall = query._calls.find(c => c.method === 'where' && c.args[0] === 'createdAt' && c.args[1] === '<=')
  assert.ok(!dateRangeCall)
})

test('buildListQuery omits date filter when both are empty strings', () => {
  const db = createMockDb()
  const query = buildListQuery(db, 'events', 'org_1', { startDate: '', endDate: '' })
  const dateCall = query._calls.find(c => c.method === 'where' && c.args[0] === 'createdAt')
  assert.ok(!dateCall)
})

// --- Limit ---

test('buildListQuery applies default limit of 50', () => {
  const db = createMockDb()
  const query = buildListQuery(db, 'agents', 'org_1')
  const limitCall = query._calls.find(c => c.method === 'limit')
  assert.ok(limitCall)
  assert.equal(limitCall.args[0], 50)
})

test('buildListQuery applies custom limit', () => {
  const db = createMockDb()
  const query = buildListQuery(db, 'agents', 'org_1', { limit: 10 })
  const limitCall = query._calls.find(c => c.method === 'limit')
  assert.ok(limitCall)
  assert.equal(limitCall.args[0], 10)
})

test('buildListQuery handles limit as string', () => {
  const db = createMockDb()
  const query = buildListQuery(db, 'agents', 'org_1', { limit: '25' })
  const limitCall = query._calls.find(c => c.method === 'limit')
  assert.ok(limitCall)
  assert.equal(limitCall.args[0], 25)
})

test('buildListQuery handles large limits', () => {
  const db = createMockDb()
  const query = buildListQuery(db, 'agents', 'org_1', { limit: 1000 })
  const limitCall = query._calls.find(c => c.method === 'limit')
  assert.ok(limitCall)
  assert.equal(limitCall.args[0], 1000)
})

test('buildListQuery handles limit of 0 (falsy, falls back to default 50)', () => {
  const db = createMockDb()
  const query = buildListQuery(db, 'agents', 'org_1', { limit: 0 })
  const limitCall = query._calls.find(c => c.method === 'limit')
  // 0 is falsy, so options.limit || '50' gives '50'
  assert.equal(limitCall.args[0], 50)
})

test('buildListQuery handles limit of 1', () => {
  const db = createMockDb()
  const query = buildListQuery(db, 'agents', 'org_1', { limit: 1 })
  const limitCall = query._calls.find(c => c.method === 'limit')
  assert.equal(limitCall.args[0], 1)
})

// --- OrderBy ---

test('buildListQuery defaults to orderBy createdAt desc', () => {
  const db = createMockDb()
  const query = buildListQuery(db, 'agents', 'org_1')
  const orderCall = query._calls.find(c => c.method === 'orderBy')
  assert.ok(orderCall)
  assert.equal(orderCall.args[0], 'createdAt')
  assert.equal(orderCall.args[1], 'desc')
})

test('buildListQuery uses custom orderBy', () => {
  const db = createMockDb()
  const query = buildListQuery(db, 'agents', 'org_1', { orderBy: 'name', orderDirection: 'asc' })
  const orderCall = query._calls.find(c => c.method === 'orderBy')
  assert.ok(orderCall)
  assert.equal(orderCall.args[0], 'name')
  assert.equal(orderCall.args[1], 'asc')
})

test('buildListQuery uses custom orderDirection desc', () => {
  const db = createMockDb()
  const query = buildListQuery(db, 'agents', 'org_1', { orderBy: 'updatedAt', orderDirection: 'desc' })
  const orderCall = query._calls.find(c => c.method === 'orderBy')
  assert.ok(orderCall)
  assert.equal(orderCall.args[1], 'desc')
})

test('buildListQuery uses custom orderBy without direction (default desc)', () => {
  const db = createMockDb()
  const query = buildListQuery(db, 'agents', 'org_1', { orderBy: 'priority' })
  const orderCall = query._calls.find(c => c.method === 'orderBy')
  assert.equal(orderCall.args[0], 'priority')
  assert.equal(orderCall.args[1], 'desc')
})

// --- Cursor-based pagination ---

test('buildListQuery applies startAfter when cursor provided', () => {
  const cursor = { id: 'agent_50', createdAt: '2024-06-01' }
  const db = createMockDb()
  const query = buildListQuery(db, 'agents', 'org_1', { cursor })
  const startAfterCall = query._calls.find(c => c.method === 'startAfter')
  assert.ok(startAfterCall)
  assert.deepEqual(startAfterCall.args[0], cursor)
})

test('buildListQuery omits startAfter when no cursor', () => {
  const db = createMockDb()
  const query = buildListQuery(db, 'agents', 'org_1')
  const startAfterCall = query._calls.find(c => c.method === 'startAfter')
  assert.ok(!startAfterCall)
})

// --- Combined options ---

test('buildListQuery applies all options together', () => {
  const cursor = { id: 'last' }
  const db = createMockDb()
  const query = buildListQuery(db, 'events', 'org_5', {
    status: 'completed',
    filterField: 'type',
    filterValue: 'purchase',
    startDate: '2024-01-01',
    endDate: '2024-06-30',
    limit: 25,
    orderBy: 'timestamp',
    orderDirection: 'asc',
    cursor,
  })

  const methodCalls = query._calls.map(c => c.method)
  assert.ok(methodCalls.includes('where'))
  assert.ok(methodCalls.includes('orderBy'))
  assert.ok(methodCalls.includes('limit'))
  assert.ok(methodCalls.includes('startAfter'))

  // Verify exact calls
  const whereCalls = query._calls.filter(c => c.method === 'where')
  assert.ok(whereCalls.find(c => c.args[0] === 'orgId'))
  assert.ok(whereCalls.find(c => c.args[0] === 'status'))
  assert.ok(whereCalls.find(c => c.args[0] === 'type'))
  assert.ok(whereCalls.find(c => c.args[0] === 'createdAt' && c.args[1] === '>='))
  assert.ok(whereCalls.find(c => c.args[0] === 'createdAt' && c.args[1] === '<='))

  const orderCall = query._calls.find(c => c.method === 'orderBy')
  assert.equal(orderCall.args[0], 'timestamp')
  assert.equal(orderCall.args[1], 'asc')

  const limitCall = query._calls.find(c => c.method === 'limit')
  assert.equal(limitCall.args[0], 25)
})

// --- attachQueryMetrics ---

test('attachQueryMetrics adds metrics to request object', () => {
  const req = {}
  const metrics = {
    collection: 'agents',
    durationMs: 45,
    docsReturned: 10,
    docsScanned: 10,
    limit: 50,
    orderBy: 'createdAt',
    direction: 'desc',
    filters: ['status:active'],
  }
  attachQueryMetrics(req, metrics)
  assert.ok(Array.isArray(req._queryMetrics))
  assert.equal(req._queryMetrics.length, 1)
  assert.equal(req._queryMetrics[0].collection, 'agents')
  assert.equal(req._queryMetrics[0].durationMs, 45)
})

test('attachQueryMetrics accumulates multiple metrics', () => {
  const req = {}
  attachQueryMetrics(req, { durationMs: 10, docsReturned: 5, docsScanned: 5, limit: 50, orderBy: 'a', direction: 'asc' })
  attachQueryMetrics(req, { durationMs: 20, docsReturned: 8, docsScanned: 8, limit: 20, orderBy: 'b', direction: 'desc' })
  attachQueryMetrics(req, { durationMs: 30, docsReturned: 3, docsScanned: 3, limit: 10, orderBy: 'c', direction: 'asc' })
  assert.equal(req._queryMetrics.length, 3)
})

test('attachQueryMetrics does nothing on null/undefined request', () => {
  attachQueryMetrics(null, { durationMs: 1, docsReturned: 0, docsScanned: 0, limit: 1, orderBy: 'x', direction: 'asc' })
  attachQueryMetrics(undefined, { durationMs: 1, docsReturned: 0, docsScanned: 0, limit: 1, orderBy: 'x', direction: 'asc' })
  // Should not throw
})

test('attachQueryMetrics initializes _queryMetrics array if missing', () => {
  const req = {}
  attachQueryMetrics(req, { durationMs: 1, docsReturned: 1, docsScanned: 1, limit: 1, orderBy: 'a', direction: 'asc' })
  assert.ok(Array.isArray(req._queryMetrics))
})

// --- executeListQuery ---

test('executeListQuery returns query snapshot', async () => {
  const db = createMockDb()
  const query = buildListQuery(db, 'agents', 'org_1')
  const snap = await executeListQuery(query, { request: {}, collection: 'agents', limit: 50 })
  assert.ok(snap)
  assert.equal(snap.size, 0)
  assert.equal(snap.empty, true)
})

test('executeListQuery attaches metrics to request', async () => {
  const db = createMockDb()
  const query = buildListQuery(db, 'agents', 'org_1')
  const req = {}
  const snap = await executeListQuery(query, { request: req, collection: 'agents', limit: 50 })
  assert.ok(req._queryMetrics)
  assert.equal(req._queryMetrics.length, 1)
  assert.ok(req._queryMetrics[0].durationMs >= 0)
  assert.equal(req._queryMetrics[0].collection, 'agents')
  assert.equal(req._queryMetrics[0].limit, 50)
})

// --- Order consistency ---

test('query call order: where before orderBy before limit before startAfter', () => {
  const db = createMockDb()
  const query = buildListQuery(db, 'items', 'org_1', { cursor: 'abc' })

  const methodSequence = query._calls.map(c => c.method)
  const whereIndices = methodSequence.map((m, i) => m === 'where' ? i : -1).filter(i => i >= 0)
  const orderIdx = methodSequence.indexOf('orderBy')
  const limitIdx = methodSequence.indexOf('limit')
  const startAfterIdx = methodSequence.indexOf('startAfter')

  // All where calls should come before orderBy
  for (const wi of whereIndices) {
    assert.ok(wi < orderIdx, `where at ${wi} should be before orderBy at ${orderIdx}`)
  }
  // orderBy before limit
  assert.ok(orderIdx < limitIdx, `orderBy at ${orderIdx} should be before limit at ${limitIdx}`)
  // limit before startAfter
  assert.ok(limitIdx < startAfterIdx, `limit at ${limitIdx} should be before startAfter at ${startAfterIdx}`)
})

// --- Edge cases ---

test('buildListQuery handles all undefined options', () => {
  const db = createMockDb()
  const query = buildListQuery(db, 'test', 'org', {
    status: undefined,
    filterField: undefined,
    filterValue: undefined,
    startDate: undefined,
    endDate: undefined,
    limit: undefined,
    cursor: undefined,
    orderBy: undefined,
    orderDirection: undefined,
  })
  // Should not throw and should use defaults
  assert.equal(query._name, 'test')
  const orderCall = query._calls.find(c => c.method === 'orderBy')
  assert.equal(orderCall.args[0], 'createdAt')
  assert.equal(orderCall.args[1], 'desc')
  const limitCall = query._calls.find(c => c.method === 'limit')
  assert.equal(limitCall.args[0], 50)
})

test('buildListQuery with filterValue of 0 (falsy but valid)', () => {
  const db = createMockDb()
  const query = buildListQuery(db, 'items', 'org_1', { filterField: 'count', filterValue: 0 })
  // 0 !== undefined is true, so filter should be applied
  const filterCall = query._calls.find(c => c.method === 'where' && c.args[0] === 'count')
  assert.ok(filterCall)
})

test('buildListQuery with filterValue of false (falsy but valid)', () => {
  const db = createMockDb()
  const query = buildListQuery(db, 'items', 'org_1', { filterField: 'enabled', filterValue: false })
  const filterCall = query._calls.find(c => c.method === 'where' && c.args[0] === 'enabled')
  assert.ok(filterCall)
})

test('buildListQuery with filterValue of empty string (falsy, skip)', () => {
  const db = createMockDb()
  const query = buildListQuery(db, 'items', 'org_1', { filterField: 'name', filterValue: '' })
  // '' !== undefined is true, so empty string IS applied
  const filterCall = query._calls.find(c => c.method === 'where' && c.args[0] === 'name')
  assert.ok(filterCall)
  assert.equal(filterCall.args[2], '')
})
