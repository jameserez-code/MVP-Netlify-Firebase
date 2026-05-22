// Secrets Rotation — JWT and Engine secret rotation with optional HashiCorp Vault support
import { randomBytes } from 'crypto'
import { log } from './logger.js'
import { setSecret } from './jwt.js'
import { setEngineSecret } from './crypto.js'

let rotationTimer: NodeJS.Timeout | null = null

export function rotateJwtSecret(): string {
  const newSecret = randomBytes(32).toString('hex')
  process.env.JWT_SECRET = newSecret
  setSecret(newSecret)
  log.success('JWT secret rotated', { length: newSecret.length })
  return newSecret
}

export function rotateEngineSecret(): string {
  const newSecret = randomBytes(32).toString('hex')
  process.env.ENGINE_SECRET = newSecret
  setEngineSecret(newSecret)
  log.success('ENGINE secret rotated', { length: newSecret.length })
  return newSecret
}

export function scheduleRotation(intervalMs: number = 30 * 24 * 60 * 60 * 1000): () => void {
  if (rotationTimer) {
    clearInterval(rotationTimer)
  }

  rotationTimer = setInterval(() => {
    try {
      rotateJwtSecret()
      rotateEngineSecret()
    } catch (e: any) {
      log.error('scheduled secret rotation failed', { error: e.message })
    }
  }, intervalMs)

  log.success('secret rotation scheduled', { intervalDays: Math.round(intervalMs / 86400000) })

  return () => {
    if (rotationTimer) {
      clearInterval(rotationTimer)
      rotationTimer = null
    }
  }
}

export function cancelScheduledRotation() {
  if (rotationTimer) {
    clearInterval(rotationTimer)
    rotationTimer = null
  }
}
