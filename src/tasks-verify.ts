import { createTask, getTask } from './tasks.js'
import { log } from './lib/logger.js'

async function run() {
  const task = await createTask({
    description: 'Verify Firestore CRUD for tasks collection',
    priority: 1,
    tags: ['healthcheck', 'firestore'],
  })

  const found = await getTask(task.id)

  if (!found) {
    throw new Error('READ FAILED: task not found after create')
  }

  if (found.status !== 'created') {
    throw new Error(`READ FAILED: expected status "created", got "${found.status}"`)
  }

  const payload = found.payload as Record<string, unknown>
  if (payload.description !== 'Verify Firestore CRUD for tasks collection') {
    throw new Error('READ FAILED: payload mismatch')
  }

  log.success('all checks passed')
  process.exit(0)
}

run().catch((err) => {
  log.error('verify failed', { error: err.message })
  process.exit(1)
})
