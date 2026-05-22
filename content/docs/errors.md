# API Error Codes

All errors returned by the Passport Agent API follow a consistent structure:

```json
{
  "error": {
    "code": "error_code",
    "message": "Human-readable description",
    "detail": { }  // optional additional context
  }
}
```

## HTTP Status Codes

| Status | Meaning | Recovery |
|--------|---------|----------|
| 200 | Success | N/A |
| 201 | Created | N/A |
| 400 | Bad Request | Fix request body |
| 401 | Unauthorized | Provide valid credentials |
| 403 | Forbidden | Elevate permissions or verify email |
| 404 | Not Found | Check resource ID |
| 409 | Conflict | Check current state before retry |
| 413 | Payload Too Large | Reduce body size under 100KB |
| 429 | Rate Limited | Wait for `Retry-After` seconds |
| 500 | Internal Server Error | Retry with exponential backoff |
| 502 | Bad Gateway (email/Stripe) | Upstream service down; retry later |
| 503 | Service Unavailable (Firestore) | Retry later; circuit breaker may apply |

## Error Code Reference

### Validation Errors (400)

| Code | When | Client Action |
|------|------|---------------|
| `validation` | Required fields missing or invalid format | Check error `detail` for specific field |
| `validation_error` | Zod schema validation failed | Check `fields` object for per-field errors |
| `invalid_input` | Injection pattern detected in request body | Remove script tags, eval(), template strings |
| `payload_too_large` | Request body exceeds 100KB limit | Reduce payload size or batch requests |

### Authentication Errors (401)

| Code | When | Client Action |
|------|------|---------------|
| `unauthorized` | Missing Authorization header, expired JWT, or invalid API key | Re-login to get fresh JWT; check API key |
| `invalid_credentials` | Wrong email/password combination | Check credentials |

### Authorization Errors (403)

| Code | When | Client Action |
|------|------|---------------|
| `forbidden` | User lacks required role for the action | Request role elevation from org admin |
| `email_not_verified` | User email not yet verified | Check inbox for verification email; POST /auth/resend-verification |
| `account_locked` | 5+ failed login attempts | Wait `Retry-After` seconds (max 30 minutes) |
| `abuse_detected` | Request patterns flagged as abusive | Reduce request frequency; contact support |

### Not Found Errors (404)

| Code | When | Client Action |
|------|------|---------------|
| `not_found` | Resource (task, agent, policy, run, webhook, etc.) does not exist | Verify the resource ID |
| `agent_unknown` | Agent ID not found in system | Register the agent first via POST /agents/register |

### Conflict Errors (409)

| Code | When | Client Action |
|------|------|---------------|
| `conflict` | State transition conflict (e.g., completing an already-completed run) | Query current state via GET first; only transition from valid states |
| `ticket_replayed` | Gateway ticket already used (replay protection) | Generate a new ticket via POST /enforce |

### Rate Limiting (429)

| Code | When | Client Action |
|------|------|---------------|
| `rate_limited` | IP or endpoint rate limit exceeded | Check `X-RateLimit-Remaining` header; wait `Retry-After` seconds |
| `ddos_protection` | DDoS protection triggered | Reduce concurrent connection count |
| `limit_exceeded` | Daily enforcement limit reached on free plan | Upgrade to Pro plan |
| `agent_limit` | Maximum agent count reached on free plan | Upgrade to Pro plan |

### Firestore Service Errors (503)

| Code | When | Client Action |
|------|------|---------------|
| `firestore` | Firestore read/write operation failed | Retry with exponential backoff (1s, 2s, 4s); check system health at GET /health |
| `enforce_failed` | Policy enforcement evaluation failed | Retry; check policies for invalid configuration |
| `gateway_failed` | Gateway ticket execution failed | Retry with new ticket |
| `config_error` | Required environment variable not configured | Contact system administrator |

### Email Service Errors (502)

| Code | When | Client Action |
|------|------|---------------|
| `email_failed` | Email delivery failed (Resend API down) | Retry later; email delivery is best-effort |
| `stripe_error` | Stripe API returned an error | Check Stripe dashboard; verify billing configuration |

### Stripe Webhook Errors (400)

| Code | When | Client Action |
|------|------|---------------|
| `invalid_signature` | Stripe webhook signature verification failed | Verify STRIPE_WEBHOOK_SECRET is correctly configured |

### System Errors (500)

| Code | When | Client Action |
|------|------|---------------|
| `internal_error` | Unexpected server error | Retry with backoff; check system health |
| `diagnostics_failed` | System diagnostics check failed | Review server logs |
| `consistency_failed` | Consistency check failed | Run POST /repair with action="orphaned" or "stuck" |
| `repair_failed` | Automated repair failed | Manual intervention required |
| `report_failed` | Report generation failed | Retry later |
| `digest_failed` | Daily digest generation failed | Retry later |
| `waf_blocked` | Request blocked by Web Application Firewall | Remove malicious patterns from request |

## Middleware-Added Headers

| Header | Description |
|--------|-------------|
| `X-RateLimit-Remaining` | Number of requests remaining in current window |
| `Retry-After` | Seconds to wait before retrying (on 429) |
| `X-Cache` | Cache status: `HIT`, `HIT-L1`, `MISS` |
| `Cache-Control` | Cache directives for cached responses |

## Recovery Strategies

### Client-Side Exponential Backoff

```javascript
async function withRetry(fn, maxRetries = 3) {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn()
    } catch (err) {
      if (i === maxRetries) throw err
      if (err.status === 503 || err.status === 502) {
        await sleep(Math.pow(2, i) * 1000) // 1s, 2s, 4s
      } else {
        throw err // Don't retry client errors (4xx)
      }
    }
  }
}
```

### Circuit Breaker States

Passport Agent uses circuit breakers for Firestore operations:
- **Closed**: Normal operation
- **Open**: All requests immediately fail (prevents cascading failures)
- **Half-open**: Limited requests allowed to probe recovery

When the circuit is open, clients should back off and retry after at least 30 seconds.

### Health Check

Monitor `GET /health` for system status:
- `ok`: All systems operational
- `degraded`: One or more dependencies down (Firebase, Stripe, email)
- Returns per-component status: `firebase`, `memory`, `stripe`, `email`
