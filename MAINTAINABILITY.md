# Codebase Maintainability Guide

## Dependency Philosophy

**Zero-dependency where possible. Single-dependency where necessary.**

| Dependency | Why we have it | Could we remove it? |
|-----------|---------------|---------------------|
| `firebase-admin` | Firestore persistence | Only if we support another DB |
| `fastify` | HTTP server (15+ endpoints) | Could use raw Node http, but Fastify gives routing + CORS + validation |
| `@fastify/cors` | Unused — CORS handled inline | Remove in next pass |
| `tsx` | TypeScript runtime | Could compile to JS first |
| `typescript` | Type safety | Could use JSDoc |
| `@types/node` | Node.js type definitions | Required for TS |

**What we deliberately don't depend on:** ORMs, queues (BullMQ, Kafka), agent frameworks (LangChain, CrewAI), frontend frameworks (React, Vue), state machines (XState), logging libraries (Winston, Pino).

## Module Map

### `src/lib/` — Foundation (imported everywhere, no deps on other src modules)
| File | Lines | Purpose |
|------|-------|---------|
| `crypto.ts` | 143 | Key generation, hashing, HMAC, JWT, gateway tickets |
| `firebase.ts` | 37 | Singleton Firestore init |
| `jwt.ts` | 61 | Auth token sign/verify |
| `logger.ts` | 37 | Structured logging |

### `src/` — Core platform modules
| File | Lines | Purpose | Depends on |
|------|-------|---------|-----------|
| `server.ts` | 257 | Fastify entry point | All modules |
| `state-machine.ts` | 33 | Task/run status types + transitions | — |
| `transitions.ts` | 173 | Atomic Firestore state transitions | state-machine, logger |
| `resilience.ts` | 190 | Crash recovery, retry, idempotency | logger |
| `observability.ts` | 116 | Request IDs, metrics, timeline, trace | crypto, logger |
| `security.ts` | 83 | Auth hardening, org isolation, idempotency keys | jwt, logger |
| `capabilities.ts` | 151 | Execution capabilities, org seeding, org metrics | logger |
| `diagnostics.ts` | 159 | Diagnostics, consistency checker, repair, reports | logger |
| `agent-contract.ts` | 122 | Agent execution interface, registry, sandbox | — |
| `agent-model.ts` | 88 | Legacy type definitions (partially absorbed by state-machine) | — |
| `config.ts` | 45 | Runtime operational parameters | — |
| `types.ts` | 134 | Shared TypeScript API types | — |
| `worker.ts` | 125 | Execution worker (polling, crash recovery, timeouts) | firebase, logger, resilience |

### `src/routes/` — API endpoint groups
| File | Lines | Endpoints |
|------|-------|----------|
| `agents.ts` | 150 | 5 endpoints (register, list, get, revoke, rotate-key) |
| `policies.ts` | 100 | 4 endpoints (create, list, get, update) |
| `enforce.ts` | 122 | 2 endpoints (enforce, gateway/execute) |

### Scripts (one-shot)
| File | Lines | Purpose |
|------|-------|---------|
| `healthcheck.ts` | 47 | Verify single Firestore read/write |
| `seed.ts` | 80 | Seed 5 collections with demo data |
| `tasks.ts` | 58 | `createTask`/`getTask` module + self-test |
| `bootstrap.ts` | 80 | `npm run setup` — validate, seed, test, print endpoints |

## Naming Conventions

- **Files**: kebab-case (`state-machine.ts`, `agent-contract.ts`)
- **Functions**: camelCase (`transitionTask`, `ensureSingleActiveRun`)
- **Types**: PascalCase (`TaskStatus`, `RunStatus`)
- **Constants**: UPPER_SNAKE (`TASK_TRANSITIONS`, `MAX_RETRIES`)
- **Routes**: plural noun (`/agents`, `/policies`, `/runs`)
- **Actions**: verb (`/enforce`, `/execute`, `/register`)
- **Firestore collections**: camelCase (`actionIntents`, `gatewayTickets`)

## Dependency Graph

```
server.ts
  ├── lib/firebase.ts
  ├── lib/logger.ts
  ├── lib/jwt.ts
  ├── lib/crypto.ts
  ├── state-machine.ts
  ├── transitions.ts (→ state-machine, logger)
  ├── resilience.ts (→ logger)
  ├── observability.ts (→ crypto, logger)
  ├── security.ts (→ jwt, logger)
  ├── capabilities.ts (→ logger)
  ├── diagnostics.ts (→ logger)
  ├── agent-contract.ts
  ├── config.ts
  ├── routes/agents.ts (→ crypto, logger)
  ├── routes/policies.ts (→ crypto, logger)
  └── routes/enforce.ts (→ crypto, logger, evaluator CJS)
```

## What to Refactor

1. **Remove `agent-model.ts`** — absorbed by `state-machine.ts`, `transitions.ts`, and `types.ts`. 88 lines of mostly redundant type definitions.
2. **Remove unused `@fastify/cors`** — CORS is handled inline in `server.ts`.
3. **Consolidate `tasks.ts` + `tasks-verify.ts`** — 91 lines across 2 files for basic CRUD. Move into routes or remove.
4. **Evaluate CJS bridge in enforce.ts** — `createRequire` to load evaluator.js. Consider porting evaluator to TypeScript to remove the bridge.

## What NOT to Touch

- `crypto.ts` / `crypto.js` — Two implementations (TS + CJS) exist because the Netlify Functions runtime needs CJS and the Fastify server needs TS. This duplication is intentional until one runtime is chosen.
- `state-machine.ts` — Minimal, correct, heavily tested. Do not abstract further.
- `transitions.ts` — Every state change goes through here. Centralized enforcement point. Do not bypass.

## Adding a New Endpoint

1. If it belongs to an existing group → add to `src/routes/{group}.ts`
2. If it's a new group → create `src/routes/{name}.ts`, export default async function, import in `server.ts`
3. If it needs auth → use `requireAuth()` from server.ts
4. If it modifies state → use `transitionTask()` or `transitionRun()` from `transitions.ts`
5. Add a test in `tests/integration/`

## Testing

```
npm test                    # Unit tests (crypto + evaluator)
npm run test:integration    # Enforce pipeline against live server
npm run test:security       # Auth + replay + isolation tests
npm run test:resilience     # Fault injection tests
```

All integration tests require the API server running on `:3000` with a valid `service-account.json`.
