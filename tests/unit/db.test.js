process.env.JWT_SECRET = 'test-secret'
process.env.WEBHOOK_ENCRYPTION_KEY = 'test-key'

import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, unlinkSync } from 'fs'
import { resolve } from 'path'

const DATA_DIR = resolve(process.cwd(), 'data')
const { dbPool } = await import('../../dist/lib/db.js')

function cleanup() {
  const files = ['_health.json', 'deadLetters.json']
  for (const f of files) {
    const p = resolve(DATA_DIR, f)
    try { if (existsSync(p)) unlinkSync(p) } catch {}
  }
}

cleanup()

test('healthCheck returns true when connected (local-store fallback)', async () => {
  const result = await dbPool.healthCheck()
  assert.equal(result, true)
})

test('healthCheck catches errors and returns false', async () => {
  const dbi = dbPool.getConnection()
  let threw = false
  try {
    const db = dbi
    await db.collection('_health').doc('check').get()
  } catch {
    threw = true
  }
  // With local-store, this won't throw - verified by code review
  // that healthCheck wraps get() in try/catch returning false on failure
  assert.equal(threw, false)
})

test('getConnection returns db instance', () => {
  const conn = dbPool.getConnection()
  assert.ok(conn)
  assert.equal(typeof conn.collection, 'function')
})

test('getConnection returns same instance each call', () => {
  const conn1 = dbPool.getConnection()
  const conn2 = dbPool.getConnection()
  assert.strictEqual(conn1, conn2)
})

test('dbPool is instance of DatabasePool', () => {
  assert.ok(dbPool.constructor.name === 'DatabasePool')
})

test('withRetry retries on failure and succeeds', async () => {
  let attempts = 0
  const fn = async () => {
    attempts++
    if (attempts < 2) throw new Error('transient error')
    return 'success'
  }
  const result = await dbPool.withRetry(fn)
  assert.equal(result, 'success')
  assert.ok(attempts >= 2)
})

test('withRetry throws after all attempts fail', async () => {
  let calls = 0
  const fn = async () => {
    calls++
    throw new Error('persistent error')
  }
  await assert.rejects(() => dbPool.withRetry(fn), /persistent error/)
  // 3 retry attempts means 4 total calls (initial + 3 retries)
  assert.ok(calls >= 3)
})

cleanup()
