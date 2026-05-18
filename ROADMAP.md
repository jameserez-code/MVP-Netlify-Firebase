# Passport Agent — Complete Roadmap

## Current State (May 14, 2026)

**What's built:** 18 API endpoints, 7 web pages, TUI console, guided demo, demo worker, Docker, Vercel deployment, 30 unit tests, 24 integration tests, 10 documentation files. 2 runtime dependencies. Zero AI frameworks.

**What works today:** `curl ... | bash` → server + TUI auto-launch → worker processes tasks → enforcement blocks malicious actions → explainability shows why → health model reports state → guided demo walks through everything.

---

## PHASE 1: DEMO PERFECTION (highest priority for YC)

### 1.1 Real Enforcement in Demo Worker
The demo worker currently simulates tool calls. Wire the actual 11-step evaluator (from `netlify/functions/src/engine/evaluator.js`) into the demo worker so every simulated tool call goes through real policy evaluation.
- **Effort:** Medium
- **Impact:** Turns demo from "simulated" to "real" — enforcement decisions come from actual policy rules

### 1.2 Demo Worker Uses Real Policy Rules
Create demo policies that the evaluator checks. Currently the demo worker manually decides allow/deny. Instead: create a policy document, run the evaluator against it, and show the real decision.
- **Effort:** Small
- **Impact:** Explain endpoint shows which specific rule triggered, not generic messages

### 1.3 One-Command Golden Demo
Single command that starts server, worker, TUI, and runs through all 6 scenes without user input. Fully automated, deterministic, recordable.
- **Effort:** Medium
- **Impact:** Can be recorded and shared. Works every time. No operator error possible.

---

## PHASE 2: PRODUCTION OPERATIONS (for real deployments)

### 2.1 Production Worker with Real Execution
The worker currently simulates a 1-second execution. Implement real agent contract execution using the `agent-contract.ts` interface — the worker calls an actual registered executor function.
- **Effort:** Large
- **Impact:** System can execute real agent logic, not just simulate

### 2.2 Full Test Suite
- Unit tests: 30 → 100+ (every module covered)
- Integration tests: 24 → 50+ (every endpoint has error path tests)
- E2E tests: 0 → 10 (full lifecycle scenarios)
- Load tests: 0 → 3 (throughput, recovery, replay)
- **Effort:** Large
- **Impact:** Production confidence. Catch regressions before deployment.

### 2.3 Alerting + Monitoring
- Worker heartbeat endpoint
- Prometheus-compatible metrics
- Slack/webhook alerts for: stuck tasks, elevated failures, replay attacks
- **Effort:** Medium
- **Impact:** Operational visibility without needing the TUI

### 2.4 Rate Limiting Dashboard
Web UI showing current rate limit state per endpoint, per org, per IP. Ability to adjust limits live.
- **Effort:** Small
- **Impact:** Operator visibility into abuse prevention

---

## PHASE 3: ENTERPRISE FEATURES (post-YC)

### 3.1 Multi-Org Management UI
Web dashboard for creating/editing/deleting organizations. Each org has isolated agents, policies, tasks, and metrics.
- **Effort:** Medium
- **Impact:** Required for multi-tenant SaaS

### 3.2 Policy Templates
Pre-built policy templates for common agent scenarios (support bot, coding agent, CI/CD bot, document processor).
- **Effort:** Small
- **Impact:** Faster onboarding. Operators don't need to define policies from scratch.

### 3.3 API Versioning
Add `/v1/` prefix to all endpoints. Backward compatibility guarantees. Deprecation policy.
- **Effort:** Small
- **Impact:** Production API discipline

### 3.4 Real Password Hashing
The demo uses hardcoded 'admin' password. Production requires PBKDF2 hashing (already built in `src/lib/password.ts`). Wire it into the user registration flow.
- **Effort:** Small
- **Impact:** Security credibility

---

## PHASE 4: YC DEMO READINESS (immediate)

### 4.1 Flawless Demo Every Time
- Deterministic seed data that produces the exact same demo scenario
- Automatic cleanup/reset between demos
- Scripted timing that accounts for variable hardware
- **Effort:** Medium
- **Impact:** No demo failures. Confidence to demo live.

### 4.2 Demo Recording Script
Produce a terminal recording (asciinema or similar) that shows the full demo without needing a live server.
- **Effort:** Small
- **Impact:** Can share demo without scheduling. Embed in README.

### 4.3 One-Page Architecture Diagram
Visual diagram (ASCII or SVG) showing the full execution pipeline — from agent SDK → enforce → gateway → audit → replay.
- **Effort:** Small
- **Impact:** YC partners understand the system in 30 seconds

### 4.4 Competitor Comparison
Detailed comparison against: raw LLM function calling, LangChain tool calling, Guardrails AI, AWS IAM, Auth0. Feature matrix.
- **Effort:** Small
- **Impact:** Clear positioning for YC interview

---

## PHASE 5: DEVELOPER ECOSYSTEM (post-YC)

### 5.1 Published SDK
Publish `@passport-agent/sdk` to npm. Include TypeScript types, examples, and integration guides.
- **Effort:** Medium
- **Impact:** Developers can integrate in 3 lines of code

### 5.2 SDK Integration Tests
Real OpenAI API calls going through the SDK → enforce → gateway pipeline. Verify the entire flow works.
- **Effort:** Large
- **Impact:** SDK is production-grade, not demo-only

### 5.3 Developer Quickstart Guide
5-minute guide for a new developer to: register agent, create policy, wrap tools with SDK, deploy.
- **Effort:** Small
- **Impact:** Developer onboarding

---

## PHASE 6: INFRASTRUCTURE (post-funding)

### 6.1 Distributed Workers
Multiple worker processes with coordination (Redis or Firestore lock). Scale task throughput beyond 8/min.
- **Effort:** Large
- **Impact:** Production scale

### 6.2 Real Database
Migrate from Firestore to PostgreSQL (or similar) for stronger consistency guarantees and SQL query support.
- **Effort:** Large
- **Impact:** Enterprise requirements

### 6.3 SOC 2 Compliance Package
Pre-built evidence collection, audit reports, access logs for SOC 2 Type II certification.
- **Effort:** Large
- **Impact:** Enterprise sales

---

## PRIORITY ORDER (what to build next)

```
NOW (this session):    1.1, 1.2, 2.2, 3.1, 3.2
THIS WEEK:             1.3, 4.1, 4.2, 4.3, 4.4
NEXT WEEK:             2.1, 2.3, 3.3, 3.4
POST-YC:               5.x, 6.x
```
