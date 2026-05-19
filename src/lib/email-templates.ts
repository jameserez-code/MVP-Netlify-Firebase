// Email templates for Passport Agent notifications
// All templates use inline CSS for maximum email client compatibility

const BRAND_COLOR = '#2ea043'
const BG_COLOR = '#0d1117'
const CARD_BG = '#161b22'
const TEXT_COLOR = '#c9d1d9'
const MUTED_COLOR = '#8b949e'
const BORDER_COLOR = '#30363d'
const RED_COLOR = '#f85149'
const AMBER_COLOR = '#d2991d'

function baseTemplate(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 16px !important; }
      .card { padding: 16px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${BG_COLOR};color:${TEXT_COLOR};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding:24px 0;">
        <table role="presentation" class="container" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:600px;">
          <!-- Brand -->
          <tr>
            <td style="padding-bottom:24px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding-right:10px;">
                    <div style="width:32px;height:32px;border-radius:6px;background:${BRAND_COLOR}20;border:1px solid ${BRAND_COLOR}40;display:inline-block;text-align:center;line-height:30px;font-size:14px;color:${BRAND_COLOR};font-weight:700;">P</div>
                  </td>
                  <td>
                    <div style="font-size:16px;font-weight:700;letter-spacing:1px;color:${BRAND_COLOR};">PASSPORT AGENT</div>
                    <div style="font-size:10px;color:${MUTED_COLOR};letter-spacing:2px;text-transform:uppercase;">Identity + Permission Control</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td class="card" style="background-color:${CARD_BG};border:1px solid ${BORDER_COLOR};border-radius:8px;padding:28px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="font-size:11px;color:${MUTED_COLOR};margin:0;">
                Passport Agent v2.0 &middot; Automated notification<br/>
                <a href="#" style="color:${MUTED_COLOR};text-decoration:underline;">Manage notification preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function policyViolationTemplate(params: {
  agentName: string
  tool: string
  reason: string
  timestamp: string
}): { html: string; text: string } {
  const { agentName, tool, reason, timestamp } = params
  const html = baseTemplate(
    'Policy Violation Alert',
    `
    <h1 style="font-size:18px;font-weight:700;color:${RED_COLOR};margin:0 0 16px 0;">Policy Violation Detected</h1>
    <p style="font-size:14px;color:${TEXT_COLOR};margin:0 0 16px 0;line-height:1.5;">
      An agent attempted an action that was blocked by your organization's policies.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${BG_COLOR};border:1px solid ${BORDER_COLOR};border-radius:6px;margin-bottom:16px;">
      <tr><td style="padding:12px 16px;border-bottom:1px solid ${BORDER_COLOR};"><span style="font-size:11px;color:${MUTED_COLOR};text-transform:uppercase;letter-spacing:1px;">Agent</span><div style="font-size:14px;font-weight:600;color:${TEXT_COLOR};margin-top:2px;">${escapeHtml(agentName)}</div></td></tr>
      <tr><td style="padding:12px 16px;border-bottom:1px solid ${BORDER_COLOR};"><span style="font-size:11px;color:${MUTED_COLOR};text-transform:uppercase;letter-spacing:1px;">Tool</span><div style="font-family:monospace;font-size:13px;color:${BRAND_COLOR};margin-top:2px;">${escapeHtml(tool)}</div></td></tr>
      <tr><td style="padding:12px 16px;border-bottom:1px solid ${BORDER_COLOR};"><span style="font-size:11px;color:${MUTED_COLOR};text-transform:uppercase;letter-spacing:1px;">Reason</span><div style="font-size:14px;color:${TEXT_COLOR};margin-top:2px;">${escapeHtml(reason)}</div></td></tr>
      <tr><td style="padding:12px 16px;"><span style="font-size:11px;color:${MUTED_COLOR};text-transform:uppercase;letter-spacing:1px;">Time</span><div style="font-size:13px;color:${MUTED_COLOR};margin-top:2px;">${escapeHtml(new Date(timestamp).toLocaleString())}</div></td></tr>
    </table>
    <p style="font-size:12px;color:${MUTED_COLOR};margin:0;line-height:1.5;">
      Review your policies in the <a href="#" style="color:${BRAND_COLOR};text-decoration:none;">Passport Agent dashboard</a> to adjust rules if needed.
    </p>
    `
  )
  const text = `Passport Agent — Policy Violation Alert\n\nAgent: ${agentName}\nTool: ${tool}\nReason: ${reason}\nTime: ${new Date(timestamp).toLocaleString()}\n\nReview your policies in the Passport Agent dashboard.`
  return { html, text }
}

export function agentRevokedTemplate(params: {
  agentName: string
  revokedBy: string
  timestamp: string
}): { html: string; text: string } {
  const { agentName, revokedBy, timestamp } = params
  const html = baseTemplate(
    'Agent Revoked',
    `
    <h1 style="font-size:18px;font-weight:700;color:${AMBER_COLOR};margin:0 0 16px 0;">Agent Access Revoked</h1>
    <p style="font-size:14px;color:${TEXT_COLOR};margin:0 0 16px 0;line-height:1.5;">
      The following agent has been revoked and can no longer perform actions within your organization.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${BG_COLOR};border:1px solid ${BORDER_COLOR};border-radius:6px;margin-bottom:16px;">
      <tr><td style="padding:12px 16px;border-bottom:1px solid ${BORDER_COLOR};"><span style="font-size:11px;color:${MUTED_COLOR};text-transform:uppercase;letter-spacing:1px;">Agent</span><div style="font-size:14px;font-weight:600;color:${TEXT_COLOR};margin-top:2px;">${escapeHtml(agentName)}</div></td></tr>
      <tr><td style="padding:12px 16px;border-bottom:1px solid ${BORDER_COLOR};"><span style="font-size:11px;color:${MUTED_COLOR};text-transform:uppercase;letter-spacing:1px;">Revoked By</span><div style="font-size:14px;color:${TEXT_COLOR};margin-top:2px;">${escapeHtml(revokedBy)}</div></td></tr>
      <tr><td style="padding:12px 16px;"><span style="font-size:11px;color:${MUTED_COLOR};text-transform:uppercase;letter-spacing:1px;">Time</span><div style="font-size:13px;color:${MUTED_COLOR};margin-top:2px;">${escapeHtml(new Date(timestamp).toLocaleString())}</div></td></tr>
    </table>
    <p style="font-size:12px;color:${MUTED_COLOR};margin:0;line-height:1.5;">
      If this was unintentional, you can re-register the agent from the dashboard.
    </p>
    `
  )
  const text = `Passport Agent — Agent Access Revoked\n\nAgent: ${agentName}\nRevoked By: ${revokedBy}\nTime: ${new Date(timestamp).toLocaleString()}\n\nIf this was unintentional, you can re-register the agent from the dashboard.`
  return { html, text }
}

export function systemAlertTemplate(params: {
  alertType: string
  message: string
  severity: 'info' | 'warning' | 'critical'
}): { html: string; text: string } {
  const { alertType, message, severity } = params
  const severityColor = severity === 'critical' ? RED_COLOR : severity === 'warning' ? AMBER_COLOR : BRAND_COLOR
  const html = baseTemplate(
    'System Alert',
    `
    <h1 style="font-size:18px;font-weight:700;color:${severityColor};margin:0 0 16px 0;">System Alert: ${escapeHtml(alertType)}</h1>
    <p style="font-size:14px;color:${TEXT_COLOR};margin:0 0 16px 0;line-height:1.5;">
      ${escapeHtml(message)}
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${BG_COLOR};border:1px solid ${BORDER_COLOR};border-radius:6px;margin-bottom:16px;">
      <tr><td style="padding:12px 16px;border-bottom:1px solid ${BORDER_COLOR};"><span style="font-size:11px;color:${MUTED_COLOR};text-transform:uppercase;letter-spacing:1px;">Severity</span><div style="font-size:14px;font-weight:600;color:${severityColor};margin-top:2px;text-transform:uppercase;">${severity}</div></td></tr>
      <tr><td style="padding:12px 16px;border-bottom:1px solid ${BORDER_COLOR};"><span style="font-size:11px;color:${MUTED_COLOR};text-transform:uppercase;letter-spacing:1px;">Alert Type</span><div style="font-family:monospace;font-size:13px;color:${TEXT_COLOR};margin-top:2px;">${escapeHtml(alertType)}</div></td></tr>
      <tr><td style="padding:12px 16px;"><span style="font-size:11px;color:${MUTED_COLOR};text-transform:uppercase;letter-spacing:1px;">Time</span><div style="font-size:13px;color:${MUTED_COLOR};margin-top:2px;">${escapeHtml(new Date().toLocaleString())}</div></td></tr>
    </table>
    <p style="font-size:12px;color:${MUTED_COLOR};margin:0;line-height:1.5;">
      Check the <a href="#" style="color:${BRAND_COLOR};text-decoration:none;">Passport Agent diagnostics</a> page for more details.
    </p>
    `
  )
  const text = `Passport Agent — System Alert: ${alertType}\n\nSeverity: ${severity}\nMessage: ${message}\nTime: ${new Date().toLocaleString()}\n\nCheck the Passport Agent diagnostics page for more details.`
  return { html, text }
}

export function welcomeTemplate(params: {
  orgName: string
  email: string
  password?: string
}): { html: string; text: string } {
  const { orgName, email, password } = params
  const html = baseTemplate(
    'Welcome to Passport Agent',
    `
    <h1 style="font-size:18px;font-weight:700;color:${BRAND_COLOR};margin:0 0 16px 0;">Welcome to Passport Agent</h1>
    <p style="font-size:14px;color:${TEXT_COLOR};margin:0 0 16px 0;line-height:1.5;">
      Your organization <strong style="color:${TEXT_COLOR};">${escapeHtml(orgName)}</strong> has been successfully set up with Passport Agent.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${BG_COLOR};border:1px solid ${BORDER_COLOR};border-radius:6px;margin-bottom:16px;">
      <tr><td style="padding:12px 16px;border-bottom:1px solid ${BORDER_COLOR};"><span style="font-size:11px;color:${MUTED_COLOR};text-transform:uppercase;letter-spacing:1px;">Organization</span><div style="font-size:14px;font-weight:600;color:${TEXT_COLOR};margin-top:2px;">${escapeHtml(orgName)}</div></td></tr>
      <tr><td style="padding:12px 16px;border-bottom:1px solid ${BORDER_COLOR};"><span style="font-size:11px;color:${MUTED_COLOR};text-transform:uppercase;letter-spacing:1px;">Email</span><div style="font-size:14px;color:${TEXT_COLOR};margin-top:2px;">${escapeHtml(email)}</div></td></tr>
      ${password ? `<tr><td style="padding:12px 16px;"><span style="font-size:11px;color:${MUTED_COLOR};text-transform:uppercase;letter-spacing:1px;">Password</span><div style="font-family:monospace;font-size:13px;color:${BRAND_COLOR};margin-top:2px;">${escapeHtml(password)}</div></td></tr>` : ''}
    </table>
    <p style="font-size:14px;color:${TEXT_COLOR};margin:0 0 12px 0;line-height:1.5;">
      Next steps:
    </p>
    <ul style="font-size:13px;color:${MUTED_COLOR};margin:0 0 16px 0;padding-left:18px;line-height:1.6;">
      <li>Register your first agent</li>
      <li>Define policies to control permissions</li>
      <li>Configure webhooks for real-time events</li>
      <li>Invite team members to your organization</li>
    </ul>
    <p style="font-size:12px;color:${MUTED_COLOR};margin:0;line-height:1.5;">
      Need help? Visit the <a href="#" style="color:${BRAND_COLOR};text-decoration:none;">documentation</a> or reply to this email.
    </p>
    `
  )
  const text = `Passport Agent — Welcome\n\nYour organization ${orgName} has been successfully set up.\n\nEmail: ${email}\n${password ? `Password: ${password}\n` : ''}\nNext steps:\n- Register your first agent\n- Define policies to control permissions\n- Configure webhooks for real-time events\n- Invite team members to your organization`
  return { html, text }
}

export function digestTemplate(params: {
  orgName: string
  date: string
  violations: number
  newAgents: number
  revokedAgents: number
  topViolatedTools: string[]
}): { html: string; text: string } {
  const { orgName, date, violations, newAgents, revokedAgents, topViolatedTools } = params
  const toolList = topViolatedTools.length
    ? topViolatedTools.map((t) => `<li style="margin-bottom:4px;">${escapeHtml(t)}</li>`).join('')
    : '<li style="color:${MUTED_COLOR};">None</li>'

  const html = baseTemplate(
    'Daily Digest',
    `
    <h1 style="font-size:18px;font-weight:700;color:${BRAND_COLOR};margin:0 0 16px 0;">Daily Digest — ${escapeHtml(orgName)}</h1>
    <p style="font-size:14px;color:${TEXT_COLOR};margin:0 0 16px 0;line-height:1.5;">
      Here is your summary for <strong style="color:${TEXT_COLOR};">${escapeHtml(date)}</strong>.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:16px;">
      <tr>
        <td style="width:33%;padding:12px;background:${BG_COLOR};border:1px solid ${BORDER_COLOR};border-radius:6px 0 0 6px;text-align:center;">
          <div style="font-size:24px;font-weight:700;color:${RED_COLOR};">${violations}</div>
          <div style="font-size:10px;color:${MUTED_COLOR};text-transform:uppercase;letter-spacing:1px;margin-top:4px;">Violations</div>
        </td>
        <td style="width:33%;padding:12px;background:${BG_COLOR};border-top:1px solid ${BORDER_COLOR};border-bottom:1px solid ${BORDER_COLOR};text-align:center;">
          <div style="font-size:24px;font-weight:700;color:${BRAND_COLOR};">${newAgents}</div>
          <div style="font-size:10px;color:${MUTED_COLOR};text-transform:uppercase;letter-spacing:1px;margin-top:4px;">New Agents</div>
        </td>
        <td style="width:33%;padding:12px;background:${BG_COLOR};border:1px solid ${BORDER_COLOR};border-radius:0 6px 6px 0;text-align:center;">
          <div style="font-size:24px;font-weight:700;color:${AMBER_COLOR};">${revokedAgents}</div>
          <div style="font-size:10px;color:${MUTED_COLOR};text-transform:uppercase;letter-spacing:1px;margin-top:4px;">Revoked</div>
        </td>
      </tr>
    </table>
    <p style="font-size:12px;color:${MUTED_COLOR};margin:0 0 8px 0;text-transform:uppercase;letter-spacing:1px;">Top Violated Tools</p>
    <ul style="font-size:13px;color:${TEXT_COLOR};margin:0 0 16px 0;padding-left:18px;line-height:1.5;">
      ${toolList}
    </ul>
    <p style="font-size:12px;color:${MUTED_COLOR};margin:0;line-height:1.5;">
      View full details in the <a href="#" style="color:${BRAND_COLOR};text-decoration:none;">Passport Agent dashboard</a>.
    </p>
    `
  )
  const text = `Passport Agent — Daily Digest for ${orgName}\n\nDate: ${date}\nViolations: ${violations}\nNew Agents: ${newAgents}\nRevoked Agents: ${revokedAgents}\n\nTop Violated Tools:\n${topViolatedTools.join('\n') || 'None'}\n\nView full details in the dashboard.`
  return { html, text }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
