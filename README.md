# Passport Agent — Trustworthy Autonomous Execution

> **OAuth for AI Agents.** A deterministic execution runtime that intercepts every AI tool call, verifies identity, evaluates against policies, and allows/denies/modifies before execution — with immutable audit logging and crash recovery.

**Cryptographic identity. Pre-execution enforcement. Explainable decisions. Deterministic replay. Immutable audit. Crash recovery.**

---

## Table of Contents

- [What This Is](#what-this-is)
- [YC-Style Verdict](#yc-style-verdict)
- [Architecture](#architecture)
- [Quickstart](#quickstart)
- [Environment Setup](#environment-setup)
- [API Endpoints](#api-endpoints)
- [Frontend](#frontend)
- [Security](#security)
- [Deployment](#deployment)
- [Design System](#design-system)
- [Testing](#testing)
- [State Machines](#state-machines)
- [Scripts](#scripts)
- [Documentation](#documentation)

---

## What This Is

AI agents generate tool calls. Passport Agent intercepts every call:

1. **Verifies** the agent's cryptographic identity
2. **Evaluates** the action against defined policies (allowed tools, domains, constraints, cost limits, PII detection)
3. **Decides** — allow, deny, or modify (e.g., force GET instead of POST)
4. **Executes** via signed gateway tickets
5. **Audits** every decision immutably to Firestore

**For:** Developers building AI agents that need to act on behalf of users/businesses safely.
**Competitors:** Raw API keys (no enforcement), OAuth 2.0 (not designed for autonomous agents), LangChain callbacks (post-hoc, not pre-execution).

---

## YC-Style Verdict

> **This is a real problem in a growing market, but the project was two half-finished products masquerading as one MVP.**

**Before (yesterday):**
- Backend: Fastify API + Firebase/Firestore + execution worker + policy engine — but a 2010-era vanilla HTML frontend
- Frontend: Polished Next.js + Tailwind + dark theme — but only connected to `localStorage`, no real backend
- Security: Hardcoded passwords (`admin`), custom crypto with timing vulnerabilities, JWT secret fallbacks
- Deployment: Node 18 (incompatible with deps), binding to `localhost` (broke on Render), no healthchecks

**After (today):**
- Integrated Next.js 14 frontend actually connected to the Fastify backend
- All hardcoded credentials removed; native `crypto.timingSafeEqual()`; env validation at startup
- Node 20, Docker multi-stage build, healthchecks, production CORS
- Design system: Dark OLED + Glassmorphism + Terminal aesthetic

**Biggest remaining risk:** No validated user demand. You need 10 developers to try this and give feedback before building more features.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 CLIENTS                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Next.js    │  │   Operator   │  │    SDK       │  │   Netlify    │       │
│  │   Frontend   │  │   Console    │  │  (OpenAI)    │  │   Functions  │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
└─────────┼─────────────────┼─────────────────┼─────────────────┼───────────────┘
          │                 │                 │                 │
          └─────────────────┴─────────────────┴─────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   Fastify API      │
                    │   (Node 20)        │
                    │                    │
                    │  • Auth (JWT)      │
                    │  • Tasks / Runs    │
                    │  • Agents / Policies│
                    │  • Enforce         │
                    │  • Gateway         │
                    │  • Audit / Metrics │
                    │  • Diagnostics     │
                    └─────────┬──────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
    ┌─────▼─────┐      ┌─────▼─────┐      ┌─────▼─────┐
    │ Firestore │      │  Worker   │      │  Audit    │
    │  (5 col.) │      │ (polling) │      │  Logger   │
    └───────────┘      └───────────┘      └───────────┘
```

**Collections:** `tasks`, `runs`, `agents`, `policies`, `actionIntents`, `logs`, `sessions`, `users`

---

## Quickstart

### Prerequisites
- Node.js >= 20
- Firebase project (or use demo mode)
- Git

### 1. Clone & Install

```bash
git clone https://github.com/jameserez-code/MVP-Netlify-Firebase.git
cd MVP-Netlify-Firebase
npm install
cd frontend && npm install && cd ..
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your Firebase credentials and secrets
```

See [Environment Setup](#environment-setup) below for details.

### 3. Run Backend

```bash
# Development (with tsx watch)
npm run dev

# Production build
npm run build
npm start
```

### 4. Run Frontend

```bash
cd frontend
npm run dev        # http://localhost:3001
```

### 5. Run Worker (separate terminal)

```bash
npm run worker
```

### 6. Docker (alternative)

```bash
docker compose up    # API + worker + healthchecks
```

---

## Environment Setup

### Required Variables

| Variable | Purpose | How to Get |
|----------|---------|-----------|
| `FIREBASE_PROJECT_ID` | Firebase project ID | Firebase Console → Project Settings |
| `FIREBASE_CLIENT_EMAIL` | Service account email | Firebase Console → Service Accounts |
| `FIREBASE_PRIVATE_KEY` | Service account private key | Download JSON, extract `private_key` |
| `JWT_SECRET` | JWT signing secret | `openssl rand -hex 32` |
| `ENGINE_SECRET` | Gateway ticket signing | `openssl rand -hex 32` |
| `ADMIN_PASSWORD` | Initial admin password | Generate strong password (auto-generated if empty) |
| `DEFAULT_ORG_ID` | Default organization ID | Any string, e.g., `org_default_001` |

### Optional Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `PORT` | API server port | `3000` |
| `ALLOWED_ORIGINS` | CORS origins (production) | — |
| `NODE_ENV` | Environment mode | `development` |

### Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a project (or use existing)
3. Project Settings → Service Accounts → Generate New Private Key
4. Save as `service-account.json` in project root (gitignored)
5. Copy `project_id`, `client_email`, `private_key` to `.env`

**Important:** `private_key` must include actual newline characters (`\n` in JSON becomes real newlines in `.env`).

### Firestore Indexes

Deploy indexes before first use:

```bash
firebase deploy --only firestore:indexes
```

---

## API Endpoints

### Auth

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/auth/login` | — | Get JWT token |

### Tasks & Runs

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/task` | JWT | Create task |
| GET | `/task/:id` | — | Read task |
| POST | `/agent/run` | JWT | Start run |
| POST | `/run/:id/log` | JWT | Log action |
| PATCH | `/run/:id/complete` | JWT | Complete run |
| PATCH | `/run/:id/fail` | JWT | Fail run |

### Agents & Policies

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/agents/register` | JWT | Register agent |
| GET | `/agents` | — | List agents |
| GET/PATCH | `/agents/:id` | —/JWT | Get/revoke agent |
| POST/GET | `/policies` | JWT/— | CRUD policies |

### Enforcement & Gateway

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/enforce` | JWT | Evaluate intent |
| POST | `/gateway/execute` | — | Execute with ticket |

### Observability

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/audit` | — | Query intents |
| GET | `/audit/timeline` | — | Execution timeline |
| GET | `/run/:id/trace` | — | Run trace |
| GET | `/metrics` | — | Operational metrics |
| GET | `/diagnostics` | — | System health |
| GET | `/consistency` | — | Consistency check |
| POST | `/repair` | JWT | Repair orphaned/stuck |
| GET | `/report` | — | Operational report |
| GET | `/health` | — | Health check (no auth) |

### Org

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/org/seed` | JWT | Create demo org |
| GET | `/org/metrics` | — | Org-scoped metrics |

**Full OpenAPI spec:** [`api-spec.yaml`](./api-spec.yaml)

---

## Frontend

### Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS v3**
- **Lucide React** (icons — no emojis)
- **qrcode** (passport QR generation)

### Pages

| Route | Purpose | Auth Required |
|-------|---------|--------------|
| `/` | Landing page (hero, features, CTA) | No |
| `/login` | Admin/org login | No |
| `/register` | Organization registration | No |
| `/dashboard` | Stats, diagnostics, health | Yes |
| `/dashboard/agents` | Agent management, registration | Yes |
| `/dashboard/policies` | Policy builder, JSON editor | Yes |
| `/dashboard/audit` | Audit log with filters | Yes |

### Design System

See [`design-system/MASTER.md`](./design-system/MASTER.md) for the complete design system specification.

**Key aesthetic:** Dark OLED (`#0d1117`) + Glassmorphism + Terminal green (`#2ea043`) accents. JetBrains Mono for data. Geist/Inter for UI.

### API Client

The frontend connects to the backend via `NEXT_PUBLIC_API_URL` (default: `http://localhost:3000`). JWT is stored in `localStorage` and automatically attached to all authenticated requests. 401 responses redirect to `/login`.

### Running the Frontend

```bash
cd frontend
npm run dev        # Port 3001
npm run build      # Production build
npm start          # Start production server
```

---

## Security

### What We Fixed (Critical)

| Issue | Severity | Fix |
|-------|----------|-----|
| Hardcoded `DEFAULT_PASSWORD = 'admin'` | **Critical** | Removed. Now requires `ADMIN_PASSWORD` env or auto-generates secure random password |
| Custom `timingSafeEqual` in `jwt.ts` | **High** | Replaced with native `crypto.timingSafeEqual()` |
| `JWT_SECRET` fallback to `'dev-secret-change-me'` | **High** | Removed. Server fails fast with clear error if missing |
| `ENGINE_SECRET` fallback | **High** | Removed. Server fails fast with clear error if missing |
| Hardcoded `orgId: 'org_seed_001'` | **Medium** | Now requires `DEFAULT_ORG_ID` env var |
| In-memory rate limiting (no distributed support) | **Medium** | Documented limitation; Redis recommended for multi-instance |
| No env validation | **Medium** | Added `src/lib/env.ts` — validates all required vars at startup |
| Missing `.gitignore` for secrets | **Low** | Added `*.key`, `*.pem`, `.env*` exclusions |
| CORS `*` in production | **Medium** | Now requires `ALLOWED_ORIGINS` in production; `*` only in dev |
| No CSP headers | **Low** | Added `Content-Security-Policy` to `netlify.toml` |

### Security Checklist for Production

- [ ] Rotate the Firebase service account key (especially if shared in chat/logs)
- [ ] Set strong `JWT_SECRET` (>= 32 chars, random)
- [ ] Set strong `ENGINE_SECRET` (>= 32 chars, random)
- [ ] Set `ADMIN_PASSWORD` to a strong password (or let it auto-generate)
- [ ] Configure `ALLOWED_ORIGINS` with exact domains (no wildcards)
- [ ] Enable Firebase App Check for additional abuse prevention
- [ ] Use Redis for distributed rate limiting if running multiple instances
- [ ] Enable Cloud Armor or similar DDoS protection
- [ ] Set up log aggregation and alerting for suspicious patterns
- [ ] Review Firestore rules regularly
- [ ] Run `npm audit` weekly

### Cryptographic Primitives

- **JWT Signing:** HS256 with `JWT_SECRET` (256-bit)
- **Gateway Tickets:** HS256 with `ENGINE_SECRET`
- **Intent Signatures:** HMAC-SHA256 with per-agent secret keys
- **Password Hashing:** PBKDF2-SHA256, 50k-100k iterations, 32-byte salt
- **Agent Secret Keys:** `crypto.randomBytes(32)` (256-bit)

---

## Deployment

### Render (Recommended for API)

1. Connect GitHub repo to Render
2. Create a **Web Service**
3. Configure:
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Standard (or Free for testing)
4. Add all environment variables from `.env.example`
5. **Important:** Render auto-detects ports. Ensure `PORT` env var is set.
6. Deploy

The Dockerfile includes a `HEALTHCHECK` that pings `/health` every 30 seconds.

### Netlify (Frontend + Serverless)

1. Connect GitHub repo to Netlify
2. Configure build settings:
   - **Build command:** `cd frontend && npm install && npm run build`
   - **Publish directory:** `frontend/out` or `frontend/.next`
3. Add environment variables in Netlify dashboard
4. Deploy

Netlify Functions are in `netlify/functions/` for serverless API endpoints.

### Docker

```bash
# Build and run
docker compose up --build

# API only
docker compose up api

# Worker only
docker compose up worker

# Scale API to 3 instances
docker compose up --scale api=3
```

**Note:** For multi-instance deployments, replace in-memory rate limiting with Redis.

---

## Design System

See [`design-system/MASTER.md`](./design-system/MASTER.md).

**Quick reference:**

| Token | Value | Usage |
|-------|-------|-------|
| `bg-primary` | `#0d1117` | Page background |
| `bg-surface` | `#161b22` | Cards, panels |
| `text-primary` | `#c9d1d9` | Body text |
| `text-secondary` | `#8b949e` | Labels, captions |
| `accent-green` | `#2ea043` | Success, primary actions |
| `accent-blue` | `#58a6ff` | Info, links |
| `accent-coral` | `#f78166` | Warnings, danger |
| `border-subtle` | `rgba(48, 54, 61, 0.5)` | Card borders |
| `font-ui` | `Inter, sans-serif` | UI text |
| `font-mono` | `JetBrains Mono, monospace` | Data, code |

---

## Testing

### Unit Tests

```bash
npm test
```

Tests cryptographic primitives and policy evaluator. All 30 tests must pass.

### Integration Tests

```bash
npm run test:integration    # Enforce pipeline
npm run test:security         # Auth/security
npm run test:resilience       # Failure recovery
npm run test:e2e              # End-to-end
npm run test:policy           # Policy rules
```

**Note:** Integration tests now require `ADMIN_PASSWORD` environment variable.

### Manual Testing

```bash
npm run demo           # Zero-setup demo server
npm run demo:guided     # Guided walkthrough (6 scenes)
```

---

## State Machines

### Tasks

```
pending → queued → running → completed
  │         │         │
  └─────────┴─────────┴──→ failed
  │
  └──→ cancelled
```

### Runs

```
starting → running → completed
   │          │
   └──────────┴──→ failed
   │
   └──→ timed_out
```

All transitions are validated. Invalid transitions are rejected with explicit error codes.

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start API server (tsx watch) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Start compiled server |
| `npm run worker` | Start execution worker |
| `npm run setup` | Bootstrap (validate, seed, test) |
| `npm test` | Unit tests |
| `npm run test:integration` | Enforce pipeline test |
| `npm run test:security` | Security tests |
| `npm run test:resilience` | Resilience tests |
| `npm run demo` | Demo server (zero Firebase) |
| `npm run demo:guided` | Guided walkthrough |

---

## Documentation

| Doc | Purpose |
|-----|---------|
| [`api-spec.yaml`](./api-spec.yaml) | OpenAPI 3.0 specification |
| [`design-system/MASTER.md`](./design-system/MASTER.md) | UI/UX design system |
| `OPERATIONS.md` | Start, monitor, recover |
| `FAILURE_MODES.md` | Common failures + diagnosis |
| `FIRESTORE_INDEXES.md` | Required Firestore indexes |
| `DEPLOY.md` | Netlify deployment guide |
| `SECURITY_REVIEW.md` | Security audit notes |

---

## License

MIT © J. Rabinowitz
