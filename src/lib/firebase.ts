import admin from 'firebase-admin'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { CircuitBreaker } from './circuit-breaker.js'

let _db: admin.firestore.Firestore | null = null
let _firebaseConnected = false
let _lastSuccessfulConnection = 0
let _connectionFailures = 0

const firebaseCircuitBreaker = new CircuitBreaker({
  name: 'firebase-connection',
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
  halfOpenMaxCalls: 3,
})

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000
const TIMEOUT_MS = 30_000

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isRetryableError(error: any): boolean {
  const codes = [
    'UNAVAILABLE', 'DEADLINE_EXCEEDED', 'RESOURCE_EXHAUSTED',
    'ABORTED', 'INTERNAL', 'UNKNOWN',
  ]
  if (error?.code && codes.includes(error.code)) return true
  if (error?.code === 14 || error?.code === 4 || error?.code === 10) return true
  return false
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Firestore operation timed out')), ms)
    promise.then(
      (val) => { clearTimeout(timer); resolve(val) },
      (err) => { clearTimeout(timer); reject(err) },
    )
  })
}

async function retryOperation<T>(fn: () => Promise<T>, retries: number = MAX_RETRIES): Promise<T> {
  let lastError: any
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await withTimeout(fn(), TIMEOUT_MS)
      _firebaseConnected = true
      _lastSuccessfulConnection = Date.now()
      _connectionFailures = 0
      return result
    } catch (error: any) {
      lastError = error
      if (!isRetryableError(error) || attempt >= retries) {
        _connectionFailures++
        if (_connectionFailures >= 3) {
          _firebaseConnected = false
        }
        throw error
      }
      await sleep(RETRY_DELAY_MS * Math.pow(2, attempt))
    }
  }
  throw lastError
}

export function isFirebaseConnected(): boolean {
  if (!_db) return false
  if (!_firebaseConnected && Date.now() - _lastSuccessfulConnection > 60_000) {
    return false
  }
  return _firebaseConnected || (Date.now() - _lastSuccessfulConnection < 60_000)
}

export function getFirebaseStatus(): { connected: boolean; lastSuccess: number; failures: number } {
  return {
    connected: _firebaseConnected,
    lastSuccess: _lastSuccessfulConnection,
    failures: _connectionFailures,
  }
}

export async function firestoreOperation<T>(fn: () => Promise<T>): Promise<T> {
  return firebaseCircuitBreaker.execute(() => retryOperation(fn))
}

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
    _firebaseConnected = true
    _lastSuccessfulConnection = Date.now()
    return _db
  }

  // 2. Try GOOGLE_APPLICATION_CREDENTIALS env var
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    if (admin.apps.length === 0) {
      admin.initializeApp({ credential: admin.credential.applicationDefault() })
    }
    _db = admin.firestore()
    _firebaseConnected = true
    _lastSuccessfulConnection = Date.now()
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
    _firebaseConnected = true
    _lastSuccessfulConnection = Date.now()
    return _db
  }

  // 4. Nothing configured — attempt demo/graceful degradation
  console.warn('Firebase credentials not found. Running without database.\nAgents can still register and evaluate policies in-memory for demo purposes.')
  _db = null
  _firebaseConnected = false
  // Return a stub object that prevents crashes but won't persist
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

// Circuit-breaker-wrapped Firebase operations for resilience
export async function firebaseOperation<T>(fn: () => Promise<T>): Promise<T> {
  return firebaseCircuitBreaker.execute(fn)
}
