# @passport-agent/sdk

AI Agent Passport SDK — enforce policies on AI agent tool calls.

## Installation

```bash
npm install @passport-agent/sdk
```

## Quick Start

```javascript
const { AgentControlPlane } = require('@passport-agent/sdk');

const cp = new AgentControlPlane({
  agentId: 'agent_abc123',
  secretKey: 'ak_live_...',
  endpoint: 'https://api.passport-agent.example.com',
  model: 'gpt-4',
  provider: 'openai',
});

// Start a session
cp.startSession('Summarize news');

// Wrap any tool with enforcement
const webSearch = cp.wrapTool('web_search', async ({ query }) => {
  // ... real implementation
  return { results: [] };
});

try {
  const result = await webSearch({ query: 'latest AI news' });
} catch (err) {
  console.error('Blocked:', err.reason);
}
```

## API Reference

### `new AgentControlPlane(options)`

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `agentId` | `string` | Yes | Unique agent identifier |
| `secretKey` | `string` | Yes | HMAC signing secret |
| `endpoint` | `string` | Yes | API base URL |
| `apiKey` | `string` | No | API key for authentication |
| `model` | `string` | No | Model name (default: `'unknown'`) |
| `provider` | `string` | No | Provider name (default: `'unknown'`) |
| `systemPrompt` | `string` | No | System prompt for hashing |

### `startSession(taskHint?)`

Starts a new session. Returns `{ sessionId, taskHint }`.

### `endSession()`

Ends the active session. Returns `{ sessionId, completedAt }`.

### `wrapTool(toolName, toolFn)`

Wraps a tool function with policy enforcement. Returns a new async function with the same signature.

### `processToolCalls(toolCalls, toolImpls, opts?)`

Processes OpenAI `tool_calls` arrays through enforcement.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `useWrapped` | `boolean` | `false` | If `true`, uses `wrapTool()` for each call (slower, more secure). If `false`, executes directly (faster). |

### `listAgents()`

Returns a paginated list of registered agents.

### `getAuditLog(options?)`

Queries the audit log.

| Option | Type | Description |
|--------|------|-------------|
| `decision` | `'allow' \| 'deny' \| 'modify'` | Filter by decision |
| `tool` | `string` | Filter by tool name |
| `limit` | `number` | Page size |
| `offset` | `number` | Page offset |

### `revokeAgent(id)`

Revokes an agent by ID. Returns `{ id, status }`.

## Error Handling

The SDK throws three error types:

### `PermissionError`

Thrown when a tool call is denied by policy.

```javascript
try {
  await wrappedTool(params);
} catch (err) {
  if (err.name === 'PermissionError') {
    console.log(err.code);        // 'PERMISSION_DENIED'
    console.log(err.reason);      // e.g. 'tool_not_allowed'
    console.log(err.violatedRule); // e.g. 'allowedTools'
    console.log(err.intentId);    // intent ID for audit
    console.log(err.tool);        // tool name
  }
}
```

### `GatewayError`

Thrown when the enforcement gateway is unreachable or returns an unexpected error.

```javascript
catch (err) {
  if (err.name === 'GatewayError') {
    console.log(err.code);    // 'ENFORCE_UNAVAILABLE' or 'GATEWAY_UNAVAILABLE'
    console.log(err.message); // human-readable description
  }
}
```

### `RequestError`

Thrown when an API request fails after all retries (including network errors, timeouts, 5xx responses).

```javascript
catch (err) {
  if (err.name === 'RequestError') {
    console.log(err.code);        // 'REQUEST_FAILED'
    console.log(err.statusCode);  // HTTP status code, if available
    console.log(err.message);
  }
}
```

## Configuration Options

### Timeout

The SDK uses a 30-second default timeout for all HTTP requests. This is configurable at the `_apiCall` level but is intentionally kept as a sensible default.

### Retries

All API calls automatically retry up to 3 times with exponential backoff:
- Retry 1: 1 second delay
- Retry 2: 2 seconds delay
- Retry 3: 4 seconds delay

Retries are triggered on network errors, timeouts, and 5xx HTTP responses.

### API Key Authentication

You can authenticate using an API key instead of (or in addition to) JWT bearer tokens:

```javascript
const cp = new AgentControlPlane({
  agentId: 'agent_abc123',
  secretKey: 'ak_live_...',
  endpoint: 'https://api.passport-agent.example.com',
  apiKey: 'passport_...', // Added in v1.0.0-beta.1
});
```

When `apiKey` is provided, the `X-API-Key` header is automatically sent with every request.

## CLI

The SDK ships with a CLI:

```bash
npx passport-agent init                # Create .passport-agent.json
npx passport-agent agent create --name "My Agent"
npx passport-agent enforce --tool "web_search" --param '{"query":"test"}'
npx passport-agent audit --limit 10
npx passport-agent status
```

CLI configuration is read from `.passport-agent.json` or environment variables:
- `PASSPORT_API_KEY`
- `PASSPORT_API_URL`

## License

MIT
