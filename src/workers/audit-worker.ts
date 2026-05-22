import { auditQueue } from '../lib/queue.js'
import { getDb } from '../lib/firebase.js'
import { log } from '../lib/logger.js'

const db = getDb()

auditQueue.process(async (job) => {
  const { entries } = job.data
  try {
    const batch = db.batch()
    for (const entry of entries) {
      const ref = db.collection('actionIntents').doc(entry.intentId || db.collection('actionIntents').doc().id)
      batch.set(ref, entry)
    }
    await batch.commit()
    log.info('audit batch written', { count: entries.length, jobId: job.id })
    return { committed: entries.length }
  } catch (err: any) {
    log.error('audit worker failed', { jobId: job.id, error: err.message })
    throw err
  }
})

auditQueue.on('failed', async (job, err) => {
  const maxAttempts = (job.opts.attempts as number) || 1
  if (job.attemptsMade >= maxAttempts) {
    log.error('audit permanently failed', { jobId: job.id, error: err.message })
    try {
      const { storeDeadLetter } = await import('../lib/dead-letter.js')
      await storeDeadLetter('audit', job)
    } catch (e: any) {
      log.error('failed to store dead letter', { error: e.message })
    }
  }
})
