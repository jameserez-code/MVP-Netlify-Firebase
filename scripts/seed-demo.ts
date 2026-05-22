#!/usr/bin/env node
// Demo data seed script — creates comprehensive realistic demo data
// Run: npx tsx scripts/seed-demo.ts [options]
//
// Options:
//   --scenario=customer-support|data-analyst|ecommerce   Pre-built scenario
//   --days=30          Generate N days of audit data
//   --orgs=5           Generate data for N organizations
//   --volume=high      Generate 10K+ enforcements for load testing
//   --output=file.json Export generated data to JSON file
//   --no-color         Disable colorized output
//   --help             Show this help

import { initFirebase } from '../src/lib/firebase.js'
import { log } from '../src/lib/logger.js'
import { hashPassword } from '../src/lib/password.js'
import { generateId, generatePassportNumber } from '../src/lib/crypto.js'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const db = initFirebase()

interface CliOptions {
  scenario: 'customer-support' | 'data-analyst' | 'ecommerce' | null
  days: number
  orgs: number
  volume: 'normal' | 'high'
  output: string | null
  color: boolean
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  const options: CliOptions = {
    scenario: null,
    days: 1,
    orgs: 1,
    volume: 'normal',
    output: null,
    color: true,
  }

  for (const arg of args) {
    if (arg === '--help') {
      printHelp()
      process.exit(0)
    }
    if (arg === '--no-color') {
      options.color = false
      continue
    }
    const match = arg.match(/^--(\w+)=(.+)$/)
    if (!match) continue
    const [, key, value] = match
    switch (key) {
      case 'scenario':
        if (['customer-support', 'data-analyst', 'ecommerce'].includes(value)) {
          options.scenario = value as CliOptions['scenario']
        } else {
          console.error(`Invalid scenario: ${value}. Valid: customer-support, data-analyst, ecommerce`)
          process.exit(1)
        }
        break
      case 'days':
        options.days = parseInt(value, 10)
        if (isNaN(options.days) || options.days < 1 || options.days > 365) {
          console.error('--days must be between 1 and 365')
          process.exit(1)
        }
        break
      case 'orgs':
        options.orgs = parseInt(value, 10)
        if (isNaN(options.orgs) || options.orgs < 1 || options.orgs > 100) {
          console.error('--orgs must be between 1 and 100')
          process.exit(1)
        }
        break
      case 'volume':
        if (value === 'high') options.volume = 'high'
        break
      case 'output':
        options.output = value
        break
    }
  }

  return options
}

function printHelp() {
  console.log(`
Passport Agent — Demo Data Seeder v2.1

Usage: npx tsx scripts/seed-demo.ts [options]

Options:
  --scenario=customer-support  Use the HelpDesk AI customer support scenario
  --scenario=data-analyst      Use the DataVault Analytics scenario
  --scenario=ecommerce         Use the ShopSphere e-commerce scenario
  --days=30                    Generate N days of backdated audit logs
  --orgs=5                     Generate N separate organizations
  --volume=high                Generate 10,000+ enforcement logs (load testing)
  --output=data.json           Export generated data to a JSON file
  --no-color                   Disable colorized console output

Examples:
  npm run demo:seed
  npm run demo:seed -- --scenario=customer-support
  npm run demo:seed -- --scenario=data-analyst --days=30 --volume=high
  npm run demo:seed -- --orgs=5 --volume=high --output=bulk-data.json
`)
}

// ANSI color codes for pretty console output
const C = options().color
  ? {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      dim: '\x1b[2m',
      green: '\x1b[32m',
      cyan: '\x1b[36m',
      yellow: '\x1b[33m',
      red: '\x1b[31m',
      magenta: '\x1b[35m',
      blue: '\x1b[34m',
    }
  : { reset: '', bright: '', dim: '', green: '', cyan: '', yellow: '', red: '', magenta: '', blue: '' }

function options(): CliOptions {
  return _opts
}
let _opts: CliOptions

function color(text: string, c: string): string {
  return options().color ? `${c}${text}${C.reset}` : text
}

function hr() {
  console.log(color('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', C.dim))
}

