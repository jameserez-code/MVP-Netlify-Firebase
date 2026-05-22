# Contributing to Passport Agent

Thank you for your interest in contributing! This document outlines the process for contributing to this project.

---

## Architecture Overview

Passport Agent is a policy enforcement gateway for AI agents. It sits between
your LLM and its tool execution, validating every action against security policies.

```
                         ┌───────────────────┐
  OpenAI / Anthropic ──▶ │  Passport Agent   │ ──▶ Tool Execution
  LangChain / CrewAI     │  (Enforce Policy) │     (if allowed)
                         └───────────────────┘
                                  │
                            Firestore (audit)
                            Redis (cache/rate)

Project structure:
├── src/            Fastify API server (18 endpoints)
│   ├── routes/     API route handlers
│   ├── lib/        Core libraries (firebase, crypto, logger, policy engine)
│   ├── middleware/  Auth, org-isolation, rate limiting
│   └── workers/    Background job processors
├── frontend/       Next.js 14 dashboard (app router)
│   ├── app/        Pages (dashboard, demo, playground, docs, auth)
│   ├── components/ Reusable UI components
│   └── lib/        API client, SWR config, WebSocket client
├── sdk/            TypeScript SDK for Node.js integrations
├── demo/           Demo scripts and scenario data
├── examples/       Runnable integration examples
├── templates/      Quickstart templates (config, docker, env)
├── scripts/        Dev ops scripts (seed, migrate, deploy)
├── tests/          Unit and integration tests
├── e2e/            Playwright end-to-end tests
├── content/        Documentation and guides
└── design-system/  Visual design reference
```

---

## Development Setup

### Prerequisites

- Node.js >= 20
- npm >= 10
- Git
- Docker (optional, for Redis)

### Backend Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `templates/env.quickstart` to `.env` and configure variables
4. Run tests: `npm test`
5. Start development server: `npm run dev`

### Frontend Setup

1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Run type check: `npm run type-check`
4. Run lint: `npm run lint`
5. Start development server: `npm run dev`

### Quick Docker Setup

The quickest way to get a local environment:

```bash
# 1. Copy env template
cp templates/env.quickstart .env

# 2. Edit .env with your Firebase credentials
vim .env

# 3. Start the stack (API + Redis)
docker compose -f docker-compose.yml up -d

# 4. Seed demo data
npm run demo:seed

# 5. Verify
curl http://localhost:3000/health
```

### Using the Quickstart Templates

- `templates/.passport-agent.json` — Default agent config for the CLI
- `templates/docker-compose.quickstart.yml` — Minimal Docker Compose for testing
- `templates/env.quickstart` — Minimal env vars for local dev

---

## Testing Guide

### Unit Tests

All new utilities and business logic must have unit tests.

```bash
npm test                    # Runs all unit tests (Node test runner)
```

### Integration Tests

Require Firebase credentials. Skipped in CI when unavailable.

```bash
npm run test:integration    # Enforce endpoint integration tests
npm run test:security       # Security-focused tests (SSRF, PII, injection)
npm run test:resilience     # Error handling and retry logic tests
npm run test:full-api       # Full API surface integration test
npm run test:policy         # Policy engine evaluation tests
npm run test:smoke          # Smoke tests (scripts/e2e-smoke-test.ts)
```

### E2E Tests (Playwright)

```bash
npm run test:e2e            # Headless E2E tests
npm run test:e2e:ui         # Interactive E2E test runner
```

### Frontend Tests

```bash
cd frontend
npm run type-check          # TypeScript type checking
npm run lint                # ESLint
npm run build               # Ensure Next.js build succeeds
```

### Demo & Manual Testing

```bash
npm run demo:lifecycle      # Full agent lifecycle demo (hits real API)
npm run demo:seed           # Seed demo data (see options below)
npm run demo                # Start demo server
npm run demo:guided         # Interactive guided demo
```

Seed script options:
```bash
npm run demo:seed -- --scenario=customer-support   # Use C/S scenario
npm run demo:seed -- --scenario=data-analyst       # Use analytics scenario
npm run demo:seed -- --orgs=5 --volume=high        # 5 orgs, 10K+ logs
npm run demo:seed -- --days=30 --output=data.json  # 30 days, export
```

---

## Branch Naming Conventions

Use the following prefixes for branch names:

- `feat/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `style/` - Code style changes (formatting, no logic change)
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests
- `chore/` - Maintenance tasks
- `perf/` - Performance improvements

Examples:

```
feat/oauth-login
fix/firebase-connection-timeout
docs/api-authentication
perf/audit-query-optimization
```

---

## Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat:` A new feature
- `fix:` A bug fix
- `docs:` Documentation only changes
- `style:` Changes that do not affect the meaning of the code
- `refactor:` A code change that neither fixes a bug nor adds a feature
- `perf:` A code change that improves performance
- `test:` Adding or correcting tests
- `chore:` Changes to the build process or auxiliary tools
- `security:` Security fixes

