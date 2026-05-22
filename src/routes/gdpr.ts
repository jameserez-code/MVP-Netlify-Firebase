import type { FastifyInstance } from 'fastify'
import type { Firestore } from 'firebase-admin/firestore'
import { createRequire } from 'module'
import { log } from '../lib/logger.js'
import { cacheDeletePattern } from '../lib/cache.js'

const require = createRequire(import.meta.url)

function getOrgId(request: any): string {
  return request.orgId || process.env.DEFAULT_ORG_ID || 'default'
}

function getRequestOrgIdSafe(request: any): string {
  return request.orgId || process.env.DEFAULT_ORG_ID || 'default'
}

interface Claims {
  sub: string
  role: string
  orgId?: string
  scopes?: string[]
  iat: number
  exp: number
  jti: string
}

const COLLECTIONS_TO_EXPORT = [
  'users', 'agents', 'policies', 'actionIntents',
  'tasks', 'runs', 'logs', 'apiKeys', 'webhooks',
  'templates', 'sessions', 'gatewayTickets',
  'notificationSettings',
]

export default async function gdprRoutes(app: FastifyInstance, db: Firestore) {

  app.post('/gdpr/export', async (request, reply) => {
    try {
      const claims = (request as any).claims as Claims | undefined
      if (!claims) {
        reply.code(401)
        return { error: { code: 'unauthorized', message: 'authentication required' } }
      }
      const orgId = claims.orgId || process.env.DEFAULT_ORG_ID || 'default'

      const exportData: Record<string, any[]> = {}
      let totalDocs = 0

      const exportableCollections = [...COLLECTIONS_TO_EXPORT]

      if (db.collection('organizations')) {
        exportableCollections.push('organizations')
      }

      for (const col of exportableCollections) {
        try {
          const snap = await db
            .collection(col)
            .where('orgId', '==', orgId)
            .limit(20000)
            .get()

          const docs = snap.docs.map((d) => {
            const data = d.data() as any
            if (data.signingKey) {
              data.signingKey = {
                ...data.signingKey,
                secretHash: data.signingKey.secretHash ? '***REDACTED***' : undefined,
                secretSalt: data.signingKey.secretSalt ? '***REDACTED***' : undefined,
              }
            }
            if (data.passwordHash) data.passwordHash = '***REDACTED***'
            if (data.passwordSalt) data.passwordSalt = '***REDACTED***'
            if (data.keyHash) data.keyHash = '***REDACTED***'
            if (data.keySalt) data.keySalt = '***REDACTED***'
            if (data.verificationToken) data.verificationToken = '***REDACTED***'
            if (data.passwordResetToken) data.passwordResetToken = '***REDACTED***'
            return { id: d.id, ...data }
          })

          if (docs.length > 0) {
            exportData[col] = docs
            totalDocs += docs.length
          }
        } catch {
          // Skip collections that don't exist or can't be queried
        }
      }

      const response = {
        user: claims.sub,
        orgId,
        exportedAt: new Date().toISOString(),
        collections: Object.keys(exportData),
        totalDocuments: totalDocs,
        data: exportData,
      }

      log.success('gdpr export', { orgId, user: claims.sub, totalDocs })

      reply.header('Content-Type', 'application/json; charset=utf-8')
      reply.header('Content-Disposition', 'attachment; filename="gdpr-export.json"')
      return JSON.stringify(response, null, 2)
    } catch (e: any) {
      log.error('gdpr export failed', { error: e.message })
      reply.code(500)
      return { error: { code: 'gdpr_export_failed', message: e.message } }
    }
  })

  app.post('/gdpr/delete', async (request, reply) => {
    try {
      const claims = (request as any).claims as Claims | undefined
      if (!claims) {
        reply.code(401)
        return { error: { code: 'unauthorized', message: 'authentication required' } }
      }

      if (claims.role !== 'org_admin') {
        reply.code(403)
        return { error: { code: 'forbidden', message: 'Only org_admin can delete account data' } }
      }

      const { confirm } = (request.body || {}) as { confirm?: string }
      if (confirm !== 'DELETE') {
        reply.code(400)
        return {
          error: {
            code: 'validation',
            message: 'Confirmation required. Send { "confirm": "DELETE" } to proceed with permanent deletion.',
          },
        }
      }

      const orgId = claims.orgId || process.env.DEFAULT_ORG_ID || 'default'
      const now = new Date().toISOString()
      const hardDeleteDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      const deletionSummary: Record<string, number> = {}

      const collectionsToDelete = [
        ...COLLECTIONS_TO_EXPORT,
        'organizations',
      ]

      for (const col of collectionsToDelete) {
        try {
          const snap = await db
            .collection(col)
            .where('orgId', '==', orgId)
            .limit(20000)
            .get()

          const batch = db.batch()
          let count = 0

          for (const doc of snap.docs) {
            batch.update(doc.ref, {
              deleted: true,
              deletedAt: now,
              hardDeleteAt: hardDeleteDate,
              status: 'deleted',
            })
            count++
            if (count >= 500) break
          }

          if (count > 0) {
            await batch.commit()
            deletionSummary[col] = count
          }
        } catch {
          // Skip if collection can't be accessed
        }
      }

      cacheDeletePattern('cache:*').catch(() => {})
      log.warn('gdpr account deletion', {
        orgId,
        user: claims.sub,
        collections: deletionSummary,
        hardDeleteAt: hardDeleteDate,
      })

      return {
        message: 'Account data has been marked for deletion. Data will be permanently removed after 30 days.',
        deletedAt: now,
        hardDeleteAt: hardDeleteDate,
        summary: {
          collections: Object.keys(deletionSummary),
          totalDocumentsDeleted: Object.values(deletionSummary).reduce((sum, c) => sum + c, 0),
          details: deletionSummary,
        },
      }
    } catch (e: any) {
      log.error('gdpr delete failed', { error: e.message })
      reply.code(500)
      return { error: { code: 'gdpr_delete_failed', message: e.message } }
    }
  })
}
