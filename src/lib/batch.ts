import type { Firestore } from 'firebase-admin/firestore'
import { log } from './logger.js'

const BATCH_SIZE = 500

export async function batchWrite(
  db: Firestore,
  collection: string,
  documents: Array<{ id: string; data: Record<string, unknown> }>,
): Promise<number> {
  let written = 0
  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = db.batch()
    const chunk = documents.slice(i, i + BATCH_SIZE)
    for (const doc of chunk) {
      batch.set(db.collection(collection).doc(doc.id), doc.data as any)
    }
    await batch.commit()
    written += chunk.length
    log.info('batchWrite committed', { collection, count: chunk.length })
  }
  return written
}

export async function batchDelete(
  db: Firestore,
  collection: string,
  ids: string[],
): Promise<number> {
  let deleted = 0
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = db.batch()
    const chunk = ids.slice(i, i + BATCH_SIZE)
    for (const id of chunk) {
      batch.delete(db.collection(collection).doc(id))
    }
    await batch.commit()
    deleted += chunk.length
    log.info('batchDelete committed', { collection, count: chunk.length })
  }
  return deleted
}

export async function batchUpdate(
  db: Firestore,
  collection: string,
  updates: Array<{ id: string; data: Record<string, unknown> }>,
): Promise<number> {
  let updated = 0
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = db.batch()
    const chunk = updates.slice(i, i + BATCH_SIZE)
    for (const update of chunk) {
      batch.update(db.collection(collection).doc(update.id), update.data as any)
    }
    await batch.commit()
    updated += chunk.length
    log.info('batchUpdate committed', { collection, count: chunk.length })
  }
  return updated
}

// ---------------------------------------------------------------------------
// Audit queue — high-volume batching for actionIntents
// ---------------------------------------------------------------------------

let auditQueue: Array<{ id: string; data: Record<string, unknown> }> = []
let auditFlushTimer: NodeJS.Timeout | null = null
const AUDIT_FLUSH_INTERVAL_MS = 5000
const AUDIT_FLUSH_SIZE = 100

export function queueAuditEntry(
  db: Firestore,
  entry: { id: string; data: Record<string, unknown> },
) {
  auditQueue.push(entry)
  if (auditQueue.length >= AUDIT_FLUSH_SIZE) {
    flushAuditQueue(db).catch((e) => log.error('audit flush failed', { error: e.message }))
  } else if (!auditFlushTimer) {
    auditFlushTimer = setTimeout(() => {
      flushAuditQueue(db).catch((e) => log.error('audit flush failed', { error: e.message }))
      auditFlushTimer = null
    }, AUDIT_FLUSH_INTERVAL_MS)
  }
}

export async function flushAuditQueue(db: Firestore): Promise<number> {
  if (auditFlushTimer) {
    clearTimeout(auditFlushTimer)
    auditFlushTimer = null
  }
  const entries = auditQueue.splice(0, auditQueue.length)
  if (entries.length === 0) return 0
  return batchWrite(db, 'actionIntents', entries)
}
