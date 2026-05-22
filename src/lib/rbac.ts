import type { FastifyRequest, FastifyReply } from 'fastify'
import { log } from './logger.js'

export type OrgRole = 'org_admin' | 'org_member' | 'readonly'

const ROLE_HIERARCHY: Record<OrgRole, number> = {
  org_admin: 3,
  org_member: 2,
  readonly: 1,
}

/**
 * Check if a user's role meets the minimum required role level.
 */
function hasMinimumRole(userRole: string, minimumRole: OrgRole): boolean {
  const userLevel = ROLE_HIERARCHY[userRole as OrgRole] || 0
  const requiredLevel = ROLE_HIERARCHY[minimumRole] || 999
  return userLevel >= requiredLevel
}

/**
 * Returns a preHandler middleware that requires the user to have one of the allowed roles.
 * Roles are hierarchical: org_admin > org_member > readonly.
 * If `allowApiKey` is true, requests authenticated via API key (role === 'api_key') are permitted.
 */
export function requireRole(allowedRoles: OrgRole[], options?: { allowApiKey?: boolean }) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const claims = (request as any).claims as { role?: string; sub?: string } | undefined

    if (!claims) {
      reply.code(401).send({
        error: { code: 'unauthorized', message: 'Authentication required' },
      })
      return
    }

    const userRole = claims.role || 'readonly'

    // API keys bypass role checks if allowed
    if (userRole === 'api_key' && options?.allowApiKey !== false) {
      return
    }

    // Check if user's role is explicitly allowed or meets minimum hierarchy
    const permitted = allowedRoles.some((role) => {
      if (userRole === role) return true
      return hasMinimumRole(userRole, role)
    })

    if (!permitted) {
      log.warn('rbac denied', {
        sub: claims.sub,
        role: userRole,
        required: allowedRoles.join(','),
        path: request.url,
      })
      reply.code(403).send({
        error: {
          code: 'forbidden',
          message: `This action requires one of the following roles: ${allowedRoles.join(', ')}. Your current role is '${userRole}'.`,
        },
      })
      return
    }
  }
}

/**
 * Shorthand middleware helpers for common role patterns.
 */
export const requireAdmin = requireRole(['org_admin'])
export const requireMember = requireRole(['org_member'])
export const requireReadonly = requireRole(['readonly'])
