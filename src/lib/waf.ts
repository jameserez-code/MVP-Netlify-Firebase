// Web Application Firewall (WAF) — input sanitization, header validation, body validation
import { log } from './logger.js'

const SQL_INJECTION_PATTERNS = [
  /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
  /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
  /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
  /((\%27)|(\'))union/i,
  /exec(\s|\+)+(s|x)p\w+/i,
  /UNION\s+SELECT/i,
  /INSERT\s+INTO/i,
  /DELETE\s+FROM/i,
  /DROP\s+TABLE/i,
  /;\s*shutdown/i,
  /;\s*drop/i,
]

const NOSQL_INJECTION_PATTERNS = [
  /\$where/i,
  /\$regex/i,
  /\$ne/i,
  /\$gt/i,
  /\$lt/i,
  /\$eq/i,
  /\$exists/i,
  /\$or/i,
  /\$and/i,
  /{\s*\$[^}]+}/i,
]

const XSS_PATTERNS = [
  /<script[^>]*>[\s\S]*?<\/script>/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /<iframe/i,
  /<object/i,
  /<embed/i,
  /expression\s*\(/i,
  /url\s*\(/i,
]

const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//,
  /\.\.\\/,
  /\.\.%2f/i,
  /\.\.%5c/i,
  /%2e%2e%2f/i,
  /%252e%252e%252f/i,
]

const SUSPICIOUS_HEADERS = [
  'x-http-method-override',
  'x-http-method',
  'x-method-override',
]

const MAX_BODY_SIZE = 1024 * 1024 // 1MB

export interface WafResult {
  allowed: boolean
  reason?: string
  statusCode: number
}

function flattenObject(obj: Record<string, unknown>): string[] {
  const values: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    values.push(key)
    if (typeof value === 'string') {
      values.push(value)
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      values.push(...flattenObject(value as Record<string, unknown>))
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') values.push(item)
        else if (typeof item === 'object' && item !== null) values.push(...flattenObject(item as Record<string, unknown>))
      }
    } else {
      values.push(String(value))
    }
  }
  return values
}

export function checkWaf(request: any): WafResult {
  // Header validation
  const userAgent = request.headers['user-agent'] || ''
  if (!userAgent || userAgent.length < 2) {
    return { allowed: false, reason: 'User-Agent header is required', statusCode: 403 }
  }

  for (const h of SUSPICIOUS_HEADERS) {
    if (request.headers[h]) {
      log.warn('waf: suspicious header detected', { header: h, ip: request.ip })
      return { allowed: false, reason: 'Suspicious header detected', statusCode: 403 }
    }
  }

  // Check URL for injection/path traversal
  const url = request.url || ''
  const body = request.body || {}

  const inputsToCheck: string[] = [url]

  // Check query params
  if (request.query) {
    for (const [k, v] of Object.entries(request.query)) {
      inputsToCheck.push(k, String(v))
    }
  }

  // Check body strings
  if (body && typeof body === 'object') {
    inputsToCheck.push(...flattenObject(body))
  }

  const checks = [
    { patterns: SQL_INJECTION_PATTERNS, name: 'SQL injection' },
    { patterns: NOSQL_INJECTION_PATTERNS, name: 'NoSQL injection' },
    { patterns: XSS_PATTERNS, name: 'XSS' },
    { patterns: PATH_TRAVERSAL_PATTERNS, name: 'path traversal' },
  ]

  for (const { patterns, name } of checks) {
    for (const input of inputsToCheck) {
      for (const pattern of patterns) {
        if (pattern.test(input)) {
          log.warn('waf: blocked pattern', {
            pattern: name,
            input: input.substring(0, 100),
            ip: request.ip,
          })
          return {
            allowed: false,
            reason: `Blocked: ${name} pattern detected`,
            statusCode: 403,
          }
        }
      }
    }
  }

  // Body size check
  const contentLength = parseInt(request.headers['content-length'] || '0', 10)
  if (contentLength > MAX_BODY_SIZE) {
    return { allowed: false, reason: 'Body exceeds 1MB limit', statusCode: 413 }
  }

  // Malformed JSON check — Fastify already handles JSON parsing errors,
  // but we explicitly guard against body parser bypass attempts
  const contentType = request.headers['content-type'] || ''
  if (
    contentType.includes('application/json') &&
    request.method !== 'GET' &&
    request.method !== 'HEAD' &&
    request.method !== 'OPTIONS' &&
    body === undefined
  ) {
    // If body is undefined despite JSON content-type, it may be malformed
    // Fastify's parser would have already rejected it, but we double-check
    log.warn('waf: potential malformed JSON body', { ip: request.ip })
    // Do not block here since Fastify handles it; just log
  }

  return { allowed: true, statusCode: 200 }
}
