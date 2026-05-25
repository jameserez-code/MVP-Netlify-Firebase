import test from 'node:test'
import assert from 'node:assert/strict'
import { AbuseDetection } from '../../dist/lib/abuse-detection.js'

function makeRequest(overrides = {}) {
  return {
    url: overrides.url || '/api/test',
    method: overrides.method || 'POST',
    headers: { 'user-agent': overrides.userAgent || 'Mozilla/5.0 TestAgent' },
  }
}

// --- Bot detection: rapid sequential requests ---

test('bot detection: rapid sequential requests triggers block', () => {
  const detector = new AbuseDetection()
  const now = Date.now()
  const state = {
    requests: [],
    blocked: false,
    alertSent: false,
  }
  for (let i = 0; i < 50; i++) {
    state.requests.push({
      timestamp: now - (100 * i),
      path: '/api/test',
      method: 'GET',
      userAgent: 'bot-agent/1.0',
    })
  }
  const result = detector.analyze(state, '10.0.0.1', now)
  assert.equal(result.blocked, true)
  assert.ok(result.reason.toLowerCase().includes('rapid'))
})

test('bot detection: at threshold (50) blocks', () => {
  const detector = new AbuseDetection()
  const now = Date.now()
  const state = { requests: [], blocked: false, alertSent: false }
  for (let i = 0; i < 50; i++) {
    state.requests.push({
      timestamp: now - (50 * i),
      path: '/api/test',
      method: 'GET',
      userAgent: 'test/1.0',
    })
  }
  const result = detector.analyze(state, '10.0.0.2', now)
  assert.equal(result.blocked, true)
})

test('bot detection: below threshold (49) does not block', () => {
  const detector = new AbuseDetection()
  const now = Date.now()
  const state = { requests: [], blocked: false, alertSent: false }
  for (let i = 0; i < 49; i++) {
    state.requests.push({
      timestamp: now - (50 * i),
      path: '/api/test',
      method: 'GET',
      userAgent: 'test/1.0',
    })
  }
  const result = detector.analyze(state, '10.0.0.3', now)
  assert.equal(result.blocked, false)
})

test('bot detection: requests outside window not counted', () => {
  const detector = new AbuseDetection()
  const now = Date.now()
  const state = { requests: [], blocked: false, alertSent: false }
  for (let i = 0; i < 40; i++) {
    state.requests.push({
      timestamp: now - (50 * i),
      path: '/api/test',
      method: 'GET',
      userAgent: 'test/1.0',
    })
  }
  // Add 20 old requests outside the 10s window
  for (let i = 0; i < 20; i++) {
    state.requests.push({
      timestamp: now - 11_000 - (i * 100),
      path: '/api/test',
      method: 'GET',
      userAgent: 'test/1.0',
    })
  }
  const result = detector.analyze(state, '10.0.0.4', now)
  assert.equal(result.blocked, false)
})

// --- Bot detection: normal human pattern ---

test('bot detection: normal human pattern passes', () => {
  const detector = new AbuseDetection()
  const now = Date.now()
  const state = { requests: [], blocked: false, alertSent: false }
  // Simulate 5 requests over 60 seconds (normal browsing)
  for (let i = 0; i < 5; i++) {
    state.requests.push({
      timestamp: now - (12_000 * i),
      path: '/api/test',
      method: 'GET',
      userAgent: 'Mozilla/5.0',
    })
  }
  const result = detector.analyze(state, '192.168.1.1', now)
  assert.equal(result.blocked, false)
  assert.equal(result.reason, undefined)
})

// --- Bot detection: known bad IP ---

test('bot detection: known bad IP is blocked', async () => {
  const detector = new AbuseDetection()
  const badIps = ['192.0.2.1', '192.0.2.254', '198.51.100.5', '203.0.113.42']
  for (const ip of badIps) {
    const result = await detector.check(ip, makeRequest())
    assert.equal(result.allowed, false, `IP ${ip} should be blocked`)
    assert.ok(result.reason.includes('reputation'))
  }
})

