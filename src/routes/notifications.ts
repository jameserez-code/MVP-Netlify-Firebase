import type { FastifyInstance } from 'fastify'
import type { Firestore } from 'firebase-admin/firestore'
import { log } from '../lib/logger.js'

export interface NotificationSettings {
  email: {
    policyViolations: boolean
    agentRevocations: boolean
    systemAlerts: boolean
    weeklyDigest: boolean
  }
  webhookEnabled: boolean
}

const DEFAULT_SETTINGS: NotificationSettings = {
  email: {
    policyViolations: true,
    agentRevocations: true,
    systemAlerts: true,
    weeklyDigest: false,
  },
  webhookEnabled: true,
}

export default async function notificationsRoutes(app: FastifyInstance, db: Firestore) {

  // ---------------------------------------------------------------------------
  // GET /notifications/settings — get current user's notification preferences
  // ---------------------------------------------------------------------------
  app.get('/notifications/settings', async (request, reply) => {
    const claims = (request as any).claims
    if (!claims) {
      reply.code(401)
      return { error: { code: 'unauthorized', message: 'Authentication required' } }
    }

    const userId = claims.sub || claims.jti
    if (!userId) {
      reply.code(400)
      return { error: { code: 'validation', message: 'User identifier not found in token' } }
    }

    try {
      const settingsSnap = await db.collection('users').doc(userId).collection('settings').doc('notifications').get()
      if (settingsSnap.exists) {
        const data = settingsSnap.data() as any
        return {
          ...DEFAULT_SETTINGS,
          ...data,
          email: { ...DEFAULT_SETTINGS.email, ...(data.email || {}) },
        }
      }
      return DEFAULT_SETTINGS
    } catch (e: any) {
      log.error('failed to get notification settings', { userId, error: e.message })
      reply.code(503)
      return { error: { code: 'firestore', message: 'read failed' } }
    }
  })

  // ---------------------------------------------------------------------------
  // POST /notifications/settings — update current user's notification preferences
  // ---------------------------------------------------------------------------
  app.post('/notifications/settings', async (request, reply) => {
    const claims = (request as any).claims
    if (!claims) {
      reply.code(401)
      return { error: { code: 'unauthorized', message: 'Authentication required' } }
    }

    const userId = claims.sub || claims.jti
    if (!userId) {
      reply.code(400)
      return { error: { code: 'validation', message: 'User identifier not found in token' } }
    }

    const body = (request.body || {}) as Partial<NotificationSettings>

    // Validate shape
    const email = (body.email || {}) as Partial<NotificationSettings['email']>
    const update: NotificationSettings = {
      email: {
        policyViolations: typeof email.policyViolations === 'boolean' ? email.policyViolations : DEFAULT_SETTINGS.email.policyViolations,
        agentRevocations: typeof email.agentRevocations === 'boolean' ? email.agentRevocations : DEFAULT_SETTINGS.email.agentRevocations,
        systemAlerts: typeof email.systemAlerts === 'boolean' ? email.systemAlerts : DEFAULT_SETTINGS.email.systemAlerts,
        weeklyDigest: typeof email.weeklyDigest === 'boolean' ? email.weeklyDigest : DEFAULT_SETTINGS.email.weeklyDigest,
      },
      webhookEnabled: typeof body.webhookEnabled === 'boolean' ? body.webhookEnabled : DEFAULT_SETTINGS.webhookEnabled,
    }

    try {
      await db.collection('users').doc(userId).collection('settings').doc('notifications').set(update, { merge: true })
      log.success('notification settings updated', { userId })
      return update
    } catch (e: any) {
      log.error('failed to update notification settings', { userId, error: e.message })
      reply.code(503)
      return { error: { code: 'firestore', message: 'write failed' } }
    }
  })

  // ---------------------------------------------------------------------------
  // POST /notifications/test — send a test email to the current user
  // ---------------------------------------------------------------------------
  app.post('/notifications/test', async (request, reply) => {
    const claims = (request as any).claims
    if (!claims) {
      reply.code(401)
      return { error: { code: 'unauthorized', message: 'Authentication required' } }
    }

    const userEmail = claims.sub
    if (!userEmail || !userEmail.includes('@')) {
      reply.code(400)
      return { error: { code: 'validation', message: 'User email not available in token' } }
    }

    const { sendEmail } = await import('../lib/email.js')
    const { systemAlertTemplate } = await import('../lib/email-templates.js')
    const { html, text } = systemAlertTemplate({
      alertType: 'Test Email',
      message: 'This is a test email from Passport Agent. Your notification system is working correctly.',
      severity: 'info',
    })

    const result = await sendEmail({
      to: userEmail,
      subject: 'Passport Agent — Test Email',
      html,
      text,
    })

    if (!result.success) {
      reply.code(502)
      return { error: { code: 'email_failed', message: result.error || 'Failed to send test email' } }
    }

    return { success: true, message: 'Test email sent' }
  })

  // ---------------------------------------------------------------------------
  // POST /notifications/digest — trigger daily digest for an org (cron / admin)
  // ---------------------------------------------------------------------------
  app.post('/notifications/digest', async (request, reply) => {
    const claims = (request as any).claims
    if (!claims) {
      reply.code(401)
      return { error: { code: 'unauthorized', message: 'Authentication required' } }
    }

    const { orgId } = (request.body || {}) as { orgId?: string }
    if (!orgId) {
      reply.code(400)
      return { error: { code: 'validation', message: 'orgId is required' } }
    }

    try {
      const { sendEmail, getOrgAdminEmails } = await import('../lib/email.js')
      const { digestTemplate } = await import('../lib/email-templates.js')

      // Check if any admin has digest enabled
      const usersSnap = await db.collection('users').where('orgId', '==', orgId).get()
      const adminEmails: string[] = []
      for (const doc of usersSnap.docs) {
        const data = doc.data() as any
        const settingsSnap = await db.collection('users').doc(doc.id).collection('settings').doc('notifications').get()
        const settings = settingsSnap.exists ? (settingsSnap.data() as any) : {}
        if (settings?.email?.weeklyDigest !== false && data.email) {
          adminEmails.push(data.email)
        }
      }

      if (adminEmails.length === 0) {
        return { sent: false, reason: 'no_subscribers' }
      }

      // Gather digest data for the last 24h
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const [violationsSnap, agentsSnap] = await Promise.all([
        db.collection('actionIntents').where('orgId', '==', orgId).where('decision', '==', 'deny').where('createdAt', '>=', since).get(),
        db.collection('agents').where('orgId', '==', orgId).get(),
      ])

      const violations = violationsSnap.size
      const newAgents = agentsSnap.docs.filter((d: any) => {
        const registeredAt = d.data().registeredAt
        return registeredAt && registeredAt >= since
      }).length
      const revokedAgents = agentsSnap.docs.filter((d: any) => {
        const revokedAt = d.data().revokedAt
        return revokedAt && revokedAt >= since
      }).length

      const toolCounts: Record<string, number> = {}
      violationsSnap.docs.forEach((d: any) => {
        const tool = d.data().tool
        if (tool) toolCounts[tool] = (toolCounts[tool] || 0) + 1
      })
      const topViolatedTools = Object.entries(toolCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tool, count]) => `${tool} (${count})`)

      const orgSnap = await db.collection('organizations').doc(orgId).get()
      const orgName = orgSnap.exists ? (orgSnap.data() as any).name : orgId

      const { html, text } = digestTemplate({
        orgName,
        date: new Date().toLocaleDateString(),
        violations,
        newAgents,
        revokedAgents,
        topViolatedTools,
      })

      const result = await sendEmail({
        to: adminEmails,
        subject: `Passport Agent — Daily Digest for ${orgName}`,
        html,
        text,
        orgId,
      })

      if (!result.success) {
        reply.code(502)
        return { error: { code: 'email_failed', message: result.error || 'Failed to send digest' } }
      }

      return { sent: true, recipients: adminEmails.length }
    } catch (e: any) {
      log.error('daily digest failed', { orgId, error: e.message })
      reply.code(500)
      return { error: { code: 'digest_failed', message: e.message } }
    }
  })
}
