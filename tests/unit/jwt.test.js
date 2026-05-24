import test from 'node:test'
import assert from 'node:assert/strict'

process.env.JWT_SECRET = 'ff'.repeat(32)

import { sign, verify, setSecret, getSecret } from '../../dist/lib/jwt.js'

test('sign produces valid three-part JWT', () => {
  const token = sign({ sub: 'user_001', role: 'org_admin' })
  const parts = token.split('.')
  assert.equal(parts.length, 3)
  assert.ok(parts[0].length > 0)
  assert.ok(parts[1].length > 0)
  assert.ok(parts[2].length > 0)
})

test('verify returns claims for valid token', async () => {
  const token = sign({ sub: 'user_001', role: 'org_admin', orgId: 'org_01' })
  const claims = await verify(token)
  assert.ok(claims !== null)
  assert.equal(claims.sub, 'user_001')
  assert.equal(claims.role, 'org_admin')
  assert.equal(claims.orgId, 'org_01')
})

test('verify returns null for tampered token', async () => {
  const token = sign({ sub: 'user_002', role: 'agent' })
  const parts = token.split('.')
  const tamperedPayload = Buffer.from(JSON.stringify({ sub: 'user_003', role: 'org_admin', iat: 123, exp: 9999999999, jti: 'abc' })).toString('base64url')
  const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`
  const claims = await verify(tamperedToken)
  assert.equal(claims, null)
})

test('verify returns null for malformed token', async () => {
  assert.equal(await verify('not.a.jwt.token'), null)
  assert.equal(await verify('a.b'), null)
  assert.equal(await verify(''), null)
})

test('verify returns null for wrong secret', async () => {
  const token = sign({ sub: 'user_001', role: 'agent' })
  const originalSecret = getSecret()
  setSecret('aa'.repeat(32))
  const claims = await verify(token)
  assert.equal(claims, null)
  setSecret(originalSecret)
})

test('verify returns null for expired token', async () => {
  const token = sign({ sub: 'user_exp', role: 'agent' })
  const parts = token.split('.')
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'))
  const expiredPayload = { ...payload, exp: 1 }
  const newPayloadB64 = Buffer.from(JSON.stringify(expiredPayload)).toString('base64url')
  const secret = Buffer.from(getSecret(), 'hex')
  const { createHmac } = await import('crypto')
  const sig = createHmac('sha256', secret).update(`${parts[0]}.${newPayloadB64}`).digest('base64url')
  const expiredToken = `${parts[0]}.${newPayloadB64}.${sig}`
  const claims = await verify(expiredToken)
  assert.equal(claims, null)
})

test('tokens have unique jti', () => {
  const t1 = sign({ sub: 'user_001', role: 'agent' })
  const t2 = sign({ sub: 'user_001', role: 'agent' })
  const p1 = JSON.parse(Buffer.from(t1.split('.')[1], 'base64url').toString('utf-8'))
  const p2 = JSON.parse(Buffer.from(t2.split('.')[1], 'base64url').toString('utf-8'))
  assert.notEqual(p1.jti, p2.jti)
})

test('sign includes iat and exp claims', () => {
  const token = sign({ sub: 'user_001', role: 'org_admin' })
  const parts = token.split('.')
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'))
  assert.ok(typeof payload.iat === 'number')
  assert.ok(typeof payload.exp === 'number')
  assert.ok(payload.exp > payload.iat)
})

test('sign includes orgId when provided', () => {
  const token = sign({ sub: 'user_001', role: 'agent', orgId: 'org_42' })
  const parts = token.split('.')
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'))
  assert.equal(payload.orgId, 'org_42')
})

test('verify with empty token returns null', async () => {
  assert.equal(await verify(''), null)
  assert.equal(await verify(null), null)
  assert.equal(await verify(undefined), null)
})

test('verify rejects token with truncated signature', async () => {
  const token = sign({ sub: 'user_001', role: 'agent' })
  const truncated = token.substring(0, token.length - 5)
  const claims = await verify(truncated)
  assert.equal(claims, null)
})
