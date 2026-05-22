import type { FastifyInstance } from 'fastify'
import type { Firestore } from 'firebase-admin/firestore'
import { log } from '../lib/logger.js'
import { buildListQuery } from '../lib/query-builder.js'
import { checkExportRateLimit } from '../lib/export-rate-limiter.js'
import { generateReportData, renderReportHtml, parsePeriod } from '../lib/pdf-report.js'

function getOrgId(request: any): string {
  return request.orgId || process.env.DEFAULT_ORG_ID || 'default'
}

function getRequestOrgIdSafe(request: any): string {
  return request.orgId || process.env.DEFAULT_ORG_ID || 'default'
}

export default async function exportsRoutes(app: FastifyInstance, db: Firestore) {

  app.get('/exports/audit/csv', async (request, reply) => {
    const orgId = getOrgId(request)
    const rateLimit = checkExportRateLimit(orgId)
    if (!rateLimit.allowed) {
      reply.code(429)
      reply.header('Retry-After', String(rateLimit.retryAfter))
      return { error: { code: 'rate_limited', message: 'Export rate limit exceeded (5/hour). Try again later.' } }
    }

    try {
      const { startDate, endDate, decision } = (request.query || {}) as {
        startDate?: string; endDate?: string; decision?: string
      }

      let q = db.collection('actionIntents').where('orgId', '==', orgId)

      if (startDate) {
        q = q.where('createdAt', '>=', startDate)
      }
      if (endDate) {
        q = q.where('createdAt', '<=', endDate)
      }
      if (decision) {
        q = q.where('decision', '==', decision)
      }

      q = q.orderBy('createdAt', 'desc').limit(10000)

      const snap = await q.get()
      const entries = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[]

      const escapeCsv = (val: unknown): string => {
        const str = val != null ? String(val) : ''
        return `"${str.replace(/"/g, '""')}"`
      }

      const headers = ['id', 'tool', 'decision', 'reason', 'agentId', 'createdAt']
      const rows = entries.map((e) =>
        headers.map((h) => escapeCsv(h === 'reason' ? e.decisionReason : e[h])).join(','),
      )

      const csv = [headers.join(','), ...rows].join('\n')

      reply.header('Content-Type', 'text/csv; charset=utf-8')
      reply.header('Content-Disposition', 'attachment; filename="audit-export.csv"')
      reply.header('X-Export-Count', String(entries.length))
      log.info('audit csv export', { orgId, count: entries.length })
      return csv
    } catch (e: any) {
      log.error('audit csv export failed', { error: e.message })
      reply.code(500)
      return { error: { code: 'export_failed', message: e.message } }
    }
  })

  app.get('/exports/policies/json', async (request, reply) => {
    const orgId = getOrgId(request)
    const rateLimit = checkExportRateLimit(orgId)
    if (!rateLimit.allowed) {
      reply.code(429)
      reply.header('Retry-After', String(rateLimit.retryAfter))
      return { error: { code: 'rate_limited', message: 'Export rate limit exceeded (5/hour). Try again later.' } }
    }

    try {
      const snap = await db
        .collection('policies')
        .where('orgId', '==', orgId)
        .orderBy('createdAt', 'desc')
        .limit(5000)
        .get()

      const policies = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

      reply.header('Content-Type', 'application/json; charset=utf-8')
      reply.header('Content-Disposition', 'attachment; filename="policies-export.json"')
      reply.header('X-Export-Count', String(policies.length))
      log.info('policies json export', { orgId, count: policies.length })
      return JSON.stringify(policies, null, 2)
    } catch (e: any) {
      log.error('policies json export failed', { error: e.message })
      reply.code(500)
      return { error: { code: 'export_failed', message: e.message } }
    }
  })

  app.get('/exports/agents/json', async (request, reply) => {
    const orgId = getOrgId(request)
    const rateLimit = checkExportRateLimit(orgId)
    if (!rateLimit.allowed) {
      reply.code(429)
      reply.header('Retry-After', String(rateLimit.retryAfter))
      return { error: { code: 'rate_limited', message: 'Export rate limit exceeded (5/hour). Try again later.' } }
    }

    try {
      const snap = await db
        .collection('agents')
        .where('orgId', '==', orgId)
        .orderBy('registeredAt', 'desc')
        .limit(5000)
        .get()

      const agents = snap.docs.map((d) => {
        const data = d.data() as any
        if (data.signingKey) {
          data.signingKey = {
            ...data.signingKey,
            secretHash: data.signingKey.secretHash ? '***REDACTED***' : undefined,
            secretSalt: data.signingKey.secretSalt ? '***REDACTED***' : undefined,
          }
        }
        return { id: d.id, ...data }
      })

      reply.header('Content-Type', 'application/json; charset=utf-8')
      reply.header('Content-Disposition', 'attachment; filename="agents-export.json"')
      reply.header('X-Export-Count', String(agents.length))
      log.info('agents json export', { orgId, count: agents.length })
      return JSON.stringify(agents, null, 2)
    } catch (e: any) {
      log.error('agents json export failed', { error: e.message })
      reply.code(500)
      return { error: { code: 'export_failed', message: e.message } }
    }
  })

  app.get('/exports/report/pdf', async (request, reply) => {
    const orgId = getOrgId(request)
    const rateLimit = checkExportRateLimit(orgId)
    if (!rateLimit.allowed) {
      reply.code(429)
      reply.header('Retry-After', String(rateLimit.retryAfter))
      return { error: { code: 'rate_limited', message: 'Export rate limit exceeded (5/hour). Try again later.' } }
    }

    try {
      const { period: periodParam } = (request.query || {}) as { period?: string }
      const period = parsePeriod(periodParam)

      const data = await generateReportData(db, orgId, period)
      const html = renderReportHtml(data)

      reply.header('Content-Type', 'text/html; charset=utf-8')
      reply.header('Content-Disposition', 'inline; filename="security-report.html"')
      log.info('report generated', { orgId, period: periodParam })
      return html
    } catch (e: any) {
      log.error('report generation failed', { error: e.message })
      reply.code(500)
      return { error: { code: 'report_failed', message: e.message } }
    }
  })
}
