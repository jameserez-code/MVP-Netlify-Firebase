import admin from 'firebase-admin'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

let _db: admin.firestore.Firestore | null = null

export function initFirebase(): admin.firestore.Firestore {
  if (_db) return _db

  // 1. Try environment variables first (deployments like Vercel, Netlify, Lambda)
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY

  if (projectId && clientEmail && privateKey) {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        projectId,
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      })
    }
    _db = admin.firestore()
    return _db
  }

  // 2. Try GOOGLE_APPLICATION_CREDENTIALS env var
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    if (admin.apps.length === 0) {
      admin.initializeApp({ credential: admin.credential.applicationDefault() })
    }
    _db = admin.firestore()
    return _db
  }

  // 3. Try service-account.json file (local dev)
  const keyPath = resolve(process.cwd(), 'service-account.json')
  if (existsSync(keyPath)) {
    const sa = JSON.parse(readFileSync(keyPath, 'utf-8'))
    if (admin.apps.length === 0) {
      admin.initializeApp({ credential: admin.credential.cert(sa) })
    }
    _db = admin.firestore()
    return _db
  }

  // 4. Nothing configured — give clear instructions
  const msg = [
    'Firebase credentials not found. Configure one of:',
    '',
    'Option A — Environment variables (deployments):',
    '  FIREBASE_PROJECT_ID=your-project',
    '  FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...',
    '  FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n..."',
    '',
    'Option B — Service account file (local):',
    '  Create service-account.json from:',
    '  Firebase Console → Project Settings → Service accounts → Generate new private key',
    '',
    'Option C — Demo mode (no Firebase):',
    '  npm run demo    → runs without Firebase',
  ].join('\n')
  throw new Error(msg)
}

export function getDb(): admin.firestore.Firestore {
  if (!_db) return initFirebase()
  return _db
}
