# Passport Agent — Trustworthy Autonomous Execution

A deterministic execution runtime for autonomous systems.

**Cryptographic identity. Pre-execution enforcement. Explainable decisions. Deterministic replay. Immutable audit. Crash recovery.**

AI agents generate tool calls. Passport Agent intercepts every call, verifies the agent's identity, evaluates the action against defined policies, and either allows, denies, or modifies it — all before execution.

## Architecture

```
┌─────────────┐    POST /enforce    ┌──────────────┐    Gateway Ticket    ┌─────────────┐
│  Agent SDK  │ ──────────────────▶ │ Policy Engine │ ──────────────────▶ │   Gateway   │
│ (wrapTool)  │                     │ (evaluator)  │                     │ (execute)   │
└─────────────┘                     └──────┬───────┘                     └──────┬──────┘
                                           │ DENY                                │
                                    PermissionError                      Audit Log
                                           │                                    │
                                    ┌──────▼───────┐                    ┌───────▼──────┐
                                    │  Audit Log   │◀────────────────────│  Firestore   │
                                    │ (actionIntents)│                   │ (5 collections)│
                                    └──────────────┘                    └──────────────┘

Worker: polls pending tasks → creates runs → executes → completes/fails
Resilience: crash recovery, idempotency, retry, timeout, stale detection
```

## Quickstart

### One-liner (any terminal)

```bash
curl -fsSL https://raw.githubusercontent.com/jameserez-code/MVP-Netlify-Firebase/main/install.sh | bash
```

### Manual

```bash
git clone https://github.com/jameserez-code/MVP-Netlify-Firebase.git
cd MVP-Netlify-Firebase
npm install
# Place service-account.json from Firebase Console
bash start.sh
```

## API Endpoints (18 total)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/auth/login` | — | Get JWT |
| POST | `/task` | JWT | Create task |
| GET | `/task/:id` | — | Read task |
| POST | `/agent/run` | JWT | Start run |
| POST | `/run/:id/log` | JWT | Log action |
| PATCH | `/run/:id/complete` | JWT | Complete run |
| PATCH | `/run/:id/fail` | JWT | Fail run |
| POST | `/agents/register` | JWT | Register agent |
| GET/PATCH | `/agents/:id` | —/JWT | Get/revoke agent |
| POST/GET/PATCH | `/policies` | JWT/— | CRUD policies |
| POST | `/enforce` | JWT | Evaluate intent |
| POST | `/gateway/execute` | — | Execute with ticket |
| GET | `/audit` | — | Query intents |
| GET | `/audit/timeline` | — | Execution timeline |
| GET | `/run/:id/trace` | — | Run trace |
| GET | `/metrics` | — | Operational metrics |
| GET | `/security/ping` | — | Auth status |

## Documentation

| Doc | Purpose |
|-----|---------|
| `OPERATIONS.md` | Start, monitor, recover |
| `FAILURE_MODES.md` | Common failures + diagnosis |
| `FIRESTORE_INDEXES.md` | Required indexes |
| `DEPLOY.md` | Netlify deployment |
| `api-spec.yaml` | OpenAPI 3.0 spec |

## Pages

| File | Purpose |
|------|---------|
| `index.html` | Main app — gate, auth, passport, visa |
| `admin-portal.html` | Admin — credential registry, activity feed |
| `agents.html` | Agent management — register, policies, enforce test |
| `dev-dashboard.html` | Dev ops — metrics, runs, timeline |
| `verify-demo.html` | Third-party credential verification |

## State Machines

**Tasks:** `pending → queued → running → completed/failed/cancelled`
**Runs:** `starting → running → completed/failed/timed_out`

All transitions validated. Invalid transitions rejected with explicit error.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start API server |
| `npm run worker` | Start execution worker |
| `npm run setup` | Bootstrap (validate, seed, test) |
| `npm test` | Unit tests (crypto + evaluator) |
| `npm run test:integration` | Enforce pipeline test |
| `npm run test:security` | Security tests |
| `npm run test:resilience` | Failure resilience tests |

## Docker

```bash
docker compose up           # API + worker
docker compose up api       # API only
```

## Environment

Copy `.env.example` to `.env`. Required:
- `service-account.json` — Firebase service account
- `JWT_SECRET` — JWT signing key
- `ENGINE_SECRET` — Gateway ticket signing key
