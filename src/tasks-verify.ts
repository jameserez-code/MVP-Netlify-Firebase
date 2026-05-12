import { createTask, getTask } from './tasks.js'

async function run() {
  // 1. CREATE
  const task = await createTask({
    description: 'Verify Firestore CRUD for tasks collection',
    priority: 1,
    tags: ['healthcheck', 'firestore'],
  })

  // 2. READ
  const found = await getTask(task.id)

  // 3. VERIFY
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

  console.log('\n✅ ALL CHECKS PASSED')
  console.log('   createTask → document written')
  console.log('   getTask    → document read back')
  console.log('   payload    → matches')
  process.exit(0)
}

run().catch((err) => {
  console.error('\n❌ CHECK FAILED:', err.message)
  process.exit(1)
})