function section(title: string) {
  console.log('')
  console.log(color(`  ${title}`, C.bright + C.cyan))
  hr()
}

function success(label: string, detail?: string) {
  const d = detail ? color(`  ${detail}`, C.dim) : ''
  console.log(`  ${color('✓', C.green)} ${label}${d}`)
}

// Progress bar
function progressBar(current: number, total: number, width = 30): string {
  const pct = Math.min(current / total, 1)
  const filled = Math.round(width * pct)
  const empty = width - filled
  const bar = '█'.repeat(filled) + '░'.repeat(empty)
  const percent = Math.round(pct * 100)
  return `${bar} ${percent}% (${current}/${total})`
}

function showProgress(current: number, total: number, label: string) {
  const barWidth = 20
  const pct = Math.min(current / total, 1)
  const filled = Math.round(barWidth * pct)
  const empty = barWidth - filled
  const bar = color('█'.repeat(filled), C.green) + '░'.repeat(empty)
  const percent = color(`${Math.round(pct * 100)}%`.padStart(4), C.yellow)
  process.stdout.write(`\r  ${bar} ${percent}  ${label}${' '.repeat(20)}`)
  if (current >= total) {
    process.stdout.write('\n')
  }
}

// ---------------------------------------------------------------------------
// Scenario loader
// ---------------------------------------------------------------------------

interface ScenarioData {
  scenario: string
  name: string
  org: Record<string, unknown>
  agents: Record<string, unknown>[]
  policies: Record<string, unknown>[]
  enforcementLogs: Record<string, unknown>[]
}

function loadScenario(name: string): ScenarioData {
  const path = resolve(__dirname, '..', 'demo', 'scenarios', `${name}.json`)
  try {
    const raw = readFileSync(path, 'utf-8')
    return JSON.parse(raw)
  } catch {
    console.error(color(`Scenario file not found: ${path}`, C.red))
    process.exit(1)
  }
}

// ---------------------------------------------------------------------------
// Data definitions
// ---------------------------------------------------------------------------

const ORG_NAMES = [
  { name: 'Acme Corp', slug: 'acme-corp', plan: 'enterprise' },
  { name: 'Globex Inc', slug: 'globex-inc', plan: 'pro' },
  { name: 'Initech Solutions', slug: 'initech', plan: 'pro' },
  { name: 'Umbrella Analytics', slug: 'umbrella', plan: 'enterprise' },
  { name: 'Stark Industries', slug: 'stark', plan: 'enterprise' },
  { name: 'Wayne Enterprises', slug: 'wayne', plan: 'enterprise' },
  { name: 'Cyberdyne Systems', slug: 'cyberdyne', plan: 'pro' },
  { name: 'Massive Dynamic', slug: 'massive-dynamic', plan: 'enterprise' },
  { name: 'Soylent Corp', slug: 'soylent', plan: 'free' },
  { name: 'Hooli', slug: 'hooli', plan: 'pro' },
]

const AGENTS = [
  { name: 'Customer Support Bot', model: 'gpt-4o', provider: 'openai', status: 'active' },
  { name: 'Sales Assistant', model: 'claude-3-opus-20240229', provider: 'anthropic', status: 'active' },
  { name: 'Data Analyst', model: 'gpt-4-turbo', provider: 'openai', status: 'active' },
  { name: 'Code Reviewer', model: 'claude-3-sonnet-20240229', provider: 'anthropic', status: 'revoked' },
  { name: 'Security Scanner', model: 'gpt-4o-mini', provider: 'openai', status: 'active' },
]

