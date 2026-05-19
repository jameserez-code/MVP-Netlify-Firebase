import type { FastifyInstance } from 'fastify'
import type { Firestore } from 'firebase-admin/firestore'
import { log } from '../lib/logger.js'
import { paginate, parsePaginationQuery } from '../lib/pagination.js'
import { hashKey, verifyKey, generateId } from '../lib/crypto.js'
import { randomUUID } from 'crypto'

interface ApiKeyDoc {
  id: string
  orgId: string
  name: string
  keyHash: string
  keySalt: string
  keyPrefix: string
  scopes: string[]
  createdAt: string
  lastUsedAt: string | null
  requestCount: number
  status: 'active' | 'revoked'
}

function maskKey(key: string): string {
  return key.substring(0, 8) + '•'.repeat(Math.max(key.length - 8, 8))
}

export default async function apiKeysRoutes(app: FastifyInstance, db: Firestore) {

  // ---------------------------------------------------------------------------
  // POST /api-keys — create new API key
  // ---------------------------------------------------------------------------
  app.post('/api-keys', async (request, reply) => {
    const claims = (request as any).claims
    if (!claims) {
      reply.code(401)
      return { error: { code: 'unauthorized', message: 'Authentication required' } }
    }

    const { name, scopes } = (request.body || {}) as { name?: string; scopes?: string[] }
    if (!name) {
      reply.code(400)
      return { error: { code: 'validation', message: 'name is required' } }
    }

    const orgId = claims.sub || claims.orgId || process.env.DEFAULT_ORG_ID
    if (!orgId) {
      reply.code(500)
      return { error: { code: 'config_error', message: 'DEFAULT_ORG_ID not configured' } }
    }

    try {
      const plaintextKey = `passport_${randomUUID().replace(/-/g, '')}`
      const { hash, salt } = hashKey(plaintextKey)
      const keyId = generateId('key_')

      const doc: ApiKeyDoc = {
        id: keyId,
        orgId,
        name,
        keyHash: hash,
        keySalt: salt,
        keyPrefix: plaintextKey.substring(0, 8),
        scopes: scopes || ['read', 'write'],
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
        requestCount: 0,
        status: 'active',
      }

      await db.collection('apiKeys').doc(keyId).set(doc)

      log.success('api key created', { keyId, orgId, name })
      reply.code(201)
      return {
        id: keyId,
        name,
        key: plaintextKey, // returned ONCE
        scopes: doc.scopes,
        createdAt: doc.createdAt,
      }
    } catch (e: any) {
      log.error('api key creation failed', { error: e.message })
      reply.code(503)
      return { error: { code: 'firestore', message: 'write failed' } }
    }
  })

  // ---------------------------------------------------------------------------
  // GET /api-keys — list keys (masked)
  // ---------------------------------------------------------------------------
  app.get('/api-keys', async (request, reply) => {
    const claims = (request as any).claims
    if (!claims) {
      reply.code(401)
      return { error: { code: 'unauthorized', message: 'Authentication required' } }
    }

    const orgId = claims.sub || claims.orgId || process.env.DEFAULT_ORG_ID
    if (!orgId) {
      reply.code(500)
      return { error: { code: 'config_error', message: 'DEFAULT_ORG_ID not configured' } }
    }

    try {
      let q = db.collection('apiKeys').where('orgId', '==', orgId)
      const snap = await q.get()
      let data = snap.docs.map(d => {
        const doc = d.data() as ApiKeyDoc
        return {
          id: d.id,
          name: doc.name,
          maskedKey: maskKey(doc.keyPrefix + '•'.repeat(24)),
          createdAt: doc.createdAt,
          lastUsedAt: doc.lastUsedAt,
          requestCount: doc.requestCount || 0,
          scopes: doc.scopes,
          status: doc.status,
        }
      })

      const options = parsePaginationQuery(request.query as Record<string, unknown>)
      return paginate(data, options)
    } catch (e: any) {
      log.error('api keys list failed', { error: e.message })
      reply.code(503)
      return { error: { code: 'firestore', message: e.message } }
    }
  })

  // ---------------------------------------------------------------------------
  // DELETE /api-keys/:id — revoke key
  // ---------------------------------------------------------------------------
  app.delete('/api-keys/:id', async (request, reply) => {
    const claims = (request as any).claims
    if (!claims) {
      reply.code(401)
      return { error: { code: 'unauthorized', message: 'Authentication required' } }
    }

    const id = (request.params as any).id
    const snap = await db.collection('apiKeys').doc(id).get()
    if (!snap.exists) {
      reply.code(404)
      return { error: { code: 'not_found', message: 'API key not found' } }
    }

    await db.collection('apiKeys').doc(id).update({
      status: 'revoked',
      revokedAt: new Date().toISOString(),
    })

    log.success('api key revoked', { keyId: id })
    return { id, status: 'revoked' }
  })

  // ---------------------------------------------------------------------------
  // POST /api-keys/:id/rotate — create new key, revoke old one
  // ---------------------------------------------------------------------------
  app.post('/api-keys/:id/rotate', async (request, reply) => {
    const claims = (request as any).claims
    if (!claims) {
      reply.code(401)
      return { error: { code: 'unauthorized', message: 'Authentication required' } }
    }

    const id = (request.params as any).id
    const snap = await db.collection('apiKeys').doc(id).get()
    if (!snap.exists) {
      reply.code(404)
      return { error: { code: 'not_found', message: 'API key not found' } }
    }

    const oldDoc = snap.data() as ApiKeyDoc
    const orgId = oldDoc.orgId

    try {
      // Revoke old key
      await db.collection('apiKeys').doc(id).update({
        status: 'revoked',
        revokedAt: new Date().toISOString(),
      })

      // Create new key with same name/scopes
      const plaintextKey = `passport_${randomUUID().replace(/-/g, '')}`
      const { hash, salt } = hashKey(plaintextKey)
      const newKeyId = generateId('key_')

      const newDoc: ApiKeyDoc = {
        id: newKeyId,
        orgId,
        name: oldDoc.name,
        keyHash: hash,
        keySalt: salt,
        keyPrefix: plaintextKey.substring(0, 8),
        scopes: oldDoc.scopes,
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
        requestCount: 0,
        status: 'active',
      }

      await db.collection('apiKeys').doc(newKeyId).set(newDoc)

      log.success('api key rotated', { oldKeyId: id, newKeyId })
      reply.code(201)
      return {
        id: newKeyId,
        name: newDoc.name,
        key: plaintextKey, // returned ONCE
        scopes: newDoc.scopes,
        createdAt: newDoc.createdAt,
        previousKeyId: id,
      }
    } catch (e: any) {
      log.error('api key rotation failed', { error: e.message })
      reply.code(503)
      return { error: { code: 'firestore', message: 'write failed' } }
    }
  })
}
