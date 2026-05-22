/**
 * Passport Agent SDK — LangChain Integration
 * =============================================
 * Demonstrates wrapping LangChain agents with Passport Agent policy
 * enforcement. Every tool call goes through pre-execution validation.
 *
 * Prerequisites:
 *   1. Running Passport Agent server
 *   2. npm install langchain @langchain/openai @passport-agent/sdk
 *
 * Usage:
 *   PASSPORT_API_KEY=pp_xxx OPENAI_API_KEY=sk-xxx \
 *     node examples/langchain-integration.js
 */

import { createClient } from '@passport-agent/sdk'
import { ChatOpenAI } from '@langchain/openai'
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { tool } from '@langchain/core/tools'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// 1. Setup Passport Client
// ---------------------------------------------------------------------------

const passport = createClient({
  baseUrl: process.env.PASSPORT_API_URL || 'http://localhost:3000',
  apiKey: process.env.PASSPORT_API_KEY || 'pp_demo_key_replace_me',
})

let currentAgentId: string

// ---------------------------------------------------------------------------
// 2. Passport-Enforced Tool Wrapper
//    Wraps any LangChain tool to pass through Passport enforcement first
// ---------------------------------------------------------------------------

function createPassportEnforcedTool(
  toolName: string,
  toolDescription: string,
  schema: z.ZodObject<any>,
  handler: (params: any) => Promise<string>,
) {
  return tool(
    async (params: any) => {
      // Step 1: Enforce via Passport
      const result = await passport.enforce({
        intent: {
          intentId: `lc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          agentId: currentAgentId,
          tool: toolName,
          parameters: params,
        },
      })

      // Step 2: Check decision
      if (result.decision === 'deny') {
        console.log(`  [Passport] ✗ ${toolName} → DENIED: ${result.reason}`)
        return `ERROR: Tool call denied by policy enforcement. Reason: ${result.reason}`
      }

      console.log(`  [Passport] ✓ ${toolName} → ALLOWED`)

      // Step 3: Execute the actual tool
      try {
        return await handler(params)
      } catch (err: any) {
        return `ERROR: ${err.message}`
      }
    },
    {
      name: toolName,
      description: toolDescription,
      schema,
    },
  )
}

// ---------------------------------------------------------------------------
// 3. Define Passport-Enforced Tools
// ---------------------------------------------------------------------------

const webSearchTool = createPassportEnforcedTool(
  'web_search',
  'Search the web for information. Use for looking up documentation and facts.',
  z.object({ query: z.string().describe('The search query') }),
  async ({ query }) => {
    // In production, this would call a real search API
    return `Search results for: "${query}"\n1. Documentation found at docs.example.com\n2. Related FAQ: How to configure OAuth2`
  },
)

const databaseQueryTool = createPassportEnforcedTool(
  'database_query',
  'Query the database with SELECT statements only. Returns data rows.',
  z.object({ sql: z.string().describe('A SQL SELECT query') }),
  async ({ sql }) => {
    // In production, this would execute a real query
    return `Query executed: ${sql}\nReturned 42 rows.`
  },
)

const sendEmailTool = createPassportEnforcedTool(
  'send_email',
  'Send an email to a recipient. Use cautiously.',
  z.object({
    to: z.string().describe('Email recipient'),
    subject: z.string().describe('Email subject'),
    body: z.string().describe('Email body'),
  }),
  async ({ to, subject, body }) => {
    // This will be blocked by most Passport policies — demo purposes
    return `Email sent to ${to} with subject "${subject}"`
  },
)

// ---------------------------------------------------------------------------
// 4. Create LangChain Agent with Passport-Guarded Tools
// ---------------------------------------------------------------------------

async function createAgent(agentId: string) {
  currentAgentId = agentId

  const llm = new ChatOpenAI({
    model: 'gpt-4o',
    temperature: 0,
  })

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a helpful customer support assistant.
      You have access to these tools: web_search, database_query, send_email.
      Use web_search for documentation, database_query for customer data.
      Always try database_query before send_email.
      Never send emails without checking the database first.`],
    ['placeholder', '{chat_history}'],
    ['human', '{input}'],
    ['placeholder', '{agent_scratchpad}'],
  ])

  const tools = [webSearchTool, databaseQueryTool, sendEmailTool]

  const agent = createToolCallingAgent({ llm, tools, prompt })
  const executor = new AgentExecutor({ agent, tools, verbose: true })

  return executor
}

// ---------------------------------------------------------------------------
// 5. Setup Passport Resources
// ---------------------------------------------------------------------------

async function setupPassport() {
  console.log('≡ Setting up Passport Agent + LangChain\n')

  const { orgId } = await passport.organizations.upsert({
    name: 'LangChain Demo Org',
    slug: 'langchain-demo',
    plan: 'pro',
    ownerEmail: 'dev@langchain-demo.com',
  })
  console.log(`✓ Org: ${orgId}`)

  const agent = await passport.agents.register({
    name: 'LangChain Support Agent',
    model: 'gpt-4o',
    provider: 'openai',
    systemPrompt: 'Customer support agent using LangChain tool calling.',
  })
  console.log(`✓ Agent: ${agent.agentId}`)

  // Create policy: allow web_search and database_query, block send_email
  const policy = await passport.policies.create({
    name: 'LangChain Demo Policy',
    description: 'Allow web searches and DB queries, block emails',
    priority: 10,
    scope: { agentId: agent.agentId },
    rules: {
      allowedTools: [
        { toolName: 'web_search', parameterConstraints: { query: { type: 'string' } } },
        { toolName: 'database_query', parameterConstraints: { sql: { type: 'string' } } },
      ],
      deniedTools: ['send_email'],
      dataRestrictions: { denyPiiInParameters: true },
    },
  })
  console.log(`✓ Policy: ${policy.id}`)

  return { agentId: agent.agentId }
}

// ---------------------------------------------------------------------------
// 6. Run Demo Queries
// ---------------------------------------------------------------------------

async function runQueries(executor: AgentExecutor) {
  console.log('\n≡ Running LangChain Agent Queries\n')

  const queries = [
    'Search the web for Passport Agent documentation',
    'Query the database for recent orders',
    'Send an email to admin@company.com about the status',
  ]

  for (const query of queries) {
    console.log(`\n▶ User: ${query}`)
    try {
      const result = await executor.invoke({ input: query })
      console.log(`◀ Agent: ${result.output}`)
    } catch (err: any) {
      console.log(`◀ Error: ${err.message}`)
    }
  }
}

// ---------------------------------------------------------------------------
// 7. Main
// ---------------------------------------------------------------------------

async function main() {
  try {
    const { agentId } = await setupPassport()
    const executor = await createAgent(agentId)
    await runQueries(executor)

    console.log('\n╔══════════════════════════════════════════╗')
    console.log('║  LangChain + Passport Demo Complete      ║')
    console.log('╚══════════════════════════════════════════╝')
  } catch (err) {
    console.error('Fatal:', err)
    process.exit(1)
  }
}

main()
