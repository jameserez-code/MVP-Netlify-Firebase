// Input validation + sanitization middleware
// Prevents injection, oversized payloads, and malformed requests

// ---------------------------------------------------------------------------
// Payload size limits
// ---------------------------------------------------------------------------
const MAX_BODY_SIZE_BYTES = 100_000  // 100KB

export function validatePayloadSize(body: string): boolean {
  return Buffer.byteLength(body, 'utf-8') <= MAX_BODY_SIZE_BYTES
}

// ---------------------------------------------------------------------------
// Parameter sanitization — prevent script/template injection
// ---------------------------------------------------------------------------
const INJECTION_PATTERNS = [
  /<script[^>]*>/i,
  /\$\{.*\}/,        // template injection
  /eval\s*\(/i,
  /Function\s*\(/i,
  /__proto__/i,
  /constructor\s*\[/i,
]

export function sanitizeString(input: string): string {
  let cleaned = input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .substring(0, 5000)  // max string length
  return cleaned
}

export function hasInjectionPatterns(input: string): boolean {
  return INJECTION_PATTERNS.some(p => p.test(input))
}

export function sanitizeObject(obj: Record<string, unknown>, depth = 0): Record<string, unknown> {
  if (depth > 10) return {}  // max nesting depth
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (hasInjectionPatterns(key)) continue
    if (typeof value === 'string') {
      result[key] = sanitizeString(value)
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = sanitizeObject(value as Record<string, unknown>, depth + 1)
    } else {
      result[key] = value
    }
  }
  return result
}

// ---------------------------------------------------------------------------
// Fastify hook: validate request body
export function registerValidationHooks(server: any) {
  // Check raw body BEFORE parsing (for size + injection)
  server.addHook('preParsing', async (request: any, reply: any, payload: unknown) => {
    if (typeof payload === 'string') {
      if (!validatePayloadSize(payload)) {
        reply.code(413).send({ error: { code: 'payload_too_large', message: `Body exceeds ${MAX_BODY_SIZE_BYTES / 1000}KB limit` } })
        return reply
      }
      if (hasInjectionPatterns(payload)) {
        reply.code(400).send({ error: { code: 'invalid_input', message: 'Potential injection detected' } })
        return reply
      }
    }
    return payload
  })

  // Secure headers on every response
  server.addHook('onSend', async (_request: any, reply: any, payload: unknown) => {
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.header('X-Frame-Options', 'DENY')
    reply.header('X-XSS-Protection', '1; mode=block')
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    reply.header('Cache-Control', 'no-store')
    return payload
  })
}
