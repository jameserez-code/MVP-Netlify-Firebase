import { createHmac, pbkdf2Sync, randomBytes, createHash, timingSafeEqual, createCipheriv, createDecipheriv, scryptSync } from 'crypto'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const KEY_ITERATIONS = 50000
const KEY_DIGEST = 'sha512'
const KEY_LENGTH = 64
const PASSPORT_TTL = 900  // 15 min
const TICKET_TTL  = 30   // 30 sec

// ---------------------------------------------------------------------------
// Key generation
// ---------------------------------------------------------------------------
export function generateAgentSecretKey(): string {
  return `ak_live_${randomBytes(32).toString('hex')}`
}

export function generatePassportNumber(): string {
  const seg = () => randomBytes(2).toString('hex').substring(0, 4).toUpperCase()
  return `PP-${seg()}-${seg()}`
}

export function generateId(prefix: string, len = 16): string {
  return `${prefix}${randomBytes(len).toString('hex').substring(0, len)}`
}

// ---------------------------------------------------------------------------
// Key hashing
// ---------------------------------------------------------------------------
export function hashKey(plaintext: string): { hash: string; salt: string } {
  const salt = randomBytes(32).toString('hex')
  const hash = pbkdf2Sync(plaintext, salt, KEY_ITERATIONS, KEY_LENGTH, KEY_DIGEST).toString('hex')
  return { hash, salt }
}

export function verifyKey(plaintext: string, hash: string, salt: string, iterations = KEY_ITERATIONS): boolean {
  const computed = pbkdf2Sync(plaintext, salt, iterations, KEY_LENGTH, KEY_DIGEST).toString('hex')
  return timingSafeEqual(Buffer.from(computed), Buffer.from(hash))
}

// ---------------------------------------------------------------------------
// Intent signing — HMAC-SHA256
// ---------------------------------------------------------------------------
export function signIntent(intentId: string, agentId: string, tool: string, parameters: Record<string, unknown>): { signature: string; timestamp: string } {
  const timestamp = new Date().toISOString()
  const payload = [intentId, agentId, tool, JSON.stringify(parameters), timestamp].join('|')
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET environment variable is required')
  const hmac = createHmac('sha256', secret)
  return {
    signature: `hmac-sha256:${hmac.update(payload).digest('hex')}`,
    timestamp,
  }
}

export function verifyIntentSignature(fields: Record<string, unknown>, secret: string): boolean {
  const { signature, ...rest } = fields
  const computed = signIntent(
    rest.intentId as string, rest.agentId as string, rest.tool as string, rest.parameters as Record<string, unknown>
  )
  if (!signature) return false
  return timingSafeEqual(Buffer.from(computed.signature), Buffer.from(signature as string))
}

// ---------------------------------------------------------------------------
// Passport JWT — 15 min TTL
// ---------------------------------------------------------------------------
export function generatePassportJWT(agentId: string, passportNumber: string, keyId: string, secret: string): string {
  const header = { alg: 'HS256', typ: 'JWT', kid: keyId }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    sub: agentId, pn: passportNumber,
    iat: now, exp: now + PASSPORT_TTL,
    jti: randomBytes(8).toString('hex'),
  }
  return signJWT(header, payload, secret)
}

export function verifyPassportJWT(token: string, secret: string): Record<string, unknown> {
  return verifyJWT(token, secret)
}

// ---------------------------------------------------------------------------
// Gateway ticket JWT — 30 sec TTL
// ---------------------------------------------------------------------------
let ENGINE_SECRET: string | null = null

export function getEngineSecret(): string {
  if (!ENGINE_SECRET) {
    ENGINE_SECRET = process.env.ENGINE_SECRET || null
    if (!ENGINE_SECRET) {
      throw new Error('ENGINE_SECRET environment variable is required')
    }
  }
  return ENGINE_SECRET
}

export function setEngineSecret(newSecret: string): void {
  ENGINE_SECRET = newSecret
}

export function generateGatewayTicket(intentId: string, agentId: string, tool: string, parameters: Record<string, unknown>): string {
  const header = { alg: 'HS256', typ: 'GATEWAY_TICKET' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iid: intentId, aid: agentId, tool,
    params: JSON.stringify(parameters),
    iat: now, exp: now + TICKET_TTL,
    jti: randomBytes(8).toString('hex'),
  }
  return signJWT(header, payload, getEngineSecret())
}

export function verifyGatewayTicket(token: string): { iid: string; aid: string; tool: string; params: Record<string, unknown> } {
  const payload = verifyJWT(token, getEngineSecret())
  payload.params = JSON.parse(payload.params as string)
  return payload as any
}

// ---------------------------------------------------------------------------
// System prompt hash
// ---------------------------------------------------------------------------
export function hashSystemPrompt(prompt: string): string {
  return `sha256:${createHash('sha256').update(prompt).digest('hex')}`
}

// ---------------------------------------------------------------------------
// JWT primitives
// ---------------------------------------------------------------------------
function signJWT(header: Record<string, unknown>, payload: Record<string, unknown>, secret: string): string {
  const hB64 = Buffer.from(JSON.stringify(header)).toString('base64url')
  const pB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', secret).update(`${hB64}.${pB64}`).digest('base64url')
  return `${hB64}.${pB64}.${sig}`
}

function verifyJWT(token: string, secret: string): Record<string, unknown> {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('invalid_token_format')
  const expectedSig = createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest('base64url')
  if (!timingSafeEqual(Buffer.from(expectedSig), Buffer.from(parts[2]))) {
    throw new Error('invalid_signature')
  }
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'))
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('token_expired')
  }
  return payload
}

export const TICKET_TTL_SECONDS = TICKET_TTL

// ---------------------------------------------------------------------------
// Webhook secret encryption — AES-256-GCM
// ---------------------------------------------------------------------------
const WEBHOOK_KEY = process.env.WEBHOOK_ENCRYPTION_KEY || process.env.JWT_SECRET || ''
if (!WEBHOOK_KEY) throw new Error('JWT_SECRET or WEBHOOK_ENCRYPTION_KEY environment variable is required')

const WEBHOOK_MASTER_KEY = scryptSync(WEBHOOK_KEY, 'webhook_salt', 32)

export function encryptWebhookSecret(plaintext: string): { ciphertext: string; iv: string; tag: string } {
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-gcm', WEBHOOK_MASTER_KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  }
}

export function decryptWebhookSecret(ciphertext: string, iv: string, tag: string): string {
  const decipher = createDecipheriv('aes-256-gcm', WEBHOOK_MASTER_KEY, Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(tag, 'base64'))
  const decrypted = Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()])
  return decrypted.toString('utf8')
}