test('bot detection: valid IP is not blocked by reputation', async () => {
  const detector = new AbuseDetection()
  const result = await detector.check('34.120.45.67', makeRequest())
  assert.equal(result.allowed, true)
})

// --- Bot detection: unusual time-of-day ---

test('bot detection: unusual time-of-day pattern with midnight requests', () => {
  const detector = new AbuseDetection()
  const state = { requests: [], blocked: false, alertSent: false }
  // 20+ requests all at 2-5 AM UTC
  for (let i = 0; i < 25; i++) {
    // Use 2024-01-15T03:30:00Z = 3 AM UTC
    const ts = new Date('2024-01-15T03:30:00Z').getTime() - (1000 * i)
    state.requests.push({
      timestamp: ts,
      path: '/api/data',
      method: 'POST',
      userAgent: 'test/1.0',
    })
  }
  const result = detector.analyze(state, '10.0.0.10', state.requests[0].timestamp)
  assert.ok(result.reason && result.reason.includes('Unusual time-of-day'))
  assert.equal(result.blocked, false)
})

test('bot detection: normal business hours no anomaly', () => {
  const detector = new AbuseDetection()
  const state = { requests: [], blocked: false, alertSent: false }
  for (let i = 0; i < 25; i++) {
    // 2 PM UTC
    const ts = new Date('2024-01-15T14:00:00Z').getTime() - (1000 * i)
    state.requests.push({
      timestamp: ts,
      path: '/api/data',
      method: 'POST',
      userAgent: 'test/1.0',
    })
  }
  const result = detector.analyze(state, '10.0.0.11', state.requests[0].timestamp)
  assert.equal(result.reason, undefined)
  assert.equal(result.blocked, false)
})

test('bot detection: below min threshold no time anomaly check', () => {
  const detector = new AbuseDetection()
  const state = { requests: [], blocked: false, alertSent: false }
  for (let i = 0; i < 15; i++) {
    const ts = new Date('2024-01-15T03:30:00Z').getTime() - (1000 * i)
    state.requests.push({
      timestamp: ts,
      path: '/api/data',
      method: 'POST',
      userAgent: 'test/1.0',
    })
  }
  const result = detector.analyze(state, '10.0.0.12', state.requests[0].timestamp)
  assert.equal(result.reason, undefined)
})

// --- IP reputation check ---

test('IP reputation check: isKnownBadIp detects bad ranges', () => {
  const detector = new AbuseDetection()
  assert.equal(detector.isKnownBadIp('192.0.2.100'), true)
  assert.equal(detector.isKnownBadIp('198.51.100.200'), true)
  assert.equal(detector.isKnownBadIp('203.0.113.50'), true)
})

test('IP reputation check: clean IPs are not flagged', () => {
  const detector = new AbuseDetection()
  assert.equal(detector.isKnownBadIp('1.1.1.1'), false)
  assert.equal(detector.isKnownBadIp('8.8.8.8'), false)
  assert.equal(detector.isKnownBadIp('10.0.0.1'), false)
  assert.equal(detector.isKnownBadIp('172.16.0.1'), false)
  assert.equal(detector.isKnownBadIp('::1'), false)
})

// --- Geographic anomaly ---

test('bot detection: geographic anomaly with frequent UA changes', () => {
  const detector = new AbuseDetection()
  const now = Date.now()
  const state = { requests: [], blocked: false, alertSent: false }
  const userAgents = [
    'Mozilla/5.0 Chrome/120.0',
    'Mozilla/5.0 Safari/605.1',
    'Mozilla/5.0 Firefox/121.0',
    'curl/8.1',
    'Python/3.11',
    'Go-http-client/2.0',
    'Wget/1.21',
    'libwww-perl/6.0',
    'PostmanRuntime/7.0',
    'Insomnia/2023.5',
    'MobileSafari/605.1',
  ]
  for (let i = 0; i < 11; i++) {
    state.requests.push({
      timestamp: now - (1000 * i),
      path: '/api/login',
      method: 'POST',
      userAgent: userAgents[i % userAgents.length],
    })
  }
  const result = detector.analyze(state, '10.0.0.20', now)
  assert.ok(result.reason && result.reason.includes('User-Agent'))
})
