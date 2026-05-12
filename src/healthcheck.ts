import admin from 'firebase-admin'

import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const keyPath = resolve(process.cwd(), 'service-account.json')

if (!existsSync(keyPath)) {
  console.error('ERROR: service-account.json not found')
  console.error(`Expected at: ${keyPath}`)
  console.error('Get it from: Firebase Console → Project Settings → Service accounts → Generate new private key')
  process.exit(1)
}

const sa = JSON.parse(readFileSync(keyPath, 'utf-8'))

if (admin.apps.length === 0) {
  admin.initializeApp({ credential: admin.credential.cert(sa) })
}

const db = admin.firestore()

async function run() {
  const ref = db.collection('healthcheck').doc('init')

  await ref.set({
    status: 'ok',
    message: 'Firestore write/read verified',
    timestamp: new Date().toISOString(),
  })
  console.log('write success')

  const snap = await ref.get()
  if (!snap.exists) {
    throw new Error('READ FAILED: document not found after write')
  }
  console.log('read success')
  console.log('document contents:', JSON.stringify(snap.data(), null, 2))

  await admin.app().delete()
  process.exit(0)
}

run().catch((err) => {
  console.error('FAILURE:', err.message)
  process.exit(1)
})
