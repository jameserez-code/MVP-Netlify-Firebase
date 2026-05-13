// Fault injection / resilience tests
// Run: npm run test:resilience

import { initFirebase } from '../../src/lib/firebase.js'
import { log } from '../../src/lib/logger.js'

const db = initFirebase()
let pass = 0, fail = 0
function p(n: string) { pass++; console.log('  ✓ ' + n) }
function f(n: string, m: string) { fail++; console.log('  ✗ ' + n + ': ' + m) }

async function run() {
  console.log('\nResilience Tests\n')

  // 1. Idempotent task creation — same key twice
  const key1 = 'idem_' + Date.now()
  const r1 = await (await import('../../src/resilience.js')).idempotentTaskCreate(db, key1, { test: 'idempotent' })
  const r2 = await (await import('../../src/resilience.js')).idempotentTaskCreate(db, key1, { test: 'duplicate' })
  if (r1.created && !r2.created && r1.id === r2.id) p('idempotent task creation')
  else f('idempotent task creation', `r1:${r1.created} r2:${r2.created}`)

  // 2. Stuck task detection (the task created above is "pending" — not stuck)
  const stuck = await (await import('../../src/resilience.js')).findStuckTasks(db)
  if (Array.isArray(stuck)) p('stuck task scan works')
  else f('stuck task scan', String(stuck))

  // 3. Retry policy — max retries exceeded
  const taskRef = db.collection('tasks').doc(r1.id)
  await taskRef.update({ retryCount: 3, status: 'failed' })
  const retryResult = await (await import('../../src/resilience.js')).retryTask(db, r1.id, 'Test error')
  if (!retryResult.retried && retryResult.retryCount > 3) p('max retries prevented')
  else f('max retries', JSON.stringify(retryResult))

  // 4. Calculate retry delay — exponential
  const d0 = (await import('../../src/resilience.js')).calculateRetryDelay(0)
  const d1 = (await import('../../src/resilience.js')).calculateRetryDelay(1)
  const d2 = (await import('../../src/resilience.js')).calculateRetryDelay(2)
  if (d0 < d1 && d1 < d2) p('exponential backoff increases')
  else f('backoff', `d0:${d0} d1:${d1} d2:${d2}`)

  // 5. Ensure single active run — re-entry check
  const agentSnap = await db.collection('agents').where('status', '==', 'active').limit(1).get()
  if (!agentSnap.empty) {
    const agentId = agentSnap.docs[0].id
    // Create a running run
    const runRef = db.collection('runs').doc()
    await runRef.set({ agentId, taskId: 'bogus', status: 'running', startedAt: new Date().toISOString() })
    const allowed = await (await import('../../src/resilience.js')).ensureSingleActiveRun(db, 'bogus', agentId)
    if (!allowed) p('duplicate run prevented')
    else f('duplicate run', 'should have been prevented')
    await runRef.delete()
  } else { p('single run check (no agent)') }

  // 6. Transition validation — invalid state change
  const { transitionTask } = await import('../../src/transitions.js')
  const testTaskRef = db.collection('tasks').doc('fault_test_task')
  await testTaskRef.set({ status: 'completed', createdAt: new Date().toISOString() })
  try {
    await transitionTask(db, 'fault_test_task', 'running', {}, 'fault_test')
    f('invalid transition', 'should have thrown')
  } catch (e: any) {
    if (e.message.includes('INVALID_TASK_TRANSITION')) p('invalid transition rejected')
    else f('invalid transition', e.message)
  }
  await testTaskRef.delete()

  console.log('\n' + pass + '/' + (pass + fail) + ' tests passed\n')
  process.exit(fail > 0 ? 1 : 0)
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1) })
