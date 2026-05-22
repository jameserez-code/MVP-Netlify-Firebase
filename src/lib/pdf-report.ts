import type { Firestore } from 'firebase-admin/firestore'
import { log } from './logger.js'

export interface ReportPeriod {
  startDate: string
  endDate: string
}

export interface ReportData {
  orgName: string
  orgId: string
  period: ReportPeriod
  totalEnforcements: number
  allowed: number
  denied: number
  modified: number
  topPolicies: Array<{ name: string; triggers: number }>
  topAgents: Array<{ agentId: string; actions: number }>
  violationTypes: Array<{ type: string; count: number }>
  generatedAt: string
}

async function getOrgName(db: Firestore, orgId: string): Promise<string> {
  try {
    const snap = await db.collection('organizations').doc(orgId).get()
    if (snap.exists) {
      const data = snap.data() as any
      return data.name || orgId
    }
  } catch {}
  return orgId
}

async function getPolicyName(db: Firestore, policyId: string): Promise<string> {
  try {
    const snap = await db.collection('policies').doc(policyId).get()
    if (snap.exists) {
      const data = snap.data() as any
      return data.name || policyId
    }
  } catch {}
  return policyId
}

export async function generateReportData(
  db: Firestore,
  orgId: string,
  period: ReportPeriod,
): Promise<ReportData> {
  const snap = await db
    .collection('actionIntents')
    .where('orgId', '==', orgId)
    .where('createdAt', '>=', period.startDate)
    .where('createdAt', '<=', period.endDate)
    .limit(10000)
    .get()

  const entries = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[]

  const decisionCounts: Record<string, number> = { allow: 0, deny: 0, modify: 0 }
  const policyCounts: Record<string, number> = {}
  const agentCounts: Record<string, number> = {}
  const ruleCounts: Record<string, number> = {}

  for (const entry of entries) {
    const decision = entry.decision as string
    if (decisionCounts[decision] !== undefined) {
      decisionCounts[decision]++
    }

    if (entry.violatedRule) {
      const rule = entry.violatedRule as string
      ruleCounts[rule] = (ruleCounts[rule] || 0) + 1
    }

    if (entry.agentId) {
      agentCounts[entry.agentId] = (agentCounts[entry.agentId] || 0) + 1
    }
  }

  const sortedPolicies = Object.entries(policyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const topPoliciesWithNames = await Promise.all(
    sortedPolicies.map(async ([id, triggers]) => ({
      name: await getPolicyName(db, id),
      triggers,
    })),
  )

  const topAgents = Object.entries(agentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([agentId, actions]) => ({ agentId, actions }))

  const violationTypes = Object.entries(ruleCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)

  const totalEnforcements = decisionCounts.allow + decisionCounts.deny + decisionCounts.modify

  const orgName = await getOrgName(db, orgId)

  return {
    orgName,
    orgId,
    period,
    totalEnforcements,
    allowed: decisionCounts.allow,
    denied: decisionCounts.deny,
    modified: decisionCounts.modify,
    topPolicies: topPoliciesWithNames,
    topAgents,
    violationTypes,
    generatedAt: new Date().toISOString(),
  }
}

export function renderReportHtml(data: ReportData): string {
  const {
    orgName,
    period,
    totalEnforcements,
    allowed,
    denied,
    modified,
    topPolicies,
    topAgents,
    violationTypes,
    generatedAt,
  } = data

  const allowPct = totalEnforcements > 0 ? ((allowed / totalEnforcements) * 100).toFixed(1) : '0.0'
  const denyPct = totalEnforcements > 0 ? ((denied / totalEnforcements) * 100).toFixed(1) : '0.0'
  const modifyPct = totalEnforcements > 0 ? ((modified / totalEnforcements) * 100).toFixed(1) : '0.0'

  const topPolicyRows = topPolicies.length > 0
    ? topPolicies
        .map(
          (p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(p.name)}</td>
        <td>${p.triggers}</td>
      </tr>`,
        )
        .join('\n')
    : '<tr><td colspan="3" class="empty">No policy data</td></tr>'

  const topAgentRows = topAgents.length > 0
    ? topAgents
        .map(
          (a, i) => `
      <tr>
        <td>${i + 1}</td>
        <td class="mono">${escapeHtml(a.agentId)}</td>
        <td>${a.actions}</td>
      </tr>`,
        )
        .join('\n')
    : '<tr><td colspan="3" class="empty">No agent data</td></tr>'

  const violationRows = violationTypes.length > 0
    ? violationTypes
        .map(
          (v) => `
      <tr>
        <td>${escapeHtml(v.type)}</td>
        <td>${v.count}</td>
      </tr>`,
        )
        .join('\n')
    : '<tr><td colspan="2" class="empty">No violations</td></tr>'

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Passport Agent - Security Report</title>
<style>
  @page { size: A4; margin: 20mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1a1a2e; background: #fff; line-height: 1.6;
    max-width: 800px; margin: 0 auto; padding: 40px 20px;
  }
  .cover { text-align: center; padding: 60px 0; border-bottom: 3px solid #2ea043; margin-bottom: 40px; }
  .cover h1 { font-size: 28px; color: #2ea043; margin-bottom: 8px; }
  .cover .org { font-size: 20px; color: #333; margin-bottom: 4px; }
  .cover .period { font-size: 14px; color: #666; }
  .cover .generated { font-size: 11px; color: #999; margin-top: 20px; }
  .section { margin: 30px 0; }
  .section h2 { font-size: 18px; color: #2ea043; border-bottom: 2px solid #e0e0e0; padding-bottom: 6px; margin-bottom: 16px; }
  .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .metric-card { background: #f8f9fa; border-radius: 8px; padding: 16px; text-align: center; border: 1px solid #e0e0e0; }
  .metric-card .value { font-size: 24px; font-weight: 700; color: #1a1a2e; }
  .metric-card .label { font-size: 11px; text-transform: uppercase; color: #666; margin-top: 4px; }
  .metric-card .pct { font-size: 12px; color: #999; }
  .metric-card.allow .value { color: #2ea043; }
  .metric-card.deny .value { color: #d32f2f; }
  .metric-card.modify .value { color: #1976d2; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 8px 12px; background: #f0f0f0; font-size: 11px; text-transform: uppercase; color: #555; border-bottom: 2px solid #ddd; }
  td { padding: 8px 12px; border-bottom: 1px solid #eee; }
  .mono { font-family: 'JetBrains Mono', 'SF Mono', monospace; font-size: 12px; }
  .empty { color: #999; font-style: italic; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e0e0e0; font-size: 11px; color: #999; text-align: center; }
  @media print {
    body { padding: 0; max-width: none; }
    .cover { page-break-after: always; }
    .section { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="cover">
  <h1>Passport Agent Security Report</h1>
  <div class="org">${escapeHtml(orgName)}</div>
  <div class="period">${period.startDate} &mdash; ${period.endDate}</div>
  <div class="generated">Generated: ${generatedAt}</div>
</div>

<div class="section">
  <h2>Summary Metrics</h2>
  <div class="metrics">
    <div class="metric-card">
      <div class="value">${totalEnforcements}</div>
      <div class="label">Total Enforcements</div>
    </div>
    <div class="metric-card allow">
      <div class="value">${allowed}</div>
      <div class="label">Allowed</div>
      <div class="pct">${allowPct}%</div>
    </div>
    <div class="metric-card deny">
      <div class="value">${denied}</div>
      <div class="label">Denied</div>
      <div class="pct">${denyPct}%</div>
    </div>
    <div class="metric-card modify">
      <div class="value">${modified}</div>
      <div class="label">Modified</div>
      <div class="pct">${modifyPct}%</div>
    </div>
  </div>
</div>

${topPolicies.length > 0 ? `
<div class="section">
  <h2>Top 5 Most Triggered Policies</h2>
  <table>
    <thead><tr><th>#</th><th>Policy Name</th><th>Triggers</th></tr></thead>
    <tbody>${topPolicyRows}</tbody>
  </table>
</div>
` : ''}

${topAgents.length > 0 ? `
<div class="section">
  <h2>Top 5 Most Active Agents</h2>
  <table>
    <thead><tr><th>#</th><th>Agent ID</th><th>Actions</th></tr></thead>
    <tbody>${topAgentRows}</tbody>
  </table>
</div>
` : ''}

${violationTypes.length > 0 ? `
<div class="section">
  <h2>Violation Breakdown by Type</h2>
  <table>
    <thead><tr><th>Violation Rule</th><th>Count</th></tr></thead>
    <tbody>${violationRows}</tbody>
  </table>
</div>
` : ''}

<div class="footer">
  Passport Agent v2.1 &middot; This report is auto-generated and intended for security auditing purposes.
</div>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function parsePeriod(param: string | undefined): ReportPeriod {
  const now = new Date()
  const endDate = now.toISOString()

  switch (param) {
    case '24h': {
      const d = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      return { startDate: d.toISOString(), endDate }
    }
    case '30d': {
      const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return { startDate: d.toISOString(), endDate }
    }
    case '90d': {
      const d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      return { startDate: d.toISOString(), endDate }
    }
    case '7d':
    default: {
      const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return { startDate: d.toISOString(), endDate }
    }
  }
}
