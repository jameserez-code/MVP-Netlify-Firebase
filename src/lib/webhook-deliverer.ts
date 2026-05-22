import { createHmac } from 'crypto'
import type { Firestore } from 'firebase-admin/firestore'
import { log } from './logger.js'
import { decryptWebhookSecret } from './crypto.js'
import { CircuitBreaker } from './circuit-breaker.js'
import { getDb } from './firebase.js'

export interface WebhookDoc {
  id: string
  url: string
  events: string[]
  secretCipher: string
  secretIv: string
  secretTag: string
  name: string
  active: boolean
  orgId: string
  createdAt: string
  lastDeliveredAt?: string | null
  failureCount?: number
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

const webhookCircuitBreaker = new CircuitBreaker({
  name: 'webhook-delivery',
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
  halfOpenMaxCalls: 3,
})

async function sendToWebhook(
  db: Firestore,
  webhook: WebhookDoc,
  event: string,
  payload: Record<string, unknown>,
) {
  const timestamp = new Date().toISOString()
  let secret: string
  try {
    secret = decryptWebhookSecret(webhook.secretCipher, webhook.secretIv, webhook.secretTag)
  } catch (e: any) {
    log.error('webhook secret decryption failed', { webhookId: webhook.id, error: e.message })
    return
  }

  const body = JSON.stringify(payload)
  const hmac = createHmac('sha256', secret).update(body).digest('hex')

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Webhook-Signature': `sha256=${hmac}`,
    'X-Webhook-Event': event,
    'X-Webhook-ID': webhook.id,
    'X-Webhook-Timestamp': timestamp,
  }

  let lastError: string | undefined
  let responseStatus: number | null = null
  let responseBody = ''
  let delivered = false
  let attempt = 0

  for (attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await webhookCircuitBreaker.execute(() =>
        fetch(webhook.url, { method: 'POST', headers, body }),
      )
      responseStatus = res.status
      responseBody = await res.text()
      delivered = res.ok
      if (delivered) break
      lastError = `HTTP ${res.status}`
    } catch (e: any) {
      lastError = e.message
      responseStatus = null
      responseBody = ''
    }
    if (attempt < 3) {
      await sleep(1000 * Math.pow(2, attempt - 1))
    }
  }

  const delivery = {
    webhookId: webhook.id,
    event,
    payload,
    responseStatus,
    responseBody: responseBody.substring(0, 5000),
    deliveredAt: new Date().toISOString(),
    attempt,
    error: lastError || null,
    success: delivered,
  }

  await db.collection('webhook_deliveries').add(delivery)

  if (!delivered) {
    const newFailureCount = (webhook.failureCount || 0) + 1
    await db.collection('webhooks').doc(webhook.id).update({
      failureCount: newFailureCount,
      lastDeliveredAt: delivery.deliveredAt,
    })
    if (newFailureCount >= 3) {
      await db.collection('webhooks').doc(webhook.id).update({ active: false })
      log.warn('webhook deactivated after failures', { webhookId: webhook.id, failureCount: newFailureCount })
    }
  } else {
    await db.collection('webhooks').doc(webhook.id).update({
      lastDeliveredAt: delivery.deliveredAt,
      failureCount: 0,
    })
  }

  return delivery
}

export async function deliverWebhook(
  dbOrWebhook: Firestore | WebhookDoc,
  event: string,
  payload: Record<string, unknown>,
  orgId?: string,
  forceWebhookId?: string,
): Promise<any> {
  // Single webhook delivery (used by worker)
  if ('url' in (dbOrWebhook as any)) {
    const db = getDb()
    return sendToWebhook(db, dbOrWebhook as WebhookDoc, event, payload)
  }

  const db = dbOrWebhook as Firestore
  try {
    let docs: WebhookDoc[] = []
    if (forceWebhookId) {
      const snap = await db.collection('webhooks').doc(forceWebhookId).get()
      if (snap.exists) docs.push({ id: snap.id, ...snap.data() } as unknown as WebhookDoc)
    } else {
      const snap = await db.collection('webhooks').where('active', '==', true).get()
      docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as WebhookDoc))
    }

    docs = docs.filter((w) => {
      if (forceWebhookId && w.id === forceWebhookId) return true
      return w.events.includes(event)
    })

    if (orgId) docs = docs.filter((w) => w.orgId === orgId)

    await Promise.allSettled(docs.map((w) => sendToWebhook(db, w, event, payload)))
  } catch (e: any) {
    log.error('webhook delivery error', { error: e.message, event })
  }
}
