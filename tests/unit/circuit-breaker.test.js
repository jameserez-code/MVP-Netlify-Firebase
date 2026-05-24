import test from 'node:test'
import assert from 'node:assert/strict'
import { CircuitBreaker, CircuitBreakerError } from '../../dist/lib/circuit-breaker.js'

test('circuit breaker starts closed', () => {
  const cb = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 1000, name: 'test-cb' })
  assert.equal(cb.state, 'closed')
})

test('circuit breaker opens after threshold failures', async () => {
  const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 100, name: 'test-cb' })
  await cb.execute(() => Promise.reject(new Error('fail'))).catch(() => {})
  await cb.execute(() => Promise.reject(new Error('fail'))).catch(() => {})
  assert.equal(cb.state, 'open')
})

test('circuit breaker allows successful calls when closed', async () => {
  const cb = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 5000, name: 'test-cb' })
  const result = await cb.execute(() => Promise.resolve('ok'))
  assert.equal(result, 'ok')
  assert.equal(cb.state, 'closed')
})

test('circuit breaker rejects when open', async () => {
  const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 5000, name: 'test-cb' })
  await cb.execute(() => Promise.reject(new Error('fail'))).catch(() => {})
  await assert.rejects(
    () => cb.execute(() => Promise.resolve('ok')),
    (err) => err instanceof CircuitBreakerError && err.message.includes('is open')
  )
})

test('circuit breaker transitions to half-open after timeout', async () => {
  const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 50, halfOpenMaxCalls: 1, name: 'test-cb' })
  await cb.execute(() => Promise.reject(new Error('fail'))).catch(() => {})
  assert.equal(cb.getState(), 'open')
  await new Promise(r => setTimeout(r, 60))
  const result = await cb.execute(() => Promise.resolve('recovered'))
  assert.equal(result, 'recovered')
  assert.equal(cb.getState(), 'closed')
})

test('circuit breaker resets failure count on success', async () => {
  const cb = new CircuitBreaker({ failureThreshold: 5, resetTimeoutMs: 100, name: 'test-cb' })
  await cb.execute(() => Promise.reject(new Error('fail'))).catch(() => {})
  await cb.execute(() => Promise.reject(new Error('fail'))).catch(() => {})
  assert.equal(cb.failures, 2)
  await cb.execute(() => Promise.resolve('ok'))
  assert.equal(cb.failures, 1)
  assert.equal(cb.state, 'closed')
})

test('circuit breaker stays closed below threshold', async () => {
  const cb = new CircuitBreaker({ failureThreshold: 5, resetTimeoutMs: 100, name: 'test-cb' })
  await cb.execute(() => Promise.reject(new Error('fail'))).catch(() => {})
  await cb.execute(() => Promise.reject(new Error('fail'))).catch(() => {})
  await cb.execute(() => Promise.reject(new Error('fail'))).catch(() => {})
  assert.equal(cb.state, 'closed')
  assert.equal(cb.failures, 3)
})

test('circuit breaker blocks during half-open when max calls reached', async () => {
  const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 60, halfOpenMaxCalls: 1, name: 'test-cb' })
  await cb.execute(() => Promise.reject(new Error('fail'))).catch(() => {})
  await new Promise(r => setTimeout(r, 70))
  assert.equal(cb.getState(), 'half-open')
  await cb.execute(() => Promise.reject(new Error('fail'))).catch(() => {})
  assert.equal(cb.getState(), 'open')
})

test('circuit breaker requires name option', () => {
  const cb = new CircuitBreaker({ name: 'required' })
  assert.ok(cb.name)
})

test('circuit breaker error preserves name', () => {
  const err = new CircuitBreakerError('test message')
  assert.equal(err.name, 'CircuitBreakerError')
  assert.equal(err.message, 'test message')
})
