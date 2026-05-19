#!/usr/bin/env node
// Demo data seed script — creates comprehensive realistic demo data
// Run: npx tsx scripts/seed-demo.ts
// Requires: Firebase configured, ADMIN_PASSWORD set for user creation

import { initFirebase } from '../src/lib/firebase.js'
import { log } from '../src/lib/logger.js'
import { hashPassword } from '../src/lib/password.js'
import { generateId, generatePassportNumber } from '../src/lib/crypto.js'

const db = initFirebase()

// ANSI color codes for pretty console output
const C = {
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

function color(text: string, color: string): string {
  return `${color}${text}${C.reset}`
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

// ---------------------------------------------------------------------------
// Demo data definitions
// ---------------------------------------------------------------------------

const ORG_NAME = 'Acme Corp'
const ADMIN_EMAIL = 'admin@acmecorp.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AcmeDemo2024!'

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
]

// ---------------------------------------------------------------------------
// Seed functions
// ---------------------------------------------------------------------------

async function seedOrg(orgId: string, now: string) {
  section('Organization & Admin')

  const { hash, salt } = hashPassword(ADMIN_PASSWORD)

  await db.collection('organizations').doc(orgId).set({
    id: orgId,
    name: ORG_NAME,
    slug: 'acme-corp',
    plan: 'enterprise',
    monthlyCredentialLimit: 10000,
    credentialsIssuedThisMonth: 42,
    ownerId: ADMIN_EMAIL,
    members: [ADMIN_EMAIL, 'ops@acmecorp.com', 'dev@acmecorp.com'],
    createdAt: now,
  })
  success('Organization', `${ORG_NAME} (${orgId})`)

  await db.collection('users').doc(ADMIN_EMAIL).set({
    email: ADMIN_EMAIL,
    displayName: `${ORG_NAME} Admin`,
    role: 'org_admin',
    orgId,
    passwordHash: hash,
    passwordSalt: salt,
    passwordIterations: 100_000,
    createdAt: now,
    lastLoginAt: now,
  })
  success('Admin User', ADMIN_EMAIL)

  return orgId
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
        origin: {
          createdBy: 'seed_script',
          createdAt: now,
          environment: 'production',
        },
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
      revokedBy: agentDef.status === 'revoked' ? ADMIN_EMAIL : null,
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
      scope: {
        agentId: '*',
        environment: ['production', 'staging'],
      },
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
      payload: {
        description: TASK_DESCRIPTIONS[i % TASK_DESCRIPTIONS.length],
        priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
        tags: ['demo', 'seeded'],
      },
      status,
      createdAt: now,
      updatedAt: now,
      runCount: status === 'completed' || status === 'failed' ? 1 : 0,
      retryCount: status === 'failed' ? 1 : 0,
      error: status === 'failed' ? 'Simulated failure for demo purposes' : null,
    }

    if (status === 'queued') taskDoc.queuedAt = now
    if (status === 'running') {
      taskDoc.startedAt = now
      taskDoc.queuedAt = now
    }
    if (status === 'completed') {
      taskDoc.startedAt = now
      taskDoc.completedAt = now
      taskDoc.queuedAt = now
    }
    if (status === 'failed') {
      taskDoc.startedAt = now
      taskDoc.failedAt = now
      taskDoc.queuedAt = now
    }

    await db.collection('tasks').doc(taskId).set(taskDoc)
    taskIds.push(taskId)
    success(`Task ${i + 1}`, `${status} · ${taskDoc.payload.description}`)
  }

  return taskIds
}

async function seedAuditLogs(orgId: string, agentIds: string[], now: string) {
  section('Audit Logs')
  const logIds: string[] = []

  for (let i = 0; i < 25; i++) {
    const action = AUDIT_ACTIONS[i % AUDIT_ACTIONS.length]
    const agentId = agentIds[i % agentIds.length]
    const logId = generateId('log_')

    // Vary timestamps slightly for realistic ordering
    const timestamp = new Date(Date.now() - i * 60000).toISOString()

    await db.collection('logs').doc(logId).set({
      agentId,
      runId: i < 10 ? generateId('run_') : null,
      tool: action.tool,
      decision: action.decision,
      reason: action.reason,
      parameters: action.parameters,
      timestamp,
      requestId: generateId('req_', 8),
      orgId,
    })

    logIds.push(logId)
  }

  success(`${logIds.length} audit log entries`, 'realistic actions with varied timestamps')
  return logIds
}

