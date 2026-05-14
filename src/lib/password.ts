// Password hashing — PBKDF2 with configurable iterations
// Replaces hardcoded 'admin' password with proper hashed storage

import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto'

const ITERATIONS = 100_000
const KEY_LENGTH = 64
const DIGEST = 'sha512'

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(32).toString('hex')
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex')
  return { hash, salt }
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const computed = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex')
  return timingSafeEqual(Buffer.from(computed), Buffer.from(hash))
}

// Default admin password — only used when seeding. Change in production.
export const DEFAULT_PASSWORD = 'admin'
export const HASHED_DEFAULT: { hash: string; salt: string } = hashPassword(DEFAULT_PASSWORD)
