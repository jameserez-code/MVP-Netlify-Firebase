import type { FastifyInstance } from 'fastify'
import type { Firestore } from 'firebase-admin/firestore'
import { createRequire } from 'module'
import { log } from '../lib/logger.js'
import { generateGatewayTicket, TICKET_TTL_SECONDS } from '../lib/crypto.js'
import { deliverWebhook } from '../lib/webhook-deliverer.js'
import { publishEvent } from '../lib/events.js'
import { checkLimit, incrementEnforcement } from '../lib/usage.js'
import { optimizeQuery } from '../lib/query-optimizer.js'
import { cacheDeletePattern } from '../lib/cache.js'
import { enforcementsTotal } from '../lib/metrics.js'
import { queueAuditEntry } from '../lib/batch.js'

const require = createRequire(import.meta.url)
const { evaluateIntent } = require('../../netlify/functions/src/engine/evaluator.js')
const { verifyGatewayTicket, getEngineSecret } = require('../../netlify/functions/src/lib/crypto.js')

export default async function enforceRoutes(app: FastifyInstance, db: Firestore) {

  app.post('/enforce', async (request, reply) => {
    try {
      const { intent } = (request.body || {}) as any

      if (!intent?.intentId || !intent?.tool || !intent?.agentId) {
        reply.code(400)
        return { error: { code: 'validation', message: 'intent.intentId, intent.agentId, and intent.tool required' } }
      }

      // Verify agent exists + is active
      const agentSnap = await db.collection('agents').doc(intent.agentId).get()
      if (!agentSnap.exists) { reply.code(401); return { error: { code: 'agent_unknown' } } }

      const agent = { id: agentSnap.id, ...agentSnap.data() }
      if ((agent as any).status !== 'active') {
        reply.code(403)
        return { decision: 'deny', reason: `agent_${(agent as any).status}`, violatedRule: 'agent_status' }
      }

      // Fetch policies
      const agentOrgId = (agent as any).orgId || process.env.DEFAULT_ORG_ID
      if (!agentOrgId) {
        reply.code(500)
        return { error: { code: 'config_error', message: 'DEFAULT_ORG_ID not configured' } }
      }

      const limitCheck = await checkLimit(db, agentOrgId, 'enforcements')
      if (!limitCheck.allowed) {
        reply.code(429)
        return { error: { code: 'limit_exceeded', message: 'Daily enforcement limit reached. Upgrade to Pro.', plan: 'free' } }
      }

      // Composite index hint: policies — orgId Ascending, createdAt Descending
      const snap = await optimizeQuery(
        db.collection('policies').where('orgId', '==', agentOrgId),
        { limit: 200, orderBy: { field: 'createdAt', direction: 'desc' } },
      ).get()
      const policies = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter((p: any) => p.status === 'active')
        .filter((p: any) => (p.scope?.agentId === '*' || p.scope?.agentId === intent.agentId))
        .sort((a: any, b: any) => (a.priority || 999) - (b.priority || 999))

      // Evaluate
      const decision = evaluateIntent({
        intent: { tool: intent.tool, parameters: intent.parameters || {} },
        agentStatus: (agent as any).status,
        policies,
        sessionCost: null, dailyCost: null, toolCost: null,
      })

      const response: Record<string, unknown> = {
        decision: decision.decision, intentId: intent.intentId, decidedAt: new Date().toISOString(),
      }
      if (decision.reason) { response.reason = decision.reason; response.violatedRule = decision.violatedRule }

      if (decision.decision === 'allow' || decision.decision === 'modify') {
        const finalParams = decision.decision === 'modify' ? decision.modifiedParameters : (intent.parameters || {})
        response.gatewayTicket = generateGatewayTicket(intent.intentId, intent.agentId, intent.tool, finalParams)
        response.ticketExpiresAt = new Date(Date.now() + TICKET_TTL_SECONDS * 1000).toISOString()
        if (decision.modifications) response.modifications = decision.modifications
        if (decision.modifiedParameters) response.modifiedParameters = decision.modifiedParameters
      }

      const auditEntry = {
        intentId: intent.intentId, orgId: agentOrgId,
        agentId: intent.agentId, tool: intent.tool,
        parameters: intent.parameters || {}, decision: decision.decision,
        decisionReason: decision.reason || null, violatedRule: decision.violatedRule || null,
        createdAt: new Date().toISOString(),
      }
      queueAuditEntry(db, { id: intent.intentId, data: auditEntry })
      await publishEvent(agentOrgId, 'audit', auditEntry)
      cacheDeletePattern('cache:metrics:*').catch(() => {})
      cacheDeletePattern('cache:audit:*').catch(() => {})

      if (decision.decision === 'deny') {
        deliverWebhook(db, 'policy.violation', {
          event: 'policy.violation',
          timestamp: new Date().toISOString(),
          intentId: intent.intentId,
          agentId: intent.agentId,
          tool: intent.tool,
          decision: decision.decision,
          reason: decision.reason,
          violatedRule: decision.violatedRule,
        }, agentOrgId).catch(() => {})

        // Send email notification to org admins
        ;(async () => {
          try {
            const { sendEmail, getOrgAdminEmails } = await import('../lib/email.js')
            const { policyViolationTemplate } = await import('../lib/email-templates.js')
            const adminEmails = await getOrgAdminEmails(db, agentOrgId)
            if (adminEmails.length === 0) return
            const { html, text } = policyViolationTemplate({
              agentName: (agent as any).name || intent.agentId,
              tool: intent.tool,
              reason: decision.reason || 'Policy rule violation',
              timestamp: new Date().toISOString(),
            })
            await sendEmail({
              to: adminEmails,
              subject: 'Passport Agent — Policy Violation Detected',
              html,
              text,
              orgId: agentOrgId,
            })
          } catch {
            // Silently fail — email is best-effort
          }
        })()
      }

      incrementEnforcement(db, agentOrgId).catch(() => {})
      enforcementsTotal.inc({ decision: decision.decision, org_id: agentOrgId })
      log.info('enforce', { intentId: intent.intentId, decision: decision.decision })
      return response

    } catch (e: any) {
      log.error('enforce failed', { error: e.message })
      reply.code(500)
      return { error: { code: 'enforce_failed', message: e.message } }
    }
  })

  app.post('/gateway/execute', async (request, reply) => {
    const { gatewayTicket, action } = (request.body || {}) as any
    if (!gatewayTicket || !action?.tool) {
      reply.code(400)
      return { error: { code: 'validation', message: 'gatewayTicket and action.tool required' } }
    }

    try {
      let ticketPayload: any
      try {
        ticketPayload = verifyGatewayTicket(gatewayTicket)
      } catch {
        reply.code(403)
        return { error: { code: 'invalid_ticket', message: 'ticket invalid or expired' } }
      }

      // Replay prevention
      const ticketDoc = await db.collection('gatewayTickets').doc(ticketPayload.iid).get()
      if (ticketDoc.exists && ticketDoc.data()?.status === 'used') {
        reply.code(403)
        return { error: { code: 'ticket_replayed', message: 'Ticket already used' } }
      }

      await db.collection('gatewayTickets').doc(ticketPayload.iid).set({
        status: 'used', intentId: ticketPayload.iid, tool: ticketPayload.tool,
        usedAt: new Date().toISOString(),
      })

      const startMs = Date.now()
      const result = { status: 'executed', tool: ticketPayload.tool, params: ticketPayload.params }

      db.collection('actionIntents').doc(ticketPayload.iid).update({
        executed: true, executionResult: { success: true, latencyMs: Date.now() - startMs },
      }).catch(() => {})

      log.success('gateway executed', { intentId: ticketPayload.iid, tool: ticketPayload.tool })
      return { executed: true, result, latencyMs: Date.now() - startMs }

    } catch (e: any) {
      log.error('gateway failed', { error: e.message })
      reply.code(500)
      return { error: { code: 'gateway_failed', message: e.message } }
    }
  })
}
