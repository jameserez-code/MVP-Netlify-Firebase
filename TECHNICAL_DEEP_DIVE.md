# Passport Agent — Technical Deep Dive

## Architecture

Single-process Node.js server (Fastify) + deterministic polling worker. Firestore for persistence. Local JSON file store for demo mode.

**Only 2 runtime dependencies:** `fastify`, `firebase-admin`. Zero AI frameworks. Zero queues. Zero ORMs.

## Execution Pipeline

```
1. Agent SDK intercepts tool call → signs ACTION_INTENT (HMAC-SHA256)
2. POST /enforce → server validates signature against stored agent key
3. Policy resolution: fetch active policies → filter by agent scope → sort by priority
4. 11-step evaluation:
   a. Agent status check (revoked/suspended → deny)
   b. Blocked tools check (deniedTools → deny)
   c. Allowed tools check (no match → deny)
   d. Modify transformations applied
   e. Domain blocklist → deny
   f. Domain allowlist → deny if no match
   g. Parameter constraints (type, enum, pattern, length, range)
   h. Data restrictions (PII, secret patterns)
   i. Rate limit check
   j. Cost limit check
   k. Issue gateway ticket (if allowed/modified)
5. POST /gateway/execute → verify ticket → mark used (replay protection)
6. Tool executed → response returned → all logged to audit
```

## State Machines

**Tasks:** `pending → queued → running → completed | failed | cancelled`  
**Runs:** `starting → running → completed | failed | timed_out`

All transitions are atomic Firestore transactions. Invalid transitions rejected explicitly (409).

## Deterministic Guarantees

- Evaluator is a **pure function**: same task + same agent + same policy → same decision every time
- Replay is **verifiable**: stored execution artifact compared to new output
- Crash recovery is **deterministic**: `recoverOnStartup()` finds stuck runs, requeues if retries remain

## Security Model

- **Auth:** HMAC-SHA256 JWT (1hr expiry, configurable)
- **Passwords:** PBKDF2 (100k iterations, SHA-512)
- **Agent keys:** Never stored plaintext. Hash only. Revealed once at registration.
- **Gateway tickets:** Single-use, 30s TTL, atomically marked
- **Input validation:** Injection detection (script, template, eval), 100KB body limit
- **Rate limiting:** Per-endpoint (auth 20/min, enforce 100/min), burst detection
- **Org isolation:** orgId on every document, queries automatically scoped

## Scale Characteristics

- **Throughput:** 8 tasks/min per worker (single-process polling)
- **Latency:** ~50ms transition, ~40ms log write
- **Recovery:** ~500ms per 100 stuck runs
- **API:** ~50 req/sec single Fastify instance
- **Memory:** < 50MB baseline

## Operations

- **18 API endpoints** (OpenAPI 3.0 spec)
- **7 console pages** (static HTML, Tailwind CDN)
- **Terminal TUI** (256-color, keyboard-native, zero deps)
- **30 unit tests** + **24 integration tests** (all passing)
- Docker + docker-compose deployment
- One-command install + zero-config demo mode
