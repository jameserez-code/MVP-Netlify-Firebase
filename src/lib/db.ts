import { getDb } from './firebase.js'
import { log } from './logger.js'

export class DatabasePool {
  private maxConnections = 10
  private retryAttempts = 3
  private retryDelayMs = 500

  getConnection() {
    // Firestore is connectionless (HTTP) and handles pooling automatically.
    // This wrapper exists for future connection management (e.g. Postgres,
    // Redis) and to provide a uniform interface across the codebase.
    return getDb()
  }

  async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await fn()
      } catch (e: any) {
        lastError = e
        if (attempt < this.retryAttempts) {
          log.warn('db operation failed, retrying', {
            attempt,
            error: e.message,
          })
          await new Promise((r) => setTimeout(r, this.retryDelayMs * attempt))
        }
      }
    }
    throw lastError
  }

  async healthCheck(): Promise<boolean> {
    try {
      const db = getDb()
      await db.collection('_health').doc('check').get()
      return true
    } catch {
      return false
    }
  }
}

export const dbPool = new DatabasePool()
