import admin from 'firebase-admin'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// ---------------------------------------------------------------------------
// Firebase init (service account JSON in project root)
// ---------------------------------------------------------------------------
const keyPath = resolve(process.cwd(), 'service-account.json')

if (!existsSync(keyPath)) {
  console.error('FATAL: service-account.json not found at', keyPath)
  process.exit(1)
}

const sa = JSON.parse(readFileSync(keyPath, 'utf-8'))

if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.cert(sa) })
}

const db = admin.firestore()

// ---------------------------------------------------------------------------
// createTask(payload) — write a task document
// ---------------------------------------------------------------------------
export async function createTask(payload: Record<string, unknown>) {
  const docRef = db.collection('tasks').doc()         // auto-id
  const doc = {
    payload,
    status: 'created',
    createdAt: new Date().toISOString(),
  }

  await docRef.set(doc)
  console.log(`createTask success — id: ${docRef.id}`)
  return { id: docRef.id, ...doc }
}

// ---------------------------------------------------------------------------
// getTask(id) — read a task document
// ---------------------------------------------------------------------------
export async function getTask(id: string) {
  const snapshot = await db.collection('tasks').doc(id).get()

  if (!snapshot.exists) {
    console.warn(`getTask not found — id: ${id}`)
    return null
  }

  const data = snapshot.data()
  console.log(`getTask success — id: ${id}, status: ${data?.status}`)
  return { id, ...data }
}

// ---------------------------------------------------------------------------
// Self-test (run directly: tsx src/tasks.ts)
// ---------------------------------------------------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  ;(async () => {
    const task = await createTask({ message: 'self-test payload', source: 'cli' })
    const found = await getTask(task.id)
    console.log('verify:', found ? 'READ OK' : 'READ FAIL')
    await admin.app().delete()
    process.exit(0)
  })().catch((err) => {
    console.error('FAILURE:', err.message)
    process.exit(1)
  })
}
