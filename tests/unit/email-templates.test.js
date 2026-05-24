import test from 'node:test'
import assert from 'node:assert/strict'
import {
  policyViolationTemplate,
  agentRevokedTemplate,
  systemAlertTemplate,
  welcomeTemplate,
  digestTemplate,
  verificationTemplate,
  passwordResetTemplate,
  accountLockedTemplate,
  generateEmail,
} from '../../dist/lib/email-templates.js'

// --- policyViolationTemplate ---

test('policyViolationTemplate returns HTML with agent name', () => {
  const { html, text } = policyViolationTemplate({
    agentName: 'TestBot',
    tool: 'delete_db',
    reason: 'tool_not_permitted',
    timestamp: '2024-01-15T10:30:00Z',
  })
  assert.ok(html.includes('TestBot'))
  assert.ok(html.includes('delete_db'))
  assert.ok(html.includes('tool_not_permitted'))
  assert.ok(html.includes('Policy Violation Detected'))
  assert.ok(text.includes('TestBot'))
  assert.ok(text.includes('Policy Violation Alert'))
})

test('policyViolationTemplate returns valid HTML structure', () => {
  const { html } = policyViolationTemplate({
    agentName: 'AgentX',
    tool: 'send_email',
    reason: 'rate_limit_exceeded',
    timestamp: '2024-06-01T12:00:00Z',
  })
  assert.ok(html.startsWith('<!DOCTYPE html>'))
  assert.ok(html.includes('</html>'))
  assert.ok(html.includes('<h1'))
  assert.ok(html.includes('TestBot') === false)
  assert.ok(html.includes('AgentX'))
})

test('policyViolationTemplate escapes HTML in inputs', () => {
  const { html } = policyViolationTemplate({
    agentName: '<script>alert("xss")</script>',
    tool: '"><img onerror=alert(1)>',
    reason: '&evil',
    timestamp: '2024-01-01',
  })
  assert.ok(!html.includes('<script>'))
  assert.ok(html.includes('&lt;script&gt;'))
  assert.ok(html.includes('&quot;&gt;'))
  assert.ok(html.includes('&amp;evil'))
})

test('policyViolationTemplate handles empty strings', () => {
  const { html, text } = policyViolationTemplate({
    agentName: '',
    tool: '',
    reason: '',
    timestamp: '',
  })
  assert.ok(html.includes('Policy Violation Detected'))
  assert.ok(typeof text === 'string')
})

test('policyViolationTemplate handles special unicode chars', () => {
  const { html } = policyViolationTemplate({
    agentName: 'Café_Passpo\u{1F600}',
    tool: 'tool_日本',
    reason: 'réàson_🔥',
    timestamp: '2024-01-01',
  })
  assert.ok(html.includes('Café_Passpo😀'))
  assert.ok(html.includes('tool_日本'))
})

// --- agentRevokedTemplate ---

test('agentRevokedTemplate returns HTML with agent and revoked info', () => {
  const { html, text } = agentRevokedTemplate({
    agentName: 'BotAlpha',
    revokedBy: 'admin@acme.com',
    timestamp: '2024-03-01T14:00:00Z',
  })
  assert.ok(html.includes('BotAlpha'))
  assert.ok(html.includes('admin@acme.com'))
  assert.ok(html.includes('revoked'))
  assert.ok(html.includes('Agent Access Revoked'))
  assert.ok(text.includes('BotAlpha'))
})

test('agentRevokedTemplate includes valid HTML structure', () => {
  const { html } = agentRevokedTemplate({
    agentName: 'Bot',
    revokedBy: 'system',
    timestamp: '2024-01-01',
  })
  assert.ok(html.startsWith('<!DOCTYPE html>'))
  assert.ok(html.includes('</html>'))
  assert.ok(html.includes('Revoked By'))
})

test('agentRevokedTemplate escapes HTML', () => {
  const { html } = agentRevokedTemplate({
    agentName: '<b>bold</b>',
    revokedBy: '"><script>',
    timestamp: '2024-01-01',
  })
  assert.ok(!html.includes('<b>bold</b>'))
  assert.ok(html.includes('&lt;b&gt;'))
  assert.ok(!html.includes('<script>'))
})

// --- systemAlertTemplate ---

