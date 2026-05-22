import type { FastifyInstance } from 'fastify'
import type { Firestore } from 'firebase-admin/firestore'
import { log } from '../lib/logger.js'
import { paginate, parsePaginationQuery } from '../lib/pagination.js'
import { generateId } from '../lib/crypto.js'
import { optimizeQuery, attachQueryMetrics } from '../lib/query-optimizer.js'
import { buildListQuery } from '../lib/query-builder.js'
import { getTemplates, findTemplateById } from '../lib/policy-templates.js'
import { withCache, cacheDeletePattern } from '../lib/cache.js'

export default async function policiesRoutes(app: FastifyInstance, db: Firestore) {

  // ---------------------------------------------------------------------------
  // POST /policies
  // ---------------------------------------------------------------------------
  app.post('/policies', async (request, reply) => {
    const claims = (request as any).claims
    if (!claims) {
      reply.code(401)
      return { error: { code: 'unauthorized', message: 'Authentication required' } }
    }
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

    try {
    await db.collection('policies').doc(policyId).set(doc)
    log.success('policy created', { policyId, name })
    await cacheDeletePattern('cache:policies:*')
    reply.code(201)
    return doc
    } catch (e: any) {
      log.error('policy creation failed', { error: e.message })
      reply.code(503)
      return { error: { code: 'firestore', message: 'write failed' } }
    }
  })

  // ---------------------------------------------------------------------------
  // GET /policies
  // ---------------------------------------------------------------------------
  app.get('/policies', async (request, reply) => {
    const { status, agentId, limit } = (request.query || {}) as { status?: string; agentId?: string; limit?: string }
    const orgId = process.env.DEFAULT_ORG_ID
    if (!orgId) {
      reply.code(500)
      return { error: { code: 'config_error', message: 'DEFAULT_ORG_ID not configured' } }
    }
    try {
      const q = buildListQuery(db, 'policies', orgId, { status, limit: limit || '50' })
      const start = Date.now()
      const snap = await q.get()
      const durationMs = Date.now() - start

      attachQueryMetrics(request, {
        collection: 'policies',
        durationMs,
        docsReturned: snap.size,
        docsScanned: snap.size,
        limit: parseInt(limit || '50', 10),
        orderBy: 'createdAt',
        direction: 'desc',
        filters: status ? [`status=${status}`] : undefined,
      })

      let data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      if (agentId) data = data.filter((p: any) => (p.scope?.agentId === agentId || p.scope?.agentId === '*'))

      const options = parsePaginationQuery(request.query as Record<string, unknown>)
      if (status) options.filters = { ...options.filters, status }
      const result = paginate(data, options)

      log.info('policies list', {
        count: result.data.length,
        total: result.pagination.total,
        queryDurationMs: durationMs,
      })
      return result
    } catch (e: any) {
      log.error('policies list failed', { error: e.message })
      reply.code(503)
      return { error: { code: 'firestore', message: e.message } }
    }
  })

  // ---------------------------------------------------------------------------
  // PATCH /policies/:id
  // ---------------------------------------------------------------------------
  app.patch('/policies/:id', async (request, reply) => {
    try {
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
    await cacheDeletePattern('cache:policies:*')
    return { id, ...updates }
    } catch (e: any) {
      log.error('policy update failed', { error: e.message, policyId: (request.params as any)?.id })
      reply.code(503)
      return { error: { code: 'firestore', message: 'update failed' } }
    }
  })

  // ---------------------------------------------------------------------------
  // GET /policies/templates — public template gallery
  // ---------------------------------------------------------------------------
  app.get('/policies/templates', async (request, reply) => {
    const { category, search } = (request.query || {}) as { category?: string; search?: string }
    let templates = getTemplates()
    if (category && category !== 'all') {
      templates = templates.filter(t => t.category === category)
    }
    if (search) {
      const s = search.toLowerCase()
      templates = templates.filter(t =>
        t.name.toLowerCase().includes(s) ||
        t.description.toLowerCase().includes(s) ||
        t.category.toLowerCase().includes(s)
      )
    }
    return { data: templates }
  })

  // ---------------------------------------------------------------------------
  // POST /policies/from-template — create policies from a template
  // ---------------------------------------------------------------------------
  app.post('/policies/from-template', async (request, reply) => {
    try {
    const { templateId, name, overrides } = (request.body || {}) as any
    if (!templateId) {
      reply.code(400)
      return { error: { code: 'validation', message: 'templateId is required' } }
    }

    const template = findTemplateById(templateId)
    if (!template) {
      reply.code(404)
      return { error: { code: 'not_found', message: 'Template not found' } }
    }

    const orgId = process.env.DEFAULT_ORG_ID
    if (!orgId) {
      reply.code(500)
      return { error: { code: 'config_error', message: 'DEFAULT_ORG_ID not configured' } }
    }

    const createdPolicies: any[] = []
    for (const tp of template.policies) {
      const policyId = generateId('pol_')
      const policyName = name || tp.name
      const doc = {
        id: policyId,
        orgId,
        name: policyName,
        description: template.description,
        status: 'active',
        scope: {
          agentId: overrides?.scope?.agentId || '*',
          environment: overrides?.scope?.environment || ['*'],
        },
        rules: {
          allowedTools: tp.allowedTools.map((tool: string) => ({ toolName: tool, parameterConstraints: {} })),
          deniedTools: tp.deniedTools,
          allowedDomains: (tp.allowedDomains || []).map((d: string) => ({ pattern: d, methods: ['GET', 'POST', 'PUT'] })),
          deniedDomains: (tp.deniedDomains || []).map((d: string) => ({ pattern: d, methods: ['GET', 'POST', 'PUT'] })),
          costLimit: tp.maxCost ? { maxUsdPerSession: tp.maxCost, maxUsdPerDay: tp.maxCost * 10 } : null,
          dataRestrictions: tp.piiDetection ? { denyPiiInParameters: true, denySecretsInParameters: true } : null,
        },
        priority: overrides?.priority || 50,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      await db.collection('policies').doc(policyId).set(doc)
      createdPolicies.push(doc)
    }

    log.success('policies created from template', { templateId, count: createdPolicies.length })
    await cacheDeletePattern('cache:policies:*')
    reply.code(201)
    return { data: createdPolicies }
    } catch (e: any) {
      log.error('template policy creation failed', { error: e.message })
      reply.code(503)
      return { error: { code: 'firestore', message: 'template policy creation failed' } }
    }
  })

  // ---------------------------------------------------------------------------
  // POST /policies/templates — save current policy as reusable template
  // ---------------------------------------------------------------------------
  app.post('/policies/templates', async (request, reply) => {
    try {
    const claims = (request as any).claims
    const orgId = claims?.orgId || process.env.DEFAULT_ORG_ID || 'default'

    const { name, description, policyIds, public: isPublic = false } = (request.body || {}) as any
    if (!name || !Array.isArray(policyIds) || policyIds.length === 0) {
      reply.code(400)
      return { error: { code: 'validation', message: 'name and policyIds are required' } }
    }

    const policies: any[] = []
    for (const pid of policyIds) {
      const snap = await db.collection('policies').doc(pid).get()
      if (snap.exists) {
        const data = snap.data() as any
        policies.push({
          name: data.name,
          allowedTools: data.rules?.allowedTools?.map((t: any) => t.toolName || t) || [],
          deniedTools: data.rules?.deniedTools || [],
          allowedDomains: data.rules?.allowedDomains?.map((d: any) => d.pattern || d) || [],
          deniedDomains: data.rules?.deniedDomains?.map((d: any) => d.pattern || d) || [],
          piiDetection: !!data.rules?.dataRestrictions?.denyPiiInParameters,
          maxCost: data.rules?.costLimit?.maxUsdPerSession || 0,
        })
      }
    }

    const templateId = generateId('tmpl_')
    const doc = {
      id: templateId,
      name,
      description: description || '',
      policies,
      orgId,
      createdBy: claims?.sub || 'system',
      public: isPublic,
      createdAt: new Date().toISOString(),
    }

    await db.collection('templates').doc(templateId).set(doc)
    log.success('custom template saved', { templateId, name, orgId })
    await cacheDeletePattern('cache:policies:*')
    reply.code(201)
    return doc
    } catch (e: any) {
      log.error('custom template save failed', { error: e.message })
      reply.code(503)
      return { error: { code: 'firestore', message: 'template save failed' } }
    }
  })
}
