import type { Firestore } from 'firebase-admin/firestore'
import type { Migration } from './runner.js'
import { log } from '../lib/logger.js'

/**
 * Migration 001: Initial Schema
 * - Ensures required collections exist by writing a schema marker doc
 * - Idempotent: safe to run multiple times
 */
const migration: Migration = {
  id: '001',
  name: 'initial-schema',
  up: async (db: Firestore) => {
    const collections = ['tasks', 'runs', 'agents', 'policies', 'logs', 'actionIntents', 'users', 'organizations', 'apiKeys', 'webhooks', 'gatewayTickets', '_migrations']
    const now = new Date().toISOString()

    for (const coll of collections) {
      const schemaRef = db.collection(coll).doc('_schema')
      const snap = await schemaRef.get()
      if (!snap.exists) {
        await schemaRef.set({
          collection: coll,
          createdAt: now,
          version: 1,
        })
        log.success('created schema marker', { collection: coll })
      } else {
        log.info('schema marker already exists', { collection: coll })
      }
    }

    // Ensure composite indexes are set up (Firestore auto-creates single-field indexes)
    // For composite indexes, we add a helper doc that the deploy script can check
    const indexRef = db.collection('_config').doc('indexes')
    const indexSnap = await indexRef.get()
    if (!indexSnap.exists) {
      await indexRef.set({
        requiredIndexes: [
          { collection: 'tasks', fields: ['status', 'createdAt'] },
          { collection: 'runs', fields: ['status', 'startedAt'] },
          { collection: 'runs', fields: ['taskId', 'status'] },
          { collection: 'logs', fields: ['runId', 'timestamp'] },
          { collection: 'logs', fields: ['tool', 'timestamp'] },
          { collection: 'actionIntents', fields: ['orgId', 'decision', 'createdAt'] },
          { collection: 'agents', fields: ['orgId', 'status'] },
          { collection: 'policies', fields: ['orgId', 'status'] },
        ],
        createdAt: now,
      })
    }
  },
  down: async (db: Firestore) => {
    // Remove schema markers
    const collections = ['tasks', 'runs', 'agents', 'policies', 'logs', 'actionIntents', 'users', 'organizations', 'apiKeys', 'webhooks', 'gatewayTickets', '_migrations']
    for (const coll of collections) {
      await db.collection(coll).doc('_schema').delete()
    }
    await db.collection('_config').doc('indexes').delete()
  },
}

export default migration
