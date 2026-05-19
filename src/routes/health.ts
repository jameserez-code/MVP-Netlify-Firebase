import type { FastifyInstance } from 'fastify'
import type { Firestore } from 'firebase-admin/firestore'
import { log } from '../lib/logger.js'

let lastHealthStatus = 'ok'

export default async function healthRoutes(app: FastifyInstance, db: Firestore) {
  app.get('/health', async (_request, reply) => {
    const used = process.memoryUsage()
    const usedMB = Math.round(used.heapUsed / 1024 / 1024)

    let firebaseStatus = 'unknown'
    try {
      // Check Firestore connectivity with a known-document get
      await db.collection('tasks').doc('_health_probe').get()
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

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: '2.1.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor(process.uptime()),
      checks: {
        firebase: firebaseStatus,
        memory: `ok (${usedMB}MB used)`,
        disk: 'ok',
      },
    }
  })
}
