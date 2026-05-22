/**
 * Passport Agent — Custom Plain Node.js Agent Integration
 * =========================================================
 * Minimal integration showing how to use Passport Agent enforcement
 * with ANY agent system without SDK dependencies.
 *
 * This demonstrates the raw HTTP API: register, enforce, audit.
 * Use this as a reference for custom/unsupported frameworks.
 *
 * Usage:
 *   PASSPORT_API_URL=http://localhost:3000 PASSPORT_API_KEY=pp_xxx \
 *     node examples/custom-agent.js
 */

import { createHmac, randomBytes } from 'node:crypto'

// ---------------------------------------------------------------------------
// 1. Configuration
// ---------------------------------------------------------------------------

const API_BASE = process.env.PASSPORT_API_URL || 'http://localhost:3000'
const API_KEY = process.env.PASSPORT_API_KEY || 'pp_demo_key_replace_me'

// Standard headers for all Passport API requests
const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${API_KEY}`,
}

// ---------------------------------------------------------------------------
// 2. API Helpers — raw fetch, no SDK dependency
// ---------------------------------------------------------------------------

async function api(method: string, path: string, body?: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const json = await res.json()

  if (!res.ok) {
    throw new Error(`API ${method} ${path} → ${res.status}: ${json.message || json.error}`)
  }

  return json
}

// ---------------------------------------------------------------------------
// 3. Custom Agent Implementation
//    This is YOUR agent — could be any custom logic
// ---------------------------------------------------------------------------

class CustomAgent {
  agentId: string | null = null
  tools: Map<string, (params: Record<string, unknown>) => Promise<unknown>>

  constructor() {
    // Define the tools your agent can call
    this.tools = new Map([
      ['web_search', this.webSearch],
      ['database_query', this.databaseQuery],
      ['send_notification', this.sendNotification],
    ])
  }

  // Tool implementations (replace with your actual logic)
  async webSearch(params: Record<string, unknown>) {
    console.log(`  → Searching web for: "${params.query}"`)
    return { results: ['Result 1', 'Result 2', 'Result 3'] }
  }

  async databaseQuery(params: Record<string, unknown>) {
    console.log(`  → Executing SQL: "${params.sql}"`)
    return { rows: 42, columns: ['id', 'name', 'email'] }
  }

  async sendNotification(params: Record<string, unknown>) {
    console.log(`  → Sending notification to: ${params.to}`)
    return { sent: true, channel: params.channel }
  }

  /**
   * Core loop: Passport-enforced tool execution.
   * Every tool call is validated before execution.
   */
  async executeIntent(tool: string, parameters: Record<string, unknown>) {
    if (!this.agentId) throw new Error('Agent not registered')

    // Step 1: Pre-execution enforcement
    const enforcement = await api('POST', '/enforce', {
      intent: {
        intentId: `custom_${Date.now()}_${randomBytes(4).toString('hex')}`,
        agentId: this.agentId,
        tool,
        parameters,
      },
    })

    // Step 2: Check decision
    if (enforcement.decision === 'deny') {
      console.log(`  ✗ ${tool} → DENIED: ${enforcement.reason}`)

      // Log the denial to audit trail
      await this.logAudit({
        agentId: this.agentId!,
        tool,
        decision: 'deny',
        reason: enforcement.reason,
        parameters,
        requestId: enforcement.requestId,
      })

      return { allowed: false, reason: enforcement.reason }
    }

    // Step 3: Execute the actual tool (only if allowed)
    console.log(`  ✓ ${tool} → ALLOWED`)

    const handler = this.tools.get(tool)
    if (!handler) throw new Error(`Unknown tool: ${tool}`)

    try {
      const result = await handler.call(this, parameters)

      // Log the allowed execution to audit
      await this.logAudit({
        agentId: this.agentId!,
        tool,
        decision: 'allow',
        reason: 'Within policy',
        parameters,
        gatewayTicket: enforcement.gatewayTicket,
        requestId: enforcement.requestId,
      })

      return { allowed: true, result, gatewayTicket: enforcement.gatewayTicket }
    } catch (err: any) {
      await this.logAudit({
        agentId: this.agentId!,
        tool,
        decision: 'error',
        reason: err.message,
        parameters,
        requestId: enforcement.requestId,
      })
      throw err
    }
  }

  async logAudit(entry: Record<string, unknown>) {
    try {
      await api('POST', '/audit/log', entry)
    } catch {
      // Non-critical — don't crash if audit logging fails
      console.warn('  ⚠ Audit log write failed')
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Setup — Register agent and create policies
// ---------------------------------------------------------------------------

async function setupAgent(agent: CustomAgent) {
  console.log('≡ Passport Agent: Custom Agent Setup\n')

  // Register a new agent identity
  const result = await api('POST', '/agents/register', {
    name: 'Custom Node.js Agent',
    model: 'custom-v1',
    provider: 'custom',
    systemPrompt: 'A custom agent that searches the web, queries databases, and sends notifications.',
  })

  agent.agentId = result.agentId
  console.log(`✓ Agent registered: ${result.agentId}`)
  console.log(`  Passport: ${result.passportNumber}`)

  // Create a policy for this agent
  const policy = await api('POST', '/policies', {
    name: 'Custom Agent Policy',
    description: 'Allow web_search and database_query, block send_notification to external channels',
    priority: 10,
    scope: { agentId: result.agentId },
    rules: {
      allowedTools: [
        { toolName: 'web_search', parameterConstraints: { query: { type: 'string', maxLength: 200 } } },
        { toolName: 'database_query', parameterConstraints: { sql: { type: 'string', pattern: '^SELECT' } } },
      ],
      deniedTools: ['send_notification'],
      allowedDomains: [{ pattern: '*.internal.local', methods: ['GET', 'POST'] }],
      dataRestrictions: { denyPiiInParameters: true, denySecretsInParameters: true },
    },
  })
  console.log(`✓ Policy created: ${policy.id}\n`)

  return result
}

// ---------------------------------------------------------------------------
// 5. Demo — simulate tool calls
// ---------------------------------------------------------------------------

async function runDemo(agent: CustomAgent) {
  console.log('≡ Running Custom Agent Demo\n')

  const testCalls = [
    { tool: 'web_search', params: { query: 'How to configure Passport Agent' } },
    { tool: 'database_query', params: { sql: 'SELECT * FROM users LIMIT 10' } },
    { tool: 'database_query', params: { sql: 'DROP TABLE users' } }, // Should be denied (not SELECT)
    { tool: 'send_notification', params: { to: 'external@evil.com', channel: 'email' } }, // Should be denied
    { tool: 'web_search', params: { query: 'Customer John Doe SSN 123-45-6789' } }, // PII detected
  ]

  for (const call of testCalls) {
    await agent.executeIntent(call.tool, call.params)
    // Simulate processing time
    await new Promise((r) => setTimeout(r, 100))
  }

  console.log('\n╔══════════════════════════════════════════╗')
  console.log('║  Custom Agent Demo Complete              ║')
  console.log(`║  Check audit logs for full trace:        ║`)
  console.log(`║  ${API_BASE}/dashboard/audit                 ║`)
  console.log('╚══════════════════════════════════════════╝')
}

// ---------------------------------------------------------------------------
// 6. Main
// ---------------------------------------------------------------------------

async function main() {
  const agent = new CustomAgent()

  try {
    await setupAgent(agent)
    await runDemo(agent)
  } catch (err: any) {
    console.error('Fatal error:', err.message)
    process.exit(1)
  }
}

main()
