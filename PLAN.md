# PASSPORT AGENT — YC-READY MVP EXECUTION PLAN

**Version:** 1.0  
**Date:** 2026-05-11  
**Status:** Implementation-ready

---

## 1. PRODUCT DEFINITION

### One-Sentence Problem Statement
Every SaaS company ships raw API keys — strings that can be copied, leaked to GitHub, and shared without audit — because building a real credential system from scratch takes weeks and most teams never do it right.

### Target User Persona
**Primary:** Engineering lead or founder at a B2B SaaS company (5–100 employees) that exposes an API to external developers or enterprise clients. They've already had one API key leak, or their security team is asking how keys are rotated. They know the problem exists but have not prioritized it.

**Secondary:** Platform team at a mid-size tech company integrating with 10+ vendors, tired of managing raw secrets and needing an audit trail for SOC 2.

### Core Pain Point (Why Existing Solutions Fail)
- **Raw API keys** (Stripe style): No scoping, no verification, secrets stored in plaintext, leak constantly via git commits
- **OAuth 2.0**: Correct but adds 2–3 weeks of backend work, requires redirect flows unsuitable for machine-to-machine
- **Auth0 / Clerk**: Authentication platforms, not credential issuance infrastructure — they tell you who someone is, not what they're authorized to do with a specific API
- **AWS IAM / Vault**: Correct but require cloud lock-in or significant ops overhead; inaccessible to small teams

### MVP Success Definition
A company can integrate Passport Agent in under 30 minutes to:
1. Issue a cryptographic credential (passport) to a new API user via one API call
2. That user sees their credential once (QR code + masked API key)
3. Any service can verify the credential via a public endpoint without shared secrets
4. The issuing company can grant or revoke scoped permissions (visas) from an admin dashboard
5. Every action is logged in an immutable audit trail

---

## 2. YC-LEVEL POSITIONING

### Why This Is Fundable
- **Every software company is this customer.** If you have an API, you have this problem.
- **Latent market unlocking**: Nobody sells "credential infrastructure" as a product. Teams solve it ad hoc. A focused solution can own the category.
- **Multiple monetization vectors**: Charge per credential issued, per monthly active credential, or per org seat. Expansion revenue is natural (more users → more credentials).
- **The API economy is growing 25%+ YoY.** Every new API integration creates a new credential pair. This problem compounds.

### Why Now
- **AI agent explosion**: LLM-based agents need machine-readable credentials to act on behalf of users across APIs. Raw API keys passed to agents are the top attack vector. A credentials layer built for agents is the right product at the right time.
- **SOC 2 / compliance pressure**: Post-2023, enterprises require proof of credential rotation, access audits, and least-privilege enforcement from their vendors. Small SaaS companies are getting rejected in enterprise deals for not having this.
- **Post-breach fatigue**: High-profile API key leaks have made engineering teams actively looking for solutions.

### Competitive Differentiation

| Dimension | Passport Agent | Raw Keys | Auth0 | AWS IAM |
|-----------|---------------|----------|-------|---------|
| Setup time | < 30 min | 0 | 2–3 days | 1–2 weeks |
| Scoped permissions | ✓ (visas) | ✗ | Limited | ✓ (complex) |
| Public verification | ✓ (hash) | ✗ | ✗ | ✗ |
| QR / physical verification | ✓ | ✗ | ✗ | ✗ |
| Built for AI agents | ✓ | ✗ | ✗ | ✗ |
| Audit trail | ✓ | ✗ | ✓ | ✓ |
| Price for 10k creds/mo | $49 | $0 | $240+ | Variable |

---

## 3. SYSTEM ARCHITECTURE

