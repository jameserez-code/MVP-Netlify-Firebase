import test from 'node:test'
import assert from 'node:assert/strict'
import { mock } from 'node:test'
import { redis } from '../../dist/lib/redis.js'

mock.method(redis, 'publish', mock.fn(() => Promise.resolve()))

const {
  subscribeClient,
  unsubscribeClient,
  removeClient,
  broadcastToOrgClients,
  publishEvent,
} = await import('../../dist/lib/events.js')

function makeMockWs(readyState = 1) {
  const sent = []
  const ws = {
    readyState,
    send: (msg) => { sent.push(msg) },
    _sent: sent,
  }
  return ws
}

test('subscribeClient adds to room', () => {
  const ws = makeMockWs()
  subscribeClient(ws, 'org-a', 'ch-1')
  broadcastToOrgClients('org-a', 'ch-1', { hello: 'world' })
  assert.ok(ws._sent.length > 0)
  const msg = JSON.parse(ws._sent[0])
  assert.equal(msg.data.hello, 'world')
})

test('unsubscribeClient removes from room', () => {
  const ws = makeMockWs()
  subscribeClient(ws, 'org-b', 'ch-unsub')
  unsubscribeClient(ws, 'org-b', 'ch-unsub')
  broadcastToOrgClients('org-b', 'ch-unsub', { msg: 'nope' })
  assert.equal(ws._sent.length, 0)
})

test('publishEvent delivers to all clients in room', () => {
  const ws1 = makeMockWs()
  const ws2 = makeMockWs()
  subscribeClient(ws1, 'org-c', 'ch-multi')
  subscribeClient(ws2, 'org-c', 'ch-multi')
  broadcastToOrgClients('org-c', 'ch-multi', { val: 42 })
  assert.ok(ws1._sent.length > 0)
  assert.ok(ws2._sent.length > 0)
})

test('publishEvent ignores empty rooms', () => {
  const result = broadcastToOrgClients('nonexistent-org', 'no-channel', { x: 1 })
  assert.equal(result, undefined)
})

test('publishEvent delivers to wildcard subscribers via direct channel', () => {
  const ws = makeMockWs()
  subscribeClient(ws, 'org-wild', '*')
  broadcastToOrgClients('org-wild', '*', { wild: true })
  assert.ok(ws._sent.length > 0)
  const msg = JSON.parse(ws._sent[0])
  assert.equal(msg.data.wild, true)
})

test('multiple rooms isolation', () => {
  const wsA = makeMockWs()
  const wsB = makeMockWs()
  subscribeClient(wsA, 'org-iso', 'room-a')
  subscribeClient(wsB, 'org-iso', 'room-b')

  broadcastToOrgClients('org-iso', 'room-a', { msg: 'A' })
  assert.ok(wsA._sent.length > 0)
  assert.equal(wsB._sent.length, 0)

  broadcastToOrgClients('org-iso', 'room-b', { msg: 'B' })
  assert.ok(wsB._sent.length > 0)
  assert.equal(wsA._sent.length, 1)
})

test('different orgs have isolated rooms', () => {
  const ws1 = makeMockWs()
  const ws2 = makeMockWs()
  subscribeClient(ws1, 'org-x', 'ch')
  subscribeClient(ws2, 'org-y', 'ch')

  broadcastToOrgClients('org-x', 'ch', { org: 'x' })
  assert.ok(ws1._sent.length > 0)
  assert.equal(ws2._sent.length, 0)
})

test('removeClient removes from all rooms', () => {
  const ws = makeMockWs()
  subscribeClient(ws, 'org-rm', 'ch-1')
  subscribeClient(ws, 'org-rm', 'ch-2')
  removeClient(ws)
  broadcastToOrgClients('org-rm', 'ch-1', { msg: 'gone' })
  broadcastToOrgClients('org-rm', 'ch-2', { msg: 'gone' })
  assert.equal(ws._sent.length, 0)
})

test('unsubscribeClient does not throw for nonexistent client', () => {
  const ws = makeMockWs()
  assert.doesNotThrow(() => unsubscribeClient(ws, 'org-ghost', 'ch-ghost'))
})

test('broadcastToOrgClients skips non-OPEN clients', () => {
  const wsClosed = makeMockWs(3) // CLOSING readyState
  subscribeClient(wsClosed, 'org-closed', 'ch')
  broadcastToOrgClients('org-closed', 'ch', { msg: 'never' })
  assert.equal(wsClosed._sent.length, 0)
})

test('publishEvent also publishes to Redis', async () => {
  redis.publish.mock.resetCalls()
  await publishEvent('org-pub', 'ch-redis', { key: 'val' })
  const calls = redis.publish.mock.calls
  assert.ok(calls.length > 0)
  assert.match(calls[0].arguments[0], /^org:org-pub:events$/)
})

test('publishEvent handles Redis failure gracefully', async () => {
  redis.publish.mock.mockImplementationOnce(() => Promise.reject(new Error('redis down')))
  await assert.doesNotReject(() => publishEvent('org-redis-fail', 'ch', { test: 1 }))
})

test('broadcastToOrgClients sends JSON with correct structure', () => {
  const ws = makeMockWs()
  subscribeClient(ws, 'org-struct', 'ch-json')
  broadcastToOrgClients('org-struct', 'ch-json', { foo: 'bar' })
  const msg = JSON.parse(ws._sent[0])
  assert.equal(msg.type, 'event')
  assert.equal(msg.channel, 'ch-json')
  assert.deepEqual(msg.data, { foo: 'bar' })
})
