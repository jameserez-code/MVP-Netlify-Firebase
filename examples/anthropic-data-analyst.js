/**
 * Passport Agent SDK — Anthropic Claude Data Analyst Integration
 * ===============================================================
 * Complete example: register a data analyst agent with Claude,
 * enforce read-only SQL, sandboxed Python, and no-export policies.
 *
 * Prerequisites:
 *   1. Running Passport Agent server (npm run dev)
 *   2. Set ANTHROPIC_API_KEY, PASSPORT_API_KEY in environment
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-xxx PASSPORT_API_KEY=pp_xxx \
 *     node examples/anthropic-data-analyst.js
 */

import { createClient } from '@passport-agent/sdk'
import Anthropic from '@anthropic-ai/sdk'

// ---------------------------------------------------------------------------
// 1. Configuration
// ---------------------------------------------------------------------------

const CONFIG = {
  apiUrl: process.env.PASSPORT_API_URL || 'http://localhost:3000',
  apiKey: process.env.PASSPORT_API_KEY || 'pp_demo_key_replace_me',
  orgName: 'DataVault Analytics',
  adminEmail: 'dataeng@datavault.io',
}

const passport = createClient({ baseUrl: CONFIG.apiUrl, apiKey: CONFIG.apiKey })

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'sk-ant-demo-key-replace-me',
})

// ---------------------------------------------------------------------------
// 2. Setup Organization & Agent
// ---------------------------------------------------------------------------

async function setup() {
  console.log('≡ Passport Agent: Data Analyst with Claude\n')

  const { orgId } = await passport.organizations.upsert({
    name: CONFIG.orgName,
    slug: 'datavault-analytics',
    plan: 'enterprise',
    ownerEmail: CONFIG.adminEmail,
  })
  console.log(`✓ Organization: ${orgId}`)

  const agent = await passport.agents.register({
    name: 'Python Data Analyst',
    model: 'claude-3-sonnet-20240229',
    provider: 'anthropic',
    systemPrompt: [
      'You are a data analyst for DataVault Analytics.',
      'You run Python analysis in sandboxed environments.',
      'You never access raw PII, write to disk, or make external network calls.',
    ].join(' '),
  })
  console.log(`✓ Agent: ${agent.agentId}`)

  return { orgId, agentId: agent.agentId }
}

// ---------------------------------------------------------------------------
// 3. Create Data-Specific Policies
// ---------------------------------------------------------------------------

async function createPolicies(agentId: string) {
  console.log('\n≡ Creating Data Policies\n')

  // Policy 1: Sandboxed Python only
  const sandbox = await passport.policies.create({
    name: 'Sandboxed Python',
    description: 'Python in sandbox only — no shell, no filesystem, no network',
    priority: 10,
    scope: { agentId },
    rules: {
      allowedTools: [
        {
          toolName: 'sandbox_run',
          parameterConstraints: {
            language: { type: 'string', enum: ['python'] },
            timeout: { type: 'number', max: 30 },
          },
        },
        { toolName: 'generate_chart', parameterConstraints: { type: { type: 'string', enum: ['bar', 'line', 'scatter', 'heatmap'] } } },
      ],
      deniedTools: ['shell_exec', 'file_system_write', 'network_request', 'subprocess_run'],
      dataRestrictions: { denyPiiInParameters: true },
    },
  })
  console.log(`✓ Policy: ${sandbox.id} — Sandboxed Python`)

  // Policy 2: No raw data export
  const noExport = await passport.policies.create({
    name: 'No Raw Data Export',
    description: 'Reports allowed, raw CSV/JSON/Excel exports blocked',
    priority: 20,
    scope: { agentId: '*' },
    rules: {
      allowedTools: ['generate_report', 'create_visualization'],
      deniedTools: ['export_csv', 'export_json', 'export_excel', 'email_data'],
      dataRestrictions: { denyPiiInParameters: true },
    },
  })
  console.log(`✓ Policy: ${noExport.id} — No Raw Data Export`)

  return { sandboxId: sandbox.id, noExportId: noExport.id }
}

// ---------------------------------------------------------------------------
// 4. AI + Policy Enforcement Wrapper
// ---------------------------------------------------------------------------

interface ToolAttempt {
  tool: string
  parameters: Record<string, unknown>
}

async function enforceAndExecute(agentId: string, intent: ToolAttempt) {
  // Pre-execution enforcement via Passport
  const decision = await passport.enforce({
    intent: {
      intentId: `anl_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      agentId,
      tool: intent.tool,
      parameters: intent.parameters,
    },
  })

  if (decision.decision === 'deny') {
    console.log(`  ✗ DENIED: ${intent.tool} — ${decision.reason}`)
    return { allowed: false, reason: decision.reason }
  }

  // If allowed, the SDK could optionally call the actual tool here
  // For demo purposes, we simulate execution
  console.log(`  ✓ ALLOWED: ${intent.tool}`)

  // If it's a Claude API call, chain with enforcement ticket
  if (intent.tool === 'llm_generate') {
    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      messages: [{ role: 'user', content: JSON.stringify(intent.parameters) }],
      // Pass the gateway ticket as metadata for audit traceability
      metadata: { gatewayTicket: decision.gatewayTicket },
    })
    return { allowed: true, response: response.content }
  }

  return { allowed: true }
}

// ---------------------------------------------------------------------------
// 5. Demo — simulate analyst tool calls
// ---------------------------------------------------------------------------

async function runDemo(agentId: string) {
  console.log('\n≡ Simulating Data Analyst Workflow\n')

  const actions: ToolAttempt[] = [
    { tool: 'sandbox_run', parameters: { language: 'python', code: 'import pandas as pd\nprint(pd.__version__)', timeout: 10 } },
    { tool: 'shell_exec', parameters: { cmd: 'cat /etc/passwd' } },
    { tool: 'generate_chart', parameters: { type: 'heatmap', data: 'correlation_matrix_q1' } },
    { tool: 'export_csv', parameters: { query: 'SELECT * FROM users', filename: 'dump.csv' } },
    { tool: 'network_request', parameters: { url: 'https://api.external-service.com/data' } },
    { tool: 'sandbox_run', parameters: { language: 'python', code: 'print(sum([1,2,3]))', timeout: 60 } },
    { tool: 'llm_generate', parameters: { prompt: 'Summarize the Q1 sales trends' } },
    { tool: 'email_data', parameters: { to: 'partner@external.io', attachment: 'report.csv' } },
  ]

  let ok = 0
  let blocked = 0

  for (const action of actions) {
    const result = await enforceAndExecute(agentId, action)
    result.allowed ? ok++ : blocked++
    // Rate limit demo — small delay between calls
    await new Promise((r) => setTimeout(r, 200))
  }

  console.log(`\n≡ Summary: ${ok} passed, ${blocked} blocked`)
}

// ---------------------------------------------------------------------------
// 6. Main
// ---------------------------------------------------------------------------

async function main() {
  try {
    const { agentId } = await setup()
    await createPolicies(agentId)
    await runDemo(agentId)

    console.log('\n╔═════════════════════════════════════════╗')
    console.log('║  Anthropic Data Analyst Demo Complete   ║')
    console.log('╚═════════════════════════════════════════╝')
  } catch (err) {
    console.error('Fatal:', err)
    process.exit(1)
  }
}

main()
