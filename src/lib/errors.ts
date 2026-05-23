export class AppError extends Error {
  code: string
  statusCode: number
  detail?: Record<string, unknown>

  constructor(code: string, message: string, statusCode = 500, detail?: Record<string, unknown>) {
    super(message)
    this.code = code
    this.statusCode = statusCode
    this.detail = detail
  }
}

export function sanitizeErrorForProduction(error: any) {
  return { code: error.code || 'internal_error', message: 'An internal error occurred' }
}
