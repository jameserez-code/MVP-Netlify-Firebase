import type { FastifyInstance } from 'fastify'
import type { Firestore } from 'firebase-admin/firestore'
import { createRequire } from 'module'
import { log } from '../lib/logger.js'
import { generateGatewayTicket, TICKET_TTL_SECONDS } from '../lib/crypto.js'

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
      const snap = await db.collection('policies').where('orgId', '==', (agent as any).orgId || 'org_seed_001').get()
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

      db.collection('actionIntents').doc(intent.intentId).set({
        intentId: intent.intentId, orgId: (agent as any).orgId || 'org_seed_001',
        agentId: intent.agentId, tool: intent.tool,
        parameters: intent.parameters || {}, decision: decision.decision,
        decisionReason: decision.reason || null, violatedRule: decision.violatedRule || null,
        createdAt: new Date().toISOString(),
      }).catch(() => {})

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
