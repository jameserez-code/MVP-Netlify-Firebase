import type { FastifyInstance } from 'fastify'
import type { Firestore } from 'firebase-admin/firestore'
import { log } from '../lib/logger.js'
import {
  generateAgentSecretKey, generatePassportNumber, hashKey, hashSystemPrompt,
  generateId,
} from '../lib/crypto.js'

export default async function agentsRoutes(app: FastifyInstance, db: Firestore) {

  // ---------------------------------------------------------------------------
  // POST /agents/register
  // ---------------------------------------------------------------------------
  app.post('/agents/register', async (request, reply) => {
    const { name, model, provider, systemPrompt, environment, metadata } = (request.body || {}) as any

    if (!name || !model || !provider) {
      reply.code(400)
      return { error: { code: 'validation', message: 'name, model, and provider are required' } }
    }

    try {
      const secretKey = generateAgentSecretKey()
      const { hash, salt } = hashKey(secretKey)
      const passportNumber = generatePassportNumber()
      const promptHash = hashSystemPrompt(systemPrompt || '')
      const agentId = generateId('agent_')

      const orgId = process.env.DEFAULT_ORG_ID
      if (!orgId) {
        reply.code(500)
        return { error: { code: 'config_error', message: 'DEFAULT_ORG_ID not configured' } }
      }

      await db.collection('agents').doc(agentId).set({
        id: agentId,
        name,
        model,
        provider,
        orgId,
        status: 'active',
        passport: {
          passportNumber,
          model,
          provider,
          modelVersion: model,
          systemPromptHash: promptHash,
          origin: {
            createdBy: 'api',
            createdAt: new Date().toISOString(),
            environment: environment || 'production',
          },
        },
        signingKey: {
          keyId: secretKey.substring(0, 14),
          secretHash: hash,
          secretSalt: salt,
          algorithm: 'hmac-sha256',
          iterations: 50000,
          rotatedAt: null,
        },
        registeredAt: new Date().toISOString(),
        lastSeenAt: null,
        revokedAt: null,
        revokedBy: null,
        revokedReason: null,
        metadata: metadata || {},
      })

      log.success('agent registered', { agentId, passportNumber, model })
      reply.code(201)
      return {
        agentId,
        passportNumber,
        secretKey,
        secretKeyPrefix: secretKey.substring(0, 14),
        systemPromptHash: promptHash,
        registeredAt: new Date().toISOString(),
      }
    } catch (e: any) {
      log.error('agent register failed', { error: e.message })
      reply.code(503)
      return { error: { code: 'firestore', message: 'write failed' } }
    }
  })

  // ---------------------------------------------------------------------------
  // GET /agents
  // ---------------------------------------------------------------------------
  app.get('/agents', async (request, reply) => {
    const { status } = (request.query || {}) as { status?: string }
    const orgId = process.env.DEFAULT_ORG_ID
    if (!orgId) {
      reply.code(500)
      return { error: { code: 'config_error', message: 'DEFAULT_ORG_ID not configured' } }
    }
    try {
      let q = db.collection('agents').where('orgId', '==', orgId)
      const snap = await q.get()
      let data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      if (status) data = data.filter((a: any) => a.status === status)
      data.sort((a: any, b: any) => (b.registeredAt || '').localeCompare(a.registeredAt || ''))

      log.info('agents list', { count: data.length })
      return { data, total: data.length }
    } catch (e: any) {
      log.error('agents list failed', { error: e.message })
      reply.code(503)
      return { error: { code: 'firestore', message: e.message } }
    }
  })

  // ---------------------------------------------------------------------------
  // GET /agents/:id
  // ---------------------------------------------------------------------------
  app.get('/agents/:id', async (request, reply) => {
    const snap = await db.collection('agents').doc((request.params as any).id).get()
    if (!snap.exists) { reply.code(404); return { error: { code: 'not_found', message: 'agent not found' } } }
    return { id: snap.id, ...snap.data() }
  })

  // ---------------------------------------------------------------------------
  // PATCH /agents/:id/revoke
  // ---------------------------------------------------------------------------
  app.patch('/agents/:id/revoke', async (request, reply) => {
    const id = (request.params as any).id
    const { reason } = (request.body || {}) as { reason?: string }
    const snap = await db.collection('agents').doc(id).get()
    if (!snap.exists) { reply.code(404); return { error: { code: 'not_found', message: 'agent not found' } } }

    await db.collection('agents').doc(id).update({
      status: 'revoked',
      revokedAt: new Date().toISOString(),
      revokedReason: reason || 'No reason provided',
    })
    log.success('agent revoked', { agentId: id, reason })
    return { id, status: 'revoked' }
  })

  // ---------------------------------------------------------------------------
  // POST /agents/:id/rotate-key
  // ---------------------------------------------------------------------------
  app.post('/agents/:id/rotate-key', async (request, reply) => {
    const id = (request.params as any).id
    const snap = await db.collection('agents').doc(id).get()
    if (!snap.exists) { reply.code(404); return { error: { code: 'not_found', message: 'agent not found' } } }

    const newKey = generateAgentSecretKey()
    const { hash, salt } = hashKey(newKey)
    await db.collection('agents').doc(id).update({
      'signingKey.keyId': newKey.substring(0, 14),
      'signingKey.secretHash': hash,
      'signingKey.secretSalt': salt,
      'signingKey.iterations': 50000,
      'signingKey.rotatedAt': new Date().toISOString(),
    })

    log.success('agent key rotated', { agentId: id })
    return { agentId: id, newSecretKey: newKey, newSecretKeyPrefix: newKey.substring(0, 14) }
  })
}
