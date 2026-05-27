import type { FastifyInstance } from 'fastify'
import type { Firestore } from 'firebase-admin/firestore'
import { log } from '../lib/logger.js'
import { paginate, parsePaginationQuery } from '../lib/pagination.js'
import {
  generateAgentSecretKey, generatePassportNumber, hashKey, hashSystemPrompt,
  generateId,
} from '../lib/crypto.js'
import { deliverWebhook } from '../lib/webhook-deliverer.js'
import { publishEvent } from '../lib/events.js'
import { checkLimit } from '../lib/usage.js'
import { optimizeQuery, attachQueryMetrics } from '../lib/query-optimizer.js'
import { buildListQuery } from '../lib/query-builder.js'
import { withCache, cacheDeletePattern } from '../lib/cache.js'
import { requireAdmin, requireMember, requireReadonly } from '../lib/rbac.js'

export default async function agentsRoutes(app: FastifyInstance, db: Firestore) {

  // ---------------------------------------------------------------------------
  // POST /agents/register
  // ---------------------------------------------------------------------------
  app.post('/agents/register', { preHandler: [requireMember] }, async (request, reply) => {
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

      const orgId = (request as any).orgId
      if (!orgId) {
        reply.code(400)
        return { error: { code: 'validation', message: 'organization context required' } }
      }

      const limitCheck = await checkLimit(db, orgId, 'agents')
      if (!limitCheck.allowed) {
        reply.code(429)
        return { error: { code: 'agent_limit', message: 'Agent limit reached. Upgrade to Pro.' } }
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
      await publishEvent(orgId, 'agents', { type: 'registered', agentId, name, model, provider, timestamp: new Date().toISOString() })
      await cacheDeletePattern('cache:agents:*')
      deliverWebhook(db, 'agent.registered', {
        event: 'agent.registered',
        timestamp: new Date().toISOString(),
        agentId,
        name,
        model,
        provider,
      }, orgId).catch(() => {})
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
  app.get('/agents', { preHandler: [requireReadonly] }, async (request, reply) => {
    const { status, limit } = (request.query || {}) as { status?: string; limit?: string }
    const orgId = (request as any).orgId
    if (!orgId) {
      reply.code(400)
      return { error: { code: 'validation', message: 'organization context required' } }
    }
    try {
      const q = buildListQuery(db, 'agents', orgId, { status, limit: limit || '50' })
      const start = Date.now()
      const snap = await q.get()
      const durationMs = Date.now() - start

      attachQueryMetrics(request, {
        collection: 'agents',
        durationMs,
        docsReturned: snap.size,
        docsScanned: snap.size,
        limit: parseInt(limit || '50', 10),
        orderBy: 'createdAt',
        direction: 'desc',
        filters: status ? [`status=${status}`] : undefined,
      })

      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))

      const options = parsePaginationQuery(request.query as Record<string, unknown>)
      if (status) options.filters = { ...options.filters, status }
      const result = paginate(data, options)

      log.info('agents list', {
        count: result.data.length,
        total: result.pagination.total,
        queryDurationMs: durationMs,
      })
      return result
    } catch (e: any) {
      log.error('agents list failed', { error: e.message })
      reply.code(503)
      return { error: { code: 'firestore', message: e.message } }
    }
  })

  // ---------------------------------------------------------------------------
  // PATCH /agents/:id/revoke
  // ---------------------------------------------------------------------------
  app.patch('/agents/:id/revoke', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
    const id = (request.params as any).id
    const { reason } = (request.body || {}) as { reason?: string }
    const snap = await db.collection('agents').doc(id).get()
    if (!snap.exists) { reply.code(404); return { error: { code: 'not_found', message: 'agent not found' } } }

    const agentData = snap.data() as any
    const requestOrgId = (request as any).orgId

    if (agentData.orgId !== requestOrgId) {
      reply.code(403)
      return { error: { code: 'forbidden', message: 'agent belongs to another organization' } }
    }

    const claims = (request as any).claims
    const revokedBy = claims?.sub || claims?.orgId || 'system'
    const orgId = agentData?.orgId

    await db.collection('agents').doc(id).update({
      status: 'revoked',
      revokedAt: new Date().toISOString(),
      revokedReason: reason || 'No reason provided',
      revokedBy,
    })
    log.success('agent revoked', { agentId: id, reason, revokedBy })
    await publishEvent(orgId || process.env.DEFAULT_ORG_ID || 'default', 'agents', { type: 'revoked', agentId: id, reason: reason || 'No reason provided', timestamp: new Date().toISOString() })
    await cacheDeletePattern('cache:agents:*')
    deliverWebhook(db, 'agent.revoked', {
      event: 'agent.revoked',
      timestamp: new Date().toISOString(),
      agentId: id,
      reason: reason || 'No reason provided',
    }, orgId).catch(() => {})

    // Send email notification to org admins
    ;(async () => {
      try {
        const { sendEmail, getOrgAdminEmails } = await import('../lib/email.js')
        const { agentRevokedTemplate } = await import('../lib/email-templates.js')
        const adminEmails = await getOrgAdminEmails(db, orgId || '')
        if (adminEmails.length === 0) return
        const { html, text } = agentRevokedTemplate({
          agentName: agentData?.name || id,
          revokedBy,
          timestamp: new Date().toISOString(),
        })
        await sendEmail({
          to: adminEmails,
          subject: 'Passport Agent — Agent Access Revoked',
          html,
          text,
          orgId,
        })
      } catch {
        // Silently fail — email is best-effort
      }
    })()

    return { id, status: 'revoked' }
    } catch (e: any) {
      log.error('agent revoke failed', { error: e.message, agentId: (request.params as any)?.id })
      reply.code(503)
      return { error: { code: 'firestore', message: 'revoke failed' } }
    }
  })

  // ---------------------------------------------------------------------------
  // POST /agents/:id/rotate-key
  // ---------------------------------------------------------------------------
  app.post('/agents/:id/rotate-key', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
    const id = (request.params as any).id
    const snap = await db.collection('agents').doc(id).get()
    if (!snap.exists) { reply.code(404); return { error: { code: 'not_found', message: 'agent not found' } } }

    const agentData = snap.data() as any
    const requestOrgId = (request as any).orgId

    if (agentData.orgId !== requestOrgId) {
      reply.code(403)
      return { error: { code: 'forbidden', message: 'agent belongs to another organization' } }
    }

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
    await cacheDeletePattern('cache:agents:*')
    return { agentId: id, newSecretKey: newKey, newSecretKeyPrefix: newKey.substring(0, 14) }
    } catch (e: any) {
      log.error('agent key rotate failed', { error: e.message, agentId: (request.params as any)?.id })
      reply.code(503)
      return { error: { code: 'firestore', message: 'key rotation failed' } }
    }
  })
}