test('systemAlertTemplate returns HTML with severity info-warning-critical', () => {
  const severities = [
    ['info', '#2ea043'],
    ['warning', '#d2991d'],
    ['critical', '#f85149'],
  ]
  for (const [sev, color] of severities) {
    const { html } = systemAlertTemplate({
      alertType: 'DB_FAILURE',
      message: 'Database connection lost',
      severity: sev,
    })
    assert.ok(html.includes('DB_FAILURE'))
    assert.ok(html.includes('Database connection lost'))
    assert.ok(html.includes(sev), `Severity "${sev}" should appear in HTML`)
    assert.ok(html.includes(color), `Severity ${sev} should have color ${color}`)
  }
})

test('systemAlertTemplate returns valid HTML', () => {
  const { html } = systemAlertTemplate({
    alertType: 'CPU_SPIKE',
    message: 'CPU usage above 90%',
    severity: 'critical',
  })
  assert.ok(html.startsWith('<!DOCTYPE html>'))
  assert.ok(html.includes('</html>'))
  assert.ok(html.includes('System Alert'))
})

test('systemAlertTemplate handles long messages', () => {
  const longMsg = 'Error: '.repeat(200)
  const { html } = systemAlertTemplate({
    alertType: 'LONG_MESSAGE',
    message: longMsg,
    severity: 'warning',
  })
  assert.ok(html.includes(longMsg))
})

test('systemAlertTemplate escapes HTML in alert type', () => {
  const { html } = systemAlertTemplate({
    alertType: '<img src=x onerror=alert(1)>',
    message: 'safe message',
    severity: 'info',
  })
  assert.ok(!html.includes('<img'))
  assert.ok(html.includes('&lt;img'))
})

// --- welcomeTemplate ---

test('welcomeTemplate returns HTML with org name and email', () => {
  const { html, text } = welcomeTemplate({
    orgName: 'Acme Corp',
    email: 'admin@acme.com',
  })
  assert.ok(html.includes('Acme Corp'))
  assert.ok(html.includes('admin@acme.com'))
  assert.ok(html.includes('Welcome to Passport Agent'))
  assert.ok(text.includes('Acme Corp'))
  assert.ok(text.includes('admin@acme.com'))
})

test('welcomeTemplate includes password when provided', () => {
  const { html, text } = welcomeTemplate({
    orgName: 'Startup Inc',
    email: 'ceo@startup.com',
    password: 's3cret!@#',
  })
  assert.ok(html.includes('s3cret!@#'))
  assert.ok(html.includes('Password'))
  assert.ok(text.includes('s3cret!@#'))
})

test('welcomeTemplate excludes password section when omitted', () => {
  const { html, text } = welcomeTemplate({
    orgName: 'NoPass',
    email: 'nopass@test.com',
  })
  assert.ok(!html.includes('Password'))
  assert.ok(!text.includes('Password:'))
})

test('welcomeTemplate escapes HTML in org name', () => {
  const { html } = welcomeTemplate({
    orgName: '<img src=x>',
    email: 'safe@test.com',
  })
  assert.ok(!html.includes('<img'))
  assert.ok(html.includes('&lt;img'))
})

test('welcomeTemplate handles empty password', () => {
  const { html } = welcomeTemplate({
    orgName: 'TestOrg',
    email: 'test@test.com',
    password: '',
  })
  assert.ok(!html.includes('Password'))
})

// --- digestTemplate ---

test('digestTemplate returns HTML with stats', () => {
  const { html, text } = digestTemplate({
    orgName: 'MegaCorp',
    date: '2024-05-15',
    violations: 12,
    newAgents: 3,
    revokedAgents: 1,
    topViolatedTools: ['web_search', 'send_email'],
  })
  assert.ok(html.includes('MegaCorp'))
  assert.ok(html.includes('12'))
  assert.ok(html.includes('3'))
  assert.ok(html.includes('1'))
  assert.ok(html.includes('web_search'))
  assert.ok(html.includes('send_email'))
  assert.ok(html.includes('Daily Digest'))
  assert.ok(text.includes('web_search'))
})

