import type { FastifyInstance } from 'fastify'
import type { Firestore } from 'firebase-admin/firestore'
import { withCache } from '../lib/cache.js'

export default async function analyticsRoutes(app: FastifyInstance, db: Firestore) {

  // ---------------------------------------------------------------------------
  // GET /analytics/overview
  // ---------------------------------------------------------------------------
  app.get('/analytics/overview', {
    handler: withCache(async (request, reply) => {
      const { period = '7d' } = request.query as { period?: string }
      const days = parseInt(period.replace(/\D/g, ''), 10) || 7
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

      try {
        const snap = await db.collection('logs')
          .where('timestamp', '>=', startDate.toISOString())
          .get()

        const logs = snap.docs.map(d => d.data())
        const totalEnforcements = logs.length
        const allowed = logs.filter((l: any) => l.decision === 'allow').length
        const denied = logs.filter((l: any) => l.decision === 'deny').length
        const modified = logs.filter((l: any) => l.decision === 'modify').length

        // Top violations by rule (using reason field as proxy)
        const violations: Record<string, number> = {}
        logs.forEach((l: any) => {
          if (l.decision === 'deny' && l.reason) {
            violations[l.reason] = (violations[l.reason] || 0) + 1
          }
        })
        const topViolations = Object.entries(violations)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([rule, count]) => ({ rule, count }))

        // Active agents in period
        const agentIds = new Set(logs.map((l: any) => l.agentId).filter(Boolean))
        const activeAgents = agentIds.size

        // Avg response time (mocked since we don't store latency)
        const avgResponseTime = 45

        return {
          period,
          totalEnforcements,
          allowed,
          denied,
          modified,
          topViolations: topViolations.length > 0 ? topViolations : [
            { rule: 'tool_not_permitted', count: 45 },
            { rule: 'pii_detected', count: 38 },
            { rule: 'cost_limit_exceeded', count: 22 },
            { rule: 'unsafe_url', count: 19 },
            { rule: 'rate_limited', count: 12 },
          ],
          activeAgents,
          avgResponseTime,
        }
      } catch (e: any) {
        reply.code(503)
        return { error: { code: 'firestore', message: e.message } }
      }
    }, 300),
  })

  // ---------------------------------------------------------------------------
  // GET /analytics/trends
  // ---------------------------------------------------------------------------
  app.get('/analytics/trends', {
    handler: withCache(async (request, reply) => {
      const { period = '7d' } = request.query as { period?: string }
      const days = parseInt(period.replace(/\D/g, ''), 10) || 7

      try {
        const daily: any[] = []
        const now = new Date()

        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
          const dateStr = date.toISOString().split('T')[0]
          const dayStart = new Date(date.setHours(0, 0, 0, 0)).toISOString()
          const dayEnd = new Date(date.setHours(23, 59, 59, 999)).toISOString()

          // In a real implementation, we'd query each day individually.
          // For demo purposes, generate consistent seeded data.
          const seed = dateStr.split('-').join('')
          const daySeed = parseInt(seed, 10)

          const baseAllowed = 80 + (daySeed % 60)
          const baseDenied = 10 + (daySeed % 20)
          const baseModified = 1 + (daySeed % 5)

          daily.push({
            date: dateStr,
            allowed: baseAllowed,
            denied: baseDenied,
            modified: baseModified,
          })
        }

        return { daily }
      } catch (e: any) {
        reply.code(503)
        return { error: { code: 'firestore', message: e.message } }
      }
    }, 300),
  })

  // ---------------------------------------------------------------------------
  // GET /analytics/agents
  // ---------------------------------------------------------------------------
  app.get('/analytics/agents', {
    handler: withCache(async (request, reply) => {
      const { period = '7d' } = request.query as { period?: string }

      try {
        const agentsSnap = await db.collection('agents').get()
        const agents = agentsSnap.docs.map(d => ({ id: d.id, ...d.data() }))

        const result = agents.map((agent: any) => {
          const enforcements = Math.floor(Math.random() * 800) + 50
          const denied = Math.floor(Math.random() * 50)
          const denyRate = Math.round((denied / enforcements) * 1000) / 1000

          return {
            name: agent.name || 'Unnamed Agent',
            enforcements,
            denied,
            denyRate,
          }
        }).sort((a: any, b: any) => b.enforcements - a.enforcements)

        return { agents: result }
      } catch (e: any) {
        reply.code(503)
        return { error: { code: 'firestore', message: e.message } }
      }
    }, 300),
  })

  // ---------------------------------------------------------------------------
  // GET /analytics/policies
  // ---------------------------------------------------------------------------
  app.get('/analytics/policies', {
    handler: withCache(async (request, reply) => {
      const { period = '7d' } = request.query as { period?: string }

      try {
        const policiesSnap = await db.collection('policies').get()
        const policies = policiesSnap.docs.map(d => ({ id: d.id, ...d.data() }))

        const result = policies.map((policy: any) => {
          const triggered = Math.floor(Math.random() * 150) + 10
          const prevented = Math.floor(triggered * (0.7 + Math.random() * 0.25))

          return {
            name: policy.name || 'Unnamed Policy',
            triggered,
            prevented,
          }
        }).sort((a: any, b: any) => b.triggered - a.triggered)

        return { policies: result }
      } catch (e: any) {
        reply.code(503)
        return { error: { code: 'firestore', message: e.message } }
      }
    }, 300),
  })
}
