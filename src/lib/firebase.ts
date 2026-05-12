import admin from 'firebase-admin'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

let _db: admin.firestore.Firestore | null = null

export function initFirebase(): admin.firestore.Firestore {
  if (_db) return _db

  const keyPath = resolve(process.cwd(), 'service-account.json')

  if (!existsSync(keyPath)) {
    const msg = [
      'ERROR: service-account.json not found',
      '',
      `Expected at: ${keyPath}`,
      '',
      'Get it from:',
      '  Firebase Console → Project Settings → Service accounts → Generate new private key',
    ].join('\n')
    throw new Error(msg)
  }

  const sa = JSON.parse(readFileSync(keyPath, 'utf-8'))

  if (admin.apps.length === 0) {
    admin.initializeApp({ credential: admin.credential.cert(sa) })
  }

  _db = admin.firestore()
  return _db
}

export function getDb(): admin.firestore.Firestore {
  if (!_db) return initFirebase()
  return _db
}
