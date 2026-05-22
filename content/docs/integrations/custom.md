# Custom Integration Guide

Integrate Passport Agent with _any_ agent framework, custom system,
or programming language. This guide covers the raw REST API — no SDK required.

---

## Overview

Passport Agent exposes a simple REST API. You can integrate it with
any framework or language by making HTTP calls. The core loop is:

1. **Register** an agent identity
2. **Create** policies
3. **Enforce** every tool call before execution
4. **Audit** the results

```
┌───────────────┐     POST /enforce    ┌──────────────────┐
│  Your Agent   │─────────────────────▶│  Passport Agent  │
│  (any system) │◀─────────────────────│  (REST API)      │
└───────────────┘   {decision, reason} └──────────────────┘
```

## API Reference

All endpoints accept JSON. Authenticate with `Authorization: Bearer <api-key>`.

### Base URL

```
http://localhost:3000  (development)
https://api.passport-agent.dev  (production)
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/agents/register` | Register a new agent identity |
| `POST` | `/policies` | Create a policy |
| `POST` | `/enforce` | Enforce a tool call intent |
| `POST` | `/audit/log` | Write to the audit log |
| `GET`  | `/agents` | List registered agents |
| `GET`  | `/policies` | List policies |
| `GET`  | `/audit/logs` | Query audit logs |
| `GET`  | `/health` | Health check |

---

## Step 1: Register an Agent

```bash
curl -X POST http://localhost:3000/agents/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer pp_your_api_key" \
  -d '{
    "name": "Custom Analytics Agent",
    "model": "custom-v1",
    "provider": "custom",
    "systemPrompt": "A custom agent that analyzes data.",
    "capabilities": ["db_query", "generate_report", "sandbox_run"]
  }'
```

**Response:**
```json
{
  "agentId": "agent_a1b2c3d4e5f6",
  "passportNumber": "PP-2025-A1B2C3D4",
  "secretKeyPrefix": "sk_custom_",
  "registeredAt": "2025-05-21T10:00:00Z"
}
```

Save `agentId` — you'll need it for every enforcement call.

---

## Step 2: Create Policies

```bash
curl -X POST http://localhost:3000/policies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer pp_your_api_key" \
  -d '{
    "name": "Custom Policy",
    "description": "Allow read-only operations, block mutations",
    "priority": 10,
    "scope": { "agentId": "agent_a1b2c3d4e5f6" },
    "rules": {
      "allowedTools": [
        {
          "toolName": "db_query",
          "parameterConstraints": {
            "sql": { "type": "string", "pattern": "^SELECT|^EXPLAIN" }
          }
        },
        {
          "toolName": "sandbox_run",
          "parameterConstraints": {
            "language": { "type": "string", "enum": ["python"] },
            "timeout": { "type": "number", "max": 30 }
          }
        }
      ],
      "deniedTools": ["db_write", "shell_exec", "export_data"],
      "dataRestrictions": {
        "denyPiiInParameters": true,
        "denySecretsInParameters": true
      },
      "costLimit": {
        "maxPerRequest": 50,
        "maxPerDay": 500
      }
    }
  }'
```

**Response:**
```json
{
  "id": "pol_x1y2z3a4b5",
  "name": "Custom Policy",
  "status": "active",
  "createdAt": "2025-05-21T10:05:00Z"
}
```

---

## Step 3: Enforce Tool Calls

```bash
curl -X POST http://localhost:3000/enforce \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer pp_your_api_key" \
  -d '{
    "intent": {
      "intentId": "call_1716290000000_a1b2",
      "agentId": "agent_a1b2c3d4e5f6",
      "tool": "db_query",
      "parameters": {
        "sql": "SELECT * FROM users WHERE signup_date > '\''2025-01-01'\''"
      }
    }
  }'
```

**Response (allowed):**
```json
{
  "decision": "allow",
  "gatewayTicket": "gt_abc123def456",
  "reason": "Within policy",
  "matchedPolicies": ["pol_x1y2z3a4b5"],
  "requestId": "req_789xyz"
}
```

**Response (denied):**
```json
{
  "decision": "deny",
  "reason": "tool_explicitly_blocked",
  "matchedPolicies": ["pol_x1y2z3a4b5"],
  "requestId": "req_789xyz"
}
```

---

## Step 4: Integration Patterns by Language

### Node.js (no SDK)

```js
const API = 'http://localhost:3000'
const KEY = process.env.PASSPORT_API_KEY

async function enforce(agentId, tool, params) {
  const res = await fetch(`${API}/enforce`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify({
      intent: {
        intentId: `call_${Date.now()}`,
        agentId,
        tool,
        parameters: params,
      },
    }),
  })
  return res.json()
}
```

