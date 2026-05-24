import test from 'node:test'
import assert from 'node:assert/strict'

// Intercept log.warn
import { log } from '../../dist/lib/logger.js'
const warnCalls = []
log.warn = (msg, ctx) => {
  warnCalls.push({ msg, ctx })
}

import { requireRole, requireAdmin, requireMember, requireReadonly } from '../../dist/lib/rbac.js'

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

function resetWarnCalls() {
  warnCalls.length = 0
}

// ── requireRole basic tests ────────────────────────────────────────────────

test('requireRole allows when role is in allowed list (exact match)', async () => {
  resetWarnCalls()
  const middleware = requireRole(['org_admin'])
  const req = { claims: { sub: 'u1', role: 'org_admin' } }
  const reply = createMockReply()

  await middleware(req, reply)

  assert.equal(reply._sent, false, 'should not send error response')
})

test('requireRole blocks with 403 when role is not in allowed list', async () => {
  resetWarnCalls()
  const middleware = requireRole(['org_admin'])
  const req = { claims: { sub: 'u2', role: 'readonly' }, url: '/admin/agents' }
  const reply = createMockReply()

  await middleware(req, reply)

  assert.equal(reply._statusCode, 403)
  assert.equal(reply._payload.error.code, 'forbidden')
  assert.ok(
    reply._payload.error.message.includes('org_admin'),
    'error message should mention required role',
  )
})

test('org_admin can access admin-only endpoints (hierarchical)', async () => {
  resetWarnCalls()
  const middleware = requireRole(['org_admin'])
  const req = { claims: { sub: 'admin1', role: 'org_admin' } }
  const reply = createMockReply()

  await middleware(req, reply)

  assert.equal(reply._sent, false)
})

test('org_admin inherits org_member permissions (hierarchy)', async () => {
  resetWarnCalls()
  const middleware = requireRole(['org_member'])
  const req = { claims: { sub: 'admin2', role: 'org_admin' } }
  const reply = createMockReply()

  await middleware(req, reply)

  assert.equal(reply._sent, false, 'org_admin should pass org_member check via hierarchy')
})

test('org_member inherits readonly permissions (hierarchy)', async () => {
  resetWarnCalls()
  const middleware = requireRole(['readonly'])
  const req = { claims: { sub: 'mem1', role: 'org_member' } }
  const reply = createMockReply()

  await middleware(req, reply)

  assert.equal(reply._sent, false, 'org_member should pass readonly check via hierarchy')
})

test('org_member can access member endpoints', async () => {
  resetWarnCalls()
  const middleware = requireRole(['org_member'])
  const req = { claims: { sub: 'mem2', role: 'org_member' } }
  const reply = createMockReply()

  await middleware(req, reply)

  assert.equal(reply._sent, false)
})

test('readonly can access GET endpoints (readonly allowed)', async () => {
  resetWarnCalls()
  const middleware = requireRole(['readonly'])
  const req = { claims: { sub: 'ro1', role: 'readonly' }, url: '/agents' }
  const reply = createMockReply()

  await middleware(req, reply)

  assert.equal(reply._sent, false)
})

test('readonly is blocked from org_member endpoints (hierarchy)', async () => {
  resetWarnCalls()
  const middleware = requireRole(['org_member'])
  const req = { claims: { sub: 'ro2', role: 'readonly' }, url: '/agents/modify' }
  const reply = createMockReply()

  await middleware(req, reply)

  assert.equal(reply._statusCode, 403)
})

// ── requireRole missing claims / role handling ─────────────────────────────

test('requireRole handles missing claims (returns 401)', async () => {
  resetWarnCalls()
  const middleware = requireRole(['org_admin'])
  const req = {}
  const reply = createMockReply()

  await middleware(req, reply)

  assert.equal(reply._statusCode, 401)
  assert.equal(reply._payload.error.code, 'unauthorized')
  assert.ok(reply._payload.error.message.includes('Authentication required'))
})

test('requireRole handles missing role with default denial (defaults to readonly)', async () => {
  resetWarnCalls()
  // claims exist but no role field -> defaults to 'readonly'
  const middleware = requireRole(['org_admin'])
  const req = { claims: { sub: 'u3' }, url: '/admin' }
  const reply = createMockReply()

  await middleware(req, reply)

  // readonly < org_admin, so 403
  assert.equal(reply._statusCode, 403)
})

test('requireRole allows readonly role for readonly-only endpoints', async () => {
  resetWarnCalls()
  // claims have no role -> defaults to 'readonly'
  const middleware = requireRole(['readonly'])
  const req = { claims: { sub: 'u4' }, url: '/data' }
  const reply = createMockReply()

  await middleware(req, reply)

  assert.equal(reply._sent, false, 'default readonly should pass readonly check')
})

// ── requireRole multiple allowed roles ─────────────────────────────────────

