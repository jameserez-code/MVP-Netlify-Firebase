import test from 'node:test'
import assert from 'node:assert/strict'
import { parsePaginationQuery, paginate } from '../../dist/lib/pagination.js'

test('parsePaginationQuery returns defaults for empty query', () => {
  const opts = parsePaginationQuery({})
  assert.equal(opts.page, 1)
  assert.equal(opts.limit, 50)
  assert.deepEqual(opts.filters, {})
  assert.equal(opts.sort, 'createdAt')
  assert.equal(opts.order, 'desc')
})

test('parsePaginationQuery parses custom page and limit', () => {
  const opts = parsePaginationQuery({ page: '3', limit: '10' })
  assert.equal(opts.page, 3)
  assert.equal(opts.limit, 10)
})

test('parsePaginationQuery parses sort and order', () => {
  const opts = parsePaginationQuery({ sort: 'name', order: 'asc' })
  assert.equal(opts.sort, 'name')
  assert.equal(opts.order, 'asc')
})

test('parsePaginationQuery handles invalid numeric values gracefully', () => {
  const opts = parsePaginationQuery({ page: 'notanumber', limit: 'alsoNaN' })
  assert.ok(Number.isNaN(opts.page))
  assert.ok(Number.isNaN(opts.limit))
})

test('parsePaginationQuery extracts filters', () => {
  const opts = parsePaginationQuery({ filters: { status: 'active', orgId: 'org_1' } })
  assert.deepEqual(opts.filters, { status: 'active', orgId: 'org_1' })
})

test('paginate returns data slice and pagination info', () => {
  const data = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, name: `item ${i + 1}` }))
  const result = paginate(data, { page: 1, limit: 10 })
  assert.equal(result.data.length, 10)
  assert.equal(result.data[0].id, 1)
  assert.equal(result.data[9].id, 10)
  assert.equal(result.pagination.page, 1)
  assert.equal(result.pagination.limit, 10)
  assert.equal(result.pagination.total, 100)
  assert.equal(result.pagination.totalPages, 10)
})

test('paginate handles second page', () => {
  const data = Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }))
  const result = paginate(data, { page: 2, limit: 10 })
  assert.equal(result.data.length, 10)
  assert.equal(result.data[0].id, 11)
  assert.equal(result.data[9].id, 20)
})

test('paginate returns empty array for out-of-range page', () => {
  const data = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }))
  const result = paginate(data, { page: 10, limit: 5 })
  assert.equal(result.data.length, 0)
  assert.equal(result.pagination.totalPages, 2)
})

test('paginate totalPages is 0 for empty data', () => {
  const result = paginate([], { page: 1, limit: 50 })
  assert.equal(result.data.length, 0)
  assert.equal(result.pagination.total, 0)
  assert.equal(result.pagination.totalPages, 0)
})

test('paginate totalPages is 1 when data fits in 1 page', () => {
  const data = [{ id: 1 }, { id: 2 }, { id: 3 }]
  const result = paginate(data, { page: 1, limit: 50 })
  assert.equal(result.pagination.totalPages, 1)
  assert.equal(result.data.length, 3)
})

test('paginate totalPages with uneven division', () => {
  const data = Array.from({ length: 25 }, (_, i) => ({ id: i }))
  const result = paginate(data, { page: 1, limit: 10 })
  assert.equal(result.pagination.totalPages, 3)
})

test('paginate uses defaults when options are incomplete', () => {
  const data = Array.from({ length: 200 }, (_, i) => ({ id: i }))
  const result = paginate(data, {})
  assert.equal(result.pagination.page, 1)
  assert.equal(result.pagination.limit, 50)
  assert.equal(result.data.length, 50)
  assert.equal(result.pagination.totalPages, 4)
})

test('paginate page 0 is handled', () => {
  const data = [{ id: 1 }, { id: 2 }]
  const result = paginate(data, { page: 0, limit: 10 })
  assert.equal(result.data.length, 2)
})

test('paginate page less than 1 wraps around', () => {
  const data = [{ id: 1 }, { id: 2 }]
  const result = paginate(data, { page: -1, limit: 10 })
  assert.equal(result.data.length, 0)
})