### Python

```python
import requests
import os

API = os.getenv('PASSPORT_API_URL', 'http://localhost:3000')
KEY = os.getenv('PASSPORT_API_KEY')

def enforce(agent_id, tool, params):
    res = requests.post(
        f'{API}/enforce',
        json={
            'intent': {
                'intentId': f'call_{int(__import__("time").time() * 1000)}',
                'agentId': agent_id,
                'tool': tool,
                'parameters': params,
            }
        },
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {KEY}',
        },
    )
    return res.json()
```

### Go

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "os"
)

func enforce(agentID, tool string, params map[string]interface{}) (map[string]interface{}, error) {
    body := map[string]interface{}{
        "intent": map[string]interface{}{
            "intentId":   fmt.Sprintf("call_%d", time.Now().UnixMilli()),
            "agentId":    agentID,
            "tool":       tool,
            "parameters": params,
        },
    }

    jsonBody, _ := json.Marshal(body)
    req, _ := http.NewRequest("POST", os.Getenv("PASSPORT_API_URL")+"/enforce", bytes.NewBuffer(jsonBody))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer "+os.Getenv("PASSPORT_API_KEY"))

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)
    return result, nil
}
```

### Rust

```rust
use reqwest::Client;
use serde_json::{json, Value};
use std::env;

async fn enforce(agent_id: &str, tool: &str, params: Value) -> Result<Value, reqwest::Error> {
    let client = Client::new();
    let resp = client
        .post(format!("{}/enforce", env::var("PASSPORT_API_URL").unwrap()))
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", env::var("PASSPORT_API_KEY").unwrap()))
        .json(&json!({
            "intent": {
                "intentId": format!("call_{}", chrono::Utc::now().timestamp_millis()),
                "agentId": agent_id,
                "tool": tool,
                "parameters": params,
            }
        }))
        .send()
        .await?;

    resp.json().await
}
```

---

## Step 5: Building a Safe Execution Loop

The fundamental pattern for any integration:

```js
async function safeExecute(agentId, tool, params) {
  // 1. Pre-execution enforcement
  const decision = await enforce(agentId, tool, params)

  if (decision.decision === 'deny') {
    // 2a. Log denied attempt
    await auditLog(agentId, tool, 'deny', decision.reason, params)

    // Return blocked result to the agent
    return { error: `Tool '${tool}' blocked: ${decision.reason}` }
  }

  // 2b. Execute the actual tool
  try {
    const result = await executeActualTool(tool, params)

    // 3. Log successful execution
    await auditLog(agentId, tool, 'allow', 'Within policy', params, decision.gatewayTicket)

    return result
  } catch (err) {
    // 4. Log execution error
    await auditLog(agentId, tool, 'error', err.message, params)
    throw err
  }
}
```

## Decisions Reference

Passport returns one of these decisions:

| Decision | Meaning |
|----------|---------|
| `allow` | Tool call is permitted — proceed |
| `deny` | Blocked by a policy — do not execute |
| `modify` | Parameters were sanitized (e.g., PII redacted) — proceed with modified params |

## Denial Reasons

| Reason | Trigger |
|--------|---------|
| `tool_explicitly_blocked` | Tool is in `deniedTools` |
| `domain_blocked` | Domain is in `deniedDomains` |
| `pii_detected` | PII pattern found in parameters |
| `cost_limit_exceeded` | Budget exhausted |
| `tool_not_whitelisted` | Tool not in `allowedTools` (when list is non-empty) |
| `parameter_violation` | Parameter fails constraint check (pattern, type, enum, maxLength) |
| `rate_limit_exceeded` | Rate limit hit |

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| **Not saving agentId** | Always store the `agentId` from `/agents/register` — you need it for every call |
| **Skipping enforcement** | Every tool call must be enforced — one missed call is a security hole |
| **Trusting client-side enforcement** | Passport must be server-side — never expose API keys to the browser |
| **Blocking the agent's main loop** | Enforcement calls should be fast (<10ms). If slow, check your network/firebase |
| **Missing audit trail** | Always log to `/audit/log` after enforcement for compliance |
| **Hardcoded keys** | Use environment variables for all API keys — never commit them |

## Full Examples

- `examples/custom-agent.js` — Plain Node.js agent (no SDK)
- `examples/openai-customer-support.js` — With OpenAI SDK
- `examples/anthropic-data-analyst.js` — With Anthropic SDK
- `examples/langchain-integration.js` — LangChain wrapper

## Next Steps

- [OpenAI Integration](./openai.md)
- [Anthropic Integration](./anthropic.md)
- [LangChain Integration](./langchain.md)
- [CrewAI Integration](./crewai.md)
