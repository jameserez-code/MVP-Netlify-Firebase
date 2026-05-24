import test from 'node:test'
import assert from 'node:assert/strict'

// Intercept log.warn
import { log } from '../../dist/lib/logger.js'
const warnCalls = []
log.warn = (msg, ctx) => {
  warnCalls.push({ msg, ctx })
}

import {
  enforceOrgIsolation,
  registerOrgIsolation,
  getRequestOrgId,
} from '../../dist/lib/org-isolation.js'

// Helper: create a mock Fastify reply that records code/send
function createMockReply() {
  const self = {
    _statusCode: null,
    _payload: null,
    _sent: false,
    code(statusCode) {
      self._statusCode = statusCode
      return {
        send(payload) {
          self._payload = payload
          self._sent = true
        },
      }
    },
  }
  return self
}

// Helper: reset warn call tracker before each test
function resetWarnCalls() {
  warnCalls.length = 0
}

// ── enforceOrgIsolation ────────────────────────────────────────────────────

test('enforceOrgIsolation extracts orgId from JWT claims and attaches to request', async () => {
  resetWarnCalls()
  const req = { claims: { sub: 'user_1', role: 'org_admin', orgId: 'org_abc' } }
  const reply = createMockReply()

  await enforceOrgIsolation(req, reply)

  assert.equal(req.orgId, 'org_abc')
  assert.equal(reply._sent, false)
})

test('enforceOrgIsolation rejects with 401 when orgId is missing from claims', async () => {
  resetWarnCalls()
  const req = { claims: { sub: 'user_2', role: 'org_member' } }
  const reply = createMockReply()

  await enforceOrgIsolation(req, reply)

  assert.equal(reply._statusCode, 401)
  assert.equal(reply._payload.error.code, 'unauthorized')
  assert.ok(reply._payload.error.message.includes('Organization context missing'))
  // Should have logged a warning
  const rejectionWarn = warnCalls.find((c) => c.msg === 'org isolation rejected: missing orgId in claims')
  assert.ok(rejectionWarn)
  assert.equal(rejectionWarn.ctx.sub, 'user_2')
})

test('enforceOrgIsolation skips (passes through) when no claims present', async () => {
  resetWarnCalls()
  const req = {}
  const reply = createMockReply()

  await enforceOrgIsolation(req, reply)

  assert.equal(reply._sent, false)
  assert.equal(req.orgId, undefined)
})

test('enforceOrgIsolation handles claims with undefined claims gracefully', async () => {
  resetWarnCalls()
  const req = { claims: undefined }
  const reply = createMockReply()

  await enforceOrgIsolation(req, reply)

  assert.equal(reply._sent, false)
})

test('enforceOrgIsolation attaches orgId when claims include it (alongside other fields)', async () => {
  resetWarnCalls()
  const req = {
    claims: {
      sub: 'user_3',
      role: 'readonly',
      orgId: 'org_xyz',
      scopes: ['read:agents'],
      iat: 1700000000,
      exp: 1700086400,
      jti: 'jti_123',
    },
  }
  const reply = createMockReply()

  await enforceOrgIsolation(req, reply)

  assert.equal(req.orgId, 'org_xyz')
  assert.equal(reply._sent, false)
})

// ── registerOrgIsolation ───────────────────────────────────────────────────

test('registerOrgIsolation registers onRequest hook on a Fastify instance', () => {
  const hooks = []
  const app = {
    addHook(type, handler) {
      hooks.push({ type, handler })
    },
  }

  registerOrgIsolation(app)

  assert.equal(hooks.length, 1)
  assert.equal(hooks[0].type, 'onRequest')
  assert.equal(typeof hooks[0].handler, 'function')
})

// ── getRequestOrgId ────────────────────────────────────────────────────────

test('getRequestOrgId returns orgId from request', () => {
  const req = { orgId: 'org_42' }
  assert.equal(getRequestOrgId(req), 'org_42')
})

test('getRequestOrgId returns undefined when orgId is not set', () => {
  const req = {}
  assert.equal(getRequestOrgId(req), undefined)
})
