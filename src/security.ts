// Security hardening — enhanced auth, org isolation, replay protection
import type { FastifyInstance } from 'fastify'
import type { Firestore } from 'firebase-admin/firestore'
import { verify } from './lib/jwt.js'
import { log } from './lib/logger.js'

// ---------------------------------------------------------------------------
// Enhanced auth middleware with org isolation
// ---------------------------------------------------------------------------
export function hardenAuth(server: FastifyInstance, db: Firestore) {
  // Override the requireAuth pattern with org-aware version
  // This is called by every protected endpoint

  // Add security-focused test endpoints
  server.get('/security/ping', async (request, reply) => {
    // Returns auth status + org context
    const header = (request.headers.authorization || '') as string
    const token = header.startsWith('Bearer ') ? header.substring(7) : null

    if (!token) { reply.code(401); return { error: { code: 'unauthorized' } } }

    const claims = await verify(token)
    if (!claims) { reply.code(401); return { error: { code: 'invalid_token' } } }

    // Verify org still exists
    const orgSnap = await db.collection('organizations').where('ownerId', '==', claims.sub).limit(1).get()

    return {
      authenticated: true,
      userId: claims.sub,
      role: claims.role,
      org: orgSnap.empty ? null : { id: orgSnap.docs[0].id, ...orgSnap.docs[0].data() },
      expiresAt: new Date(claims.exp * 1000).toISOString(),
    }
  })
}

// ---------------------------------------------------------------------------
// Org isolation helper — ensures queries are scoped to orgId
// ---------------------------------------------------------------------------
export function requireOrgScope(db: Firestore, orgId: string) {
  return {
    tasks: () => db.collection('tasks').where('orgId', '==', orgId),
    runs: () => db.collection('runs').where('orgId', '==', orgId),
    agents: () => db.collection('agents').where('orgId', '==', orgId),
    policies: () => db.collection('policies').where('orgId', '==', orgId),
  }
}

// ---------------------------------------------------------------------------
// Replay protection helper — adds idempotency key to sensitive writes
// ---------------------------------------------------------------------------
export async function withIdempotencyKey(
  db: Firestore,
  key: string,
  ttlSeconds: number,
  fn: () => Promise<any>,
): Promise<any> {
  const ref = db.collection('idempotencyKeys').doc(key)

  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref)
      if (snap.exists) {
        // Return cached result if within TTL
        const data = snap.data()
        if (data?.expiresAt > new Date().toISOString()) {
          return { duplicated: true, originalResult: data?.result }
        }
      }
      const result = await fn()
      tx.set(ref, {
        key, result,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
      })
      return result
    })
  } catch (e: any) {
    log.error('idempotency failed', { key, error: e.message })
    throw e
  }
}
