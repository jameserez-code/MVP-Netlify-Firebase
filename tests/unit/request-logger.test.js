import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequestLoggerHooks } from '../../dist/lib/request-logger.js'
import { resetMetrics, getMetrics } from '../../dist/lib/metrics.js'

function captureConsole(method) {
  const original = console[method]
  const outputs = []
  console[method] = (...args) => outputs.push(args.join(' '))
  return {
    outputs,
    restore: () => { console[method] = original },
  }
}

function makeRequest(overrides = {}) {
  return {
    method: 'GET',
    url: '/api/test',
    routerPath: '/api/test',
    headers: { 'user-agent': 'test-agent' },
    ip: '127.0.0.1',
    query: {},
    ...overrides,
  }
}

function makeReply(overrides = {}) {
  return {
    statusCode: 200,
    correlationId: null,
    ...overrides,
  }
}

test.beforeEach(() => {
  resetMetrics()
})

test('onRequest hook generates correlation ID', async () => {
  const hooks = createRequestLoggerHooks()
  const request = makeRequest()
  const reply = makeReply()

  await hooks.onRequest(request, reply)

  assert.ok(request.correlationId, 'correlationId should be set on request')
  assert.match(request.correlationId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  assert.ok(request.startTime, 'startTime should be set on request')
  assert.ok(typeof request.startTime === 'number')
})

test('correlation ID is unique per request', async () => {
  const hooks = createRequestLoggerHooks()
  const r1 = makeRequest()
  const r2 = makeRequest()
  const reply1 = makeReply()
  const reply2 = makeReply()

  await hooks.onRequest(r1, reply1)
  await hooks.onRequest(r2, reply2)

  assert.notEqual(r1.correlationId, r2.correlationId)
})

test('onRequest logs method and path', async () => {
  const cap = captureConsole('log')
  const hooks = createRequestLoggerHooks()
  const request = makeRequest({ method: 'POST', url: '/api/agents', routerPath: '/api/agents' })
  const reply = makeReply()

  await hooks.onRequest(request, reply)

  cap.restore()
  const output = cap.outputs.join(' ')
  assert.ok(output.includes('request start'), 'should log request start')
  assert.ok(output.includes('POST'), 'should include method')
  assert.ok(output.includes('/api/agents'), 'should include path')
})

test('onRequest adds correlation ID to reply', async () => {
  const hooks = createRequestLoggerHooks()
  const request = makeRequest()
  const reply = makeReply()

  await hooks.onRequest(request, reply)

  assert.equal(reply.correlationId, request.correlationId)
  assert.ok(reply.correlationId, 'reply should have correlationId')
})

test('onResponse hook logs status code and duration for 200', async () => {
  const hooks = createRequestLoggerHooks()
  const request = makeRequest()
  const reply = makeReply({ statusCode: 200 })

  await hooks.onRequest(request, reply)
  const cap = captureConsole('log')
  await hooks.onResponse(request, reply)
  cap.restore()

  const output = cap.outputs.join(' ')
  assert.ok(output.includes('request complete'), 'should log completion for 200')
  assert.ok(output.includes('200') || output.includes('"statusCode":200'), 'should include status code')
})

test('onResponse logs error for 4xx status codes', async () => {
  const hooks = createRequestLoggerHooks()
  const request = makeRequest()
  const reply = makeReply({ statusCode: 400 })

  await hooks.onRequest(request, reply)
  const cap = captureConsole('error')
  await hooks.onResponse(request, reply)
  cap.restore()

  const output = cap.outputs.join(' ')
  assert.ok(output.includes('request error'), 'should log error for 400')
})

test('onResponse logs error for 5xx and records error metric', async () => {
  const hooks = createRequestLoggerHooks()
  const request = makeRequest()
  const reply = makeReply({ statusCode: 500 })

  await hooks.onRequest(request, reply)
  const cap = captureConsole('error')
  await hooks.onResponse(request, reply)
  cap.restore()

  const output = cap.outputs.join(' ')
  assert.ok(output.includes('request error'), 'should log error for 500')

  // Verify metrics: at least 1 error and 1 request recorded
  const metrics = getMetrics()
  assert.ok(metrics.requestsTotal >= 1, 'should record at least 1 request')
  assert.ok(metrics.errorCount >= 1, 'should record at least 1 error')
})

test('metrics are recorded on each response', async () => {
  const hooks = createRequestLoggerHooks()

  for (let i = 0; i < 3; i++) {
    const request = makeRequest()
    const reply = makeReply({ statusCode: 200 })
    await hooks.onRequest(request, reply)
    await hooks.onResponse(request, reply)
  }

  const metrics = getMetrics()
  assert.equal(metrics.requestsTotal, 3)
})

test('onResponse includes duration in log output', async () => {
  const hooks = createRequestLoggerHooks()
  const request = makeRequest()
  const reply = makeReply({ statusCode: 200 })

  await hooks.onRequest(request, reply)
  const cap = captureConsole('log')
  await hooks.onResponse(request, reply)
  cap.restore()

  const output = cap.outputs.join(' ')
  assert.ok(output.includes('duration_ms') || output.includes('responseTimeMs'), 'should include duration')
})

test('onRequest extracts client IP from headers', async () => {
  const hooks = createRequestLoggerHooks()
  const request = makeRequest({
    headers: {
      'x-forwarded-for': '10.0.0.1, 10.0.0.2',
      'user-agent': 'test',
    },
  })
  const reply = makeReply()

  const cap = captureConsole('log')
  await hooks.onRequest(request, reply)
  cap.restore()

  const output = cap.outputs.join(' ')
  assert.ok(output.includes('10.0.0.1'), 'should use first IP from x-forwarded-for')
})

test('onRequest uses request.ip when no x-forwarded-for header', async () => {
  const hooks = createRequestLoggerHooks()
  const request = makeRequest({ ip: '192.168.1.1' })
  const reply = makeReply()

  const cap = captureConsole('log')
  await hooks.onRequest(request, reply)
  cap.restore()

  const output = cap.outputs.join(' ')
  assert.ok(output.includes('192.168.1.1'), 'should use request.ip')
})

test('onResponse records correct status in metrics', async () => {
  resetMetrics()
  const hooks = createRequestLoggerHooks()

  const r200 = makeRequest()
  const r404 = makeRequest()
  const reply200 = makeReply({ statusCode: 200 })
  const reply404 = makeReply({ statusCode: 404 })

  await hooks.onRequest(r200, reply200)
  await hooks.onResponse(r200, reply200)

  await hooks.onRequest(r404, reply404)
  await hooks.onResponse(r404, reply404)

  const metrics = getMetrics()
  assert.ok(metrics.statusBreakdown['200'] >= 1, 'should have 200 in breakdown')
  assert.ok(metrics.statusBreakdown['404'] >= 1, 'should have 404 in breakdown')
})
