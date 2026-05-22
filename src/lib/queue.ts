import Bull from 'bull'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

export const webhookQueue = new Bull('webhooks', redisUrl)
export const emailQueue = new Bull('emails', redisUrl, {
  limiter: { max: 10, duration: 60000 },
})
export const auditQueue = new Bull('audit', redisUrl)
export const cleanupQueue = new Bull('cleanup', redisUrl)

function logQueueError(queueName: string, err: Error) {
  console.error(`Queue ${queueName} error:`, err.message)
}

webhookQueue.on('error', (err) => logQueueError('webhooks', err))
emailQueue.on('error', (err) => logQueueError('emails', err))
auditQueue.on('error', (err) => logQueueError('audit', err))
cleanupQueue.on('error', (err) => logQueueError('cleanup', err))