const POLICIES = [
  {
    name: 'Safe Web Search',
    description: 'Allow web search tools with safe domain restrictions',
    rules: {
      allowedTools: [{ toolName: 'web_search', parameterConstraints: { query: { type: 'string', maxLength: 200 } } }],
      deniedTools: ['execute_code', 'send_email'],
      allowedDomains: [{ pattern: '*.wikipedia.org', methods: ['GET'] }, { pattern: '*.gov', methods: ['GET'] }],
      deniedDomains: ['*.darkweb.*', 'localhost'],
      dataRestrictions: { denyPiiInParameters: true },
    },
  },
  {
    name: 'Read-Only Database',
    description: 'Database queries are allowed but no mutations',
    rules: {
      allowedTools: [{ toolName: 'db_query', parameterConstraints: { sql: { type: 'string', pattern: '^SELECT' } } }],
      deniedTools: ['db_write', 'db_delete', 'db_drop'],
      dataRestrictions: { denyPiiInParameters: true, denySecretsInParameters: true },
    },
  },
  {
    name: 'No PII Access',
    description: 'Strictly deny any tool calls containing PII',
    rules: {
      allowedTools: [{ toolName: 'lookup_order', parameterConstraints: { orderId: { type: 'string' } } }],
      deniedTools: ['access_customer_profile', 'export_user_data'],
      dataRestrictions: { denyPiiInParameters: true, denySecretsInParameters: true },
    },
  },
  {
    name: 'Internal APIs Only',
    description: 'Restrict network calls to internal domains',
    rules: {
      allowedTools: [{ toolName: 'http_request', parameterConstraints: { url: { type: 'string' } } }],
      allowedDomains: [{ pattern: '*.internal.acme.com', methods: ['GET', 'POST'] }, { pattern: 'api.acme.com', methods: ['GET'] }],
      deniedDomains: ['*.external.com', '169.254.169.254'],
    },
  },
  {
    name: 'Cost-Conscious LLM',
    description: 'Enforce cost limits per request and daily budget',
    rules: {
      allowedTools: [{ toolName: 'llm_generate', parameterConstraints: { maxTokens: { type: 'number', max: 500 } } }],
      costLimit: { maxPerRequest: 50, maxPerDay: 1000 },
      dataRestrictions: { denySecretsInParameters: true },
    },
  },
  {
    name: 'Sandboxed Execution',
    description: 'Allow safe code execution in sandboxed environment',
    rules: {
      allowedTools: [{ toolName: 'sandbox_run', parameterConstraints: { language: { type: 'string', enum: ['python', 'javascript'] } } }],
      deniedTools: ['shell_exec', 'file_system_write'],
      dataRestrictions: { denyPiiInParameters: true },
    },
  },
  {
    name: 'Audit-Only Mode',
    description: 'Log all intents but deny execution (safe monitoring)',
    rules: {
      allowedTools: [],
      deniedTools: ['*'],
      dataRestrictions: { denyPiiInParameters: true },
    },
  },
  {
    name: 'Email Restricted',
    description: 'Block all email sending capabilities',
    rules: {
      allowedTools: [{ toolName: 'draft_email', parameterConstraints: { to: { type: 'string' } } }],
      deniedTools: ['send_email', 'bulk_email', 'schedule_email'],
      dataRestrictions: { denyPiiInParameters: true },
    },
  },
]

const TASK_DESCRIPTIONS = [
  'Process customer refund request #4821',
  'Generate monthly sales report for Q3',
  'Analyze user churn patterns from last 30 days',
  'Review pull request #892 for security issues',
  'Scan repository for exposed secrets',
  'Summarize support tickets from tier-1 queue',
  'Update product inventory database',
  'Draft response to enterprise RFP',
  'Validate new user signup flow',
  'Compile compliance audit documentation',
  'Optimize database query performance',
  'Generate API documentation from OpenAPI spec',
  'Detect anomalous login patterns',
  'Sync CRM data with marketing platform',
  'Rebuild search index for product catalog',
]

