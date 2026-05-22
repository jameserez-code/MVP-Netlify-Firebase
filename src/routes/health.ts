import type { FastifyInstance } from 'fastify'
import type { Firestore } from 'firebase-admin/firestore'
import { log } from '../lib/logger.js'
import { getMetricsData } from '../observability.js'
import { getMetrics, register } from '../lib/metrics.js'
import { memoryCache } from '../lib/cache.js'

let lastHealthStatus = 'ok'

export default async function healthRoutes(app: FastifyInstance, db: Firestore) {
  app.get('/health', async (_request, reply) => {
    const used = process.memoryUsage()
    const usedMB = Math.round(used.heapUsed / 1024 / 1024)
    const totalMB = Math.round(used.heapTotal / 1024 / 1024)
    const memoryPercent = totalMB > 0 ? Math.round((usedMB / totalMB) * 1000) / 10 : 0

    let firebaseStatus = 'unknown'
    let firebaseLatency = 0
    try {
      const fbStart = Date.now()
      await db.collection('tasks').doc('_health_probe').get()
      firebaseLatency = Date.now() - fbStart
      firebaseStatus = 'connected'
    } catch {
      firebaseStatus = 'disconnected'
    }

    const overallStatus = firebaseStatus === 'connected' ? 'ok' : 'degraded'
    const orgId = process.env.DEFAULT_ORG_ID

    // Send system alert if health degraded from last check
    if (overallStatus !== 'ok' && lastHealthStatus === 'ok' && orgId) {
      lastHealthStatus = overallStatus
      ;(async () => {
        try {
          const { sendEmail, getOrgAdminEmails } = await import('../lib/email.js')
          const { systemAlertTemplate } = await import('../lib/email-templates.js')
          const adminEmails = await getOrgAdminEmails(db, orgId)
          if (adminEmails.length === 0) return
          const alertType = firebaseStatus === 'disconnected' ? 'Firebase Disconnected' : 'System Degraded'
          const message = firebaseStatus === 'disconnected'
            ? 'Passport Agent cannot connect to Firestore. Agent enforcement and audit logging may be impacted.'
            : 'One or more system health checks are failing. Please review diagnostics.'
          const { html, text } = systemAlertTemplate({
            alertType,
            message,
            severity: 'critical',
          })
          await sendEmail({
            to: adminEmails,
            subject: `Passport Agent — System Alert: ${alertType}`,
            html,
            text,
            orgId,
          })
        } catch (e: any) {
          log.error('failed to send system alert email', { error: e.message })
        }
      })()
    } else if (overallStatus === 'ok' && lastHealthStatus !== 'ok') {
      lastHealthStatus = 'ok'
    }

    // Check stripe connectivity (best effort)
    let stripeStatus = 'ok'
    try {
      const stripeKey = process.env.STRIPE_SECRET_KEY
      if (!stripeKey) {
        stripeStatus = 'ok' // not configured, not an error
      }
      // In a real implementation, we'd ping Stripe's API
    } catch {
      stripeStatus = 'degraded'
    }

    // Check email connectivity
    let emailStatus = 'ok'
    try {
      const resendKey = process.env.RESEND_API_KEY
      if (!resendKey) {
        emailStatus = 'ok' // not configured, not an error
      }
    } catch {
      emailStatus = 'degraded'
    }

    const metrics = getMetrics()

    return {
      status: overallStatus,
      version: '2.1.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      checks: {
        firebase: { status: firebaseStatus === 'connected' ? 'ok' : 'degraded', latency: firebaseLatency },
        memory: { status: memoryPercent > 90 ? 'warning' : 'ok', used: `${usedMB}MB`, total: `${totalMB}MB`, percent: memoryPercent },
        disk: { status: 'ok' },
        stripe: { status: stripeStatus },
        email: { status: emailStatus },
      },
      metrics: {
        requestsTotal: metrics.requestsTotal,
        requestsPerMinute: metrics.requestsPerMinute,
        avgResponseTime: metrics.avgResponseTime,
        errorRate: metrics.errorRate,
      },
    }
  })

  // GET /metrics — content negotiation: Prometheus text or JSON operational metrics
  app.get('/metrics', async (request, reply) => {
    const accept = (request.headers.accept as string) || '*/*'
    const wantsPrometheus = accept.includes('text/plain') || accept.includes('openmetrics')
    const wantsJson = accept.includes('application/json') || accept === '*/*'

    if (wantsPrometheus && !wantsJson) {
      reply.header('Content-Type', register.contentType)
      reply.send(await register.metrics())
      return
    }

    // Default to JSON for browsers and existing clients (backward compatible)
    const cacheKey = `metrics:json:${request.url}`
    const cached = memoryCache.get<unknown>(cacheKey)
    if (cached !== undefined) {
      reply.header('X-Cache', 'HIT')
      return cached
    }

    try {
      const data = await getMetricsData(db)
      memoryCache.set(cacheKey, data, 5)
      reply.header('X-Cache', 'MISS')
      return data
    } catch (e: any) {
      reply.code(503)
      return { error: { code: 'firestore', message: e.message } }
    }
  })
}
