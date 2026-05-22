import type { Firestore, Query } from 'firebase-admin/firestore'
import { log } from './logger.js'

export interface ListQueryOptions {
  status?: string
  filterField?: string
  filterValue?: string | number | boolean
  startDate?: string
  endDate?: string
  limit?: string | number
  cursor?: unknown
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}

/**
 * Build an optimized Firestore list query with org isolation, optional status
 * or custom field filters, date ranges, cursor pagination, and safe defaults.
 */
export function buildListQuery(
  db: Firestore,
  collection: string,
  orgId: string,
  options: ListQueryOptions = {},
): Query {
  let query: Query = db.collection(collection).where('orgId', '==', orgId)

  if (options.status) {
    query = query.where('status', '==', options.status)
  }

  if (options.filterField && options.filterValue !== undefined) {
    query = query.where(options.filterField, '==', options.filterValue)
  }

  if (options.startDate && options.endDate) {
    query = query
      .where('createdAt', '>=', options.startDate)
      .where('createdAt', '<=', options.endDate)
  }

  query = query
    .orderBy(options.orderBy || 'createdAt', options.orderDirection || 'desc')
    .limit(parseInt(String(options.limit || '50'), 10))

  if (options.cursor) {
    query = query.startAfter(options.cursor)
  }

  return query
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
 * Execute a query built with `buildListQuery`, attach performance metrics to
 * the request object (for request-logger consumption), and log slow queries.
 */
export async function executeListQuery(
  query: Query,
  context: { request: any; collection: string; limit: number },
): Promise<FirebaseFirestore.QuerySnapshot> {
  const start = Date.now()
  const snap = await query.get()
  const durationMs = Date.now() - start

  attachQueryMetrics(context.request, {
    collection: context.collection,
    durationMs,
    docsReturned: snap.size,
    docsScanned: snap.size, // Firestore does not expose scanned count directly
    limit: context.limit,
    orderBy: 'createdAt',
    direction: 'desc',
  })

  if (durationMs > 500) {
    log.warn('slow list query detected', {
      collection: context.collection,
      durationMs,
      docsReturned: snap.size,
      limit: context.limit,
    })
  }

  return snap
}
