import test from 'node:test'
import assert from 'node:assert/strict'

const {
  renderReportHtml,
  parsePeriod,
  generateReportData,
} = await import('../../dist/lib/pdf-report.js')

test('renderReportHtml returns HTML string', () => {
  const data = {
    orgName: 'Test Corp',
    orgId: 'org-1',
    period: { startDate: '2024-01-01T00:00:00.000Z', endDate: '2024-01-07T00:00:00.000Z' },
    totalEnforcements: 100,
    allowed: 70,
    denied: 20,
    modified: 10,
    topPolicies: [{ name: 'Safe Search', triggers: 42 }],
    topAgents: [{ agentId: 'agent-abc', actions: 55 }],
    violationTypes: [{ type: 'tool_denied', count: 15 }],
    generatedAt: '2024-01-07T12:00:00.000Z',
  }
  const html = renderReportHtml(data)
  assert.ok(typeof html === 'string')
  assert.ok(html.startsWith('<!DOCTYPE html>'))
  assert.ok(html.includes('</html>'))
})

test('report contains org info', () => {
  const data = {
    orgName: 'My Organization',
    orgId: 'org-xyz',
    period: { startDate: '2024-01-01', endDate: '2024-01-31' },
    totalEnforcements: 10,
    allowed: 5,
    denied: 3,
    modified: 2,
    topPolicies: [],
    topAgents: [],
    violationTypes: [],
    generatedAt: '2024-02-01',
  }
  const html = renderReportHtml(data)
  assert.ok(html.includes('My Organization'))
  assert.ok(html.includes('2024-01-01'))
  assert.ok(html.includes('2024-01-31'))
})

test('report contains metric data', () => {
  const data = {
    orgName: 'Metrics Inc',
    orgId: 'org-m',
    period: { startDate: '2024-03-01', endDate: '2024-03-07' },
    totalEnforcements: 1000,
    allowed: 750,
    denied: 200,
    modified: 50,
    topPolicies: [],
    topAgents: [],
    violationTypes: [],
    generatedAt: '2024-03-07',
  }
  const html = renderReportHtml(data)
  assert.ok(html.includes('1000'))
  assert.ok(html.includes('750'))
  assert.ok(html.includes('200'))
  assert.ok(html.includes('50'))
  assert.ok(html.includes('75.0%'))
  assert.ok(html.includes('20.0%'))
  assert.ok(html.includes('5.0%'))
})

test('report handles empty data', () => {
  const data = {
    orgName: 'Empty Corp',
    orgId: 'org-empty',
    period: { startDate: '2024-01-01', endDate: '2024-01-07' },
    totalEnforcements: 0,
    allowed: 0,
    denied: 0,
    modified: 0,
    topPolicies: [],
    topAgents: [],
    violationTypes: [],
    generatedAt: '2024-01-07',
  }
  const html = renderReportHtml(data)
  assert.ok(html.includes('0.0%'))
  assert.ok(!html.includes('Top 5 Most Triggered Policies'))
  assert.ok(!html.includes('Top 5 Most Active Agents'))
  assert.ok(!html.includes('Violation Breakdown by Type'))
})

test('report escapes HTML in user-provided names', () => {
  const data = {
    orgName: '<script>alert("xss")</script>',
    orgId: 'org-xss',
    period: { startDate: '2024-01-01', endDate: '2024-01-07' },
    totalEnforcements: 1,
    allowed: 1,
    denied: 0,
    modified: 0,
    topPolicies: [{ name: '<img src=x onerror=alert(1)>', triggers: 5 }],
    topAgents: [],
    violationTypes: [{ type: '<b>bold</b>', count: 3 }],
    generatedAt: '2024-01-07',
  }
  const html = renderReportHtml(data)
  assert.ok(!html.includes('<script>alert("xss")</script>'))
  assert.ok(html.includes('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'))
  assert.ok(!html.includes('<img src=x onerror=alert(1)>'))
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'))
  assert.ok(!html.includes('<b>bold</b>'))
  assert.ok(html.includes('&lt;b&gt;bold&lt;/b&gt;'))
})

test('report handles zero-percent division safely', () => {
  const data = {
    orgName: 'Zero',
    orgId: 'z',
    period: { startDate: '2024-01-01', endDate: '2024-01-07' },
    totalEnforcements: 0,
    allowed: 0,
    denied: 0,
    modified: 0,
    topPolicies: [],
    topAgents: [],
    violationTypes: [],
    generatedAt: '2024-01-07',
  }
  const html = renderReportHtml(data)
  assert.ok(html.includes('0.0%'))
})

test('parsePeriod returns 7d as default', () => {
  const result = parsePeriod(undefined)
  assert.ok(result.startDate)
  assert.ok(result.endDate)
})

test('parsePeriod returns 30d for 30d param', () => {
  const result = parsePeriod('30d')
  const start = new Date(result.startDate)
  const end = new Date(result.endDate)
  const diff = end.getTime() - start.getTime()
  const days = diff / (1000 * 60 * 60 * 24)
  assert.ok(days >= 29.9 && days <= 30.1)
})

test('parsePeriod returns 24h for 24h param', () => {
  const result = parsePeriod('24h')
  const start = new Date(result.startDate)
  const end = new Date(result.endDate)
  const diff = end.getTime() - start.getTime()
  const hours = diff / (1000 * 60 * 60)
  assert.ok(hours >= 23.9 && hours <= 24.1)
})

test('parsePeriod handles 7d explicitly', () => {
  const result = parsePeriod('7d')
  assert.ok(result.startDate)
  assert.ok(result.endDate)
})

test('parsePeriod handles 90d', () => {
  const result = parsePeriod('90d')
  assert.ok(result.startDate)
  assert.ok(result.endDate)
})
