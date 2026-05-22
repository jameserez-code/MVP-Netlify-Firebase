// Firestore query optimizer — adds safe defaults and slow-query logging
import type { Query } from 'firebase-admin/firestore'
import { log } from './logger.js'

export interface QueryOptimizeOptions {
  /** Default 50 */
  limit?: number
  /** Default { field: 'createdAt', direction: 'desc' } */
  orderBy?: { field: string; direction: 'asc' | 'desc' }
  /** Slow-query threshold in ms. Default 500 */
  slowMs?: number
}

/**
 * Wrap a Firestore query with safe defaults:
 * - applies .limit() (default 50)
 * - applies .orderBy() for consistent sorting
 * - logs slow queries after execution
 *
 * Usage:
 *   const snap = await optimizeQuery(db.collection('agents').where('orgId', '==', orgId))
 *     .orderBy('createdAt', 'desc')
 *     .limit(50)
 *     .get()
 *
 * Composite index hints (add to FIRESTORE_INDEXES.md):
 *   Collection: agents
 *     - orgId Ascending, createdAt Descending
 *     - orgId Ascending, status Ascending, createdAt Descending
 *   Collection: policies
 *     - orgId Ascending, createdAt Descending
 *   Collection: actionIntents
 *     - orgId Ascending, createdAt Descending
 *     - orgId Ascending, decision Ascending, createdAt Descending
 *   Collection: tasks
 *     - orgId Ascending, status Ascending, createdAt Descending
 */
export function optimizeQuery<T = any>(
  query: Query<T>,
  options: QueryOptimizeOptions = {},
): Query<T> {
  const limitValue = options.limit ?? 50
  const orderField = options.orderBy?.field ?? 'createdAt'
  const orderDir = options.orderBy?.direction ?? 'desc'

  // Apply orderBy first, then limit (Firestore ordering constraint)
  let q = query.orderBy(orderField, orderDir)
  q = q.limit(Math.max(1, Math.min(500, limitValue)))
  return q
}

export interface QueryPerformanceMetrics {
  collection?: string
  durationMs: number
  docsReturned: number
  docsScanned: number
  limit: number
  orderBy: string
  direction: string
  filters?: string[]
}

export function attachQueryMetrics(request: any, metrics: QueryPerformanceMetrics) {
  if (!request) return
  if (!request._queryMetrics) request._queryMetrics = []
  request._queryMetrics.push(metrics)
}

/**
 * Execute an optimized query and log slow ones.
 * Returns the snapshot + duration metadata.
 */
export async function executeOptimizedQuery<T = any>(
  query: Query<T>,
  options: QueryOptimizeOptions = {},
  requestContext?: { request: any; collectionName: string },
): Promise<{ snap: FirebaseFirestore.QuerySnapshot<T>; durationMs: number }> {
  const start = Date.now()
  const q = optimizeQuery(query, options)
  const snap = await q.get()
  const durationMs = Date.now() - start

  if (durationMs > (options.slowMs ?? 500)) {
    log.warn('slow query detected', {
      durationMs,
      limit: options.limit ?? 50,
      orderBy: options.orderBy?.field ?? 'createdAt',
      direction: options.orderBy?.direction ?? 'desc',
      docsReturned: snap.size,
    })
  }

  if (requestContext) {
    attachQueryMetrics(requestContext.request, {
      collection: requestContext.collectionName,
      durationMs,
      docsReturned: snap.size,
      docsScanned: snap.size,
      limit: options.limit ?? 50,
      orderBy: options.orderBy?.field ?? 'createdAt',
      direction: options.orderBy?.direction ?? 'desc',
    })
  }

  return { snap, durationMs }
}
