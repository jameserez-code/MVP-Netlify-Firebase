# LangChain Integration Guide

Integrate Passport Agent with LangChain to enforce policies on every
tool call across any LangChain agent, chain, or executor.

---

## Overview

LangChain agents use tool calling to interact with external systems.
Passport Agent wraps LangChain tools to intercept and validate every call
before execution.

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────┐
│  LangChain      │────▶│  Passport Agent  │────▶│  Tool Result │
│  Agent Executor │     │  (enforce)       │     │  (if allowed)│
└─────────────────┘     └──────────────────┘     └──────────────┘
```

## Prerequisites

- Node.js >= 20
- Running Passport Agent server
- OpenAI or Anthropic API key
- LangChain + Passport SDK installed

```bash
npm install @passport-agent/sdk langchain @langchain/openai @langchain/core zod
```

## Step 1: Initialize Clients

```js
import { createClient } from '@passport-agent/sdk'
import { ChatOpenAI } from '@langchain/openai'

const passport = createClient({
  baseUrl: process.env.PASSPORT_API_URL || 'http://localhost:3000',
  apiKey: process.env.PASSPORT_API_KEY,
})

const llm = new ChatOpenAI({
  model: 'gpt-4o',
  temperature: 0,
})
```

## Step 2: Register Agent & Create Policy

```js
const agent = await passport.agents.register({
  name: 'LangChain Support Agent',
  model: 'gpt-4o',
  provider: 'openai',
  systemPrompt: 'Customer support agent using LangChain tool calling.',
})

await passport.policies.create({
  name: 'LangChain Demo Policy',
  priority: 10,
  scope: { agentId: agent.agentId },
  rules: {
    allowedTools: [
      { toolName: 'web_search', parameterConstraints: { query: { type: 'string' } } },
      { toolName: 'database_query', parameterConstraints: { sql: { type: 'string', pattern: '^SELECT' } } },
    ],
    deniedTools: ['send_email'],
    dataRestrictions: { denyPiiInParameters: true },
  },
})
```

## Step 3: Create Passport-Enforced Tools

Wrap each LangChain tool with a Passport enforcement layer:

```js
import { tool } from '@langchain/core/tools'
import { z } from 'zod'

function createPassportEnforcedTool(toolName, description, schema, handler) {
  return tool(
    async (params) => {
      // Step 1: Enforce via Passport
      const result = await passport.enforce({
        intent: {
          intentId: `lc_${Date.now()}`,
          agentId: agent.agentId,
          tool: toolName,
          parameters: params,
        },
      })

      // Step 2: Check decision
      if (result.decision === 'deny') {
        console.log(`[Passport] ✗ ${toolName} → DENIED: ${result.reason}`)
        return `ERROR: Tool call denied. Reason: ${result.reason}`
      }

      console.log(`[Passport] ✓ ${toolName} → ALLOWED`)

      // Step 3: Execute the actual tool
      try {
        return await handler(params)
      } catch (err) {
        return `ERROR: ${err.message}`
      }
    },
    { name: toolName, description, schema },
  )
}

// Define enforced tools
const webSearchTool = createPassportEnforcedTool(
  'web_search',
  'Search the web for documentation and facts',
  z.object({ query: z.string() }),
  async ({ query }) => {
    // Your actual search implementation
    return `Results for: "${query}"`
  },
)

const dbQueryTool = createPassportEnforcedTool(
  'database_query',
  'Query the database (SELECT only)',
  z.object({ sql: z.string() }),
  async ({ sql }) => {
    // Your actual database implementation
    return `Query executed. 42 rows returned.`
  },
)
```

## Step 4: Build the Agent Executor

```js
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents'
import { ChatPromptTemplate } from '@langchain/core/prompts'

const prompt = ChatPromptTemplate.fromMessages([
  ['system', 'You are a helpful customer support assistant.'],
  ['placeholder', '{chat_history}'],
  ['human', '{input}'],
  ['placeholder', '{agent_scratchpad}'],
])

const tools = [webSearchTool, dbQueryTool]
const agent = createToolCallingAgent({ llm, tools, prompt })
const executor = new AgentExecutor({ agent, tools, verbose: true })

// Run the agent — enforcement happens automatically on every tool call
const result = await executor.invoke({
  input: 'Search the web for Passport Agent and query recent orders',
})
```

## Step 5: Full Agent Loop with Error Handling

```js
async function runWithEnforcement(input: string) {
  try {
    const result = await executor.invoke({ input })
    return { success: true, output: result.output }
  } catch (err: any) {
    // Tool calls that are denied will return error strings,
    // not throw exceptions — this catch is for unexpected errors
    return { success: false, error: err.message }
  }
}

const response = await runWithEnforcement(
  'Look up order ORD-12345 and send a confirmation email',
)
console.log(response.output)
```

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| **Tool name mismatch** | The `name` field in your `tool()` definition must match the policy's `toolName` |
| **Agent loops on denial** | If denied, return the reason as the result so the agent can adapt — don't throw |
| **Zod schema validation** | Passport validates parameters too, but Zod catches issues earlier (better UX) |
| **Verbose logging** | Set `verbose: false` on AgentExecutor in production |
| **OpenAI function calling** | LangChain's `createToolCallingAgent` uses OpenAI function calling under the hood |

## Full Example

See `examples/langchain-integration.js` for a complete, runnable example.

## Next Steps

- [OpenAI Integration](./openai.md)
- [Anthropic Integration](./anthropic.md)
- [CrewAI Integration](./crewai.md)
- [Custom Integration](./custom.md)
