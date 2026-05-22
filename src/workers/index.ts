import { initFirebase } from '../lib/firebase.js'
import { log } from '../lib/logger.js'
import { webhookQueue, emailQueue, auditQueue, cleanupQueue } from '../lib/queue.js'
import './webhook-worker.js'
import './email-worker.js'
import './audit-worker.js'
import './cleanup-worker.js'

initFirebase()

log.info('all workers started')

async function shutdown() {
  log.info('workers shutting down gracefully')
  await Promise.all([
    webhookQueue.close(),
    emailQueue.close(),
    auditQueue.close(),
    cleanupQueue.close(),
  ])
  log.info('queues closed')
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