test('digestTemplate handles empty tool list', () => {
  const { html, text } = digestTemplate({
    orgName: 'EmptyTools',
    date: '2024-01-01',
    violations: 0,
    newAgents: 0,
    revokedAgents: 0,
    topViolatedTools: [],
  })
  assert.ok(html.includes('None'))
  assert.ok(text.includes('None'))
  assert.ok(html.includes('EmptyTools'))
})

test('digestTemplate handles large numbers', () => {
  const { html } = digestTemplate({
    orgName: 'BigOrg',
    date: '2024-12-31',
    violations: 99999,
    newAgents: 1000,
    revokedAgents: 500,
    topViolatedTools: ['tool_a', 'tool_b', 'tool_c', 'tool_d'],
  })
  assert.ok(html.includes('99999'))
  assert.ok(html.includes('1000'))
  assert.ok(html.includes('500'))
})

test('digestTemplate escapes HTML in org name and tools', () => {
  const { html } = digestTemplate({
    orgName: '<b>XSS</b>',
    date: '<script>',
    violations: 0,
    newAgents: 0,
    revokedAgents: 0,
    topViolatedTools: ['<img src=x>', '"><svg onload=alert(1)>'],
  })
  assert.ok(!html.includes('<b>XSS</b>'))
  assert.ok(html.includes('&lt;b&gt;'))
  assert.ok(!html.includes('<script>'))
  assert.ok(!html.includes('<img'))
  assert.ok(html.includes('&lt;img'))
})

// --- verificationTemplate ---

test('verificationTemplate returns HTML with email and url', () => {
  const { html, text } = verificationTemplate({
    email: 'user@example.com',
    verificationUrl: 'https://passport.ai/verify?token=abc123',
  })
  assert.ok(html.includes('user@example.com'))
  assert.ok(html.includes('https://passport.ai/verify?token=abc123'))
  assert.ok(html.includes('Verify Your Email'))
  assert.ok(text.includes('user@example.com'))
  assert.ok(text.includes('verificationUrl') === false)
  assert.ok(text.includes('https://passport.ai/verify?token=abc123'))
})

test('verificationTemplate has CTA button', () => {
  const { html } = verificationTemplate({
    email: 'a@b.com',
    verificationUrl: 'https://example.com/verify',
  })
  assert.ok(html.includes('Verify Email'))
  assert.ok(html.includes('<a href="https://example.com/verify"'))
  assert.ok(html.includes('24 hours'))
})

test('verificationTemplate handles long URLs', () => {
  const longUrl = 'https://example.com/verify?' + 'x'.repeat(500)
  const { html } = verificationTemplate({
    email: 'test@test.com',
    verificationUrl: longUrl,
  })
  assert.ok(html.includes(longUrl))
})

// --- passwordResetTemplate ---

test('passwordResetTemplate returns HTML with email and reset url', () => {
  const { html, text } = passwordResetTemplate({
    email: 'lost@example.com',
    resetUrl: 'https://passport.ai/reset?token=xyz789',
  })
  assert.ok(html.includes('lost@example.com'))
  assert.ok(html.includes('https://passport.ai/reset?token=xyz789'))
  assert.ok(html.includes('Reset Your Password'))
  assert.ok(html.includes('Reset Password'))
  assert.ok(text.includes('lost@example.com'))
})

test('passwordResetTemplate mentions 1 hour expiry', () => {
  const { html } = passwordResetTemplate({
    email: 'user@test.com',
    resetUrl: 'https://test.com/reset',
  })
  assert.ok(html.includes('1 hour'))
})

// --- accountLockedTemplate ---

test('accountLockedTemplate returns HTML with email and lockout minutes', () => {
  const { html, text } = accountLockedTemplate({
    email: 'locked@example.com',
    lockoutMinutes: 15,
  })
  assert.ok(html.includes('locked@example.com'))
  assert.ok(html.includes('15'))
  assert.ok(html.includes('minutes'))
  assert.ok(html.includes('Account Temporarily Locked'))
  assert.ok(text.includes('locked@example.com'))
  assert.ok(text.includes('15'))
})

test('accountLockedTemplate handles various lockout durations', () => {
  for (const mins of [1, 5, 30, 60, 1440]) {
    const { html } = accountLockedTemplate({
      email: 'test@test.com',
      lockoutMinutes: mins,
    })
    assert.ok(html.includes(String(mins)))
  }
})