const AUDIT_ACTIONS = [
  { tool: 'lookup_order', decision: 'allow', reason: 'Within policy', parameters: { orderId: 'ORD-12345' } },
  { tool: 'send_email', decision: 'deny', reason: 'tool_explicitly_blocked', parameters: { to: 'customer@example.com' } },
  { tool: 'web_search', decision: 'allow', reason: 'Within policy', parameters: { query: 'Passport Agent documentation' } },
  { tool: 'db_query', decision: 'allow', reason: 'Within policy', parameters: { sql: 'SELECT * FROM users LIMIT 10' } },
  { tool: 'db_write', decision: 'deny', reason: 'tool_explicitly_blocked', parameters: { table: 'users' } },
  { tool: 'http_request', decision: 'deny', reason: 'domain_blocked', parameters: { url: 'http://169.254.169.254/latest/meta-data' } },
  { tool: 'sandbox_run', decision: 'allow', reason: 'Within policy', parameters: { language: 'python', code: 'print(42)' } },
  { tool: 'shell_exec', decision: 'deny', reason: 'tool_explicitly_blocked', parameters: { cmd: 'rm -rf /' } },
  { tool: 'llm_generate', decision: 'allow', reason: 'Within policy', parameters: { prompt: 'Summarize this article', maxTokens: 200 } },
  { tool: 'access_customer_profile', decision: 'deny', reason: 'tool_explicitly_blocked', parameters: { customerId: 'CUST-999' } },
  { tool: 'web_search', decision: 'deny', reason: 'pii_detected', parameters: { query: 'Customer SSN 123-45-6789 history' } },
  { tool: 'db_query', decision: 'deny', reason: 'sql_injection_detected', parameters: { sql: 'SELECT * FROM users UNION SELECT password FROM admin' } },
  { tool: 'sandbox_run', decision: 'allow', reason: 'Within policy', parameters: { language: 'python', code: 'import pandas; print(pandas.__version__)' } },
  { tool: 'export_csv', decision: 'deny', reason: 'tool_explicitly_blocked', parameters: { query: 'SELECT * FROM users', file: 'dump.csv' } },
  { tool: 'http_request', decision: 'allow', reason: 'Within policy', parameters: { url: 'https://api.internal.acme.com/v1/users', method: 'GET' } },
]

// ---------------------------------------------------------------------------
// Seed functions
// ---------------------------------------------------------------------------

async function seedOrg(orgId: string, orgIndex: number, now: string) {
  const orgDef = ORG_NAMES[orgIndex % ORG_NAMES.length]
  const adminEmail = `admin@${orgDef.slug}.com`
  const password = process.env.ADMIN_PASSWORD || 'AcmeDemo2024!'

  const { hash, salt } = hashPassword(password)

  await db.collection('organizations').doc(orgId).set({
    id: orgId,
    name: orgDef.name,
    slug: orgDef.slug,
    plan: orgDef.plan,
    monthlyCredentialLimit: 10000,
    credentialsIssuedThisMonth: 42,
    ownerId: adminEmail,
    members: [adminEmail, `ops@${orgDef.slug}.com`, `dev@${orgDef.slug}.com`],
    createdAt: now,
  })
  success('Organization', `${orgDef.name} (${orgId})`)

  await db.collection('users').doc(adminEmail).set({
    email: adminEmail,
    displayName: `${orgDef.name} Admin`,
    role: 'org_admin',
    orgId,
    passwordHash: hash,
    passwordSalt: salt,
    passwordIterations: 100_000,
    createdAt: now,
    lastLoginAt: now,
  })
  success('Admin', adminEmail)

  return { orgId, adminEmail, orgDef }
}

async function seedAgents(orgId: string, now: string) {
  section('Agents')
  const agentIds: string[] = []

  for (const agentDef of AGENTS) {
    const agentId = generateId('agent_')
    const passportNumber = generatePassportNumber()

    await db.collection('agents').doc(agentId).set({
      id: agentId,
      name: agentDef.name,
      model: agentDef.model,
      provider: agentDef.provider,
      orgId,
      status: agentDef.status,
      capabilities: ['task:execute', 'network:http', 'audit:read'],
      passport: {
        passportNumber,
        model: agentDef.model,
        provider: agentDef.provider,
        modelVersion: agentDef.model,
        systemPromptHash: `sha256:${generateId('', 64)}`,
        origin: { createdBy: 'seed_script', createdAt: now, environment: 'production' },
      },
      signingKey: {
        keyId: generateId('key_', 14),
        secretHash: generateId('', 128),
        secretSalt: generateId('', 64),
        algorithm: 'hmac-sha256',
        iterations: 50000,
        rotatedAt: null,
      },
      registeredAt: now,
      lastSeenAt: agentDef.status === 'active' ? now : null,
      revokedAt: agentDef.status === 'revoked' ? now : null,
      revokedBy: agentDef.status === 'revoked' ? 'admin' : null,
      revokedReason: agentDef.status === 'revoked' ? 'Decommissioned for upgrade' : null,
      metadata: { seeded: true, version: '2.1.0' },
    })

    agentIds.push(agentId)
    success(agentDef.name, `${agentDef.provider} · ${agentDef.model} · ${agentDef.status}`)
  }

  return agentIds
}

