import type { Firestore } from 'firebase-admin/firestore'
import { log } from './logger.js'
import { batchDelete, batchUpdate } from './batch.js'

const RETENTION_AUDIT_DAYS = parseInt(process.env.RETENTION_AUDIT_DAYS || '90', 10)
const RETENTION_DEMO_SESSIONS_HOURS = parseInt(process.env.RETENTION_DEMO_SESSIONS_HOURS || '24', 10)
const RETENTION_PASSWORD_RESET_HOURS = parseInt(process.env.RETENTION_PASSWORD_RESET_HOURS || '1', 10)
const RETENTION_VERIFICATION_HOURS = parseInt(process.env.RETENTION_VERIFICATION_HOURS || '24', 10)

/**
 * Enforce data retention policies:
 * - Audit logs older than 90 days
 * - Demo sessions older than 24 hours
 * - Expired password reset tokens
 * - Expired verification tokens
 *
 * Run daily via cron or background worker.
 */
export async function enforceRetention(db: Firestore) {
  const results = {
    auditDeleted: 0,
    demoSessionsDeleted: 0,
    passwordResetsCleared: 0,
    verificationTokensCleared: 0,
  }

  // 1. Audit logs older than retention period
  const auditCutoff = new Date(
    Date.now() - RETENTION_AUDIT_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString()
  const auditSnap = await db
    .collection('actionIntents')
    .where('createdAt', '<', auditCutoff)
    .select()
    .limit(500)
    .get()
  if (!auditSnap.empty) {
    const ids = auditSnap.docs.map((d) => d.id)
    results.auditDeleted = await batchDelete(db, 'actionIntents', ids)
    log.info('retention: deleted old audit logs', {
      count: results.auditDeleted,
      cutoff: auditCutoff,
    })
  }

  // 2. Demo sessions older than 24 hours
  const sessionCutoff = new Date(
    Date.now() - RETENTION_DEMO_SESSIONS_HOURS * 60 * 60 * 1000,
  ).toISOString()
  const sessionSnap = await db
    .collection('sessions')
    .where('startedAt', '<', sessionCutoff)
    .select()
    .limit(500)
    .get()
  if (!sessionSnap.empty) {
    const ids = sessionSnap.docs.map((d) => d.id)
    results.demoSessionsDeleted = await batchDelete(db, 'sessions', ids)
    log.info('retention: deleted old demo sessions', {
      count: results.demoSessionsDeleted,
      cutoff: sessionCutoff,
    })
  }

  // 3. Expired password reset tokens
  const now = new Date().toISOString()
  const resetSnap = await db
    .collection('users')
    .where('passwordResetExpires', '<', now)
    .select()
    .limit(500)
    .get()
  if (!resetSnap.empty) {
    const batch = db.batch()
    for (const doc of resetSnap.docs) {
      batch.update(doc.ref, { passwordResetToken: null, passwordResetExpires: null })
    }
    await batch.commit()
    results.passwordResetsCleared = resetSnap.size
    log.info('retention: cleared expired password reset tokens', {
      count: results.passwordResetsCleared,
    })
  }

  // 4. Expired verification tokens (unverified users older than threshold)
  const verifyCutoff = new Date(
    Date.now() - RETENTION_VERIFICATION_HOURS * 60 * 60 * 1000,
  ).toISOString()
  const verifySnap = await db
    .collection('users')
    .where('verified', '==', false)
    .where('createdAt', '<', verifyCutoff)
    .select()
    .limit(500)
    .get()
  if (!verifySnap.empty) {
    const batch = db.batch()
    for (const doc of verifySnap.docs) {
      batch.update(doc.ref, { verificationToken: null })
    }
    await batch.commit()
    results.verificationTokensCleared = verifySnap.size
    log.info('retention: cleared expired verification tokens', {
      count: results.verificationTokensCleared,
    })
  }

  log.success('retention enforcement complete', { results })
  return results
}