async function seedSessionsAndRuns(orgId: string, agentIds: string[], taskIds: string[], now: string) {
  section('Sessions & Runs')
  const sessionIds: string[] = []

  for (let i = 0; i < 3; i++) {
    const sessionId = generateId('sess_')
    const agentId = agentIds[i % agentIds.length]

    await db.collection('sessions').doc(sessionId).set({
      id: sessionId,
      orgId,
      agentId,
      status: i === 0 ? 'active' : 'closed',
      startedAt: now,
      endedAt: i === 0 ? null : now,
      taskIds: taskIds.slice(i * 3, i * 3 + 3),
    })

    // Create 2-3 runs per session
    for (let r = 0; r < 2 + (i % 2); r++) {
      const runId = generateId('run_')
      const taskId = taskIds[(i * 3 + r) % taskIds.length]
      const status = r === 0 ? 'completed' : 'running'

      await db.collection('runs').doc(runId).set({
        id: runId,
        orgId,
        agentId,
        taskId,
        sessionId,
        status,
        startedAt: now,
        endedAt: status === 'completed' ? now : null,
        error: null,
        updatedAt: now,
        createdAt: now,
        totalActions: r === 0 ? 5 : 2,
        allowedActions: r === 0 ? 4 : 1,
        deniedActions: r === 0 ? 1 : 1,
        durationMs: status === 'completed' ? 1240 + r * 500 : null,
      })
    }

    sessionIds.push(sessionId)
    success(`Session ${i + 1}`, `${agentId.substring(0, 14)}... · ${i === 0 ? 'active' : 'closed'}`)
  }

  return sessionIds
}

// ---------------------------------------------------------------------------
// Summary table
// ---------------------------------------------------------------------------

function printSummary(
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
    ['Organization', color(ORG_NAME, C.cyan), orgId],
    ['Admin User', color(ADMIN_EMAIL, C.cyan), 'org_admin'],
    ['Agents', color(String(agentIds.length), C.yellow), '1 revoked, 4 active'],
    ['Policies', color(String(policyIds.length), C.yellow), 'Mixed scope & restrictions'],
    ['Tasks', color(String(taskIds.length), C.yellow), 'pending, running, completed, failed'],
    ['Audit Logs', color(String(logIds.length), C.yellow), 'Realistic action history'],
    ['Sessions', color(String(sessionIds.length), C.yellow), 'With associated runs'],
  ]

  const maxLabel = Math.max(...rows.map(r => r[0].length))
  const maxValue = Math.max(...rows.map(r => r[1].length))

  for (const [label, value, detail] of rows) {
    const paddedLabel = label.padEnd(maxLabel, ' ')
    const paddedValue = value.padEnd(maxValue, ' ')
    console.log(`  ${color(paddedLabel, C.bright)}  ${paddedValue}  ${color(detail, C.dim)}`)
  }

  hr()
  console.log(`  ${color('Password:', C.bright)} ${color(ADMIN_PASSWORD, C.magenta)}`)
  console.log(`  ${color('API Base:', C.bright)} ${color('http://localhost:3000', C.blue)}`)
  console.log(`  ${color('Login:', C.bright)}    POST /auth/login`)
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
  console.log('')
  console.log(color('  ╔══════════════════════════════════════════════════════════════╗', C.cyan + C.bright))
  console.log(color('  ║           Passport Agent — Demo Data Seeder v2.1             ║', C.cyan + C.bright))
  console.log(color('  ╚══════════════════════════════════════════════════════════════╝', C.cyan + C.bright))

  const now = new Date().toISOString()
  const orgId = generateId('org_')

  try {
    await seedOrg(orgId, now)
    const agentIds = await seedAgents(orgId, now)
    const policyIds = await seedPolicies(orgId, now)
    const taskIds = await seedTasks(orgId, agentIds, now)
    const logIds = await seedAuditLogs(orgId, agentIds, now)
    const sessionIds = await seedSessionsAndRuns(orgId, agentIds, taskIds, now)

    printSummary(orgId, agentIds, policyIds, taskIds, logIds, sessionIds)

    log.success('demo seed complete', {
      org: ORG_NAME,
      agents: agentIds.length,
      policies: policyIds.length,
      tasks: taskIds.length,
      logs: logIds.length,
      sessions: sessionIds.length,
    })

    process.exit(0)
  } catch (err: any) {
    console.error(color('\n  [ERROR] Seed failed:', C.red + C.bright), err.message)
    console.error(err.stack)
    process.exit(1)
  }
}

main()
