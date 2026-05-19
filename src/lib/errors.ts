// Standard error classes for consistent API error handling

export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly detail?: Record<string, unknown>

  constructor(message: string, statusCode: number, code: string, detail?: Record<string, unknown>) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.detail = detail
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

export class ValidationError extends AppError {
  public readonly fields: Record<string, string>

  constructor(message: string, fields: Record<string, string>) {
    super(message, 400, 'validation_error', { fields })
    this.fields = fields
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

export class AuthError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'unauthorized')
    Object.setPrototypeOf(this, AuthError.prototype)
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'forbidden')
    Object.setPrototypeOf(this, ForbiddenError.prototype)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(`${resource}${id ? ` ${id}` : ''} not found`, 404, 'not_found', id ? { resource, id } : { resource })
    Object.setPrototypeOf(this, NotFoundError.prototype)
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'conflict')
    Object.setPrototypeOf(this, ConflictError.prototype)
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'rate_limited')
    Object.setPrototypeOf(this, RateLimitError.prototype)
  }
}

export class FirestoreError extends AppError {
  constructor(message: string = 'Database operation failed') {
    super(message, 503, 'firestore')
    Object.setPrototypeOf(this, FirestoreError.prototype)
  }
}

export function sanitizeErrorForProduction(error: Error): { message: string; code: string; detail?: Record<string, unknown> } {
  if (error instanceof AppError) {
    return { message: error.message, code: error.code, detail: error.detail }
  }
  return { message: 'Internal server error', code: 'internal_error' }
}
