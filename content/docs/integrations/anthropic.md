# Anthropic Integration Guide

Integrate Passport Agent with Anthropic's Claude models to enforce
tool-use policies, sandbox execution, and cost controls.

---

## Overview

Claude's tool-use feature allows the model to call external functions.
Passport Agent validates every tool-use intent against your policies
before execution.

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Claude LLM  │────▶│  Passport Agent  │────▶│  Tool Result │
│  (tool_use)  │     │  (enforce)       │     │  (if allowed)│
└──────────────┘     └──────────────────┘     └──────────────┘
```

## Prerequisites

- Node.js >= 20
- Running Passport Agent server
- Anthropic API key
- `@passport-agent/sdk` installed

```bash
npm install @passport-agent/sdk @anthropic-ai/sdk
```

## Step 1: Initialize Clients

```js
import { createClient } from '@passport-agent/sdk'
import Anthropic from '@anthropic-ai/sdk'

const passport = createClient({
  baseUrl: process.env.PASSPORT_API_URL || 'http://localhost:3000',
  apiKey: process.env.PASSPORT_API_KEY,
})

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})
```

## Step 2: Register Agent

```js
const agent = await passport.agents.register({
  name: 'Data Analysis Assistant',
  model: 'claude-3-sonnet-20240229',
  provider: 'anthropic',
  systemPrompt: [
    'You are a data analyst.',
    'Run Python code in sandboxed environments.',
    'Never access raw PII or make external network calls.',
  ].join(' '),
})
```

## Step 3: Create Data-Analysis Policies

```js
await passport.policies.create({
  name: 'Sandboxed Python',
  priority: 10,
  scope: { agentId: agent.agentId },
  rules: {
    allowedTools: [
      {
        toolName: 'sandbox_run',
        parameterConstraints: {
          language: { type: 'string', enum: ['python'] },
          timeout: { type: 'number', max: 30 },
        },
      },
      {
        toolName: 'generate_chart',
        parameterConstraints: {
          type: { type: 'string', enum: ['bar', 'line', 'scatter', 'heatmap'] },
        },
      },
    ],
    deniedTools: ['shell_exec', 'file_system_write', 'network_request'],
    dataRestrictions: {
      denyPiiInParameters: true,
    },
  },
})
```

## Step 4: Enforcement Wrapper for Claude Tool Use

```js
async function enforceToolUse(agentId, toolName, input) {
  const result = await passport.enforce({
    intent: {
      intentId: `claude_${Date.now()}`,
      agentId,
      tool: toolName,
      parameters: input,
    },
  })

  if (result.decision === 'deny') {
    return {
      type: 'tool_result',
      tool_use_id: input.tool_use_id,
      content: `ERROR: Tool call denied by policy. Reason: ${result.reason}`,
      is_error: true,
    }
  }

  // Execute the actual tool and return result
  const output = await executeTool(toolName, input)
  return {
    type: 'tool_result',
    tool_use_id: input.tool_use_id,
    content: JSON.stringify(output),
  }
}
```

## Step 5: Claude Message Loop with Enforcement

```js
const tools = [
  {
    name: 'sandbox_run',
    description: 'Run Python code in a sandboxed environment',
    input_schema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Python code to execute' },
        timeout: { type: 'number', description: 'Max execution time in seconds' },
      },
      required: ['code'],
    },
  },
  {
    name: 'generate_chart',
    description: 'Generate a visualization chart',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['bar', 'line', 'scatter', 'heatmap'] },
        data: { type: 'string' },
      },
      required: ['type', 'data'],
    },
  },
]

async function analyzeWithEnforcement(prompt: string) {
  const messages: any[] = [{ role: 'user', content: prompt }]

  while (true) {
    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 4096,
      messages,
      tools,
    })

    // Check if the response contains tool_use blocks
    const toolUses = response.content.filter((block: any) => block.type === 'tool_use')

    if (toolUses.length === 0) {
      // No more tool calls — return the final text response
      return response.content.find((block: any) => block.type === 'text')?.text
    }

    // Enforce and execute each tool call
    for (const toolUse of toolUses) {
      const enforced = await passport.enforce({
        intent: {
          intentId: toolUse.id,
          agentId: agent.agentId,
          tool: toolUse.name,
          parameters: toolUse.input,
        },
      })

      let toolResult: any

      if (enforced.decision === 'deny') {
        toolResult = {
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: `Policy violation: ${enforced.reason}`,
          is_error: true,
        }
      } else {
        const output = await executeTool(toolUse.name, toolUse.input)
        toolResult = {
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: JSON.stringify(output),
        }
      }

      messages.push({ role: 'assistant', content: [toolUse] })
      messages.push({ role: 'user', content: [toolResult] })
    }
  }
}
```

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| **tool_use vs tool_result** | Claude requires both blocks in the message array — don't skip them |
| **Mismatched tool names** | Anthropic tool names in `tools` array must match Passport policy tool names |
| **Large code blocks** | Add `maxLength` constraints on `code` parameters to prevent token abuse |
| **Concurrent tool calls** | Claude can emit multiple `tool_use` blocks in one response — enforce each one |
| **Streaming mode** | Enforcement works in streaming mode too; enforce each `tool_use` as it arrives |

## Full Example

See `examples/anthropic-data-analyst.js` for a complete, runnable example.

## Next Steps

- [OpenAI Integration](./openai.md)
- [LangChain Integration](./langchain.md)
- [Custom Integration](./custom.md)
