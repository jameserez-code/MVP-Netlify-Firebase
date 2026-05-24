import test from 'node:test'
import assert from 'node:assert/strict'
import { checkWaf } from '../../dist/lib/waf.js'

function makeRequest(overrides = {}) {
  return {
    headers: {
      'user-agent': 'Mozilla/5.0 TestAgent',
      ...overrides.headers,
    },
    url: '/api/test',
    query: {},
    body: {},
    ip: '127.0.0.1',
    ...overrides,
  }
}

test('waf allows benign input', () => {
  const req = makeRequest({
    body: { name: 'John', email: 'john@example.com' }
  })
  const result = checkWaf(req)
  assert.equal(result.allowed, true)
  assert.equal(result.statusCode, 200)
})

test('waf blocks missing user-agent header', () => {
  const req = makeRequest({
    headers: { 'user-agent': '' }
  })
  const result = checkWaf(req)
  assert.equal(result.allowed, false)
  assert.equal(result.statusCode, 403)
  assert.ok(result.reason.includes('User-Agent'))
})

test('waf blocks very short user-agent header', () => {
  const req = makeRequest({
    headers: { 'user-agent': 'a' }
  })
  const result = checkWaf(req)
  assert.equal(result.allowed, false)
  assert.equal(result.statusCode, 403)
})

test('waf blocks SQL injection patterns', () => {
  const tests = [
    "' OR '1'='1",
    "UNION SELECT * FROM users",
    "DROP TABLE users",
    "INSERT INTO users VALUES ('hack')",
    "DELETE FROM users",
    "'; DROP TABLE users; --",
  ]
  for (const input of tests) {
    const req = makeRequest({
      url: input,
      body: {},
    })
    const result = checkWaf(req)
    assert.equal(result.allowed, false, `Should block SQL injection: ${input}`)
    assert.ok(result.reason.includes('SQL injection'), `reason should mention SQL injection: ${result.reason}`)
  }
})

test('waf blocks XSS patterns', () => {
  const tests = [
    '<script>alert(1)</script>',
    'javascript:alert(1)',
    '<iframe src="evil">',
    '<object data="evil">',
    '<embed src="evil">',
  ]
  for (const input of tests) {
    const req = makeRequest({
      url: input,
      body: {},
    })
    const result = checkWaf(req)
    assert.equal(result.allowed, false, `Should block XSS: ${input}`)
    assert.ok(result.reason.includes('XSS'), `reason should mention XSS: ${result.reason}`)
  }
})

test('waf blocks NoSQL injection patterns', () => {
  const tests = [
    '{"$gt": ""}',
    '{"$where": "1"}',
    '{"$ne": null}',
  ]
  for (const input of tests) {
    const req = makeRequest({
      url: '/api/test',
      query: { q: input },
    })
    const result = checkWaf(req)
    assert.equal(result.allowed, false, `Should block NoSQL injection: ${input}`)
    assert.ok(result.reason.includes('NoSQL injection'), `reason should mention NoSQL: ${result.reason}`)
  }
})

test('waf blocks path traversal patterns', () => {
  const tests = [
    '../../../etc/passwd',
    '..\\..\\..\\windows',
    '..%2f..%2f..%2fetc%2fpasswd',
    '%2e%2e%2f%2e%2e%2f',
  ]
  for (const input of tests) {
    const req = makeRequest({
      url: input,
      body: {},
    })
    const result = checkWaf(req)
    assert.equal(result.allowed, false, `Should block path traversal: ${input}`)
    assert.ok(result.reason.includes('path traversal'), `reason should mention path traversal: ${result.reason}`)
  }
})

test('waf blocks suspicious headers', () => {
  const suspiciousHeaders = [
    'x-http-method-override',
    'x-http-method',
    'x-method-override',
  ]
  for (const header of suspiciousHeaders) {
    const req = makeRequest({
      headers: {
        'user-agent': 'Mozilla/5.0',
        [header]: 'POST',
      }
    })
    const result = checkWaf(req)
    assert.equal(result.allowed, false, `Should block header: ${header}`)
    assert.equal(result.statusCode, 403)
  }
})

test('waf blocks body exceeding 1MB', () => {
  const req = makeRequest({
    headers: {
      'user-agent': 'Mozilla/5.0',
      'content-length': '2097152',
    }
  })
  const result = checkWaf(req)
  assert.equal(result.allowed, false)
  assert.equal(result.statusCode, 413)
  assert.ok(result.reason.includes('1MB'))
})

test('waf inspects nested body values for injection', () => {
  const req = makeRequest({
    body: {
      user: {
        name: 'John',
        metadata: { note: "<script>alert('xss')</script>" }
      }
    }
  })
  const result = checkWaf(req)
  assert.equal(result.allowed, false)
  assert.ok(result.reason.includes('XSS') || result.reason.includes('SQL injection'))
})

test('waf inspects query parameters for injection', () => {
  const req = makeRequest({
    url: '/api/search',
    query: { q: "1' OR '1'='1" },
  })
  const result = checkWaf(req)
  assert.equal(result.allowed, false)
  assert.ok(result.reason.includes('SQL injection'))
})
