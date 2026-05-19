import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

let JWT_SECRET_HEX: string | null = null
let JWT_SECRET: Buffer | null = null
const TTL = 3600 // 1 hour

function ensureSecret(): Buffer {
  if (!JWT_SECRET) {
    JWT_SECRET_HEX = process.env.JWT_SECRET || ''
    if (!JWT_SECRET_HEX) {
      throw new Error('JWT_SECRET environment variable is required')
    }
    JWT_SECRET = Buffer.from(JWT_SECRET_HEX, 'hex')
  }
  return JWT_SECRET
}

interface Claims {
  sub: string   // userId
  role: string  // org_admin | agent
  iat: number
  exp: number
  jti: string
}

export function sign(payload: Pick<Claims, 'sub' | 'role'>): string {
  const secret = ensureSecret()
  const now = Math.floor(Date.now() / 1000)
  const claims: Claims = {
    ...payload,
    iat: now,
    exp: now + TTL,
    jti: randomBytes(8).toString('hex'),
  }

  const header = { alg: 'HS256', typ: 'JWT' }
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url')
  const payloadB64 = Buffer.from(JSON.stringify(claims)).toString('base64url')
  const sigInput = `${headerB64}.${payloadB64}`
  const sig = createHmac('sha256', secret).update(sigInput).digest('base64url')

  return `${sigInput}.${sig}`
}

export function verify(token: string): Claims | null {
  try {
    const secret = ensureSecret()
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const sigInput = `${parts[0]}.${parts[1]}`
    const expectedSig = createHmac('sha256', secret).update(sigInput).digest('base64url')
    const sigBuf = Buffer.from(parts[2])
    const expectedBuf = Buffer.from(expectedSig)
    if (sigBuf.length !== expectedBuf.length) return null
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null

    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'))
    const now = Math.floor(Date.now() / 1000)
    if (claims.exp < now) return null

    return claims
  } catch {
    return null
  }
}

export function getSecret(): string {
  ensureSecret()
  return JWT_SECRET_HEX!
}
