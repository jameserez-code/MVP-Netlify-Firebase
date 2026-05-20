// Environment validation — validates all required variables at startup
// Import and call validateEnv() before starting the server

import { randomBytes } from 'crypto'

export interface EnvConfig {
  jwtSecret: string
  engineSecret: string
  adminPassword: string
  defaultOrgId: string
  firebaseProjectId?: string
  firebaseClientEmail?: string
  firebasePrivateKey?: string
  googleApplicationCredentials?: string
  redisUrl?: string
  webhookEncryptionKey?: string
  port: number
}

let _config: EnvConfig | null = null
let _generatedPassword: string | null = null

export interface ValidateEnvOptions {
  skipFirebase?: boolean
}

export function validateEnv(options: ValidateEnvOptions = {}): EnvConfig {
  if (_config) return _config

  const errors: string[] = []

  // Critical secrets — must be set
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    errors.push('JWT_SECRET is required. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"')
  } else if (jwtSecret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters.')
  }

  const engineSecret = process.env.ENGINE_SECRET
  if (!engineSecret) {
    errors.push('ENGINE_SECRET is required. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"')
  }

  const defaultOrgId = process.env.DEFAULT_ORG_ID
  if (!defaultOrgId) {
    errors.push('DEFAULT_ORG_ID is required. Set your organization ID (e.g., org_prod_001).')
  }

  // Firebase — one of the two options must be provided (unless skipped for demo mode)
  const firebaseProjectId = process.env.FIREBASE_PROJECT_ID
  const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY
  const googleApplicationCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS

  if (!options.skipFirebase) {
    const hasFirebaseEnv = firebaseProjectId && firebaseClientEmail && firebasePrivateKey
    const hasFirebaseFile = !!googleApplicationCredentials

    if (!hasFirebaseEnv && !hasFirebaseFile) {
      if (process.env.NODE_ENV === 'production') {
        errors.push(
          'Firebase credentials are required in production. Provide either:\n' +
          '  (A) FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY\n' +
          '  (B) GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json'
        )
      } else {
        errors.push(
          'Firebase credentials required. Provide either:\n' +
          '  (A) FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY\n' +
          '  (B) GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json'
        )
      }
    }
  }

  // Admin password — required or auto-generated
  let adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) {
    adminPassword = randomBytes(24).toString('hex')
    _generatedPassword = adminPassword
    console.warn('\n[SECURITY] ADMIN_PASSWORD not set. A random password has been generated for this session.')
    console.warn(`[SECURITY] Admin password: ${adminPassword}\n`)
  }

  if (errors.length > 0) {
    throw new Error(
      'Missing required environment variables:\n\n' +
      errors.map(e => '  • ' + e).join('\n\n') +
      '\n\nSee .env.example for details.'
    )
  }

  _config = {
    jwtSecret: jwtSecret!,
    engineSecret: engineSecret!,
    adminPassword: adminPassword!,
    defaultOrgId: defaultOrgId!,
    firebaseProjectId: firebaseProjectId || undefined,
    firebaseClientEmail: firebaseClientEmail || undefined,
    firebasePrivateKey: firebasePrivateKey || undefined,
    googleApplicationCredentials: googleApplicationCredentials || undefined,
    redisUrl: process.env.REDIS_URL || undefined,
    webhookEncryptionKey: process.env.WEBHOOK_ENCRYPTION_KEY || undefined,
    port: parseInt(process.env.PORT || '3000', 10),
  }

  return _config
}

export function getEnv(): EnvConfig {
  if (!_config) return validateEnv()
  return _config
}

export function getAdminPassword(): string {
  return getEnv().adminPassword
}

export function getDefaultOrgId(): string {
  return getEnv().defaultOrgId
}

export function isPasswordGenerated(): boolean {
  return !!_generatedPassword
}
