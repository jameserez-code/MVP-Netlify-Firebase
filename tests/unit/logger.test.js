import test from 'node:test'
import assert from 'node:assert/strict'

// NODE_ENV defaults to undefined, which means non-production (pretty format)
const { log } = await import('../../dist/lib/logger.js')

function captureConsole(method) {
  const original = console[method]
  const outputs = []
  console[method] = (...args) => outputs.push(args.join(' '))
  return {
    outputs,
    restore: () => { console[method] = original },
  }
}

test('log.info writes to console.log', () => {
  const cap = captureConsole('log')
  log.info('test info message')
  cap.restore()
  assert.ok(cap.outputs.length > 0)
  assert.ok(cap.outputs[0].includes('test info message'))
})

test('log.error writes to console.error', () => {
  const cap = captureConsole('error')
  log.error('test error message')
  cap.restore()
  assert.ok(cap.outputs.length > 0)
  assert.ok(cap.outputs[0].includes('test error message'))
})

test('log.warn writes to console.warn', () => {
  const cap = captureConsole('warn')
  log.warn('test warn message')
  cap.restore()
  assert.ok(cap.outputs.length > 0)
  assert.ok(cap.outputs[0].includes('test warn message'))
})

test('log.success writes to console.log', () => {
  const cap = captureConsole('log')
  log.success('test success message')
  cap.restore()
  assert.ok(cap.outputs.length > 0)
  assert.ok(cap.outputs[0].includes('test success message'))
})

test('log output includes correlation ID in context', () => {
  const cap = captureConsole('log')
  log.info('request processed', { correlationId: 'abc-123', duration: 50 })
  cap.restore()
  const output = cap.outputs[0]
  assert.ok(output.includes('correlationId'), 'context should be included in output')
  assert.ok(output.includes('abc-123'), 'correlation ID value should appear')
})

test('log levels use correct prefixes (pretty format)', () => {
  const cap = captureConsole('log')
  log.info('info test')
  cap.restore()
  assert.ok(cap.outputs[0].includes('•'), 'info level should have • prefix')
})

test('log.warn uses warn prefix', () => {
  const cap = captureConsole('warn')
  log.warn('warn test')
  cap.restore()
  assert.ok(cap.outputs[0].includes('⚠'), 'warn level should have ⚠ prefix')
})

test('log.error uses error prefix', () => {
  const cap = captureConsole('error')
  log.error('error test')
  cap.restore()
  assert.ok(cap.outputs[0].includes('✗'), 'error level should have ✗ prefix')
})

test('log.success uses success prefix', () => {
  const cap = captureConsole('log')
  log.success('success test')
  cap.restore()
  assert.ok(cap.outputs[0].includes('✓'), 'success level should have ✓ prefix')
})

test('log.info without context does not break', () => {
  const cap = captureConsole('log')
  log.info('simple message')
  cap.restore()
  assert.ok(cap.outputs.length > 0)
})

test('log output includes timestamp in pretty mode', () => {
  const cap = captureConsole('log')
  log.info('timestamp test')
  cap.restore()
  const output = cap.outputs[0]
  // Timestamp format: [YYYY-MM-DD HH:MM:SS]
  assert.ok(/\[\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\]/.test(output), 'should include timestamp')
})
