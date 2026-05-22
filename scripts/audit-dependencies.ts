// Dependency Security Audit — run npm audit programmatically, check vulnerabilities and outdated deps
import { execSync } from 'child_process'
import { log } from '../src/lib/logger.js'

interface AuditResult {
  vulnerabilities: number
  critical: number
  high: number
  moderate: number
  low: number
  info: number
}

function parseNpmAudit(jsonStr: string): AuditResult {
  const data = JSON.parse(jsonStr)
  const vulns = data.vulnerabilities || {}
  let critical = 0,
    high = 0,
    moderate = 0,
    low = 0,
    info = 0
  for (const [, v] of Object.entries(vulns) as [string, any][]) {
    if (v.severity === 'critical') critical++
    else if (v.severity === 'high') high++
    else if (v.severity === 'moderate') moderate++
    else if (v.severity === 'low') low++
    else if (v.severity === 'info') info++
  }
  return {
    vulnerabilities: Object.keys(vulns).length,
    critical,
    high,
    moderate,
    low,
    info,
  }
}

async function checkOutdated(): Promise<string[]> {
  try {
    const output = execSync('npm outdated --json', { encoding: 'utf-8', cwd: process.cwd() })
    const data = JSON.parse(output)
    return Object.keys(data)
  } catch (e: any) {
    // npm outdated exits with 1 when there are outdated packages
    try {
      const data = JSON.parse(e.stdout || '{}')
      return Object.keys(data)
    } catch {
      return []
    }
  }
}

export async function runAudit(): Promise<{ passed: boolean; report: string }> {
  let auditResult: AuditResult
  try {
    const output = execSync('npm audit --json', { encoding: 'utf-8', cwd: process.cwd() })
    auditResult = parseNpmAudit(output)
  } catch (e: any) {
    if (e.stdout) {
      auditResult = parseNpmAudit(e.stdout)
    } else {
      throw e
    }
  }

  const outdated = await checkOutdated()

  const lines: string[] = []
  lines.push('=== Dependency Security Audit ===')
  lines.push(`Total vulnerabilities: ${auditResult.vulnerabilities}`)
  lines.push(`  Critical: ${auditResult.critical}`)
  lines.push(`  High: ${auditResult.high}`)
  lines.push(`  Moderate: ${auditResult.moderate}`)
  lines.push(`  Low: ${auditResult.low}`)
  lines.push(`  Info: ${auditResult.info}`)
  lines.push('')
  lines.push(`Outdated packages: ${outdated.length}`)
  if (outdated.length > 0) {
    lines.push('  ' + outdated.join(', '))
  }

  const passed = auditResult.critical === 0 && auditResult.high === 0 && auditResult.moderate === 0
  lines.push('')
  lines.push(passed ? 'PASSED: No critical/high/moderate vulnerabilities' : 'FAILED: Vulnerabilities found')

  const report = lines.join('\n')
  console.log(report)

  if (!passed) {
    log.error('dependency audit failed', {
      critical: auditResult.critical,
      high: auditResult.high,
      moderate: auditResult.moderate,
    })
  }

  return { passed, report }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAudit()
    .then((r) => {
      process.exit(r.passed ? 0 : 1)
    })
    .catch((e) => {
      console.error('Audit failed:', e.message)
      process.exit(1)
    })
}