### Examples

```
feat(auth): add JWT token refresh
fix(api): handle null response from Firebase
docs(readme): update installation instructions
security(enforce): add parameter length limits to prevent DoS
```

---

## PR Guidelines

### Before Opening a PR

1. Create a feature branch from `main`
2. Make your changes following our style guidelines
3. Write/update tests for your changes
4. Ensure all tests pass locally:
   ```bash
   npm test && npm run test:smoke && npm run lint
   ```
5. Run linting and formatting:
   ```bash
   npm run lint:fix && npm run format
   ```
6. Verify the build:
   ```bash
   npm run build && cd frontend && npm run build
   ```
7. Commit using conventional commits
8. Push your branch

### PR Description Template

```markdown
## What
Brief description of the change.

## Why
Why this change is needed. Link to issue if applicable.

## How
Technical approach and key decisions.

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass (or explain why skipped)
- [ ] Frontend type check passes
- [ ] Manual testing done (describe what you tested)

## Screenshots
(If UI change, attach before/after)

## Checklist
- [ ] No hardcoded secrets or credentials
- [ ] No console.log (use logger)
- [ ] Error states handled
- [ ] Loading states handled (frontend)
- [ ] Empty states handled (frontend)
- [ ] Mobile responsive (frontend)
```

### Review Process

1. Push your branch and open a Pull Request
2. Fill out the PR template completely
3. CI will run tests, lint, and build automatically
4. Request review from at least one maintainer
5. Address review feedback promptly
6. Once approved, your PR will be merged by a maintainer

---

## Code Style Guide

### General Principles

- **Readability over cleverness**: Write code for the next person, not the compiler
- **Explicit over implicit**: Don't rely on type coercion or hidden behavior
- **Fail fast**: Validate inputs at boundaries, throw early with clear messages
- **Least privilege**: Agents and policies should default to deny

### TypeScript (Backend)

- Use strict mode (`tsconfig.json` has `"strict": true`)
- Prefer `interface` over `type` for object shapes
- Use `Record<string, unknown>` instead of `any` for unknown objects
- All async functions must have try/catch at the top level
- Use the project logger (`src/lib/logger.ts`) — never `console.log` in production code
- Validate all request bodies with Zod schemas
- Environment variables accessed through the config layer, never directly via `process.env`

### React / Next.js (Frontend)

- Use `'use client'` directive only when needed (state, effects, event handlers)
- Server components by default; client components for interactivity
- Use SWR for all data fetching with the shared config (`lib/swr-config.ts`)
- Use `GlassCard` for card containers, `Loading`/`SkeletonCard` for loading states
- Use `EmptyState` components for empty list states — never render nothing
- Tailwind utility classes, using the `passport-` prefixed design tokens
- Dark mode only — no light mode support needed

### Naming Conventions

- **Files**: kebab-case (`seed-demo.ts`, `glass-card.tsx`)
- **Functions**: camelCase (`seedAgents`, `createPolicy`)
- **Types/Interfaces**: PascalCase (`EnforceRequest`, `PolicyRule`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE`, `MAX_RETRIES`)
- **Environment variables**: UPPER_SNAKE_CASE (`JWT_SECRET`, `FIREBASE_PROJECT_ID`)

### Error Handling

```typescript
// Good — specific catch, logged, re-thrown if needed
try {
  await doRiskyOperation()
} catch (err: any) {
  log.error('operation failed', { error: err.message, context: 'seeder' })
  throw new Error(`Seeding failed at step X: ${err.message}`)
}

// Bad — swallowing errors silently
try { await doSomething() } catch {}
```

### Security Checklist for Every PR

- [ ] No hardcoded secrets, tokens, or passwords
- [ ] No `eval()`, `new Function()`, or dynamic code execution
- [ ] SQL/NoSQL injection protections in place (parameterized queries)
- [ ] All API endpoints have input validation (Zod schemas)
- [ ] All agent tool calls go through enforcement (never direct)
- [ ] Audit logs include all enforcement decisions (allow + deny)
- [ ] PII never appears in logs or error messages
- [ ] Rate limiting on auth endpoints (login, register, reset)

### Formatting

We use ESLint and Prettier to enforce code style. Pre-commit hooks will
automatically format and lint your code.

```bash
# Backend
npm run lint               # Check
npm run lint:fix           # Auto-fix
npm run format             # Auto-format
npm run format:check       # Check only

# Frontend
cd frontend
npm run lint               # Check
npm run lint:fix           # Auto-fix
npm run format             # Auto-format
npm run format:check       # Check only
```

---

## Questions?

If you have questions, feel free to open an issue or reach out to the maintainers.
