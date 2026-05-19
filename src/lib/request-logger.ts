import { randomUUID } from 'crypto'
import { log } from './logger.js'
import { recordRequest, recordError } from './metrics.js'

// ---------------------------------------------------------------------------
// Request / Response logging with correlation IDs
// ---------------------------------------------------------------------------

declare module 'fastify' {
  interface FastifyRequest {
    correlationId?: string
    startTime?: number
  }
}

function getClientIP(request: any): string {
  const forwarded = (request.headers['x-forwarded-for'] as string) || ''
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.ip || '127.0.0.1'
}

export function createRequestLoggerHooks() {
  return {
    onRequest: async (request: any, reply: any) => {
      const correlationId = randomUUID()
      request.correlationId = correlationId
      reply.correlationId = correlationId
      request.startTime = Date.now()

      const method = request.method
      const path = request.routerPath || request.url
      const query = (request.query && Object.keys(request.query).length > 0)
        ? JSON.stringify(request.query)
        : ''
      const ip = getClientIP(request)
      const userAgent = (request.headers['user-agent'] as string) || ''

      log.info('request start', {
        correlationId,
        method,
        path,
        query,
        ip,
        userAgent,
      })
    },

    onResponse: async (request: any, reply: any) => {
      const correlationId = request.correlationId || 'unknown'
      const statusCode = reply.statusCode
      const startTime = request.startTime || Date.now()
      const elapsed = Date.now() - startTime

      // Record metrics
      const path = request.routerPath || request.url
      recordRequest(request.method, path, statusCode, elapsed)

      if (statusCode >= 400) {
        log.error('request error', {
          correlationId,
          method: request.method,
          path,
          statusCode,
          responseTimeMs: elapsed,
        })
        if (statusCode >= 500) {
          recordError(`HTTP ${statusCode}`, path)
        }
      } else {
        log.info('request complete', {
          correlationId,
          method: request.method,
          path,
          statusCode,
          responseTimeMs: elapsed,
        })
      }
    },
  }
}
