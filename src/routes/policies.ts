import type { FastifyInstance } from 'fastify'
import type { Firestore } from 'firebase-admin/firestore'
import { log } from '../lib/logger.js'
import { generateId } from '../lib/crypto.js'

export default async function policiesRoutes(app: FastifyInstance, db: Firestore) {

  // ---------------------------------------------------------------------------
  // POST /policies
  // ---------------------------------------------------------------------------
  app.post('/policies', async (request, reply) => {
    const { name, description, scope, priority, rules } = (request.body || {}) as any

    if (!name || !rules?.allowedTools) {
      reply.code(400)
      return { error: { code: 'validation', message: 'name and rules.allowedTools are required' } }
    }

    const orgId = process.env.DEFAULT_ORG_ID
    if (!orgId) {
      reply.code(500)
      return { error: { code: 'config_error', message: 'DEFAULT_ORG_ID not configured' } }
    }

    const policyId = generateId('pol_')
    const doc = {
      id: policyId,
      orgId,
      name,
      description: description || '',
      status: 'active',
      scope: {
        agentId: scope?.agentId || '*',
        environment: scope?.environment || ['*'],
      },
      rules: {
        allowedTools: rules.allowedTools || [],
        deniedTools: rules.deniedTools || [],
        allowedDomains: rules.allowedDomains || [],
        deniedDomains: rules.deniedDomains || [],
        costLimit: rules.costLimit || null,
        dataRestrictions: rules.dataRestrictions || null,
      },
      priority: priority || 50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await db.collection('policies').doc(policyId).set(doc)
    log.success('policy created', { policyId, name })
    reply.code(201)
    return doc
  })

  // ---------------------------------------------------------------------------
  // GET /policies
  // ---------------------------------------------------------------------------
  app.get('/policies', async (request, reply) => {
    const { status, agentId } = (request.query || {}) as { status?: string; agentId?: string }
    const orgId = process.env.DEFAULT_ORG_ID
    if (!orgId) {
      reply.code(500)
      return { error: { code: 'config_error', message: 'DEFAULT_ORG_ID not configured' } }
    }
    try {
      let q = db.collection('policies').where('orgId', '==', orgId)
      const snap = await q.get()
      let data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      if (status) data = data.filter((p: any) => p.status === status)
      if (agentId) data = data.filter((p: any) => (p.scope?.agentId === agentId || p.scope?.agentId === '*'))
      data.sort((a: any, b: any) => (a.priority || 999) - (b.priority || 999))

      log.info('policies list', { count: data.length })
      return { data, total: data.length }
    } catch (e: any) {
      log.error('policies list failed', { error: e.message })
      reply.code(503)
      return { error: { code: 'firestore', message: e.message } }
    }
  })

  // ---------------------------------------------------------------------------
  // GET /policies/:id
  // ---------------------------------------------------------------------------
  app.get('/policies/:id', async (request, reply) => {
    const snap = await db.collection('policies').doc((request.params as any).id).get()
    if (!snap.exists) { reply.code(404); return { error: { code: 'not_found' } } }
    return { id: snap.id, ...snap.data() }
  })

  // ---------------------------------------------------------------------------
  // PATCH /policies/:id
  // ---------------------------------------------------------------------------
  app.patch('/policies/:id', async (request, reply) => {
    const id = (request.params as any).id
    const snap = await db.collection('policies').doc(id).get()
    if (!snap.exists) { reply.code(404); return { error: { code: 'not_found' } } }

    const updates: Record<string, unknown> = {}
    const body = (request.body || {}) as any
    if (body.name !== undefined) updates.name = body.name
    if (body.status !== undefined) updates.status = body.status
    if (body.rules !== undefined) updates.rules = body.rules
    if (body.priority !== undefined) updates.priority = body.priority
    updates.updatedAt = new Date().toISOString()

    await db.collection('policies').doc(id).update(updates)
    log.success('policy updated', { policyId: id })
    return { id, ...updates }
  })
}
