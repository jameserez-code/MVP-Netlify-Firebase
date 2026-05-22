// Circuit Breaker — prevents cascading failures for external services
import { log } from './logger.js'

export type CircuitState = 'closed' | 'open' | 'half-open'

export class CircuitBreakerError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CircuitBreakerError'
    Object.setPrototypeOf(this, CircuitBreakerError.prototype)
  }
}

export interface CircuitBreakerOptions {
  failureThreshold?: number
  resetTimeoutMs?: number
  halfOpenMaxCalls?: number
  name: string
}

export class CircuitBreaker {
  private failures = 0
  private threshold: number
  private timeout: number
  private state: CircuitState = 'closed'
  private lastFailureTime = 0
  private halfOpenCalls = 0
  private halfOpenMaxCalls: number
  private name: string
  private successCount = 0

  constructor(options: CircuitBreakerOptions) {
    this.threshold = options.failureThreshold || 5
    this.timeout = options.resetTimeoutMs || 30_000
    this.halfOpenMaxCalls = options.halfOpenMaxCalls || 3
    this.name = options.name
  }

  getState(): CircuitState {
    if (this.state === 'open') {
      const now = Date.now()
      if (now - this.lastFailureTime >= this.timeout) {
        this.state = 'half-open'
        this.halfOpenCalls = 0
        log.info(`circuit breaker ${this.name} entering half-open state`)
      }
    }
    return this.state
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const state = this.getState()
    if (state === 'open') {
      throw new CircuitBreakerError(`Circuit breaker '${this.name}' is open`)
    }

    if (state === 'half-open') {
      if (this.halfOpenCalls >= this.halfOpenMaxCalls) {
        throw new CircuitBreakerError(`Circuit breaker '${this.name}' is half-open and max calls reached`)
      }
      this.halfOpenCalls++
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess() {
    if (this.state === 'half-open') {
      this.successCount++
      if (this.successCount >= this.halfOpenMaxCalls) {
        this.state = 'closed'
        this.failures = 0
        this.successCount = 0
        log.success(`circuit breaker ${this.name} closed`)
      }
    } else {
      this.failures = Math.max(0, this.failures - 1)
    }
  }

  private onFailure() {
    this.failures++
    this.lastFailureTime = Date.now()
    log.warn(`circuit breaker ${this.name} failure ${this.failures}/${this.threshold}`)
    if (this.failures >= this.threshold) {
      this.state = 'open'
      this.successCount = 0
      log.error(`circuit breaker ${this.name} opened`)
    }
  }
}
