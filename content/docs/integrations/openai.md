# OpenAI Integration Guide

Integrate Passport Agent with your OpenAI-powered agents to enforce
tool-call policies, domain restrictions, PII detection, and cost limits
before every API call.

---

## Overview

When your OpenAI agent calls a tool (function calling), Passport Agent intercepts
the intent _before_ execution and validates it against your policies.

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│  OpenAI LLM  │────▶│  Passport Agent  │────▶│  Actual Tool │
│  (function   │     │  (enforce)       │     │  (if allowed)│
│   call)      │     │                  │     │              │
└──────────────┘     └──────────────────┘     └──────────────┘
                            │
                            ✗ DENY (audited)
```

## Prerequisites

- Node.js >= 20
- Running Passport Agent server (`npm run dev`)
- OpenAI API key
- `@passport-agent/sdk` installed

```bash
npm install @passport-agent/sdk openai
```

## Step 1: Initialize Clients

```js
import { createClient } from '@passport-agent/sdk'
import OpenAI from 'openai'

const passport = createClient({
  baseUrl: process.env.PASSPORT_API_URL || 'http://localhost:3000',
  apiKey: process.env.PASSPORT_API_KEY,
})

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})
```

## Step 2: Register Your Agent

Every agent gets a digital passport with a unique identity.

```js
const agent = await passport.agents.register({
  name: 'Customer Support Bot',
  model: 'gpt-4o',
  provider: 'openai',
  systemPrompt: 'You are a helpful customer support agent.',
})

console.log(`Agent ID: ${agent.agentId}`)
console.log(`Passport: ${agent.passportNumber}`)
```

## Step 3: Create Policies

Define what tools your agent can and cannot use.

```js
await passport.policies.create({
  name: 'Safe Customer Support',
  priority: 10,
  scope: { agentId: agent.agentId },
  rules: {
    allowedTools: [
      {
        toolName: 'web_search',
        parameterConstraints: { query: { type: 'string', maxLength: 200 } },
      },
      {
        toolName: 'lookup_order',
        parameterConstraints: { orderId: { type: 'string', pattern: '^ORD-\\d+$' } },
      },
    ],
    deniedTools: ['send_email', 'delete_record', 'modify_database'],
    allowedDomains: [
      { pattern: '*.wikipedia.org', methods: ['GET'] },
      { pattern: 'api.internal.com', methods: ['GET', 'POST'] },
    ],
    deniedDomains: ['169.254.169.254', '*.darkweb.*'],
    dataRestrictions: {
      denyPiiInParameters: true,
      denySecretsInParameters: true,
    },
  },
})
```

## Step 4: Enforce Before Execution

Wrap every tool call with enforcement.

```js
async function safeToolCall(toolName, parameters) {
  const decision = await passport.enforce({
    intent: {
      intentId: `call_${Date.now()}`,
      agentId: agent.agentId,
      tool: toolName,
      parameters,
    },
  })

  if (decision.decision === 'deny') {
    console.log(`Blocked: ${decision.reason}`)
    return { error: 'Tool call denied by policy' }
  }

  // Execute the actual tool
  const result = await executeTool(toolName, parameters)
  return result
}
```

## Step 5: OpenAI Function Calling with Passport

Integrate directly into OpenAI's function calling loop:

```js
const tools = [
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
      },
    },
  },
]

async function chatWithEnforcement(userMessage: string) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: userMessage }],
    tools,
  })

  const toolCalls = completion.choices[0]?.message?.tool_calls || []

  for (const call of toolCalls) {
    const params = JSON.parse(call.function.arguments)

    // Enforce before execution
    const enforcement = await passport.enforce({
      intent: {
        intentId: call.id,
        agentId: agent.agentId,
        tool: call.function.name,
        parameters: params,
      },
    })

    if (enforcement.decision === 'allow') {
      // Execute the function safely
      const result = await executeFunction(call.function.name, params)
      // Continue the conversation with the result
      // ...
    } else {
      // Tool call was blocked — inform the model
      console.log(`Tool ${call.function.name} blocked: ${enforcement.reason}`)
    }
  }
}
```

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| **Agent not registered** | Always call `agents.register()` before enforcement |
| **Wrong tool names** | Tool names in policies must match OpenAI function names exactly |
| **Missing parameter constraints** | By default, unconstrained parameters are allowed — add constraints to lock down |
| **Token not refreshed** | Passport tokens expire; handle 401 by re-authenticating |
| **Rate limiting** | Use `enforce` sparingly; cache repeated decisions when parameters are identical |

## Full Example

See `examples/openai-customer-support.js` for a complete, runnable example.

## Next Steps

- [Anthropic Integration](./anthropic.md)
- [LangChain Integration](./langchain.md)
- [Custom Integration](./custom.md)
