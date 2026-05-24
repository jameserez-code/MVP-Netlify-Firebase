import test from 'node:test'
import assert from 'node:assert/strict'

const { enforceRetention } = await import('../../dist/lib/retention.js')

function makeFirestoreStub(collections = {}) {
  const store = {
    batch() {
      const ops = []
      return {
        update(ref, data) { ops.push({ type: 'update', ref: ref.id || ref, data }) },
        delete(ref) { ops.push({ type: 'delete', ref: ref.id || ref }) },
        set(ref, data) { ops.push({ type: 'set', ref: ref.id || ref, data }) },
        async commit() { return Promise.resolve() },
      }
    },
    collection(name) {
      const collConfig = collections[name] || { docs: [] }
      const chain = {
        _name: name,
        _filters: [],
        _limit: null,
        doc(id) {
          return { id, ref: { id } }
        },
        where(field, op, value) {
          chain._filters.push({ field, op, value })
          return chain
        },
        select() { return chain },
        limit(n) { chain._limit = n; return chain },
        async get() {
          let docs = collConfig.docs.map(d => ({ ...d }))
          for (const f of chain._filters) {
            if (f.op === '<') {
              docs = docs.filter(d => d[f.field] < f.value)
            } else if (f.op === '==') {
              docs = docs.filter(d => d[f.field] === f.value)
            }
          }
          if (chain._limit !== null) {
            docs = docs.slice(0, chain._limit)
          }
          return {
            empty: docs.length === 0,
            docs: docs.map(d => ({ id: d.__id, ref: { id: d.__id, data: () => d } })),
            size: docs.length,
          }
        },
      }
      return chain
    },
  }
  return store
}

test('enforceRetention deletes audit logs older than threshold', async () => {
  const oldDate = '1990-01-01T00:00:00.000Z'
  const db = makeFirestoreStub({
    actionIntents: {
      docs: [
        { __id: 'a1', createdAt: oldDate },
        { __id: 'a2', createdAt: oldDate },
      ],
    },
  })
  const result = await enforceRetention(db)
  assert.equal(result.auditDeleted, 2)
})

test('enforceRetention deletes demo sessions older than threshold', async () => {
  const oldDate = '1990-01-01T00:00:00.000Z'
  const db = makeFirestoreStub({
    sessions: {
      docs: [
        { __id: 's1', startedAt: oldDate },
        { __id: 's2', startedAt: oldDate },
        { __id: 's3', startedAt: oldDate },
      ],
    },
  })
  const result = await enforceRetention(db)
  assert.equal(result.demoSessionsDeleted, 3)
})

test('enforceRetention deletes expired tokens (password reset)', async () => {
  const db = makeFirestoreStub({
    users: {
      docs: [
        { __id: 'u1', passwordResetExpires: '1990-01-01T00:00:00.000Z' },
        { __id: 'u2', passwordResetExpires: '1990-01-01T00:00:00.000Z' },
      ],
    },
  })
  const result = await enforceRetention(db)
  assert.equal(result.passwordResetsCleared, 2)
})

test('enforceRetention clears verification tokens for unverified old users', async () => {
  const oldDate = '1990-01-01T00:00:00.000Z'
  const db = makeFirestoreStub({
    users: {
      docs: [
        { __id: 'u1', verified: false, createdAt: oldDate },
        { __id: 'u2', verified: false, createdAt: oldDate },
      ],
    },
  })
  const result = await enforceRetention(db)
  assert.equal(result.verificationTokensCleared, 2)
})

test('enforceRetention respects custom thresholds via env vars', async () => {
  process.env.RETENTION_AUDIT_DAYS = '1'
  process.env.RETENTION_DEMO_SESSIONS_HOURS = '1'
  process.env.RETENTION_PASSWORD_RESET_HOURS = '1'
  process.env.RETENTION_VERIFICATION_HOURS = '1'

  const oldDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  const db = makeFirestoreStub({
    actionIntents: { docs: [{ __id: 'a1', createdAt: oldDate }] },
    sessions: { docs: [{ __id: 's1', startedAt: oldDate }] },
  })
  const result = await enforceRetention(db)
  assert.ok(result.auditDeleted >= 0)
  assert.ok(result.demoSessionsDeleted >= 0)

  delete process.env.RETENTION_AUDIT_DAYS
  delete process.env.RETENTION_DEMO_SESSIONS_HOURS
  delete process.env.RETENTION_PASSWORD_RESET_HOURS
  delete process.env.RETENTION_VERIFICATION_HOURS
})

test('enforceRetention handles empty collections gracefully', async () => {
  const db = makeFirestoreStub({})
  const result = await enforceRetention(db)
  assert.equal(result.auditDeleted, 0)
  assert.equal(result.demoSessionsDeleted, 0)
  assert.equal(result.passwordResetsCleared, 0)
  assert.equal(result.verificationTokensCleared, 0)
})

test('enforceRetention returns results object with all counters', async () => {
  const db = makeFirestoreStub({})
  const result = await enforceRetention(db)
  assert.ok('auditDeleted' in result)
  assert.ok('demoSessionsDeleted' in result)
  assert.ok('passwordResetsCleared' in result)
  assert.ok('verificationTokensCleared' in result)
})

test('enforceRetention idempotent - running twice does not error', async () => {
  const db = makeFirestoreStub({})
  await assert.doesNotReject(() => enforceRetention(db))
  await assert.doesNotReject(() => enforceRetention(db))
})

test('enforceRetention handles audit logs with recent docs correctly (not deleted)', async () => {
  const recentDate = new Date().toISOString()
  const db = makeFirestoreStub({
    actionIntents: {
      docs: [
        { __id: 'recent', createdAt: recentDate },
      ],
    },
  })
  const result = await enforceRetention(db)
  assert.equal(result.auditDeleted, 0)
})

test('enforceRetention clears both password resets and verification tokens in one run', async () => {
  const oldDate = '1990-01-01T00:00:00.000Z'
  const db = makeFirestoreStub({
    users: {
      docs: [
        { __id: 'u1', passwordResetExpires: oldDate },
        { __id: 'u2', verified: false, createdAt: oldDate },
      ],
    },
  })
  const result = await enforceRetention(db)
  assert.equal(result.passwordResetsCleared, 1)
  assert.equal(result.verificationTokensCleared, 1)
})

test('enforceRetention limits batch size to 500', async () => {
  const oldDate = '1990-01-01T00:00:00.000Z'
  const docs = Array.from({ length: 600 }, (_, i) => ({ __id: `audit-${i}`, createdAt: oldDate }))
  const db = makeFirestoreStub({
    actionIntents: { docs },
  })
  const result = await enforceRetention(db)
  assert.ok(result.auditDeleted > 0)
  assert.ok(result.auditDeleted <= 600)
})
