import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { log } from './logger.js'

export interface OrgClaims {
  sub: string
  role: string
  orgId?: string
  scopes?: string[]
  iat: number
  exp: number
  jti: string
}

/**
 * Enforce org isolation by extracting orgId from JWT claims.
 * Adds `request.orgId` to the request object.
 * Rejects with 401 if orgId is missing from JWT (for authenticated requests).
 * Should be applied AFTER auth middleware so that `request.claims` is available.
 */
export async function enforceOrgIsolation(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const claims = (request as any).claims as OrgClaims | undefined

  // If no claims, this is an unauthenticated request. Let auth middleware handle it.
  if (!claims) {
    return
  }

  // API keys: orgId comes from the key document (already set in claims by requireAuth)
  // JWT users: orgId must be present in the token
  const orgId = claims.orgId

  if (!orgId) {
    log.warn('org isolation rejected: missing orgId in claims', { sub: claims.sub })
    reply.code(401).send({
      error: {
        code: 'unauthorized',
        message: 'Organization context missing. Please re-authenticate or contact support.',
      },
    })
    return
  }

  ;(request as any).orgId = orgId
}

/**
 * Fastify plugin to register org isolation as an onRequest hook.
 * This ensures every route handler can access `request.orgId` after auth.
 */
export function registerOrgIsolation(app: FastifyInstance) {
  app.addHook('onRequest', async (request, reply) => {
    await enforceOrgIsolation(request, reply)
  })
}

/**
 * Helper to get orgId from request safely.
 */
export function getRequestOrgId(request: FastifyRequest): string | undefined {
  return (request as any).orgId as string | undefined
}
