import { log } from './logger.js'
import { getMetrics } from './metrics.js'

// ---------------------------------------------------------------------------
// Alerting thresholds — checks every 5 minutes
// ---------------------------------------------------------------------------

const THRESHOLDS = {
  errorRate: 0.01,        // 1%
  avgResponseTime: 500,   // 500ms
  memoryPercent: 80,      // 80%
}

interface AlertCheck {
  name: string
  severity: 'warning' | 'critical'
  message: string
  value: number
  threshold: number
}

export function checkThresholds(): AlertCheck[] {
  const alerts: AlertCheck[] = []
  const metrics = getMetrics()

  // Error rate check
  if (metrics.errorRate > THRESHOLDS.errorRate) {
    alerts.push({
      name: 'error_rate',
      severity: 'warning',
      message: `Error rate ${(metrics.errorRate * 100).toFixed(2)}% exceeds threshold ${(THRESHOLDS.errorRate * 100).toFixed(2)}%`,
      value: metrics.errorRate,
      threshold: THRESHOLDS.errorRate,
    })
  }

  // Average response time check
  if (metrics.avgResponseTime > THRESHOLDS.avgResponseTime) {
    alerts.push({
      name: 'avg_response_time',
      severity: 'warning',
      message: `Average response time ${metrics.avgResponseTime}ms exceeds threshold ${THRESHOLDS.avgResponseTime}ms`,
      value: metrics.avgResponseTime,
      threshold: THRESHOLDS.avgResponseTime,
    })
  }

  // Memory usage check
  const used = process.memoryUsage()
  const usedMB = Math.round(used.heapUsed / 1024 / 1024)
  const totalMB = Math.round(used.heapTotal / 1024 / 1024)
  const memoryPercent = totalMB > 0 ? (usedMB / totalMB) * 100 : 0

  if (memoryPercent > THRESHOLDS.memoryPercent) {
    alerts.push({
      name: 'memory_usage',
      severity: 'warning',
      message: `Memory usage ${memoryPercent.toFixed(1)}% exceeds threshold ${THRESHOLDS.memoryPercent}%`,
      value: memoryPercent,
      threshold: THRESHOLDS.memoryPercent,
    })
  }

  // Firebase connectivity check (indirect via env)
  // In a real implementation, we'd check the last Firebase ping time
  // For now, we just log a structured alert if Firebase isn't configured
  if (!process.env.FIREBASE_PROJECT_ID && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    alerts.push({
      name: 'firebase_disconnected',
      severity: 'critical',
      message: 'Firebase credentials not configured — database connectivity may be unavailable',
      value: 1,
      threshold: 0,
    })
  }

  // Log all alerts
  for (const alert of alerts) {
    log.warn('alert threshold breached', {
      alert: alert.name,
      severity: alert.severity,
      message: alert.message,
      value: alert.value,
      threshold: alert.threshold,
      service: 'passport-agent',
      version: '2.1.0',
    })
  }

  return alerts
}

export function startThresholdChecker(intervalMs: number = 5 * 60 * 1000) {
  log.info('starting threshold checker', { intervalMinutes: intervalMs / 60_000 })
  return setInterval(checkThresholds, intervalMs)
}
