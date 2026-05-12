import { createHmac, randomBytes } from 'crypto'

const JWT_SECRET_HEX = process.env.JWT_SECRET || randomBytes(32).toString('hex')
const JWT_SECRET = Buffer.from(JWT_SECRET_HEX, 'hex')
const TTL = 3600 // 1 hour

interface Claims {
  sub: string   // userId
  role: string  // org_admin | agent
  iat: number
  exp: number
  jti: string
}

export function sign(payload: Pick<Claims, 'sub' | 'role'>): string {
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
  const sig = createHmac('sha256', JWT_SECRET).update(sigInput).digest('base64url')

  return `${sigInput}.${sig}`
}

export function verify(token: string): Claims | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const sigInput = `${parts[0]}.${parts[1]}`
    const expectedSig = createHmac('sha256', JWT_SECRET).update(sigInput).digest('base64url')
    if (!timingSafeEqual(parts[2], expectedSig)) return null

    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'))
    const now = Math.floor(Date.now() / 1000)
    if (claims.exp < now) return null

    return claims
  } catch {
    return null
  }
}

export function getSecret(): string {
  return JWT_SECRET_HEX
}

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return createHmac('sha256', bufA).update(bufB).digest().equals(createHmac('sha256', bufB).update(bufA).digest())
}
