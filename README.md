# Passport Agent — Agent Control Plane

AI agent identity + permission enforcement system. Cryptographic identity (passports) + policy-based action control (visas) + immutable audit trail.

## Quickstart

```bash
npm install
# Place service-account.json in project root (from Firebase Console)
npm run healthcheck     # Verify Firestore connection
npm run schema:seed     # Seed 5 collections
npm run dev             # Start API on :3000
```

## Architecture

```
Agent SDK → POST /enforce → Policy Engine (11-step evaluator) → Gateway Ticket
  ↓ deny                                                ↓ allow/modify
  PermissionError                                POST /gateway/execute → tool runs
                                                       ↓
                                                  Audit log (actionIntents)
```

## API Endpoints (15 total)

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | Public | Get JWT token |

### Tasks
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/task` | JWT | Create task |
| GET | `/task/:id` | Public | Read task |

### Agent Runs
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/agent/run` | JWT | Start run (atomic: run+task→running) |
| POST | `/run/:id/log` | JWT | Log tool call (atomic: log+counters) |
| PATCH | `/run/:id/complete` | JWT | Complete run (atomic: run+task→completed) |
| PATCH | `/run/:id/fail` | JWT | Fail run (atomic: run+task→failed+error) |

### Agent Registry
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/agents/register` | JWT | Register agent (returns secret key ONCE) |
| GET | `/agents` | Public | List agents |
| GET | `/agents/:id` | Public | Get agent |
| PATCH | `/agents/:id/revoke` | JWT | Revoke agent |
| POST | `/agents/:id/rotate-key` | JWT | Rotate signing key |

### Policy Management
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/policies` | JWT | Create policy |
| GET | `/policies` | Public | List policies |
| GET | `/policies/:id` | Public | Get policy |
| PATCH | `/policies/:id` | JWT | Update policy |

### Enforcement (the critical path)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/enforce` | JWT | Evaluate intent → ALLOW/DENY/MODIFY + ticket |
| POST | `/gateway/execute` | Public | Execute with ticket (replay-protected) |

### Audit
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/audit` | Public | Query action intents |

## Pages

| File | Purpose |
|------|---------|
| `index.html` | Main app — gate, auth, passport issuance, visa application |
| `admin-portal.html` | Admin dashboard — credential registry, agent activity feed |
| `agents.html` | Agent management — register, list, policies, enforce test |
| `verify-demo.html` | Third-party credential verification demo |

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Fastify server on :3000 |
| `npm run healthcheck` | Verify Firestore read/write |
| `npm run schema:seed` | Seed 5 collections |
| `npm run tasks:verify` | Verify tasks CRUD |
| `npm test` | Run 30 unit tests (crypto + evaluator) |
