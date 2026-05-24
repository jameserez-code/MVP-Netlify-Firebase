import test from 'node:test'
import assert from 'node:assert/strict'

// crypto.js requires JWT_SECRET at module init; set it before imports
process.env.JWT_SECRET = 'a'.repeat(64)

const {
  rotateJwtSecret,
  rotateEngineSecret,
  scheduleRotation,
  cancelScheduledRotation,
} = await import('../../dist/lib/secrets.js')

test('rotateJwtSecret generates new 64-char hex secret', () => {
  const secret = rotateJwtSecret()
  assert.equal(typeof secret, 'string')
  assert.equal(secret.length, 64)
  assert.match(secret, /^[0-9a-f]{64}$/)
})

test('rotateJwtSecret updates process.env.JWT_SECRET', () => {
  const prev = process.env.JWT_SECRET
  rotateJwtSecret()
  assert.notEqual(process.env.JWT_SECRET, prev)
  assert.equal(process.env.JWT_SECRET.length, 64)
})

test('rotateEngineSecret generates new 64-char hex secret', () => {
  const secret = rotateEngineSecret()
  assert.equal(typeof secret, 'string')
  assert.equal(secret.length, 64)
  assert.match(secret, /^[0-9a-f]{64}$/)
})

test('rotateEngineSecret updates process.env.ENGINE_SECRET', () => {
  const secret = rotateEngineSecret()
  assert.equal(process.env.ENGINE_SECRET, secret)
})

test('scheduleRotation sets interval with default 30 days', () => {
  const stop = scheduleRotation()
  assert.equal(typeof stop, 'function')
  stop()
})

test('scheduleRotation accepts custom interval', () => {
  const stop = scheduleRotation(60000)
  assert.equal(typeof stop, 'function')
  stop()
})

test('scheduleRotation returns a stop function that clears interval', () => {
  const stop = scheduleRotation(100)
  assert.equal(typeof stop, 'function')
  assert.doesNotThrow(() => stop())
  assert.doesNotThrow(() => stop()) // idempotent
})

test('scheduleRotation cancels previous timer before creating new one', () => {
  const stop1 = scheduleRotation(100)
  const stop2 = scheduleRotation(200)
  assert.equal(typeof stop2, 'function')
  stop2()
  assert.doesNotThrow(() => cancelScheduledRotation())
  stop1()
})

test('cancelScheduledRotation clears existing timer', () => {
  scheduleRotation(60000)
  assert.doesNotThrow(() => cancelScheduledRotation())
})

test('cancelScheduledRotation is safe to call with no active timer', () => {
  cancelScheduledRotation()
  assert.doesNotThrow(() => cancelScheduledRotation())
})

test('each rotateJwtSecret generates unique secrets', () => {
  const s1 = rotateJwtSecret()
  const s2 = rotateJwtSecret()
  assert.notEqual(s1, s2)
})

test('each rotateEngineSecret generates unique secrets', () => {
  const s1 = rotateEngineSecret()
  const s2 = rotateEngineSecret()
  assert.notEqual(s1, s2)
})

test('rotateJwtSecret returns a 64-character hex string', () => {
  const secret = rotateJwtSecret()
  assert.ok(/^[0-9a-f]{64}$/.test(secret))
})

test('rotateEngineSecret returns a 64-character hex string', () => {
  const secret = rotateEngineSecret()
  assert.ok(/^[0-9a-f]{64}$/.test(secret))
})

test('scheduleRotation returns stop function even with custom interval', () => {
  const stop = scheduleRotation(120000)
  assert.equal(typeof stop, 'function')
  stop()
})
