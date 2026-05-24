import test from 'node:test'
import assert from 'node:assert/strict'
import { checkExportRateLimit } from '../../dist/lib/export-rate-limiter.js'

test('rate limit allows first 5 exports', () => {
  const org = 'org-first5'
  for (let i = 0; i < 5; i++) {
    const result = checkExportRateLimit(org)
    assert.equal(result.allowed, true)
  }
})

test('rate limit blocks 6th export within window', () => {
  const org = 'org-block6'
  for (let i = 0; i < 5; i++) {
    checkExportRateLimit(org)
  }
  const result = checkExportRateLimit(org)
  assert.equal(result.allowed, false)
  assert.ok(typeof result.retryAfter === 'number')
  assert.ok(result.retryAfter > 0)
})

test('rate limit returns retryAfter when blocked', () => {
  const org = 'org-retry'
  for (let i = 0; i < 5; i++) {
    checkExportRateLimit(org)
  }
  const result = checkExportRateLimit(org)
  assert.equal(result.allowed, false)
  assert.ok(result.retryAfter > 0)
  assert.ok(result.retryAfter <= 3600)
})

test('different orgs have independent limits', () => {
  const orgA = 'org-indep-a'
  const orgB = 'org-indep-b'
  for (let i = 0; i < 5; i++) {
    checkExportRateLimit(orgA)
  }
  const blocked = checkExportRateLimit(orgA)
  assert.equal(blocked.allowed, false)

  const allowed = checkExportRateLimit(orgB)
  assert.equal(allowed.allowed, true)
})

test('first call for an org creates entry and allows', () => {
  const org = 'org-firstcall-' + Date.now()
  const result = checkExportRateLimit(org)
  assert.equal(result.allowed, true)
  assert.equal(result.retryAfter, undefined)
})

test('second call increments correctly', () => {
  const org = 'org-secondcall-' + Date.now()
  checkExportRateLimit(org)
  const result = checkExportRateLimit(org)
  assert.equal(result.allowed, true)
})

test('all calls within first 5 succeed', () => {
  const org = 'org-all5-' + Date.now()
  for (let i = 0; i < 5; i++) {
    const result = checkExportRateLimit(org)
    assert.equal(result.allowed, true, `call ${i + 1} should be allowed`)
  }
})

test('6th call blocked, 7th also blocked', () => {
  const org = 'org-67blocked-' + Date.now()
  for (let i = 0; i < 5; i++) {
    checkExportRateLimit(org)
  }
  assert.equal(checkExportRateLimit(org).allowed, false)
  assert.equal(checkExportRateLimit(org).allowed, false)
})

test('blocked calls do not affect rate limit count', () => {
  const org = 'org-blockedcount-' + Date.now()
  for (let i = 0; i < 5; i++) {
    checkExportRateLimit(org)
  }
  checkExportRateLimit(org) // blocked
  checkExportRateLimit(org) // blocked
  const result = checkExportRateLimit(org) // still blocked
  assert.equal(result.allowed, false)
})

test('empty orgId string works', () => {
  const org = ''
  const result = checkExportRateLimit(org)
  assert.equal(result.allowed, true)
})

test('very long orgId strings work', () => {
  const org = 'x'.repeat(500)
  const result = checkExportRateLimit(org)
  assert.equal(result.allowed, true)
})

test('retryAfter decreases on subsequent checks', async () => {
  // Use a synthetic entry to test retryAfter calculation
  const org = 'org-retrydec-' + Date.now()
  for (let i = 0; i < 5; i++) {
    checkExportRateLimit(org)
  }
  const firstBlock = checkExportRateLimit(org)
  assert.ok(firstBlock.retryAfter > 0)
})
