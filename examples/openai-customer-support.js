/**
 * Passport Agent SDK — OpenAI Customer Support Integration
 * ============================================================
 * Complete example: register a customer support agent, create policies,
 * and enforce tool calls using the Passport Agent SDK.
 *
 * Prerequisites:
 *   1. Running Passport Agent server (npm run dev)
 *   2. Set PASSPORT_API_URL, PASSPORT_API_KEY in environment
 *
 * Usage:
 *   PASSPORT_API_KEY=pp_xxx node examples/openai-customer-support.js
 */

import { createClient } from '@passport-agent/sdk'
import OpenAI from 'openai'

// ---------------------------------------------------------------------------
// 1. Configuration & Setup
// ---------------------------------------------------------------------------

const CONFIG = {
  apiUrl: process.env.PASSPORT_API_URL || 'http://localhost:3000',
  apiKey: process.env.PASSPORT_API_KEY || 'pp_demo_key_replace_me',
  orgName: 'HelpDesk AI Solutions',
  adminEmail: 'ops@helpdesk-ai.com',
}

// Initialize Passport client
const passport = createClient({
  baseUrl: CONFIG.apiUrl,
  apiKey: CONFIG.apiKey,
})

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-demo-key-replace-me',
})

// ---------------------------------------------------------------------------
// 2. Create Organization & Register Agent
// ---------------------------------------------------------------------------

async function setup() {
  console.log('≡ Passport Agent: Setting up Customer Support Agent\n')

  // Create or get organization
  const { orgId } = await passport.organizations.upsert({
    name: CONFIG.orgName,
    slug: 'helpdesk-ai',
    plan: 'pro',
    ownerEmail: CONFIG.adminEmail,
  })
  console.log(`✓ Organization: ${orgId}`)

  // Register the customer support agent with a passport
  const agent = await passport.agents.register({
    name: 'Customer Support Bot',
    model: 'gpt-4o',
    provider: 'openai',
    systemPrompt: [
      'You are a Tier 1 customer support agent for HelpDesk AI.',
      'Answer common questions using the knowledge base.',
      'Classify and route complex issues to Tier 2.',
      'Never access PII or send unsolicited emails.',
    ].join(' '),
  })
  console.log(`✓ Agent registered: ${agent.agentId}`)
  console.log(`  Passport number: ${agent.passportNumber}`)
  console.log(`  Secret key:      ${agent.secretKeyPrefix}...`)

  return { orgId, agentId: agent.agentId }
}

// ---------------------------------------------------------------------------
// 3. Create Policies
// ---------------------------------------------------------------------------

async function createPolicies(agentId: string) {
  console.log('\n≡ Creating Policies\n')

  // Policy 1: Safe Web Search — restrict to trusted domains
  const safeSearch = await passport.policies.create({
    name: 'Safe Web Search',
    description: 'Allow web searches on trusted domains only',
    priority: 10,
    scope: { agentId },
    rules: {
      allowedTools: [{ toolName: 'web_search', parameterConstraints: { query: { type: 'string', maxLength: 200 } } }],
      deniedTools: ['execute_code', 'send_email'],
      allowedDomains: [
        { pattern: '*.wikipedia.org', methods: ['GET'] },
        { pattern: 'docs.helpdesk-ai.com', methods: ['GET'] },
      ],
      deniedDomains: ['169.254.169.254', '*.darkweb.*'],
      dataRestrictions: { denyPiiInParameters: true },
    },
  })
  console.log(`✓ Policy: ${safeSearch.id} — Safe Web Search`)

  // Policy 2: Read-Only CRM — lookups only, no mutations
  const readOnlyCrm = await passport.policies.create({
    name: 'Read-Only CRM',
    description: 'Allow CRM data lookup but block all modifications',
    priority: 20,
    scope: { agentId },
    rules: {
      allowedTools: [
        { toolName: 'lookup_customer', parameterConstraints: { customerId: { type: 'string', pattern: '^CUST-\\d+$' } } },
        { toolName: 'lookup_order', parameterConstraints: { orderId: { type: 'string', pattern: '^ORD-\\d+$' } } },
      ],
      deniedTools: ['db_write', 'db_delete', 'modify_customer', 'cancel_order'],
      dataRestrictions: { denyPiiInParameters: true, denySecretsInParameters: true },
    },
  })
  console.log(`✓ Policy: ${readOnlyCrm.id} — Read-Only CRM`)

  return { safeSearchId: safeSearch.id, readOnlyCrmId: readOnlyCrm.id }
}

// ---------------------------------------------------------------------------
// 4. Enforcement Helper — wrap any OpenAI call with policy enforcement
// ---------------------------------------------------------------------------

interface EnforceOptions {
  tool: string
  parameters: Record<string, unknown>
  agentId: string
}

async function safeCall(options: EnforceOptions) {
  // Step 1: Send intent to Passport for pre-execution enforcement
  const result = await passport.enforce({
    intent: {
      intentId: `intent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      agentId: options.agentId,
      tool: options.tool,
      parameters: options.parameters,
    },
  })

  // Step 2: Check the decision
  if (result.decision === 'deny') {
    console.log(`  ✗ BLOCKED: ${options.tool} — ${result.reason}`)
    return { allowed: false, reason: result.reason }
  }

  // Step 3: If allowed, proceed with the actual tool execution
  console.log(`  ✓ ALLOWED: ${options.tool}`)
  return { allowed: true, gatewayTicket: result.gatewayTicket }
}

// ---------------------------------------------------------------------------
// 5. Run Demo — simulate a real customer support scenario
// ---------------------------------------------------------------------------

async function runDemo(agentId: string) {
  console.log('\n≡ Running Customer Support Demo\n')

  // A typical support flow — the agent tries several tool calls

  const scenarios = [
    {
      tool: 'web_search',
      params: { query: 'How to enable two-factor authentication in HelpDesk portal' },
    },
    {
      tool: 'lookup_customer',
      params: { customerId: 'CUST-45219' },
    },
    {
      tool: 'lookup_order',
      params: { orderId: 'ORD-88291' },
    },
    {
      tool: 'send_email',
      params: { to: 'customer@external.com', subject: 'Your refund', body: 'Hello...' },
    },
    {
      tool: 'web_search',
      params: { query: 'Customer Bob Smith SSN 123-45-6789 ticket history' },
    },
    {
      tool: 'db_write',
      params: { table: 'customers', operation: 'UPDATE', data: { email: 'hacked@evil.com' } },
    },
  ]

  let allowedCount = 0
  let deniedCount = 0

  for (const scenario of scenarios) {
    const result = await safeCall({
      tool: scenario.tool,
      parameters: scenario.params,
      agentId,
    })
    if (result.allowed) allowedCount++
    else deniedCount++
    // Simulate real-world latency between tool calls
    await new Promise((r) => setTimeout(r, 150))
  }

  console.log(`\n≡ Results: ${allowedCount} allowed, ${deniedCount} denied\n`)
}

// ---------------------------------------------------------------------------
// 6. Main
// ---------------------------------------------------------------------------

async function main() {
  try {
    const { orgId, agentId } = await setup()
    await createPolicies(agentId)
    await runDemo(agentId)

    console.log('╔══════════════════════════════════════════╗')
    console.log('║  Demo Complete!                          ║')
    console.log('║  Check your dashboard for full history:  ║')
    console.log(`║  ${CONFIG.apiUrl}/dashboard                  ║`)
    console.log('╚══════════════════════════════════════════╝')
  } catch (err) {
    console.error('Fatal error:', err)
    process.exit(1)
  }
}

main()
