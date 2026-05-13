# Passport Agent SDK

Embed enforcement into any AI agent in 3 lines.

## Install

```bash
npm install @passport-agent/sdk
```

## Quickstart

```javascript
import OpenAI from 'openai'
import { AgentControlPlane } from '@passport-agent/sdk'

// Initialize with your agent credentials
const acp = new AgentControlPlane({
  agentId: process.env.ACP_AGENT_ID,
  secretKey: process.env.ACP_SECRET_KEY,
  endpoint: 'http://localhost:3000',   // or your deployed API URL
  model: 'gpt-4o',
  provider: 'openai',
})

const session = acp.startSession('Answer customer questions')
const openai = new OpenAI()

// Define your tools as usual
const tools = [
  { type: 'function', function: { name: 'lookup_order', parameters: { ... } } }
]
const toolImpls = {
  lookup_order: async ({ orderId }) => fetchOrder(orderId),
}

// Normal chat loop — enforcement is automatic
while (true) {
  const response = await openai.chat.completions.create({ model: 'gpt-4o', messages, tools })

  if (response.choices[0].finish_reason === 'tool_calls') {
    // This single line enforces all tool calls against your policies
    const results = await acp.processToolCalls(
      response.choices[0].message.tool_calls,
      toolImpls
    )
    messages.push(...results)
  } else {
    break
  }
}
```

## API Reference

### `new AgentControlPlane(config)`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `agentId` | string | Yes | Registered agent ID |
| `secretKey` | string | Yes | Agent secret key (from registration) |
| `endpoint` | string | Yes | ACP API base URL |
| `model` | string | No | Model identifier |
| `provider` | string | No | Provider name |
| `systemPrompt` | string | No | System prompt (hashed for verification) |

### `acp.wrapTool(toolName, toolFn)`

Wraps a tool function so it goes through enforcement before execution.

```javascript
const safeFetch = acp.wrapTool('http_request', fetch)
const result = await safeFetch({ url: 'https://api.example.com', method: 'GET' })
// If denied: throws PermissionError({ reason, violatedRule, intentId })
```

### `acp.processToolCalls(toolCalls, toolImpls, opts?)`

Processes OpenAI `tool_calls` array. Returns tool response messages ready to push into `messages[]`. Denied calls return error tool responses that the LLM can see.

```javascript
const results = await acp.processToolCalls(
  response.choices[0].message.tool_calls,
  {
    lookup_order: async ({ orderId }) => db.find(orderId),
    send_email: async ({ to, body }) => mailer.send(to, body),
  }
)
messages.push(...results)
```

### `acp.startSession(taskHint?)` / `acp.endSession()`

Manage sessions for audit grouping. Every action logged during a session is correlated.

### Error Classes

```javascript
import { PermissionError, GatewayError } from '@passport-agent/sdk'

try {
  await wrappedTool(params)
} catch (err) {
  if (err instanceof PermissionError) {
    console.log('Blocked:', err.reason, err.violatedRule)
  }
}
```

## Local Development

```bash
npm run dev              # Start Fastify server on :3000
node demo/malicious-agent.js  # Run the 8-beat demo scenario
npm test                 # Run crypto + evaluator unit tests (30 passing)
```
