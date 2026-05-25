import test from 'node:test'
import assert from 'node:assert/strict'
import { memoryCache } from '../../dist/lib/cache.js'

test.beforeEach(() => {
  memoryCache.clear()
})

test('cache.set and cache.get work', () => {
  memoryCache.set('key1', 'value1', 60)
  assert.equal(memoryCache.get('key1'), 'value1')
})

test('cache.get returns undefined for missing key', () => {
  assert.equal(memoryCache.get('nonexistent'), undefined)
})

test('cache.delete removes key', () => {
  memoryCache.set('del-key', 'val', 60)
  assert.equal(memoryCache.get('del-key'), 'val')
  memoryCache.delete('del-key')
  assert.equal(memoryCache.get('del-key'), undefined)
})

test('cache.clear removes all keys', () => {
  memoryCache.set('a', 1, 60)
  memoryCache.set('b', 2, 60)
  memoryCache.set('c', 3, 60)
  memoryCache.clear()
  assert.equal(memoryCache.get('a'), undefined)
  assert.equal(memoryCache.get('b'), undefined)
  assert.equal(memoryCache.get('c'), undefined)
})

test('cache respects TTL (expires after TTL)', async () => {
  memoryCache.set('ttl-key', 'ttl-val', 0.01) // 10ms TTL
  assert.equal(memoryCache.get('ttl-key'), 'ttl-val')
  await new Promise((r) => setTimeout(r, 15))
  assert.equal(memoryCache.get('ttl-key'), undefined)
})

test('cache with 0 TTL (immediate expiry)', async () => {
  memoryCache.set('zero-ttl', 'gone', 0)
  await new Promise((r) => setTimeout(r, 2))
  assert.equal(memoryCache.get('zero-ttl'), undefined)
})

test('cache works with objects', () => {
  const obj = { name: 'test', nested: { value: 42 } }
  memoryCache.set('obj-key', obj, 60)
  assert.deepEqual(memoryCache.get('obj-key'), obj)
})

test('cache works with arrays', () => {
  const arr = [1, 2, 3, { a: 1 }]
  memoryCache.set('arr-key', arr, 60)
  assert.deepEqual(memoryCache.get('arr-key'), arr)
})

test('cache works with numbers', () => {
  memoryCache.set('num-key', 42, 60)
  assert.equal(memoryCache.get('num-key'), 42)
  memoryCache.set('zero-key', 0, 60)
  assert.equal(memoryCache.get('zero-key'), 0)
})

test('cache works with null values', () => {
  memoryCache.set('null-key', null, 60)
  assert.equal(memoryCache.get('null-key'), null)
})

test('cache works with undefined values', () => {
  memoryCache.set('undef-key', undefined, 60)
  assert.equal(memoryCache.get('undef-key'), undefined)
})

test('cache overwrites existing key', () => {
  memoryCache.set('overwrite', 'old', 60)
  memoryCache.set('overwrite', 'new', 60)
  assert.equal(memoryCache.get('overwrite'), 'new')
})

test('cache get returns undefined for expired key even when value was set', async () => {
  memoryCache.set('expires-soon', 'ephemeral', 0.05) // 50ms TTL
  assert.equal(memoryCache.get('expires-soon'), 'ephemeral')
  await new Promise((r) => setTimeout(r, 60))
  assert.equal(memoryCache.get('expires-soon'), undefined)
})