async function seedPolicies(orgId: string, now: string) {
  section('Policies')
  const policyIds: string[] = []

  for (let i = 0; i < POLICIES.length; i++) {
    const pol = POLICIES[i]
    const policyId = generateId('pol_')

    await db.collection('policies').doc(policyId).set({
      id: policyId,
      orgId,
      name: pol.name,
      description: pol.description,
      status: 'active',
      scope: { agentId: '*', environment: ['production', 'staging'] },
      rules: pol.rules,
      priority: (i + 1) * 10,
      createdAt: now,
      updatedAt: now,
    })

    policyIds.push(policyId)
    success(pol.name, `priority ${(i + 1) * 10}`)
  }

  return policyIds
}

async function seedTasks(orgId: string, agentIds: string[], now: string) {
  section('Tasks')
  const taskIds: string[] = []
  const statuses = ['pending', 'running', 'completed', 'failed', 'completed', 'pending', 'running', 'completed']

  for (let i = 0; i < 15; i++) {
    const taskId = generateId('task_')
    const status = statuses[i % statuses.length]
    const agentId = agentIds[i % agentIds.length]

    const taskDoc: Record<string, unknown> = {
      orgId,
      payload: { description: TASK_DESCRIPTIONS[i % TASK_DESCRIPTIONS.length], priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low', tags: ['demo', 'seeded'] },
      status,
      createdAt: now,
      updatedAt: now,
      runCount: status === 'completed' || status === 'failed' ? 1 : 0,
      retryCount: status === 'failed' ? 1 : 0,
      error: status === 'failed' ? 'Simulated failure for demo purposes' : null,
    }

    if (status === 'queued') taskDoc.queuedAt = now
    if (status === 'running') { taskDoc.startedAt = now; taskDoc.queuedAt = now }
    if (status === 'completed') { taskDoc.startedAt = now; taskDoc.completedAt = now; taskDoc.queuedAt = now }
    if (status === 'failed') { taskDoc.startedAt = now; taskDoc.failedAt = now; taskDoc.queuedAt = now }

    await db.collection('tasks').doc(taskId).set(taskDoc)
    taskIds.push(taskId)
    success(`Task ${i + 1}`, `${status} · ${taskDoc.payload.description}`)
  }

  return taskIds
}

async function seedAuditLogs(orgId: string, agentIds: string[], now: string, days: number, volume: 'normal' | 'high') {
  section('Audit Logs')
  const logIds: string[] = []
  const count = volume === 'high' ? 10000 : days > 1 ? days * 30 : 25

  for (let i = 0; i < count; i++) {
    const action = AUDIT_ACTIONS[i % AUDIT_ACTIONS.length]
    const agentId = agentIds[i % agentIds.length]
    const logId = generateId('log_')

    // Spread timestamps across the specified number of days
    const minutesPerDay = 1440
    const totalMinutes = days * minutesPerDay
    const minuteOffset = Math.floor((i / count) * totalMinutes)
    const timestamp = new Date(Date.now() - minuteOffset * 60000).toISOString()

    await db.collection('logs').doc(logId).set({
      agentId,
      runId: i < count / 3 ? generateId('run_') : null,
      tool: action.tool,
      decision: action.decision,
      reason: action.reason,
      parameters: action.parameters,
      timestamp,
      requestId: generateId('req_', 8),
      orgId,
    })

    logIds.push(logId)

    // Show progress for larger datasets
    if (count >= 100 && (i % 100 === 0 || i === count - 1)) {
      showProgress(i + 1, count, 'Audit logs')
    }
  }

  if (count < 100) {
    success(`${logIds.length} audit log entries`, `${days} day(s) · ${volume} volume`)
  } else {
    success(`${logIds.length} audit log entries`, `${days} days · ${volume} volume`)
  }
  return logIds
}

async function seedSessionsAndRuns(orgId: string, agentIds: string[], taskIds: string[], now: string) {
  section('Sessions & Runs')
  const sessionIds: string[] = []

  for (let i = 0; i < 3; i++) {
    const sessionId = generateId('sess_')
    const agentId = agentIds[i % agentIds.length]

    await db.collection('sessions').doc(sessionId).set({
      id: sessionId, orgId, agentId, status: i === 0 ? 'active' : 'closed',
      startedAt: now, endedAt: i === 0 ? null : now, taskIds: taskIds.slice(i * 3, i * 3 + 3),
    })

    for (let r = 0; r < 2 + (i % 2); r++) {
      const runId = generateId('run_')
      const taskId = taskIds[(i * 3 + r) % taskIds.length]
      const status = r === 0 ? 'completed' : 'running'

      await db.collection('runs').doc(runId).set({
        id: runId, orgId, agentId, taskId, sessionId, status,
        startedAt: now, endedAt: status === 'completed' ? now : null,
        error: null, updatedAt: now, createdAt: now,
        totalActions: r === 0 ? 5 : 2, allowedActions: r === 0 ? 4 : 1,
        deniedActions: r === 0 ? 1 : 1, durationMs: status === 'completed' ? 1240 + r * 500 : null,
      })
    }

    sessionIds.push(sessionId)
    success(`Session ${i + 1}`, `${agentId.substring(0, 14)}... · ${i === 0 ? 'active' : 'closed'}`)
  }

  return sessionIds
}

// ---------------------------------------------------------------------------
// Scenario-based seeding
// ---------------------------------------------------------------------------

async function seedFromScenario(data: ScenarioData) {
  const now = new Date().toISOString()
  const orgId = data.org.id as string
  const adminEmail = data.org.ownerId as string
  const password = process.env.ADMIN_PASSWORD || 'AcmeDemo2024!'

  section(`Scenario: ${data.name}`)

  // Org
  const { hash, salt } = hashPassword(password)
  await db.collection('organizations').doc(orgId).set({
    ...data.org,
    id: orgId,
    createdAt: now,
  })
  success('Organization', `${data.org.name} (${orgId})`)

  // Admin
  await db.collection('users').doc(adminEmail).set({
    email: adminEmail,
    displayName: `${data.org.name} Admin`,
    role: 'org_admin',
    orgId,
    passwordHash: hash,
    passwordSalt: salt,
    passwordIterations: 100_000,
    createdAt: now,
    lastLoginAt: now,
  })
  success('Admin', adminEmail)

  // Agents
  const agentIds: string[] = []
  for (const agentDef of data.agents) {
    const agentId = agentDef.id as string
    const passportNumber = generatePassportNumber()

    await db.collection('agents').doc(agentId).set({
      ...agentDef,
      orgId,
      passport: {
        passportNumber,
        model: agentDef.model || 'unknown',
        provider: agentDef.provider || 'unknown',
        modelVersion: agentDef.model || 'unknown',
        systemPromptHash: `sha256:${generateId('', 64)}`,
        origin: { createdBy: 'seed_script', createdAt: now, environment: 'production' },
      },
      signingKey: {
        keyId: generateId('key_', 14),
        secretHash: generateId('', 128),
        secretSalt: generateId('', 64),
        algorithm: 'hmac-sha256',
        iterations: 50000,
        rotatedAt: null,
      },
      metadata: { seeded: true, version: '2.1.0' },
    })

    agentIds.push(agentId)
    success(agentDef.name || agentId, `${agentDef.provider} · ${agentDef.model}`)
  }

  // Policies
  const policyIds: string[] = []
  for (const polDef of data.policies) {
    const policyId = polDef.id as string

    await db.collection('policies').doc(policyId).set({
      ...polDef,
      orgId,
    })

    policyIds.push(policyId)
    success(polDef.name || policyId, `priority ${polDef.priority}`)
  }

  // Enforcement Logs
  const logIds: string[] = []
  for (const logDef of data.enforcementLogs) {
    const logId = logDef.id as string
    await db.collection('logs').doc(logId).set({
      ...logDef,
      orgId,
    })
    logIds.push(logId)
  }
  success(`${logIds.length} enforcement logs`, 'from scenario')

  // Generate additional audit data if --days > 1 or --volume high
  if (_opts.days > 1 || _opts.volume === 'high') {
    await seedAuditLogs(orgId, agentIds, now, _opts.days, _opts.volume)
  }

  return { orgId, agentIds, policyIds, logIds }
}

// ---------------------------------------------------------------------------
// Data export
// ---------------------------------------------------------------------------

interface ExportData {
  exportedAt: string
  options: CliOptions
  organizations: Record<string, unknown> | Record<string, unknown>[]
  agents: Record<string, unknown>[]
  policies: Record<string, unknown>[]
  logs: Record<string, unknown>[]
  tasks: Record<string, unknown>[]
  runs: Record<string, unknown>[]
}

async function exportData(
  orgId: string,
  agentIds: string[],
  policyIds: string[],
  logIds: string[],
  taskIds: string[],
  runIds: string[],
  outputPath: string,
) {
  const orgDoc = (await db.collection('organizations').doc(orgId).get()).data() || {}

  const data: ExportData = {
    exportedAt: new Date().toISOString(),
    options: _opts,
    organizations: orgDoc,
    agents: [],
    policies: [],
    logs: [],
    tasks: [],
    runs: [],
  }

  for (const id of agentIds) {
    const doc = (await db.collection('agents').doc(id).get()).data()
    if (doc) data.agents.push(doc)
  }
  for (const id of policyIds) {
    const doc = (await db.collection('policies').doc(id).get()).data()
    if (doc) data.policies.push(doc)
  }
  for (const id of logIds) {
    const doc = (await db.collection('logs').doc(id).get()).data()
    if (doc) data.logs.push(doc)
  }
  for (const id of taskIds) {
    const doc = (await db.collection('tasks').doc(id).get()).data()
    if (doc) data.tasks.push(doc)
  }
  for (const id of runIds) {
    const doc = (await db.collection('runs').doc(id).get()).data()
    if (doc) data.runs.push(doc)
  }

  const outputFile = resolve(process.cwd(), outputPath)
  writeFileSync(outputFile, JSON.stringify(data, null, 2))
  success('Export', `${outputFile} (${JSON.stringify(data).length.toLocaleString()} bytes)`)
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

function printSummary(
  orgName: string,
  adminEmail: string,
  orgId: string,
  agentIds: string[],
  policyIds: string[],
  taskIds: string[],
  logIds: string[],
  sessionIds: string[],
) {
  console.log('')
  console.log(color('  ╔══════════════════════════════════════════════════════════════╗', C.green + C.bright))
  console.log(color('  ║                   Demo Data Seed Complete                    ║', C.green + C.bright))
  console.log(color('  ╚══════════════════════════════════════════════════════════════╝', C.green + C.bright))
  console.log('')

  const rows = [
    ['Organization', color(orgName, C.cyan), orgId],
    ['Admin User', color(adminEmail, C.cyan), 'org_admin'],
    ['Agents', color(String(agentIds.length), C.yellow), ''],
    ['Policies', color(String(policyIds.length), C.yellow), ''],
    ['Tasks', color(String(taskIds.length), C.yellow), ''],
    ['Audit Logs', color(String(logIds.length), C.yellow), ''],
    ['Sessions', color(String(sessionIds.length), C.yellow), ''],
  ]

  const maxLabel = Math.max(...rows.map((r) => String(r[0]).length))

  for (const [label, value, detail] of rows) {
    const paddedLabel = String(label).padEnd(maxLabel, ' ')
    console.log(`  ${color(paddedLabel, C.bright)}  ${value}  ${color(String(detail), C.dim)}`)
  }

  hr()
  console.log(`  ${color('API:', C.bright)} ${color('http://localhost:3000', C.blue)}`)
  console.log('')
  console.log(color('  Next steps:', C.bright + C.yellow))
  console.log(`    ${color('→', C.green)} npm run dev          # Start the API server`)
  console.log(`    ${color('→', C.green)} npm run test:e2e     # Run Playwright E2E tests`)
  console.log(`    ${color('→', C.green)} open operator.html   # Open operator console`)
  console.log('')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  _opts = parseArgs()

  console.log('')
  console.log(color('  ╔══════════════════════════════════════════════════════════════╗', C.cyan + C.bright))
  console.log(color('  ║           Passport Agent — Demo Data Seeder v2.1             ║', C.cyan + C.bright))
  console.log(color('  ╚══════════════════════════════════════════════════════════════╝', C.cyan + C.bright))

  if (_opts.scenario) {
    console.log(color(`  Scenario: ${_opts.scenario}  │  Days: ${_opts.days}  │  Volume: ${_opts.volume}`, C.dim))
  } else {
    console.log(color(`  Orgs: ${_opts.orgs}  │  Days: ${_opts.days}  │  Volume: ${_opts.volume}`, C.dim))
  }

  const now = new Date().toISOString()

  try {
    let orgId: string
    let agentIds: string[]
    let policyIds: string[]
    let logIds: string[] = []
    let taskIds: string[] = []
    let sessionIds: string[] = []
    let orgName = ''
    let adminEmail = ''

    if (_opts.scenario) {
      const data = loadScenario(_opts.scenario)
      const result = await seedFromScenario(data)
      orgId = result.orgId
      agentIds = result.agentIds
      policyIds = result.policyIds
      logIds = result.logIds
      orgName = data.org.name as string
      adminEmail = data.org.ownerId as string
      taskIds = []
      sessionIds = []
    } else {
      // Multi-org seeding
      for (let o = 0; o < _opts.orgs; o++) {
        const orgIdLocal = generateId('org_')
        const { adminEmail: adminEm } = await seedOrg(orgIdLocal, o, now)
        const agentIdsLocal = await seedAgents(orgIdLocal, now)
        const policyIdsLocal = await seedPolicies(orgIdLocal, now)
        const taskIdsLocal = await seedTasks(orgIdLocal, agentIdsLocal, now)
        const logIdsLocal = await seedAuditLogs(orgIdLocal, agentIdsLocal, now, _opts.days, _opts.volume)
        const sessionIdsLocal = await seedSessionsAndRuns(orgIdLocal, agentIdsLocal, taskIdsLocal, now)

        if (o === 0) {
          orgId = orgIdLocal
          agentIds = agentIdsLocal
          policyIds = policyIdsLocal
          taskIds = taskIdsLocal
          logIds = logIdsLocal
          sessionIds = sessionIdsLocal
          orgName = ORG_NAMES[0].name
          adminEmail = adminEm
        } else {
          agentIds.push(...agentIdsLocal)
          policyIds.push(...policyIdsLocal)
          taskIds.push(...taskIdsLocal)
          logIds.push(...logIdsLocal)
          sessionIds.push(...sessionIdsLocal)
        }
      }
    }

    // Export if requested
    if (_opts.output) {
      await exportData(orgId!, agentIds!, policyIds!, logIds!, taskIds!, sessionIds || [], _opts.output)
    }

    printSummary(orgName, adminEmail, orgId!, agentIds!, policyIds!, taskIds!, logIds!, sessionIds || [])

    log.success('demo seed complete', {
      scenario: _opts.scenario || 'default',
      orgs: _opts.orgs,
      agents: agentIds!.length,
      policies: policyIds!.length,
      tasks: taskIds!.length,
      logs: logIds!.length,
      sessions: sessionIds ? sessionIds.length : 0,
    })

    process.exit(0)
  } catch (err: any) {
    console.error(color('\n  [ERROR] Seed failed:', C.red + C.bright), err.message)
    console.error(err.stack)
    process.exit(1)
  }
}

main()
