import type { FastifyInstance } from 'fastify'
import type { Firestore } from 'firebase-admin/firestore'
import { requireAdmin } from '../lib/rbac.js'
import { webhookQueue, emailQueue, auditQueue, cleanupQueue } from '../lib/queue.js'
import { getDeadLetters, retryDeadLetter } from '../lib/dead-letter.js'

export default async function queueStatusRoutes(app: FastifyInstance, _db: Firestore) {
  app.get('/admin/queues', { preHandler: requireAdmin }, async (_request, _reply) => {
    const [webhookCounts, emailCounts, auditCounts, cleanupCounts] = await Promise.all([
      webhookQueue.getJobCounts(),
      emailQueue.getJobCounts(),
      auditQueue.getJobCounts(),
      cleanupQueue.getJobCounts(),
    ])
    return {
      webhooks: webhookCounts,
      emails: emailCounts,
      audit: auditCounts,
      cleanup: cleanupCounts,
    }
  })

  app.get('/admin/dead-letters', { preHandler: requireAdmin }, async (request, _reply) => {
    const { queue } = request.query as { queue?: string }
    const deadLetters = await getDeadLetters(queue)
    return { data: deadLetters }
  })

  app.post('/admin/dead-letters/:id/retry', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await retryDeadLetter(id)
    return { retried: true }
  })
}
