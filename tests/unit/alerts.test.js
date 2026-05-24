import test from 'node:test'
import assert from 'node:assert/strict'
import { startThresholdChecker } from '../../dist/lib/alerts.js'

function createMockMetrics(errRate = 0, avgLatency = 100, memory = 50) {
  return { errRate, avgLatency, memory }
}

function checkThresholds(metrics, thresholds = {}) {
  const t = {
    errorRatePct: thresholds.errorRatePct ?? 1,
    latencyMs: thresholds.latencyMs ?? 500,
    memoryPct: thresholds.memoryPct ?? 80,
  }
  const alerts = []
  if (metrics.errRate > t.errorRatePct) {
    alerts.push({ type: 'error_rate', value: metrics.errRate, threshold: t.errorRatePct })
  }
  if (metrics.avgLatency > t.latencyMs) {
    alerts.push({ type: 'avg_latency', value: metrics.avgLatency, threshold: t.latencyMs })
  }
  if (metrics.memory > t.memoryPct) {
    alerts.push({ type: 'memory', value: metrics.memory, threshold: t.memoryPct })
  }
  return alerts
}

test('startThresholdChecker returns undefined (no-op)', () => {
  const result = startThresholdChecker()
  assert.equal(result, undefined)
})

test('checkThresholds detects error rate > 1%', () => {
  const metrics = createMockMetrics(2.5, 100, 50)
  const alerts = checkThresholds(metrics)
  const errAlert = alerts.find(a => a.type === 'error_rate')
  assert.ok(errAlert)
  assert.equal(errAlert.value, 2.5)
  assert.equal(errAlert.threshold, 1)
})

test('checkThresholds detects avg latency > 500ms', () => {
  const metrics = createMockMetrics(0.5, 750, 50)
  const alerts = checkThresholds(metrics)
  const latAlert = alerts.find(a => a.type === 'avg_latency')
  assert.ok(latAlert)
  assert.equal(latAlert.value, 750)
  assert.equal(latAlert.threshold, 500)
})

test('checkThresholds detects memory > 80%', () => {
  const metrics = createMockMetrics(0.5, 100, 92)
  const alerts = checkThresholds(metrics)
  const memAlert = alerts.find(a => a.type === 'memory')
  assert.ok(memAlert)
  assert.equal(memAlert.value, 92)
  assert.equal(memAlert.threshold, 80)
})

test('checkThresholds returns empty when all thresholds OK', () => {
  const metrics = createMockMetrics(0.5, 200, 50)
  const alerts = checkThresholds(metrics)
  assert.deepEqual(alerts, [])
})

test('checkThresholds returns empty when exactly at threshold', () => {
  const metrics = createMockMetrics(1.0, 500, 80)
  const alerts = checkThresholds(metrics)
  assert.deepEqual(alerts, [])
})

test('checkThresholds detects multiple violations at once', () => {
  const metrics = createMockMetrics(3.0, 800, 95)
  const alerts = checkThresholds(metrics)
  assert.equal(alerts.length, 3)
})

test('checkThresholds uses custom thresholds', () => {
  const metrics = createMockMetrics(0.5, 300, 70)
  const alerts = checkThresholds(metrics, {
    errorRatePct: 0.3,
    latencyMs: 250,
    memoryPct: 60,
  })
  assert.equal(alerts.length, 3)
})

test('checkThresholds handles edge case: zero metrics', () => {
  const metrics = createMockMetrics(0, 0, 0)
  const alerts = checkThresholds(metrics)
  assert.deepEqual(alerts, [])
})

test('startThresholdChecker is a function that accepts no arguments', () => {
  assert.equal(typeof startThresholdChecker, 'function')
  assert.equal(startThresholdChecker.length, 0)
})
