// Diagnostics + repair utilities — enhanced with severity + actions
// Replaces previous basic diagnostics with human-readable output

export function formatDiagnostics(raw: Record<string, unknown>) {
  return {
    status: raw.status === 'healthy' ? '✓ HEALTHY' : '✗ DEGRADED',
    firestoreLatency: `${raw.firestore?.latencyMs}ms`,
    collections: Object.entries(raw.collections || {}).map(([name, info]: [string, any]) => ({
      name,
      accessible: info.accessible ? '✓' : '✗',
      count: info.count,
    })),
    config: {
      environment: raw.config?.env || 'unknown',
      jwt: raw.config?.jwtConfigured ? '✓ configured' : '✗ missing — set JWT_SECRET',
      engineSecret: raw.config?.engineSecretConfigured ? '✓ configured' : '✗ missing — set ENGINE_SECRET',
    },
    checkedAt: raw.checkedAt,
  }
}

export function formatConsistencyIssues(issues: Array<{ severity: string; resource: string; id: string; description: string }>) {
  const severityOrder: Record<string, number> = { error: 0, warn: 1 }
  const sorted = [...issues].sort((a, b) => (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99))

  return {
    total: issues.length,
    errors: issues.filter(i => i.severity === 'error').length,
    warnings: issues.filter(i => i.severity === 'warn').length,
    items: sorted.map(i => ({
      level: i.severity === 'error' ? 'CRITICAL' : 'WARNING',
      icon: i.severity === 'error' ? '✗' : '⚠',
      where: `${i.resource}/${i.id.substring(0, 12)}`,
      what: i.description,
      action: suggestRepair(i),
    })),
    ranAt: new Date().toISOString(),
  }
}

function suggestRepair(issue: { resource: string; description: string }): string {
  if (issue.description.includes('Orphaned')) return 'POST /repair { "action": "orphaned" }'
  if (issue.description.includes('no active runs')) return 'POST /repair { "action": "stuck" }'
  if (issue.description.includes('Invalid status')) return 'Manual — update task status via Firestore console'
  if (issue.description.includes('missing completedAt')) return 'Auto — non-critical, status is correct'
  if (issue.description.includes('missing failedAt')) return 'Auto — non-critical, status is correct'
  return 'Review manually'
}
