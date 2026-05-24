import test from 'node:test'
import assert from 'node:assert/strict'
import { AppError, sanitizeErrorForProduction } from '../../dist/lib/errors.js'

test('AppError sets code and message', () => {
  const err = new AppError('VALIDATION_ERROR', 'Invalid input', 400)
  assert.equal(err.code, 'VALIDATION_ERROR')
  assert.equal(err.message, 'Invalid input')
  assert.equal(err.statusCode, 400)
})

test('AppError defaults to statusCode 500', () => {
  const err = new AppError('UNKNOWN', 'Something went wrong')
  assert.equal(err.statusCode, 500)
})

test('AppError stores detail object', () => {
  const err = new AppError('DETAIL_ERR', 'With detail', 422, { field: 'email', reason: 'invalid format' })
  assert.deepEqual(err.detail, { field: 'email', reason: 'invalid format' })
})

test('AppError is instance of Error', () => {
  const err = new AppError('TEST', 'msg')
  assert.ok(err instanceof Error)
})

test('AppError with statusCode 400 (ValidationError equivalent)', () => {
  const err = new AppError('VALIDATION_ERROR', 'Invalid request body', 400)
  assert.equal(err.statusCode, 400)
})

test('AppError with statusCode 401 (AuthError equivalent)', () => {
  const err = new AppError('UNAUTHORIZED', 'Invalid credentials', 401)
  assert.equal(err.statusCode, 401)
})

test('AppError with statusCode 403 (ForbiddenError equivalent)', () => {
  const err = new AppError('FORBIDDEN', 'Access denied', 403)
  assert.equal(err.statusCode, 403)
})

test('AppError with statusCode 404 (NotFoundError equivalent)', () => {
  const err = new AppError('NOT_FOUND', 'Resource not found', 404)
  assert.equal(err.statusCode, 404)
})

test('sanitizeErrorForProduction removes stack traces and detail', () => {
  const err = new AppError('INTERNAL', 'Database connection failed', 500, { host: 'db.internal' })
  err.stack = 'Error: Database connection failed\n  at Object.<anonymous> (/app/server.js:42:13)'
  const sanitized = sanitizeErrorForProduction(err)
  assert.equal(sanitized.code, 'INTERNAL')
  assert.equal(sanitized.message, 'An internal error occurred')
  assert.equal(sanitized.stack, undefined)
  assert.equal(sanitized.detail, undefined)
})

test('sanitizeErrorForProduction handles plain Error objects', () => {
  const err = new Error('Something crashed')
  err.stack = 'Error: Something crashed\n  at foo (/app/server.js:10:5)'
  const sanitized = sanitizeErrorForProduction(err)
  assert.equal(sanitized.code, 'internal_error')
  assert.equal(sanitized.message, 'An internal error occurred')
  assert.equal(sanitized.stack, undefined)
})

test('sanitizeErrorForProduction handles objects without stack', () => {
  const err = { code: 'CUSTOM_ERR', message: 'Custom' }
  const sanitized = sanitizeErrorForProduction(err)
  assert.equal(sanitized.code, 'CUSTOM_ERR')
  assert.equal(sanitized.message, 'An internal error occurred')
})

test('sanitizeErrorForProduction throws on null/undefined (unsafe input)', () => {
  assert.throws(() => sanitizeErrorForProduction(null), /Cannot read propert/)
  assert.throws(() => sanitizeErrorForProduction(undefined), /Cannot read propert/)
})
