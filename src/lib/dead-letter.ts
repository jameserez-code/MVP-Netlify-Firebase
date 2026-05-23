import { getDb } from './firebase.js'
import { log } from './logger.js'

export interface DeadLetter {
  queue: string
  jobId: string
  name: string
  data: any
  failedReason: string
  attemptsMade: number
  createdAt: string
}

const db = getDb()

interface QueueJob {
  id: string | number
  data: any
  opts?: { jobId?: string }
}

export async function storeDeadLetter(queueName: string, job: QueueJob): Promise<void> {
  const jobData = job.data || {}
  const doc: DeadLetter = {
    queue: queueName,
    jobId: String(job.id),
    name: jobData.name || jobData.type || 'unknown',
    data: jobData,
    failedReason: jobData.reason || jobData.error || 'unknown',
    attemptsMade: jobData.attempt || 0,
    createdAt: new Date().toISOString(),
  }
  await db.collection('deadLetters').doc(String(job.id)).set(doc)
  log.warn('dead letter stored', { queue: queueName, jobId: String(job.id), reason: doc.failedReason })
  await alertIfGrowing(queueName)
}

export async function getDeadLetters(queueName?: string): Promise<DeadLetter[]> {
  let q = db.collection('deadLetters').orderBy('createdAt', 'desc')
  if (queueName) q = q.where('queue', '==', queueName)
  const snap = await q.limit(100).get()
  return snap.docs.map((d: any) => d.data() as DeadLetter)
}

export async function retryDeadLetter(docId: string): Promise<void> {
  const snap = await db.collection('deadLetters').doc(docId).get()
  if (!snap.exists) throw new Error('Dead letter not found')
  const dl = snap.data() as DeadLetter
  const { webhookQueue, emailQueue, auditQueue, cleanupQueue } = await import('./queue.js')
  const queues: Record<string, any> = {
    webhooks: webhookQueue,
    emails: emailQueue,
    audit: auditQueue,
    cleanup: cleanupQueue,
  }
  const queue = queues[dl.queue]
  if (!queue) throw new Error(`Unknown queue: ${dl.queue}`)
  await queue.add(dl.name, dl.data)
  await db.collection('deadLetters').doc(docId).delete()
  log.success('dead letter retried', { queue: dl.queue, jobId: dl.jobId })
}

export async function alertIfGrowing(queueName: string): Promise<void> {
  const snap = await db.collection('deadLetters').where('queue', '==', queueName).get()
  const count = snap.size
  if (count >= 10) {
    log.error('dead letter queue growing', { queue: queueName, count })
  }
}
