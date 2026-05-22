# Security Guide

How AI Agent Passport keeps your agents, data, and infrastructure safe.

---

## Credential Storage

### Agent Secrets

When you register an agent, the system generates a cryptographically random secret:

```typescript
const secret = crypto.randomBytes(32).toString('hex') // 256-bit
```

This secret is:
1. **Shown once** to the user during registration
2. **Hashed** with PBKDF2-SHA256 before storage (50,000–100,000 iterations, 32-byte random salt)
3. **Never stored in plaintext** — we can't recover it if you lose it

```
Stored: pbkdf2_sha256$100000$salt$hash
```

### API Keys

API keys use the same PBKDF2 hashing. When you present an API key for enforcement:
1. The key is hashed with the stored salt
2. Compared using `crypto.timingSafeEqual()` to prevent timing attacks
3. Only then is the agent identity confirmed

### JWT Secrets

JWT signing uses HS256 with a 256-bit secret (`JWT_SECRET`). This secret:
- Must be >= 32 characters
- Is validated at server startup (server fails fast if missing)
- Is never transmitted over the network
- Should be rotated quarterly in production

### Gateway Tickets

Execution tickets are signed with a separate secret (`ENGINE_SECRET`):
- Prevents ticket forgery even if API keys are compromised
- Tickets expire after 5 minutes
- Single-use tickets prevent replay attacks

---

## Policy Enforcement

### Server-Side Evaluation

All policies are evaluated on the Passport Agent servers. A compromised agent cannot:
- Bypass enforcement by modifying local code
- Forge tickets
- Override policy decisions

### Enforcement Pipeline

```
1. Receive intent { tool, parameters }
2. Verify agent identity (API key → agent lookup)
3. Load active policies for this agent
4. Evaluate in order:
   a. Blocked tools (explicit deny)
   b. Blocked patterns (PII, regex)
   c. Allowed tools (explicit allow)
   d. Cost limits
   e. Domain restrictions
5. Return decision + signed ticket (if allowed)
6. Log decision immutably
```

### Policy Precedence

Policies are evaluated in strict order:
1. **Block lists take priority** — If a tool is blocked, it's denied regardless of other policies
2. **PII patterns are checked next** — Sensitive data in parameters triggers denial
3. **Allow lists are checked last** — If no explicit allow policy matches, default behavior applies

### Default Behavior

By default, actions with no matching policy are **allowed** (permissive mode). You can switch to **deny-by-default** in organization settings:

```json
{
  "defaultDecision": "deny",
  "defaultReason": "No explicit policy permits this action"
}
```

---

## Audit Log Integrity

### Cryptographic Signatures

Every audit log entry is signed with HMAC-SHA256:

```typescript
const signature = crypto.createHmac('sha256', orgSecret)
  .update(JSON.stringify({ agentId, tool, parameters, decision, timestamp }))
  .digest('hex')
```

This ensures:
- **Tamper detection** — Modified logs fail signature verification
- **Non-repudiation** — The server cannot deny having made a decision
- **Integrity** — Log entries cannot be reordered or inserted

### Verification

You can verify any log entry:

```bash
curl https://api.passport.agent/audit/verify \
  -d '{"logId":"log_abc123","signature":"..."}'
```

### Immutable Storage

Audit logs are stored in Firestore with:
- **Append-only design** — No update or delete operations
- **Time-based sharding** — Prevents hot partitions
- **Cross-region replication** — Automatic via Firebase
- **Export capability** — JSON/CSV export for compliance reviews

### Retention

| Plan | Retention |
|------|-----------|
| Free | 30 days |
| Pro | 1 year |
| Enterprise | Unlimited + custom export |

---

## Compliance

### SOC 2 Type II

We are pursuing SOC 2 Type II certification. Current status:

- [x] Security policies documented
- [x] Access controls implemented (RBAC)
- [x] Audit logging with integrity
- [x] Encryption at rest and in transit
- [ ] Penetration testing (Q3 2024)
- [ ] External audit (Q4 2024)

### GDPR

**Data Processing:**
- We are a data processor under GDPR
- All data is stored in your Firebase project (data controller)
- We never access or process your data for our own purposes

**User Rights:**
- Right to access: Export all audit logs via API or dashboard
- Right to erasure: Delete organization and all associated data
- Right to portability: JSON export of all policies and logs
- Right to restriction: Pause all agent enforcement instantly

**Data Residency:**
- Firebase project location determines data residency
- EU projects store data in EU regions
- Enterprise plans support custom residency requirements

### CCPA

- No sale of personal information
- Audit logs can be exported for disclosure requests
- Agent actions involving California residents are tagged automatically

### HIPAA (Enterprise)

Enterprise plans include:
- Business Associate Agreement (BAA)
- Audit trails with user access logging
- Encryption at rest (AES-256) and in transit (TLS 1.3)
- Access logging for all dashboard actions

---

## Network Security

### TLS

All API endpoints require TLS 1.2+. Internal recommendation: TLS 1.3 only.

### CORS

Production deployments require explicit `ALLOWED_ORIGINS`:

```bash
ALLOWED_ORIGINS=https://your-app.com,https://admin.your-app.com
```

Wildcard (`*`) is only permitted in development mode.

### Rate Limiting

Default limits:
- 100 requests/minute per IP (unauthenticated)
- 1,000 requests/minute per API key (authenticated)
- 10,000 requests/minute per organization

Burst allowance: 2x the sustained rate.

**Distributed deployments:** Replace in-memory rate limiting with Redis.

### DDoS Protection

Recommended for production:
- Cloudflare or Cloud Armor in front of API
- Render's built-in DDoS protection (Standard plan+)
- Rate limiting + request size limits (10MB max)

---

## Vulnerability Disclosure

We take security seriously. If you discover a vulnerability:

1. Email security@your-url.com
2. Do not open public issues for security bugs
3. Allow 90 days for remediation before public disclosure
4. We offer bug bounties for verified critical vulnerabilities

**Current bounty program:**
- Critical (RCE, data breach): $2,500
- High (auth bypass, privilege escalation): $1,000
- Medium (XSS, CSRF): $250

---

## Security Checklist for Production

- [ ] Rotate Firebase service account key (especially if shared in chat/logs)
- [ ] Set strong `JWT_SECRET` (>= 32 chars, random)
- [ ] Set strong `ENGINE_SECRET` (>= 32 chars, random)
- [ ] Set `ADMIN_PASSWORD` to a strong password
- [ ] Configure `ALLOWED_ORIGINS` with exact domains
- [ ] Enable Firebase App Check for additional abuse prevention
- [ ] Use Redis for distributed rate limiting (multi-instance)
- [ ] Enable Cloud Armor or similar DDoS protection
- [ ] Set up log aggregation and alerting for suspicious patterns
- [ ] Review Firestore rules regularly
- [ ] Run `npm audit` weekly
- [ ] Enable 2FA for all dashboard admin accounts
- [ ] Set up webhook alerts for denied actions
- [ ] Review audit logs weekly for anomalies

---

## Cryptographic Primitives Summary

| Use Case | Algorithm | Key Size |
|----------|-----------|----------|
| JWT Signing | HS256 | 256-bit |
| Gateway Tickets | HS256 | 256-bit |
| Intent Signatures | HMAC-SHA256 | 256-bit per-agent |
| Password Hashing | PBKDF2-SHA256 | 32-byte salt, 50k+ iterations |
| Agent Secret Keys | `crypto.randomBytes` | 256-bit |
| Audit Log Signatures | HMAC-SHA256 | 256-bit per-org |
| TLS | ECDHE + AES-GCM | 256-bit |

---

Last updated: 2024-06-15
