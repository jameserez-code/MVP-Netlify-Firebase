import { cleanupQueue } from '../lib/queue.js'
import { getDb } from '../lib/firebase.js'
import { log } from '../lib/logger.js'

const db = getDb()

cleanupQueue.process(async (job) => {
  const { name } = job.data
  try {
    switch (name) {
      case 'demo-cleanup':
        await cleanupDemoSessions()
        break
      case 'expired-sessions':
        await cleanupExpiredSessions()
        break
      case 'old-logs':
        await archiveOldLogs()
        break
      default:
        log.warn('unknown cleanup job', { name, jobId: job.id })
    }
    return { completed: true }
  } catch (err: any) {
    log.error('cleanup worker failed', { jobId: job.id, name, error: err.message })
    throw err
  }
})

async function cleanupDemoSessions() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const snap = await db.collection('tasks').where('type', '==', 'demo').where('createdAt', '<', cutoff).get()
  const batch = db.batch()
  for (const doc of snap.docs) {
    batch.delete(doc.ref)
  }
  await batch.commit()
  log.info('demo cleanup completed', { deleted: snap.size })
}

async function cleanupExpiredSessions() {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const snap = await db.collection('jwtBlacklist').where('createdAt', '<', cutoff).get()
  const batch = db.batch()
  for (const doc of snap.docs) {
    batch.delete(doc.ref)
  }
  await batch.commit()
  log.info('expired sessions cleanup completed', { deleted: snap.size })
}

async function archiveOldLogs() {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const snap = await db.collection('actionIntents').where('createdAt', '<', cutoff).get()
  if (snap.empty) {
    log.info('old logs archival completed', { archived: 0 })
    return
  }
  const archiveBatch = db.batch()
  const deleteBatch = db.batch()
  for (const doc of snap.docs) {
    archiveBatch.set(db.collection('actionIntentsArchive').doc(doc.id), doc.data())
    deleteBatch.delete(doc.ref)
  }
  await archiveBatch.commit()
  await deleteBatch.commit()
  log.info('old logs archival completed', { archived: snap.size })
}

// Schedule recurring cleanup jobs
cleanupQueue.add('demo-cleanup', { name: 'demo-cleanup' }, { repeat: { cron: '0 */6 * * *' } })
cleanupQueue.add('expired-sessions', { name: 'expired-sessions' }, { repeat: { cron: '0 * * * *' } })
cleanupQueue.add('old-logs', { name: 'old-logs' }, { repeat: { cron: '0 0 * * 0' } })
