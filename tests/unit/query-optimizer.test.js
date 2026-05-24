import test from 'node:test'
import assert from 'node:assert/strict'

// Intercept log.warn before module loads
import { log } from '../../dist/lib/logger.js'
const warnCalls = []
log.warn = (msg, ctx) => {
  warnCalls.push({ msg, ctx })
}

import {
  optimizeQuery,
  attachQueryMetrics,
  executeOptimizedQuery,
} from '../../dist/lib/query-optimizer.js'

// Helper: create a mock Firestore Query that records chained method calls
function createMockQuery(snapSize = 0, delayMs = 0) {
  const calls = []
  const self = {
    orderBy(field, dir) {
      calls.push({ method: 'orderBy', args: [field, dir] })
      return self
    },
    limit(n) {
      calls.push({ method: 'limit', args: [n] })
      return self
    },
    async get() {
      if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs))
      }
      calls.push({ method: 'get', args: [] })
      return { size: snapSize }
    },
    _calls: calls,
  }
  return self
}

// ── optimizeQuery ──────────────────────────────────────────────────────────

test('optimizeQuery adds default limit 50 when not specified', () => {
  const q = createMockQuery()
  const result = optimizeQuery(q)
  const limitCall = result._calls.find((c) => c.method === 'limit')
  assert.ok(limitCall)
  assert.equal(limitCall.args[0], 50)
})

test('optimizeQuery preserves existing limit', () => {
  const q = createMockQuery()
  const result = optimizeQuery(q, { limit: 10 })
  const limitCall = result._calls.find((c) => c.method === 'limit')
  assert.ok(limitCall)
  assert.equal(limitCall.args[0], 10)
})

test('optimizeQuery clamps limit to 1–500 range (clamp low)', () => {
  const q = createMockQuery()
  const result = optimizeQuery(q, { limit: 0 })
  const limitCall = result._calls.find((c) => c.method === 'limit')
  assert.equal(limitCall.args[0], 1)
})

test('optimizeQuery clamps limit to 1–500 range (clamp high)', () => {
  const q = createMockQuery()
  const result = optimizeQuery(q, { limit: 1000 })
  const limitCall = result._calls.find((c) => c.method === 'limit')
  assert.equal(limitCall.args[0], 500)
})

test('optimizeQuery adds default orderBy createdAt desc', () => {
  const q = createMockQuery()
  const result = optimizeQuery(q)
  const orderCall = result._calls.find((c) => c.method === 'orderBy')
  assert.ok(orderCall)
  assert.equal(orderCall.args[0], 'createdAt')
  assert.equal(orderCall.args[1], 'desc')
})

test('optimizeQuery preserves existing orderBy direction asc', () => {
  const q = createMockQuery()
  const result = optimizeQuery(q, {
    orderBy: { field: 'name', direction: 'asc' },
  })
  const orderCall = result._calls.find((c) => c.method === 'orderBy')
  assert.equal(orderCall.args[0], 'name')
  assert.equal(orderCall.args[1], 'asc')
})

test('optimizeQuery calls orderBy before limit (correct Firestore ordering)', () => {
  const q = createMockQuery()
  const result = optimizeQuery(q, { limit: 25 })
  const calls = result._calls
  const orderByIdx = calls.findIndex((c) => c.method === 'orderBy')
  const limitIdx = calls.findIndex((c) => c.method === 'limit')
  assert.ok(orderByIdx < limitIdx, 'orderBy must be called before limit')
})

// ── attachQueryMetrics ─────────────────────────────────────────────────────

test('attachQueryMetrics adds metrics to request._queryMetrics', () => {
  const req = {}
  attachQueryMetrics(req, {
    durationMs: 42,
    docsReturned: 7,
    docsScanned: 12,
    limit: 50,
    orderBy: 'createdAt',
    direction: 'desc',
  })
  assert.ok(Array.isArray(req._queryMetrics))
  assert.equal(req._queryMetrics.length, 1)
  assert.equal(req._queryMetrics[0].durationMs, 42)
})

test('attachQueryMetrics appends to existing _queryMetrics array', () => {
  const req = { _queryMetrics: [{ durationMs: 10 }] }
  attachQueryMetrics(req, { durationMs: 99 })
  assert.equal(req._queryMetrics.length, 2)
  assert.equal(req._queryMetrics[1].durationMs, 99)
})

test('attachQueryMetrics handles null/undefined request gracefully', () => {
  assert.doesNotThrow(() => attachQueryMetrics(null, { durationMs: 1 }))
  assert.doesNotThrow(() => attachQueryMetrics(undefined, { durationMs: 1 }))
})

// ── executeOptimizedQuery ──────────────────────────────────────────────────

test('executeOptimizedQuery returns snap and durationMs', async () => {
  const q = createMockQuery(5, 0)
  const res = await executeOptimizedQuery(q)
  assert.ok(typeof res.durationMs === 'number')
  assert.ok(res.durationMs >= 0)
  assert.equal(res.snap.size, 5)
})

test('executeOptimizedQuery logs slow queries when duration > slowMs threshold', async () => {
  const q = createMockQuery(3, 0)
  const prev = warnCalls.length
  // Set slowMs to -1 so any non-negative duration triggers a warning
  await executeOptimizedQuery(q, { slowMs: -1 })
  const slowWarns = warnCalls.slice(prev).filter((c) => c.msg === 'slow query detected')
  assert.equal(slowWarns.length, 1)
  assert.equal(slowWarns[0].ctx.docsReturned, 3)
})

test('executeOptimizedQuery does not log when duration < slowMs threshold', async () => {
  const q = createMockQuery(3, 0)
  const prev = warnCalls.length
  await executeOptimizedQuery(q, { slowMs: 99999 })
  const slowWarns = warnCalls.slice(prev).filter((c) => c.msg === 'slow query detected')
  assert.equal(slowWarns.length, 0)
})

test('executeOptimizedQuery attaches metrics when requestContext is provided', async () => {
  const q = createMockQuery(2, 0)
  const req = {}
  await executeOptimizedQuery(q, { limit: 30 }, { request: req, collectionName: 'agents' })
  assert.ok(Array.isArray(req._queryMetrics))
  assert.equal(req._queryMetrics.length, 1)
  assert.equal(req._queryMetrics[0].collection, 'agents')
  assert.equal(req._queryMetrics[0].limit, 30)
})

test('executeOptimizedQuery respects custom orderBy in options', async () => {
  const q = createMockQuery(1, 0)
  const req = {}
  await executeOptimizedQuery(
    q,
    { orderBy: { field: 'status', direction: 'asc' }, slowMs: 99999 },
    { request: req, collectionName: 'tasks' },
  )
  const metrics = req._queryMetrics[0]
  assert.equal(metrics.orderBy, 'status')
  assert.equal(metrics.direction, 'asc')
})

test('executeOptimizedQuery does not attach metrics when requestContext is absent', async () => {
  const q = createMockQuery(1, 0)
  // No third arg
  const res = await executeOptimizedQuery(q, { slowMs: 99999 })
  assert.equal(typeof res.durationMs, 'number')
  // No crash, nothing on the wild
})
