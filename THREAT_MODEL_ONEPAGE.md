# Passport Agent — Threat Model

## Threat Actor

An authenticated user or compromised agent SDK attempting unauthorized tool execution, cross-org access, credential replay, capability escalation, or state corruption.

## Trust Boundaries

1. **Agent SDK → API Server** (JWT-authenticated HTTP)
2. **API Server → Database** (service account credential)
3. **Agent → External Tools/APIs** (policy-enforced + gateway-protected)
4. **Org A → Org B** (orgId isolation on every document)

## Attack Surfaces + Mitigations

| Attack | Mitigation | Verified |
|--------|-----------|----------|
| Unauthorized tool call | 11-step evaluator blocks before execution | enforce.test.ts |
| SSRF to metadata service | Domain blocklist prevents internal IP access | evaluator.test.ts |
| PII exfiltration | Parameter scanning blocks SSN/CC patterns | evaluator.test.ts |
| JWT forgery | HMAC-SHA256 signature verified every request | crypto.test.ts |
| Gateway ticket replay | Single-use, atomically marked, 30s TTL | security.test.ts |
| Cross-org access | orgId scoping on all queries | capability check |
| Capability escalation | Per-agent capability set validated before execution | capability check |
| Input injection | Pre-parsing hook blocks script/template/eval | input-validation.ts |
| Credential brute force | 20 auth req/min per IP, PBKDF2 hashing | server.ts |
| State corruption | All transitions are atomic Firestore transactions | transitions.ts |

## Residual Risks (honest disclosure)

- **Single region Firestore** — multi-region consistency not guaranteed
- **No mTLS** — HTTP in dev; production requires TLS termination at load balancer
- **No distributed worker coordination** — single-process worker; multiple workers coexist via idempotency guard
- **No request signing server-side** — intent signatures exist in SDK but not enforced on server (pending integration)
- **Demo mode uses JSON file** — not suitable for production persistence

## Incident Response

1. **Compromised agent key:** `POST /agents/:id/revoke` — immediately invalidates all future requests
2. **Credential leaked:** Rotate JWT_SECRET + ENGINE_SECRET, restart server
3. **Data exfiltration attempt:** Blocked by enforcement, logged immutably, audit trail preserved
4. **Worker crash:** Auto-recovery on restart, requeues tasks, exponential backoff retry
5. **Firestore outage:** API returns 503, worker retries next poll, no data loss
