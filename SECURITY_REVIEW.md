# Security Review

## Threat Model

**Adversary profile:** An authenticated user or compromised agent SDK attempting to execute unauthorized actions, access other orgs' data, replay actions, or escalate capabilities beyond assigned scope.

**Trust boundaries:**
1. Agent SDK → API server (network boundary, JWT-authenticated)
2. API server → Firestore (credential boundary, service account)
3. Agent → external APIs/tools (enforcement boundary, policy + gateway)
4. Org A → Org B (isolation boundary, orgId filtering)

**Out of scope:** Firestore infrastructure compromise (Google's responsibility), network-level DDoS (Netlify/cloud responsibility), OS-level privilege escalation.

---

## Attack Surfaces + Mitigations

### 1. Unauthorized tool execution

**Surface:** Agent sends valid JWT but attempts a tool call outside its policy.

**Mitigation:** The 11-step policy evaluator runs before execution. Blocked tools, denied domains, parameter constraints, PII detection — all evaluated deterministically.

**Test:** `tests/integration/enforce.test.ts` — ALLOW, DENY (blocked tool), DENY (SSRF), DENY (PII) all verified.

**Residual risk:** Policy misconfiguration (admin accidentally allows dangerous tools). Mitigation: capability system adds second layer — even if policy allows it, capability check blocks it.

---

### 2. JWT token forgery / expiration bypass

**Surface:** Attacker crafts a JWT with modified claims or uses expired token.

**Mitigation:** HMAC-SHA256 signed JWTs verified on every request. Expiry enforced in `verify()` — `jwt.ts:28`. Malformed tokens rejected with `invalid_token_format`.

**Residual risk:** JWT secret leaked (hardcoded in `.env`). Mitigation: rotate via `JWT_SECRET` env var, restart server. Documented in `OPERATIONS.md`.

---

### 3. Cross-org access

**Surface:** User in Org A queries tasks/runs/agents belonging to Org B.

**Mitigation:** Every Firestore query scoped to `orgId`. The `orgScopedQuery()` helper in `capabilities.ts` enforces this. Server endpoints use `(agent as any).orgId` from the authenticated agent document.

**Residual risk:** Endpoint that doesn't use org scoping. Mitigation: `checkConsistency()` in diagnostics detects orphaned/incorrectly scoped resources.

---

### 4. Gateway ticket replay

**Surface:** Attacker intercepts a gateway ticket and replays it to execute the same action twice.

**Mitigation:** Tickets are single-use. `gatewayTickets` collection tracks `status: "used"`. Atomic Firestore transaction in `markTicketUsed()`. Second use → `ticket_replayed`.

**Test:** `tests/integration/enforce.test.ts` — gateway execute → replay blocked.

---

### 5. Capability escalation

**Surface:** Agent with `network:http` capability attempts a `filesystem:write` action.

**Mitigation:** `checkCapability()` in `capabilities.ts` validates agent has the required capability before execution. Denial logged to audit.

**Residual risk:** Agent registered with wrong capabilities. Mitigation: `POST /agents/:id/revoke` immediately invalidates the agent.

---

### 6. Credential leakage in logs

**Surface:** Secret keys, API tokens, or service account content appears in log output.

**Mitigation:** Logger only logs structured metadata (`taskId`, `agentId`, `runId`, `requestId`) — never full request bodies or env var values. Service account never logged.

**Audit:** `src/lib/logger.ts` — only `message` and `context` fields are emitted. `context` always contains known-safe fields.

---

### 7. Rate limiting bypass

**Surface:** Attacker floods `/enforce` or `/gateway/execute` to degrade service or brute-force policy decisions.

**Mitigation:** Per-IP sliding window rate limit (200 req/min) via `checkRateLimit()` in `server.ts`. Returns `429` with `rate_limited` code.

**Residual risk:** Distributed attack from many IPs. Mitigation: configure org-level rate limits via `src/config.ts`.

---

## Firestore Security Rules

Trust boundary: **Server-side only.** All writes go through `firebase-admin` SDK with service account credentials. No client-side Firestore access.

**Rules:** `allow read, write: if false;` — all access through Admin SDK.

**Documented in:** `FIRESTORE_INDEXES.md`

---

## Session + Auth Hardening

| Control | Current | Recommended |
|---------|---------|-------------|
| JWT expiry | 1 hour | 15 minutes (shorter for sensitive env) |
| Refresh flow | None | Not needed for MVP (agent SDKs use long-lived keys) |
| Invalidation | Manual key rotation | `POST /agents/:id/revoke` + `POST /agents/:id/rotate-key` |
| Password storage | Plaintext `'admin'` (MVP) | Move to PBKDF2 hash before production |
| Rate limit | 200 req/min per IP | Configurable per endpoint in `src/config.ts` |

---

## Known Limitations (honest disclosure)

1. ~~MVP password is hardcoded~~ **FIXED** — Passwords are now hashed with PBKDF2 and `ADMIN_PASSWORD` is required (or auto-generated securely) at startup.
2. **No mTLS** — Communication between SDK and API server is HTTP (no TLS in local dev). In production, Netlify/load balancer provides TLS termination.
3. **Single Firestore region** — Multi-region consistency not guaranteed. Acceptable for MVP scale.
4. **No request signing** — Intent signatures exist in the agent SDK but not enforced server-side in the current Fastify server (only in Netlify Functions /enforce endpoint). Pending integration.
5. **Worker is single-process** — No distributed worker coordination. Acceptable for MVP throughput (8 tasks/min).

---

## Operational Assumptions

1. Service account JSON is stored on disk and never committed to git (`.gitignore` enforced)
2. `JWT_SECRET` and `ENGINE_SECRET` are set via environment variables, not hardcoded (`.env.example` provided)
3. Firestore backups are managed in GCP Console (documented in `OPERATIONS.md`)
4. Rate limits are sufficient for development/staging; adjust in `src/config.ts` for production
5. The API server runs behind a reverse proxy (Netlify, nginx) that terminates TLS

---

## Penetration Test Checklist

- [ ] Attempt tool call outside policy → DENY with `tool_explicitly_blocked`
- [ ] Attempt SSRF to `169.254.169.254` → DENY with `domain_blocked`
- [ ] Attempt PII in parameters (`ssn: "123-45-6789"`) → DENY with `pii_detected`
- [ ] Submit expired JWT → `401` with `invalid or expired token`
- [ ] Submit malformed JWT → `401` with `invalid or expired token`
- [ ] Replay gateway ticket → `403` with `ticket_replayed`
- [ ] Access other org's tasks → Firestore query scoped to orgId (no results returned)
- [ ] Register agent without auth → `401` with `missing Authorization header`
- [ ] Escalate capabilities → `checkCapability()` blocks, logs denial
- [ ] Flood endpoints → rate limit returns `429` after 200 req/min
