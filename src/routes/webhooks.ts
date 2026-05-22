import type { FastifyInstance } from 'fastify'
import type { Firestore } from 'firebase-admin/firestore'
import { log } from '../lib/logger.js'
import { generateId, encryptWebhookSecret } from '../lib/crypto.js'
import { webhookQueue } from '../lib/queue.js'

const ALLOWED_EVENTS = ['policy.violation', 'agent.revoked', 'run.failed', 'system.alert', 'agent.registered']

function maskUrl(url: string): string {
  try {
    const u = new URL(url)
    const parts = u.pathname.split('/')
    if (parts.length > 1) {
      parts[parts.length - 1] = '****'
      u.pathname = parts.join('/')
    }
    return u.toString()
  } catch {
    return url
  }
}

export default async function webhooksRoutes(app: FastifyInstance, db: Firestore) {
  // POST /webhooks — register webhook
  app.post('/webhooks', async (request, reply) => {
    try {
    const body = (request.body || {}) as any
    const { url, events, secret, name, active = true } = body

    if (!url || !events || !Array.isArray(events) || events.length === 0 || !name) {
      reply.code(400)
      return { error: { code: 'validation', message: 'url, events (array), and name are required' } }
    }

    const invalidEvents = events.filter((e: string) => !ALLOWED_EVENTS.includes(e))
    if (invalidEvents.length > 0) {
      reply.code(400)
      return { error: { code: 'validation', message: `Invalid events: ${invalidEvents.join(', ')}` } }
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      reply.code(400)
      return { error: { code: 'validation', message: 'url must be a valid URL' } }
    }

    const isProd = process.env.NODE_ENV === 'production'
    if (isProd && parsedUrl.protocol !== 'https:') {
      reply.code(400)
      return { error: { code: 'validation', message: 'URL must use https in production' } }
    }

    // Optional: validate URL is reachable with a HEAD request
    try {
      await fetch(url, { method: 'HEAD' })
    } catch {
      // Non-blocking; we allow registration even if URL is temporarily unreachable
    }

    const webhookId = generateId('wh_')
    const plaintextSecret = secret || `whsec_${generateId('', 32)}`
    const encrypted = encryptWebhookSecret(plaintextSecret)

    const orgId = process.env.DEFAULT_ORG_ID || 'default'

    const doc = {
      id: webhookId,
      url,
      events,
      secretCipher: encrypted.ciphertext,
      secretIv: encrypted.iv,
      secretTag: encrypted.tag,
      name,
      active,
      orgId,
      createdAt: new Date().toISOString(),
      lastDeliveredAt: null,
      failureCount: 0,
    }

    await db.collection('webhooks').doc(webhookId).set(doc)

    log.success('webhook registered', { webhookId, name, events })
    reply.code(201)
    return {
      id: webhookId,
      name,
      url,
      events,
      active,
      secret: plaintextSecret,
      createdAt: doc.createdAt,
    }
    } catch (e: any) {
      log.error('webhook registration failed', { error: e.message })
      reply.code(503)
      return { error: { code: 'firestore', message: 'webhook registration failed' } }
    }
  })

  // GET /webhooks — list webhooks for org
  app.get('/webhooks', async (_request, reply) => {
    try {
    const orgId = process.env.DEFAULT_ORG_ID || 'default'
    const snap = await db.collection('webhooks').where('orgId', '==', orgId).get()
    const data = snap.docs.map((d) => {
      const w = d.data() as any
      return {
        id: w.id,
        name: w.name,
        url: maskUrl(w.url),
        events: w.events,
        active: w.active,
        createdAt: w.createdAt,
        lastDeliveredAt: w.lastDeliveredAt,
        failureCount: w.failureCount || 0,
      }
    })
    return { data }
    } catch (e: any) {
      log.error('webhooks list failed', { error: e.message })
      reply.code(503)
      return { error: { code: 'firestore', message: 'webhook list query failed' } }
    }
  })

  // GET /webhooks/:id — get webhook details + delivery log
  app.get('/webhooks/:id', async (request, reply) => {
    try {
    const { id } = request.params as { id: string }
    const snap = await db.collection('webhooks').doc(id).get()
    if (!snap.exists) { reply.code(404); return { error: { code: 'not_found', message: 'webhook not found' } } }
    const w = snap.data() as any
    const deliveriesSnap = await db
      .collection('webhook_deliveries')
      .where('webhookId', '==', id)
      .orderBy('deliveredAt', 'desc')
      .limit(50)
      .get()
    return {
      id: w.id,
      name: w.name,
      url: maskUrl(w.url),
      events: w.events,
      active: w.active,
      createdAt: w.createdAt,
      lastDeliveredAt: w.lastDeliveredAt,
      failureCount: w.failureCount || 0,
      deliveries: deliveriesSnap.docs.map((d) => {
        const del = d.data() as any
        return {
          id: d.id,
          event: del.event,
          deliveredAt: del.deliveredAt,
          success: del.success,
          responseStatus: del.responseStatus,
          attempt: del.attempt,
          error: del.error,
          payload: del.payload,
        }
      }),
    }
    } catch (e: any) {
      log.error('webhook detail failed', { error: e.message, webhookId: (request.params as any)?.id })
      reply.code(503)
      return { error: { code: 'firestore', message: 'webhook detail query failed' } }
    }
  })

  // DELETE /webhooks/:id — deactivate webhook
  app.delete('/webhooks/:id', async (request, reply) => {
    try {
    const { id } = request.params as { id: string }
    const snap = await db.collection('webhooks').doc(id).get()
    if (!snap.exists) { reply.code(404); return { error: { code: 'not_found', message: 'webhook not found' } } }
    await db.collection('webhooks').doc(id).update({ active: false })
    log.success('webhook deactivated', { webhookId: id })
    return { id, status: 'deactivated' }
    } catch (e: any) {
      log.error('webhook deactivation failed', { error: e.message, webhookId: (request.params as any)?.id })
      reply.code(503)
      return { error: { code: 'firestore', message: 'webhook deactivation failed' } }
    }
  })

  // POST /webhooks/:id/test — send test ping event
  app.post('/webhooks/:id/test', async (request, reply) => {
    try {
    const { id } = request.params as { id: string }
    const snap = await db.collection('webhooks').doc(id).get()
    if (!snap.exists) { reply.code(404); return { error: { code: 'not_found', message: 'webhook not found' } } }
    const w = snap.data() as any
    if (!w.active) { reply.code(400); return { error: { code: 'inactive', message: 'webhook is inactive' } } }

    const payload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: { message: 'Test webhook' },
    }
    await webhookQueue.add('deliver', { webhook: w, event: 'webhook.test', payload }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 60000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    })
    return { success: true, message: 'Test event queued' }
    } catch (e: any) {
      log.error('webhook test failed', { error: e.message, webhookId: (request.params as any)?.id })
      reply.code(503)
      return { error: { code: 'firestore', message: 'test event queue failed' } }
    }
  })

  // POST /webhooks/:id/rotate — rotate secret
  app.post('/webhooks/:id/rotate', async (request, reply) => {
    try {
    const { id } = request.params as { id: string }
    const snap = await db.collection('webhooks').doc(id).get()
    if (!snap.exists) { reply.code(404); return { error: { code: 'not_found', message: 'webhook not found' } } }

    const newSecret = `whsec_${generateId('', 32)}`
    const encrypted = encryptWebhookSecret(newSecret)
    await db.collection('webhooks').doc(id).update({
      secretCipher: encrypted.ciphertext,
      secretIv: encrypted.iv,
      secretTag: encrypted.tag,
    })

    log.success('webhook secret rotated', { webhookId: id })
    return { id, newSecret }
    } catch (e: any) {
      log.error('webhook secret rotation failed', { error: e.message, webhookId: (request.params as any)?.id })
      reply.code(503)
      return { error: { code: 'firestore', message: 'secret rotation failed' } }
    }
  })
}