test('requireRole allows when any of multiple roles match', async () => {
  resetWarnCalls()
  const middleware = requireRole(['org_admin', 'org_member'])
  // Test org_member passes
  const req = { claims: { sub: 'u5', role: 'org_member' }, url: '/shared' }
  const reply = createMockReply()
  await middleware(req, reply)
  assert.equal(reply._sent, false)
})

test('requireRole blocks when none of multiple roles match', async () => {
  resetWarnCalls()
  const middleware = requireRole(['org_admin', 'org_member'])
  const req = { claims: { sub: 'u6', role: 'readonly' }, url: '/admin' }
  const reply = createMockReply()

  await middleware(req, reply)

  assert.equal(reply._statusCode, 403)
  assert.ok(reply._payload.error.message.includes('org_admin, org_member'))
})

// ── API key bypass ─────────────────────────────────────────────────────────

test('requireRole allows API key requests by default (no role gate)', async () => {
  resetWarnCalls()
  const middleware = requireRole(['org_admin'])
  const req = { claims: { sub: 'apikey_1', role: 'api_key' } }
  const reply = createMockReply()

  await middleware(req, reply)

  assert.equal(reply._sent, false, 'API key should bypass role check')
})

test('requireRole blocks API key when allowApiKey is explicitly false', async () => {
  resetWarnCalls()
  const middleware = requireRole(['org_admin'], { allowApiKey: false })
  // role 'api_key' fails hierarchy check (not in ROLE_HIERARCHY -> level 0 < 3)
  const req = { claims: { sub: 'apikey_2', role: 'api_key' }, url: '/admin' }
  const reply = createMockReply()

  await middleware(req, reply)

  assert.equal(reply._statusCode, 403)
})

// ── Shorthand middleware helpers ────────────────────────────────────────────

test('requireAdmin allows org_admin', async () => {
  resetWarnCalls()
  const req = { claims: { sub: 'a1', role: 'org_admin' } }
  const reply = createMockReply()
  await requireAdmin(req, reply)
  assert.equal(reply._sent, false)
})

test('requireAdmin blocks org_member', async () => {
  resetWarnCalls()
  const req = { claims: { sub: 'a2', role: 'org_member' }, url: '/admin' }
  const reply = createMockReply()
  await requireAdmin(req, reply)
  assert.equal(reply._statusCode, 403)
})

test('requireMember allows org_member', async () => {
  resetWarnCalls()
  const req = { claims: { sub: 'm1', role: 'org_member' } }
  const reply = createMockReply()
  await requireMember(req, reply)
  assert.equal(reply._sent, false)
})

test('requireMember allows org_admin (hierarchy)', async () => {
  resetWarnCalls()
  const req = { claims: { sub: 'm2', role: 'org_admin' } }
  const reply = createMockReply()
  await requireMember(req, reply)
  assert.equal(reply._sent, false)
})

test('requireMember blocks readonly', async () => {
  resetWarnCalls()
  const req = { claims: { sub: 'm3', role: 'readonly' }, url: '/members' }
  const reply = createMockReply()
  await requireMember(req, reply)
  assert.equal(reply._statusCode, 403)
})

test('requireReadonly allows readonly', async () => {
  resetWarnCalls()
  const req = { claims: { sub: 'r1', role: 'readonly' } }
  const reply = createMockReply()
  await requireReadonly(req, reply)
  assert.equal(reply._sent, false)
})

test('requireReadonly allows org_member (hierarchy)', async () => {
  resetWarnCalls()
  const req = { claims: { sub: 'r2', role: 'org_member' } }
  const reply = createMockReply()
  await requireReadonly(req, reply)
  assert.equal(reply._sent, false)
})

test('requireReadonly allows org_admin (hierarchy)', async () => {
  resetWarnCalls()
  const req = { claims: { sub: 'r3', role: 'org_admin' } }
  const reply = createMockReply()
  await requireReadonly(req, reply)
  assert.equal(reply._sent, false)
})

// ── Edge cases ─────────────────────────────────────────────────────────────

test('requireRole handles unknown role gracefully (treated as level 0, denied)', async () => {
  resetWarnCalls()
  const middleware = requireRole(['readonly'])
  const req = { claims: { sub: 'u7', role: 'super_god_mode' }, url: '/test' }
  const reply = createMockReply()

  await middleware(req, reply)

  // unknown role maps to level 0, readonly requires 1 -> denied
  assert.equal(reply._statusCode, 403)
})

test('requireRole logs rbac denied with sub, role, required, path', async () => {
  resetWarnCalls()
  const middleware = requireRole(['org_admin'])
  const req = { claims: { sub: 'logger-user', role: 'readonly' }, url: '/restricted/area' }
  const reply = createMockReply()

  await middleware(req, reply)

  const denialLog = warnCalls.find((c) => c.msg === 'rbac denied')
  assert.ok(denialLog)
  assert.equal(denialLog.ctx.sub, 'logger-user')
  assert.equal(denialLog.ctx.role, 'readonly')
  assert.equal(denialLog.ctx.path, '/restricted/area')
})
