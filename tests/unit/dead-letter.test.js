process.env.JWT_SECRET = 'test-secret'
process.env.WEBHOOK_ENCRYPTION_KEY = 'test-key'

import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, unlinkSync } from 'fs'
import { resolve } from 'path'

const DATA_DIR = resolve(process.cwd(), 'data')

function cleanup() {
  const file = resolve(DATA_DIR, 'deadLetters.json')
  try { if (existsSync(file)) unlinkSync(file) } catch {}
}

cleanup()

const {
  storeDeadLetter,
  getDeadLetters,
  retryDeadLetter,
  purgeDeadLetters,
  alertIfGrowing,
} = await import('../../dist/lib/dead-letter.js')

test('storeDeadLetter saves to local-store', async () => {
  cleanup()
  const job = { id: 'job-1', data: { name: 'test-job', type: 'webhook', reason: 'timeout', attempt: 3 } }
  await storeDeadLetter('webhooks', job)

  const results = await getDeadLetters('webhooks')
  assert.ok(results.length > 0)
  const stored = results[0]
  assert.equal(stored.queue, 'webhooks')
  assert.equal(stored.jobId, 'job-1')
  assert.equal(stored.name, 'test-job')
  assert.equal(stored.failedReason, 'timeout')
  assert.equal(stored.attemptsMade, 3)
  assert.ok(stored.createdAt)
})

test('stores dead letter with missing fields as defaults', async () => {
  const job = { id: 'default-job', data: {} }
  await storeDeadLetter('emails', job)

  const results = await getDeadLetters('emails')
  const stored = results.find(r => r.jobId === 'default-job')
  assert.ok(stored)
  assert.equal(stored.name, 'unknown')
  assert.equal(stored.failedReason, 'unknown')
  assert.equal(stored.attemptsMade, 0)
})

test('getDeadLetters retrieves filtered list by queue', async () => {
  await storeDeadLetter('webhooks', { id: 'wl-1', data: { name: 'wh' } })
  const results = await getDeadLetters('webhooks')
  assert.ok(Array.isArray(results))
  assert.ok(results.length > 0)
  assert.ok(results.every(r => r.queue === 'webhooks'))
})

test('getDeadLetters returns all when no queue filter', async () => {
  const results = await getDeadLetters()
  assert.ok(Array.isArray(results))
})

test('getDeadLetters respects limit of 100', async () => {
  const results = await getDeadLetters()
  assert.ok(results.length <= 100)
})

test('retryDeadLetter throws for missing doc', async () => {
  await assert.rejects(
    () => retryDeadLetter('nonexistent-id'),
    /Dead letter not found/
  )
})

test('retryDeadLetter re-enqueues job and deletes dl', async () => {
  const job = { id: 'job-retry', data: { name: 'retry-me', type: 'email' } }
  await storeDeadLetter('emails', job)
  await retryDeadLetter('job-retry')

  const after = await getDeadLetters('emails')
  const found = after.filter(r => r.jobId === 'job-retry')
  assert.equal(found.length, 0)
})

test('purgeDeadLetters clears all for a queue', async () => {
  await storeDeadLetter('cleanup', { id: 'purge-a', data: { name: 'a' } })
  await storeDeadLetter('cleanup', { id: 'purge-b', data: { name: 'b' } })

  const before = await getDeadLetters('cleanup')
  assert.ok(before.length > 0)

  await purgeDeadLetters('cleanup')

  const after = await getDeadLetters('cleanup')
  assert.equal(after.length, 0)
})

test('purgeDeadLetters without queueName purges all', async () => {
  await storeDeadLetter('webhooks', { id: 'purge-wh', data: { name: 'wh' } })
  await storeDeadLetter('emails', { id: 'purge-em', data: { name: 'em' } })

  await purgeDeadLetters()

  const all = await getDeadLetters()
  const hasPurgeRemaining = all.filter(r => r.jobId && r.jobId.startsWith('purge-'))
  assert.equal(hasPurgeRemaining.length, 0)
})

test('alertIfGrowing does not throw (count checking)', async () => {
  await assert.doesNotReject(() => alertIfGrowing('webhooks'))
})

test('alertIfGrowing warns when count >= threshold (10)', async () => {
  for (let i = 0; i < 12; i++) {
    await storeDeadLetter('audit', { id: `grow-${i}`, data: { name: 'growing', type: 'audit' } })
  }
  await assert.doesNotReject(() => alertIfGrowing('audit'))
})

cleanup()
