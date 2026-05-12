import admin from 'firebase-admin'

import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// ---------------------------------------------------------------------------
// Locate service account
// ---------------------------------------------------------------------------
const serviceAccountPath = resolve(process.cwd(), 'service-account.json')

if (!existsSync(serviceAccountPath)) {
  console.error('ERROR: service-account.json not found')
  console.error('')
  console.error('Place your Firebase service account key at:')
  console.error(`  ${serviceAccountPath}`)
  console.error('')
  console.error('Get it from:')
  console.error('  Firebase Console → Project Settings → Service accounts → Generate new private key')
  process.exit(1)
}

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'))

// ---------------------------------------------------------------------------
// Initialize Firebase Admin
// ---------------------------------------------------------------------------
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })

console.log('Firebase connected')

// ---------------------------------------------------------------------------
// Write to Firestore
// ---------------------------------------------------------------------------
const db = admin.firestore()

async function run() {
  const docRef = db.collection('healthcheck').doc('init')

  // WRITE
  await docRef.set({
    status: 'ok',
    message: 'Firestore write/read verified',
    timestamp: new Date().toISOString(),
  })
  console.log('write success')

  // READ
  const snapshot = await docRef.get()
  if (!snapshot.exists) {
    throw new Error('READ FAILED: document not found after write')
  }
  console.log('read success')
  console.log('document contents:', JSON.stringify(snapshot.data(), null, 2))

  await admin.app().delete()
  process.exit(0)
}

run().catch((err) => {
  console.error('FAILURE:', err.message)
  process.exit(1)
})
