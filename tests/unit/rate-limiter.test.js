import test from 'node:test'
import assert from 'node:assert/strict'
import { RateLimiter } from '../../dist/lib/rate-limiter.js'

test('rate limiter allows request within limit', async () => {
  const rl = new RateLimiter({ defaultLimit: 10, windowMs: 60000 })
  const result = await rl.check('127.0.0.1', '/api/test')
  assert.equal(result.allowed, true)
  assert.ok(result.remaining > 0)
  assert.ok(result.resetAt > Date.now())
})

test('rate limiter blocks request over limit', async () => {
  const rl = new RateLimiter({ defaultLimit: 3, windowMs: 60000 })
  const ip = '127.0.0.2'
  await rl.check(ip, '/api/test')
  await rl.check(ip, '/api/test')
  await rl.check(ip, '/api/test')
  const result = await rl.check(ip, '/api/test')
  assert.equal(result.allowed, false)
  assert.equal(result.remaining, 0)
  assert.ok(result.retryAfter > 0)
})

test('rate limiter returns retryAfter when blocked', async () => {
  const rl = new RateLimiter({ defaultLimit: 2, windowMs: 60000 })
  const ip = '127.0.0.3'
  await rl.check(ip, '/api/blocked')
  await rl.check(ip, '/api/blocked')
  const result = await rl.check(ip, '/api/blocked')
  assert.equal(result.allowed, false)
  assert.ok(typeof result.retryAfter === 'number')
  assert.ok(result.retryAfter > 0)
})

test('different endpoints have independent limits', async () => {
  const rl = new RateLimiter({ defaultLimit: 3, windowMs: 60000 })
  const ip = '192.168.1.1'
  await rl.check(ip, '/api/a')
  await rl.check(ip, '/api/a')
  const resA = await rl.check(ip, '/api/a')
  assert.equal(resA.allowed, true)
  assert.equal(resA.remaining, 0)

  const resB = await rl.check(ip, '/api/b')
  assert.equal(resB.allowed, true)
  assert.equal(resB.remaining, 2)
})

test('different IPs get independent rate limits', async () => {
  const rl = new RateLimiter({ defaultLimit: 3, windowMs: 60000 })
  const ip1 = '10.0.0.1'
  const ip2 = '10.0.0.2'
  await rl.check(ip1, '/api/test')
  await rl.check(ip1, '/api/test')
  await rl.check(ip1, '/api/test')
  const blocked = await rl.check(ip1, '/api/test')
  assert.equal(blocked.allowed, false)

  const allowed = await rl.check(ip2, '/api/test')
  assert.equal(allowed.allowed, true)
  assert.equal(allowed.remaining, 2)
})

test('rate limiter with endpoint-specific limits', async () => {
  const rl = new RateLimiter({
    defaultLimit: 100,
    windowMs: 60000,
    endpointLimits: { '/api/strict': 2 }
  })
  const ip = '10.10.10.10'
  await rl.check(ip, '/api/strict')
  await rl.check(ip, '/api/strict')
  const blocked = await rl.check(ip, '/api/strict')
  assert.equal(blocked.allowed, false)

  await rl.check(ip, '/api/loose')
  await rl.check(ip, '/api/loose')
  const allowed = await rl.check(ip, '/api/loose')
  assert.equal(allowed.allowed, true)
})

test('burst detection blocks rapid requests', async () => {
  const rl = new RateLimiter({ defaultLimit: 100, windowMs: 60000, burstThreshold: 3, burstWindowMs: 5000 })
  const ip = '172.16.0.1'
  await rl.check(ip, '/api/burst')
  await rl.check(ip, '/api/burst')
  await rl.check(ip, '/api/burst')
  const blocked = await rl.check(ip, '/api/burst')
  assert.equal(blocked.allowed, false)
  assert.ok(blocked.retryAfter > 0)
})

test('rate limiter window resets after expiry', async () => {
  const rl = new RateLimiter({ defaultLimit: 2, windowMs: 50 })
  const ip = '172.20.0.1'
  await rl.check(ip, '/api/short')
  await rl.check(ip, '/api/short')
  const blocked = await rl.check(ip, '/api/short')
  assert.equal(blocked.allowed, false)

  await new Promise(r => setTimeout(r, 60))
  const reset = await rl.check(ip, '/api/short')
  assert.equal(reset.allowed, true)
  assert.equal(reset.remaining, 1)
})

test('rate limiter with custom endpoint window durations', async () => {
  const rl = new RateLimiter({ defaultLimit: 3, windowMs: 60000 })
  const ip = '10.1.1.1'

  await rl.check(ip, '/auth/login')
  await rl.check(ip, '/auth/login')
  await rl.check(ip, '/auth/login')
  const blockedLogin = await rl.check(ip, '/auth/login')
  assert.equal(blockedLogin.allowed, false)
})

test('getLimit returns default when no prefix matches', async () => {
  const rl = new RateLimiter({
    defaultLimit: 50,
    windowMs: 60000,
    endpointLimits: { '/admin': 5 }
  })
  const ip = '10.1.1.2'
  await rl.check(ip, '/admin')
  const res = await rl.check(ip, '/public')
  assert.equal(res.allowed, true)
  assert.ok(res.remaining > 5)
})