test('accountLockedTemplate uses red danger styling', () => {
  const { html } = accountLockedTemplate({
    email: 'danger@test.com',
    lockoutMinutes: 30,
  })
  assert.ok(html.includes('#f85149'))
})

// --- generateEmail dispatcher ---

test('generateEmail dispatches to correct template - verification', () => {
  const result = generateEmail('verification', {
    email: 'test@test.com',
    verificationUrl: 'https://example.com/verify',
  })
  assert.ok(result.subject.includes('Verify Your Email'))
  assert.ok(result.html.includes('test@test.com'))
  assert.ok(typeof result.text === 'string')
})

test('generateEmail dispatches to correct template - passwordReset', () => {
  const result = generateEmail('passwordReset', {
    email: 'test@test.com',
    resetUrl: 'https://example.com/reset',
  })
  assert.ok(result.subject.includes('Reset Your Password'))
  assert.ok(result.html.includes('test@test.com'))
})

test('generateEmail dispatches to correct template - accountLocked', () => {
  const result = generateEmail('accountLocked', {
    email: 'test@test.com',
    lockoutMinutes: 10,
  })
  assert.ok(result.subject.includes('Account Temporarily Locked'))
})

test('generateEmail dispatches to correct template - policyViolation', () => {
  const result = generateEmail('policyViolation', {
    agentName: 'Agent',
    tool: 'tool',
    reason: 'reason',
    timestamp: '2024-01-01',
  })
  assert.ok(result.subject.includes('Policy Violation Detected'))
})

test('generateEmail dispatches to correct template - agentRevoked', () => {
  const result = generateEmail('agentRevoked', {
    agentName: 'Bot',
    revokedBy: 'admin',
    timestamp: '2024-01-01',
  })
  assert.ok(result.subject.includes('Agent Access Revoked'))
})

test('generateEmail dispatches to correct template - systemAlert', () => {
  const result = generateEmail('systemAlert', {
    alertType: 'TEST',
    message: 'test message',
    severity: 'info',
  })
  assert.ok(result.subject.includes('System Alert'))
  assert.ok(result.subject.includes('TEST'))
})

test('generateEmail dispatches to correct template - welcome', () => {
  const result = generateEmail('welcome', {
    orgName: 'Org',
    email: 'test@test.com',
  })
  assert.ok(result.subject.includes('Welcome to Passport Agent'))
})

test('generateEmail dispatches to correct template - digest', () => {
  const result = generateEmail('digest', {
    orgName: 'Org',
    date: '2024-01-01',
    violations: 0,
    newAgents: 0,
    revokedAgents: 0,
    topViolatedTools: [],
  })
  assert.ok(result.subject.includes('Daily Digest'))
})

test('generateEmail throws on unknown template', () => {
  assert.throws(
    () => generateEmail('nonexistent', {}),
    { message: /Unknown email template/ }
  )
})

test('generateEmail includes valid HTML for all template types', () => {
  const templates = [
    ['verification', { email: 't@t.com', verificationUrl: 'https://x.com' }],
    ['passwordReset', { email: 't@t.com', resetUrl: 'https://x.com' }],
    ['accountLocked', { email: 't@t.com', lockoutMinutes: 5 }],
    ['policyViolation', { agentName: 'A', tool: 'T', reason: 'R', timestamp: '2024-01-01' }],
    ['agentRevoked', { agentName: 'A', revokedBy: 'B', timestamp: '2024-01-01' }],
    ['systemAlert', { alertType: 'X', message: 'M', severity: 'info' }],
    ['welcome', { orgName: 'O', email: 't@t.com' }],
    ['digest', { orgName: 'O', date: '2024-01-01', violations: 0, newAgents: 0, revokedAgents: 0, topViolatedTools: [] }],
  ]
  for (const [tpl, data] of templates) {
    const result = generateEmail(tpl, data)
    assert.ok(result.html.startsWith('<!DOCTYPE html>'), `Template ${tpl} has valid HTML`)
    assert.ok(result.html.includes('</html>'), `Template ${tpl} closes HTML`)
    assert.ok(result.subject.length > 0, `Template ${tpl} has a subject`)
    assert.ok(result.text.length > 0, `Template ${tpl} has text content`)
  }
})