### Full System Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                          PASSPORT AGENT                              │
├─────────────────────────────┬────────────────────────────────────────┤
│      TENANT DASHBOARD       │       CREDENTIAL HOLDER PORTAL         │
│  (Org admin, hacker theme)  │  (API user views/manages credentials)  │
│  index.html                 │  Simplified view, same frontend        │
├─────────────────────────────┴────────────────────────────────────────┤
│                         API LAYER                                    │
│              Netlify Functions (Node.js 18, serverless)              │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  ┌─────────────┐ │
│  │  Credential  │  │ Verification │  │   Visa   │  │  Org / Auth │ │
│  │   Service    │  │   Service    │  │  Service │  │   Service   │ │
│  │ (issue/revoke│  │ (public GET) │  │(apply/   │  │(register/   │ │
│  │  /audit)     │  │ no auth req) │  │ approve) │  │ login/stats)│ │
│  └──────────────┘  └──────────────┘  └──────────┘  └─────────────┘ │
├──────────────────────────────────────────────────────────────────────┤
│                        DATA LAYER                                    │
│                          Firestore                                   │
│  Organizations │ Users │ Passports │ Visas │ AuditLog               │
├──────────────────────────────────────────────────────────────────────┤
│                     EXTERNAL SERVICES                                │
│  Firebase Auth (identity)  │  qrserver.com (QR generation)          │
│  SendGrid (notifications)  │  Stripe (billing, post-MVP)            │
└──────────────────────────────────────────────────────────────────────┘
```

### Data Flow: Credential Issuance
1. Org admin calls `POST /api/passports/issue` with org API key + holder metadata
2. API validates org API key against Firestore `organizations` collection
3. System generates: passport number (`PP-XXXX-XXXX`), raw API key (`pp_live_...`), HMAC-SHA256 verification hash using `(passportNumber + orgId + issuedAt + HMAC_SECRET)`
4. Raw API key is hashed via PBKDF2; **plaintext is never stored**
5. Passport record written to Firestore with hash, prefix (first 14 chars), verificationHash, qrData
6. Response returns the **plaintext API key exactly once** — server-side flag `keyRevealed: false` flips to `true` on first reveal
7. QR payload = `PASSPORT_AGENT_V1|{passportNumber}|{verificationHash}|{verifyURL}`

### Data Flow: Credential Verification (by any third-party service)
1. Third-party receives user's passport number + raw API key
2. Calls `POST /api/verify-passport { passportNumber, apiKey }`
3. System fetches passport by passportNumber, hashes provided key with same PBKDF2 params + stored salt
4. Compares hash — returns `{ verified, scopes, expiresAt }` without exposing any stored secrets
5. **Hash-only mode**: `GET /api/verify-passport?pn=...&h=...` — no key required, proves authenticity via HMAC

### Data Flow: Visa Application
1. Credential holder applies for visa (selects passport + scopes + expiry)
2. `POST /api/visas/apply` creates visa record with `status: "pending"`
3. Org admin sees pending visa in dashboard
4. Admin calls `PATCH /api/visas/{id}/status` with `approved` or `rejected`
5. On approval: visa record updated, webhook fired to org's configured endpoint
6. Active visa scopes returned by the verification endpoint

### Key Services and Responsibilities

| Service | Responsibility | Auth Required |
|---------|---------------|---------------|
| Credential Service | Issue, revoke, audit passports | Org API key |
| Verification Service | Public hash-based verification | None (public) |
| Visa Service | Apply, approve, reject scoped tokens | User auth + Org key |
| Org Service | Register org, manage team, view stats | Firebase Auth |
| Auth Service | Login, register, session | Firebase Auth |

### Scaling Assumptions
- **MVP**: Netlify Functions + Firestore handles ~100k credential verifications/month without changes
- **Post-MVP**: Move to dedicated Node.js service on Railway/Render + Firestore or PlanetScale, add Redis for verification caching, CDN edge for `verify-passport` endpoint

---

## 4. TECH STACK

| Layer | Choice | Reason |
|-------|--------|--------|
| Frontend | Plain HTML/JS + Tailwind CDN | Zero build step, already deployed, fastest iteration |
| Admin Portal | admin-portal.html (same stack) | Already built and functional |
| Backend | Netlify Functions (Node.js 18) | Zero configuration, already deployed, scales to 0 |
| Database | Firestore | Already partially integrated, schemaless for fast iteration |
| Auth | Firebase Authentication | Already in project, integrates with Firestore security rules |
| Credential Crypto | Node.js `crypto` module (built-in) | PBKDF2 for key hashing, HMAC-SHA256 for verification hash — zero dependencies |
| QR Codes | qrserver.com API | Zero-dependency, already working in MVP |
| Email | SendGrid | 100 free/day, reliable transactional |
| Billing (post-MVP) | Stripe | Industry standard |
| Hosting | Netlify | Already deployed, functions + static hosting unified |

**Not using:**
- **Next.js**: Overkill for current stage; migration path exists later
- **Prisma/SQL**: Firestore sufficient for MVP
- **Redis**: Not needed at MVP scale
- **Web3/blockchain**: Adds complexity, no current user value

---

## 5. DATA MODEL

### Firestore Collections

#### `organizations`
```
{
  id: string (auto)
  name: string
  slug: string                    // unique, URL-safe
  plan: "free"|"starter"|"growth"|"enterprise"
  monthlyCredentialLimit: number  // 100 / 10000 / 100000 / -1
  credentialsIssuedThisMonth: number
  orgApiKeyHash: string           // hashed; used to authenticate API calls
  orgApiKeySalt: string
  orgApiKeyPrefix: string         // first 12 chars for display
  webhookUrl: string | null
  ownerId: string                 // references users.id
  members: string[]               // user IDs with admin access
  createdAt: Timestamp
  billingEmail: string
}
```

#### `users`
```
{
  id: string                      // Firebase Auth UID
  email: string
  displayName: string
  role: "org_admin"|"org_member"|"credential_holder"
  orgId: string | null
  createdAt: Timestamp
  lastLoginAt: Timestamp
}
```

#### `passports`
```
{
  id: string (auto)
  passportNumber: string          // PP-XXXX-XXXX, globally unique
  orgId: string
  holderId: string                // uid of credential holder
  holderEmail: string
  fullName: string
  nationality: string             // affiliation/company in API context
  dob: string | null
  apiKeyHash: string              // PBKDF2(rawKey, salt, 100000, 64, "sha512")
  apiKeySalt: string              // unique per credential
  apiKeyPrefix: string            // "pp_live_8a7f2b3c" (not secret)
  verificationHash: string        // HMAC-SHA256(passportNumber+orgId+issuedAt, HMAC_SECRET)
  qrData: string                  // full QR payload string
  status: "active"|"revoked"|"expired"
  keyRevealed: boolean            // one-time reveal flag — enforced server-side
  issuedAt: Timestamp
  expiresAt: Timestamp | null
  revokedAt: Timestamp | null
  revokedBy: string | null        // uid
  metadata: Object                // freeform org-defined fields
}
```
**Indexes:** `orgId + status`, `holderId`, `passportNumber` (unique constraint enforced in service layer)

#### `visas`
```
{
  id: string (auto)
  passportId: string
  passportNumber: string
  orgId: string
  holderId: string
  scopes: string[]                // ["api:read", "api:write", "data:share", ...]
  status: "pending"|"approved"|"rejected"|"active"|"expired"
  expiresAt: Timestamp
  note: string | null             // rejection reason
  approvedBy: string | null       // uid
  rejectedBy: string | null
  resolvedAt: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
}
```
**Indexes:** `passportId + status`, `orgId + status + createdAt DESC`

#### `auditLog`
```
{
  id: string (auto)
  orgId: string
  actorId: string
  actorEmail: string
  action: string                  // see action enum below
  resourceType: "passport"|"visa"|"organization"
  resourceId: string
  metadata: Object                // action-specific context
  ip: string
  userAgent: string
  timestamp: Timestamp
}
```
**Action enum:** `passport.issued` `passport.revoked` `passport.key_revealed` `passport.verified` `passport.verification_failed` `visa.applied` `visa.approved` `visa.rejected` `org.created` `org.api_key_rotated`

**Indexes:** `orgId + timestamp DESC`, `resourceId + timestamp DESC`

### Firestore Security Rules (key rules)
```javascript
// passports: only org members or the holder can read
match /passports/{passportId} {
  allow read: if isOrgMember(resource.data.orgId) || isHolder(resource.data.holderId);
  allow write: if false; // server-side only via Admin SDK
}
// auditLog: org members read-only, only server writes
match /auditLog/{logId} {
  allow read: if isOrgMember(resource.data.orgId);
  allow write: if false;
}
// organizations: only owner/members
match /organizations/{orgId} {
  allow read: if isOrgMember(orgId);
  allow write: if false;
}
```

---

## 6. CORE FEATURES (PRIORITIZED)

### MUST BUILD (MVP Survival)

#### F1: Organization Registration + Org API Key Issuance
- **Behavior:** Company signs up, receives org-level API key (`org_live_...`) to authenticate all API calls
- **Input:** Company name, admin email, password
- **Output:** Org record created, org API key displayed ONCE (same one-time reveal mechanic), dashboard access
- **Edge cases:** Duplicate email → 400; org API key hashed like passport keys; key rotation must not break existing credentials

#### F2: Passport Issuance API
- **Behavior:** Org calls `POST /api/passports/issue` → receives passport with plaintext API key returned exactly once
- **Input:** `{ holderEmail, fullName, nationality, metadata? }` + `Authorization: Bearer {orgApiKey}`
- **Output:** `{ passportNumber, apiKey (plaintext, one-time), apiKeyPrefix, verificationHash, qrData, issuedAt }`
- **Edge cases:** Monthly limit reached → 429; duplicate holderEmail within org → warn but allow; `fullName` sanitized

#### F3: Public Credential Verification
- **Behavior:** Any service verifies a credential without any shared secret or SDK
- **Input (hash mode):** `GET ?pn={passportNumber}&h={verificationHash}` — no auth
- **Input (key mode):** `POST { passportNumber, apiKey }` — returns active scopes
- **Output:** `{ verified, passportNumber, status, scopes, expiresAt, orgName, issuedAt }`
- **Edge cases:** Revoked → `{ verified: false, reason: "revoked" }`; log every attempt to auditLog

#### F4: Visa Application + Approval Workflow
- **Behavior:** Holder selects passport + scopes + expiry; admin approves/rejects from dashboard
- **Input:** Holder POSTs `{ passportId, scopes[], expiresIn }`; Admin PATCHes `{ status, note? }`
- **Output:** Visa record; approved visa scopes included in verification response
- **Edge cases:** Approving visa on revoked passport → 400; visa expiry checked at verification time

#### F5: Passport Revocation
- **Behavior:** Org admin revokes any passport instantly; all subsequent verifications return `verified: false`
- **Input:** `PATCH /api/passports/{id}/revoke { reason? }`
- **Output:** Status → "revoked"; associated active visas → automatically expired; audit log entry
- **Edge cases:** Already-revoked → idempotent 200

#### F6: Tenant Dashboard (Admin Portal)
- **Behavior:** Org admins see all credentials, stats, pending visas, audit log; can approve/reject/revoke
- **Current state:** admin-portal.html functional — needs Firestore backend replacing localStorage
- **Edge cases:** Empty state prompts first credential issuance

#### F7: Real Authentication (replace localStorage)
- **Behavior:** Firebase Auth for all sessions; Firestore security rules enforce org data isolation
- **Edge cases:** Token expiry → redirect to login; role-based access (admin vs holder)

---

### SHOULD BUILD (Important Polish)

#### F8: Credential Holder Portal
- **Behavior:** Non-admin users log in, view own passports, apply for visas, see status
- **Input:** Firebase Auth (`credential_holder` role)
- **Output:** User sees only their own credentials

#### F9: Webhook Notifications
- **Behavior:** On visa approved/rejected, fire to org's configured webhook URL
- **Payload:** `{ event, visaId, passportNumber, scopes, expiresAt, timestamp }`
- **Edge cases:** Retry 3x with exponential backoff; log delivery status in auditLog

#### F10: Audit Log UI
- **Behavior:** Admin portal paginated audit log with filters (action type, passport, date range)
- **Edge cases:** Cursor-based pagination for large orgs; CSV export button

#### F11: Server-Enforced One-Time Key Reveal
- **Behavior:** `keyRevealed` flag in Firestore; if already `true`, reveal endpoint returns 403
- **Current state:** Client-side only (localStorage) — must move server-side before production
- **Edge cases:** User loses key before revealing → must revoke and reissue

#### F12: Credential Expiry Enforcement
- **Behavior:** `expiresAt` on passports; verification checks and returns `expired` if past
- **Scheduled job:** Netlify scheduled function marks expired records daily
- **Edge cases:** Credential expires mid-request → fails on next call

---

### LATER (YC Demo Enhancements)

#### F13: JS/Python SDK
```javascript
import PassportAgent from '@passport-agent/sdk'
const pa = new PassportAgent({ orgKey: 'org_live_...' })
const { passport } = await pa.issue({ email: 'user@co.com', fullName: 'Jane Smith' })
const result = await pa.verify({ passportNumber: 'PP-8A7F-2B3C', apiKey: '...' })
```

#### F14: Multi-Seat Organizations
- Invite team members as `org_admin` or `org_member`
- Role-based access: member can view but not revoke

#### F15: Usage Analytics Dashboard
- Charts: credentials issued over time, verification calls/day, rejection rate
- Export to CSV

#### F16: Stripe Billing Integration
- Freemium → paid upgrade flow
- Usage-based billing via Stripe metered subscriptions

#### F17: Custom Scope Registry
- Orgs define own scopes (`payment:process`, `user:read`) instead of global defaults
- Scope descriptions shown to holders at visa application time

#### F18: AI-Assisted Risk Scoring
- On `POST /api/visas/apply`, score risk of granting requested scopes
- Model: GPT-4o-mini; add risk badge (low/medium/high) in admin dashboard
- Prompt: holder history + org patterns + requested scopes → JSON risk assessment

#### F19: Agent Credentialing
- `holderType: "agent"` flag on passport issuance
- Agent metadata: model, system prompt hash, operator
- Verification response includes agent attestation — new product category

---

## 7. API DESIGN

### Authentication
All protected endpoints: `Authorization: Bearer {orgApiKey}`  
Org key format: `org_live_{32 hex}` or `org_test_{32 hex}` (sandbox)

### Base URL
`/api/*` → `/.netlify/functions/api/:splat` via netlify.toml redirect

---

### POST /api/auth/register
```json
// Request
{ "email": "admin@company.com", "password": "...", "orgName": "Acme Corp" }

// Response 201
{
  "userId": "firebase_uid",
  "orgId": "org_xxxx",
  "orgApiKey": "org_live_8a7f2b3c9d1e4f5a...",
  "orgApiKeyPrefix": "org_live_8a7f",
  "message": "Store your org API key — it will not be shown again"
}
```

### POST /api/auth/login
```json
// Request
{ "email": "admin@company.com", "password": "..." }

// Response 200
{ "token": "firebase_id_token", "userId": "...", "orgId": "..." }
```

---

### POST /api/passports/issue
**Auth:** Org API key
```json
// Request
{
  "holderEmail": "developer@client.com",
  "fullName": "Jane Smith",
  "nationality": "ClientCorp",
  "expiresIn": "365d",
  "metadata": { "teamId": "team_123" }
}

// Response 201
{
  "passportNumber": "PP-8A7F-2B3C",
  "apiKey": "pp_live_8a7f2b3c9d1e4f5a6b7c8d9e0f1a2b3c",
  "apiKeyPrefix": "pp_live_8a7f2b3c",
  "verificationHash": "0x7f3a2c1b...7f3a",
  "qrData": "PASSPORT_AGENT_V1|PP-8A7F-2B3C|0x7f3a...|https://...",
  "qrImageUrl": "https://api.qrserver.com/...",
  "status": "active",
  "issuedAt": "2026-05-11T00:00:00Z",
  "expiresAt": null
}
```

### GET /api/passports/:id
**Auth:** Org API key
```json
// Response 200 (apiKey never returned after issuance)
{
  "id": "...",
  "passportNumber": "PP-8A7F-2B3C",
  "holderEmail": "developer@client.com",
  "fullName": "Jane Smith",
  "apiKeyPrefix": "pp_live_8a7f2b3c",
  "keyRevealed": true,
  "verificationHash": "0x7f3a...",
  "status": "active",
  "visas": [{ "id": "...", "scopes": ["api:read"], "status": "active" }],
  "issuedAt": "...",
  "expiresAt": null
}
```

### GET /api/passports
**Auth:** Org API key | **Query:** `?holderId=...&status=active&page=1&limit=20`
```json
{ "data": [...passports], "pagination": { "page": 1, "total": 43, "totalPages": 3 } }
```

### PATCH /api/passports/:id/revoke
**Auth:** Org API key
```json
// Request
{ "reason": "Employee offboarding" }

// Response 200
{ "id": "...", "status": "revoked", "revokedAt": "..." }

// Error
{ "error": "ALREADY_REVOKED", "message": "Passport PP-8A7F-2B3C is already revoked" }
```

---

### GET /api/verify-passport (PUBLIC — no auth)
```
GET /api/verify-passport?pn=PP-8A7F-2B3C&h=0x7f3a2c1b...7f3a

// Verified
{
  "verified": true,
  "passportNumber": "PP-8A7F-2B3C",
  "status": "active",
  "issuer": "Acme Corp",
  "issuedAt": "2026-05-11T00:00:00Z",
  "expiresAt": null,
  "note": "Hash verification only — no scope data returned"
}

// Not verified
{ "verified": false, "reason": "revoked"|"expired"|"hash_mismatch"|"not_found" }
```

### POST /api/verify-passport (PUBLIC — returns scopes)
```json
// Request
{ "passportNumber": "PP-8A7F-2B3C", "apiKey": "pp_live_8a7f2b3c..." }

// Response 200
{
  "verified": true,
  "passportNumber": "PP-8A7F-2B3C",
  "holderName": "Jane Smith",
  "status": "active",
  "issuer": "Acme Corp",
  "activeVisas": [
    { "scopes": ["api:read", "api:write"], "expiresAt": "2027-05-11T00:00:00Z" }
  ],
  "allScopes": ["api:read", "api:write"],
  "verifiedAt": "2026-05-11T12:00:00Z"
}
```

---

### POST /api/visas/apply
**Auth:** Firebase user token
```json
// Request
{ "passportId": "...", "scopes": ["api:read", "api:write"], "expiresIn": "30d" }

// Response 201
{ "id": "visa_xxx", "status": "pending", "scopes": ["api:read", "api:write"], "expiresAt": "..." }
```

### PATCH /api/visas/:id/status
**Auth:** Org API key
```json
// Request
{ "status": "approved"|"rejected", "note": "Approved for Q2 project" }

// Response 200
{ "id": "...", "status": "approved", "resolvedAt": "..." }

// Error: visa on revoked passport
{ "error": "PASSPORT_REVOKED", "message": "Cannot approve visa for a revoked passport" }
```

---

### GET /api/org/stats
**Auth:** Org API key
```json
{
  "totalPassports": 143,
  "activePassports": 137,
  "revokedPassports": 6,
  "pendingVisas": 4,
  "activeVisas": 89,
  "verificationsThisMonth": 2341,
  "credentialsIssuedThisMonth": 23,
  "monthlyLimit": 10000
}
```

---

### Error Response Format (all endpoints)
```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable description",
  "details": {}
}
```

**Standard codes:** `UNAUTHORIZED` `FORBIDDEN` `NOT_FOUND` `VALIDATION_ERROR` `RATE_LIMITED` `LIMIT_EXCEEDED` `ALREADY_EXISTS` `ALREADY_REVOKED` `PASSPORT_REVOKED`

---

## 8. AI / AGENT LAYER

### Current Stance
AI is not core to the MVP. Do not add AI until credential infrastructure is solid and first paying customers exist. The product's value is the credential primitive, not AI.

### Phase 2: Risk Scoring for Visa Requests
**When to build:** After first 10 paying customers  
**Model:** GPT-4o-mini  
**Trigger:** Every `POST /api/visas/apply`

**Prompt:**
```
System: You are a security analyst reviewing API access scope requests.
Rate the risk of approving this visa.

Context:
- Org: {orgName}
- Holder: {holderEmail} (account age: {days}d, prior visas: {count})
- Requested scopes: {scopes}
- Expiry: {expiresIn}
- Org's historically approved scopes: {historicalScopes}

Return JSON only: { "riskLevel": "low"|"medium"|"high", "reason": "one sentence" }
```

**Output:** Risk level stored on visa record; displayed as badge in admin dashboard.

### Phase 3: Agent Credentialing
When issuing to an AI agent (`holderType: "agent"`), passport includes:
- `agentModel`: LLM model identifier
- `systemPromptHash`: SHA-256 of agent's system prompt (proves unchanged)
- `operator`: human/org who authorized the agent

Verification response returns agent attestation. This creates a new product category: **infrastructure for credentialing AI agents** — a distinct YC pitch upgrade.

---

## 9. BUILD PLAN

### Phase 0: Foundation (Days 1–2)
**Goal:** Replace localStorage with Firestore. Blocking everything else.

1. Set up Firebase project with real credentials (replace placeholder config in all files)
2. Create Firestore collections with proper security rules
3. Write `netlify/functions/src/lib/firestore.js` — Firestore Admin SDK singleton
4. Write `netlify/functions/src/lib/auth.js` — Firebase Admin token verification middleware
5. Write `netlify/functions/src/lib/crypto.js`:
   - `generateApiKey(prefix)` → `pp_live_{32 hex}`
   - `hashKey(plaintext)` → `{ hash, salt }` via PBKDF2 (100k iterations, sha512)
   - `verifyKey(plaintext, hash, salt)` → boolean
   - `generateVerificationHash(passportNumber, orgId, issuedAt)` → HMAC-SHA256
   - `generatePassportNumber()` → `PP-XXXX-XXXX`
6. Update `apply-passport.js` to write to Firestore with real crypto (replace TODO comment)
7. Update `apply-visa.js` to write to Firestore
8. Update `list-pending.js` to read from Firestore (delete mock data)
9. Update `update-status.js` to write to Firestore
10. Update `index.html` auth: replace localStorage users with Firebase Auth
11. Update `admin-portal.html` same

**Checkpoint:** Issue passport → appears in Firestore → survives page refresh. Check Firestore console.

---

### Phase 1: Core Credential Infrastructure (Days 3–7)
**Goal:** Every endpoint works end-to-end with real crypto and Firestore.

1. Complete `POST /api/passports/issue` with full crypto pipeline
2. Add org API key auth middleware — validate every protected request
3. Complete `GET /api/verify-passport` (hash mode + key mode) against Firestore
4. Complete `PATCH /api/passports/:id/revoke`
5. Complete `POST /api/visas/apply` and `PATCH /api/visas/:id/status`
6. Add `GET /api/passports` with pagination
7. Add `GET /api/org/stats` aggregating from Firestore
8. Write audit log middleware — every write appends to `auditLog` collection
9. Write `POST /api/auth/register` creating org + issuing org API key
10. Remove all remaining mock data from every function

**Checkpoint:** Full lifecycle via curl/Postman: register org → issue passport → verify → apply visa → approve → verify with scopes → revoke → verify (expect false). Zero localStorage in the data path.

---

### Phase 2: Frontend Integration (Days 8–12)
**Goal:** index.html and admin-portal.html use real APIs + Firebase Auth.

1. Add Firebase Auth JS SDK to both HTML files
2. Replace `getUsers()`/`saveUsers()` with `firebase.auth().signInWithEmailAndPassword()`
3. Replace all `getApps()`/`saveApps()` calls with `fetch('/api/passports')` and `fetch('/api/visas')`
4. Security check animation fires at end → calls `POST /api/passports/issue`
5. After issuance: server response provides `apiKey` plaintext → display once → PATCH to mark `keyRevealed: true` server-side
6. Admin portal: load from `/api/passports` and `/api/visas` (delete seed data hack)
7. Wire approve/reject to `PATCH /api/visas/:id/status`
8. Wire revoke to `PATCH /api/passports/:id/revoke`
9. Add org registration page (`/register.html`)
10. Add audit log tab to admin portal (reads from `/api/audit` endpoint)

**Checkpoint:** Full flow in browser without touching code. Register → issue → visible in Firestore + admin portal → revoke → verify returns false.

---

### Phase 3: Demo Hardening (Days 13–16)
**Goal:** Flawless demo, zero rough edges.

1. Build `verify-demo.html` — fake third-party service page:
   - Input: passport number + API key
   - Calls `POST /api/verify-passport`
   - Shows: green "ACCESS GRANTED" with scopes, or red "ACCESS DENIED" with reason
   - This is the most compelling demo artifact — do not skip
2. Add loading states to all API calls (no loading state = broken UX)
3. Add proper error messages (no raw error objects shown to users)
4. Make QR code link to `verify-demo.html?pn={passportNumber}&h={hash}` — scannable verification
5. Mobile-responsive pass on both pages
6. Add rate limiting to `/api/verify-passport` (100 req/min per IP via in-memory counter)
7. Ensure `/api/verify-passport` responds in < 200ms (add Firestore index if needed)
8. Add "Getting Started" onboarding banner for new orgs with zero credentials
9. Test full flow in incognito: no localStorage residue should affect behavior

**Checkpoint:** End-to-end demo works in front of a non-technical audience. Gate → Register → Issue → QR scan → verify-demo.html shows access granted → Revoke → scan again → access denied.

---

### Phase 4: SDK + Developer Experience (Days 17–20)
**Goal:** New developer integrates in 30 minutes without reading more than README.

1. Write `netlify/functions/src/sdk/passport-agent.js`:
```javascript
class PassportAgent {
  constructor({ orgKey, baseUrl = 'https://your-domain.netlify.app' }) {}
  async issue({ email, fullName, nationality, metadata }) {}
  async verify({ passportNumber, apiKey }) {}
  async verifyHash({ passportNumber, hash }) {}
  async revoke({ passportId, reason }) {}
  async applyVisa({ passportId, scopes, expiresIn }) {}
}
module.exports = { PassportAgent }
```
2. Write `docs.html` — minimal API reference with curl + JS examples
3. Update README with 5-line quickstart
4. Write integration test suite covering happy path + error paths for all endpoints
5. Add OpenAPI/Swagger spec to `api-spec.yaml`

**Checkpoint:** A developer who has never seen the codebase can issue their first credential in under 30 minutes using only the README.

---

### Testing Strategy

| Layer | What | Tool |
|-------|------|------|
| Unit | `crypto.js` — hash, salt, HMAC (100% coverage required) | Jest |
| Integration | Each API endpoint: 1 happy path + 1 error path | Jest + node-fetch |
| Security | Org A cannot read Org B passports (403 verified) | Manual + Jest |
| E2E | register → issue → verify → revoke → verify (expect false) | Playwright |
| Performance | `/api/verify-passport` < 200ms at p95 | Artillery |

---

## 10. RISKS & FAILURE MODES

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| PBKDF2 (100k iterations) too slow in function cold start | High | High | Benchmark first; reduce to 10k if > 150ms; acceptable security tradeoff at MVP |
| Firestore cold start adds latency to verify endpoint | Medium | High | Cache org lookup in function memory; move to dedicated server if p95 > 300ms |
| qrserver.com rate limiting | Low | Medium | Bundle `qrcode` npm package as fallback; generate data URIs server-side |
| Firebase Auth token expiry not handled | High | Medium | Add token refresh interceptor before Phase 2; unhandled = silent logout |
| Netlify function 10s timeout on PBKDF2 | Low | High | Test in deployed env early in Phase 1, not just locally |

### Product Risks

| Risk | Mitigation |
|------|------------|
| Concept too abstract — "what is a passport?" | Homepage copy leads with the pain ("API keys keep leaking"), not the solution name |
| Companies don't feel the pain until a breach | Lead with SOC 2 compliance angle as primary sales hook — near-term, concrete urgency |
| Integration friction too high | SDK + 3-line quickstart + one-click Netlify deploy button |
| "Just use HMAC yourself" objection | Emphasize the dashboard, one-time reveal, public verification, and audit trail — none of which DIY gives you |

### YC Rejection Risks

| Risk | Mitigation |
|------|------------|
| No revenue | Soft-launch paid tier before application; even $1 MRR matters |
| No users | 5 pilot companies (friends/network) with real credentials before demo day |
| "This is just Auth0" | Clear positioning: Auth0 = authentication (who you are). Passport Agent = credential issuance (what you carry). Different layer, different buyer. |
| "How is this a big company?" | Every company shipping an API is the customer. Land-and-expand: one integration → grow with their user base. Platform play with SDK ecosystem. |
| Solo founder | Demonstrate execution velocity through working product shipped in weeks |

---

## 11. YC DEMO STRATEGY

### The 2-Minute Story

**Opening (15 seconds):**
> "Every developer building an API gives out raw API keys — strings that get committed to git, shared in Slack, and have no expiry, no scoping, and no audit trail. This is how every major API breach starts. There has never been a product that solves this."

**Demo (90 seconds):**

1. **(0:00)** Open `index.html`. "This is what a company admin sees. They're onboarding a new API client."

2. **(0:15)** Fill in: Full Name "Jane Smith", Nationality "ClientCorp". Click **Initialize Security Check**. Watch the 4-step animation run.

3. **(0:35)** Passport credential card appears. Point out three things:
   - **QR code** — "scannable by anyone"
   - **Masked API key** — "shown only once, the server never stores this in plaintext"
   - **Verification hash** — "any service can verify this credential is authentic without any shared secret"

4. **(0:50)** Click Reveal. Show full key briefly. Click Copy. "Jane gets this once. After this, it's permanently masked — even if someone breaks into our database, there's nothing to steal."

5. **(1:00)** Open `verify-demo.html` in new tab. Paste passport number + API key. Hit **Verify Access**. Green response: `{ "verified": true, "scopes": ["api:read", "api:write"] }`. "Any service in the world calls our public endpoint. No SDK. No shared secret. No backend required on their end."

6. **(1:20)** Switch to admin portal. Show pending visa. Click **Approve**. Switch back to verify page, re-verify. Scopes updated. "Permissions are granular and real-time."

7. **(1:35)** Click **Revoke Passport**. Re-verify. `{ "verified": false, "reason": "revoked" }`. "Instant revocation. Zero coordination with the credential holder."

**Closing (15 seconds):**
> "We're building the Stripe of API credentials. Every company shipping an API is our customer. We charge per credential issued. There are 50 million developers. The conversion rate on 'stop your API keys from leaking' is very high."

---

### What Makes It Impressive to a Technical Audience
1. **The issuance ceremony** — security check animation makes credential creation feel significant, not throwaway. Signals intent.
2. **One-time key reveal** — visibly different from anything in the market; demonstrates deep thinking about the attack surface
3. **Public verification without shared secrets** — technically impressive and immediately graspable by any engineer in the room
4. **Instant revocation demo** — removes the biggest objection to credential systems live, on screen
5. **The hacker aesthetic** — monospace fonts, neon green, QR codes — signals technical depth to a technical audience without saying a word

### The Story Being Told
> "We identified a gap in the API security stack that every company has but nobody has productized. We built the credential primitive that should have existed alongside OAuth. The timing is right because AI agents have made this 10x more urgent — agents need unforgeable, scoped, revocable credentials, and raw API keys are not that."

---

## APPENDIX: IMMEDIATE NEXT ACTIONS (ordered, start here)

1. [ ] Set up Firebase project with real credentials — replace all placeholder `YOUR_API_KEY` config
2. [ ] Write and test `netlify/functions/src/lib/crypto.js` with benchmark (PBKDF2 timing)
3. [ ] Update `apply-passport.js` to write real passport to Firestore with crypto pipeline
4. [ ] Verify first real passport persists in Firestore console after API call
5. [ ] Update `list-pending.js` to query Firestore — delete all mock data
6. [ ] Update `index.html` to use Firebase Auth (replace localStorage users)
7. [ ] Build `verify-demo.html` — the most important demo artifact
8. [ ] Onboard 3 pilot users manually before any public launch
9. [ ] Set up waitlist page at root domain while MVP is in progress
10. [ ] Get one paying customer (even $1/month) before YC application deadline
