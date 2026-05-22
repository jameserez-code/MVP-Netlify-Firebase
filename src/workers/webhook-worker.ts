import { webhookQueue } from '../lib/queue.js'
import { deliverWebhook } from '../lib/webhook-deliverer.js'
import { log } from '../lib/logger.js'
import { initFirebase } from '../lib/firebase.js'

initFirebase()

webhookQueue.process('deliver', async (job) => {
  const { webhook, event, payload } = job.data
  job.progress(0)
  try {
    job.progress(50)
    const result = await deliverWebhook(webhook, event, payload)
    job.progress(100)
    return result
  } catch (err: any) {
    log.error('webhook worker delivery failed', { jobId: job.id, webhookId: webhook?.id, error: err.message })
    throw err
  }
})

webhookQueue.process('bulk', async (job) => {
  const { event, payload, orgId, forceWebhookId } = job.data
  try {
    const { getDb } = await import('../lib/firebase.js')
    const db = getDb()
    await deliverWebhook(db, event, payload, orgId, forceWebhookId)
    return { delivered: true }
  } catch (err: any) {
    log.error('webhook worker bulk failed', { jobId: job.id, event, error: err.message })
    throw err
  }
})

webhookQueue.on('failed', async (job, err) => {
  const maxAttempts = (job.opts.attempts as number) || 1
  if (job.attemptsMade >= maxAttempts) {
    log.error('webhook permanently failed', { jobId: job.id, error: err.message })

    // Deactivate webhook for single-delivery jobs
    if (job.name === 'deliver' && job.data.webhook?.id) {
      try {
        const { getDb } = await import('../lib/firebase.js')
        const db = getDb()
        await db.collection('webhooks').doc(job.data.webhook.id).update({ active: false })
        log.warn('webhook deactivated after final failure', { webhookId: job.data.webhook.id })
      } catch (e: any) {
        log.error('failed to deactivate webhook', { error: e.message })
      }
    }

    // Move to dead letter queue
    try {
      const { storeDeadLetter } = await import('../lib/dead-letter.js')
      await storeDeadLetter('webhooks', job)
    } catch (e: any) {
      log.error('failed to store dead letter', { error: e.message })
    }
  }
})
