# Why Every AI Agent Needs a Passport

**Launching AI Agent Passport — the identity and permissions layer we wish existed when we started building autonomous agents.**

---

## The Problem: Agents With No Guardrails

Last month, a developer told us their internal AI agent accidentally sent a customer database dump to an LLM API for "analysis." The agent had a valid API key. Nothing stopped it.

This isn't an edge case. It's the default state of AI agent deployments today:

- **Unrestricted API keys** — Agents get the same credentials as humans, with no granular permissions
- **No pre-execution checks** — You only find out something went wrong when you review logs (if you review logs)
- **No audit trail** — When an agent makes a bad decision, you can't reconstruct why
- **Policy changes require code deploys** — Want to block a new tool? Ship a new release

Real examples we've heard:
- A support agent emailed a user's SSN to the wrong recipient
- A data analysis agent dropped a production table instead of a temp cache
- A social media agent spent $4,000 on API credits in 20 minutes

The common thread: **the agent had permission to do these things because nobody built a gate.**

---

## The Solution: Pre-Execution Enforcement

AI Agent Passport sits between your agent and its tools. Every single tool call is intercepted, verified, and evaluated before execution.

Here's what happens in under 50 milliseconds:

1. **Identity Verification** — Is this agent who it claims to be? Cryptographic signatures, not just API keys.
2. **Policy Evaluation** — Does this action violate any active policies? Tool allowlists, PII patterns, cost limits, domain restrictions.
3. **Decision** — Allow, deny, or modify (e.g., force a read-only operation).
4. **Execution** — Only allowed actions proceed, via signed gateway tickets.
5. **Audit** — Every decision is logged immutably with a cryptographic signature.

The result: **agents can only do what you explicitly permit.**

---

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  OpenAI     │     │  Anthropic  │     │  Custom     │
│  Agent      │     │  Agent      │     │  Agent      │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
              ┌────────────▼────────────┐
              │   Passport Agent SDK    │
              │   (one-line wrapper)    │
              └────────────┬────────────┘
                           │
              ┌────────────▼────────────┐
              │   Enforcement API       │
              │   • Identity check      │
              │   • Policy evaluation   │
              │   • Decision + ticket   │
              └────────────┬────────────┘
                           │
              ┌────────────▼────────────┐
              │   Gateway (signed)      │
              └────────────┬────────────┘
                           │
                    ┌──────▼──────┐
                    │   Tools     │
                    └─────────────┘
```

The enforcement layer is **completely stateless**. JWT auth, horizontal scaling, sub-50ms latency. Your agents don't slow down.

---

## Get Started in 5 Minutes

### 1. Install the SDK

```bash
npm install @passport-agent/sdk
```

### 2. Wrap Your Agent

```typescript
import { AgentControlPlane } from '@passport-agent/sdk'

const agent = new AgentControlPlane({
  apiKey: process.env.PASSPORT_API_KEY,
  policies: ['safe-web-search', 'no-pii', 'read-only-db']
})

const result = await agent.enforce({
  tool: 'query_database',
  parameters: { table: 'users', limit: 10 }
})

// result.decision is 'allowed', 'denied', or 'modified'
// result.ticket is a signed gateway ticket for execution
```

### 3. Define Policies in the Dashboard

```json
{
  "name": "No Destructive Actions",
  "rules": {
    "blockedTools": ["delete_database", "drop_table"]
  }
}
```

Or use the visual policy builder — no JSON required.

### 4. Register Your Agent

One API call. The agent gets a scoped credential with automatic secret rotation.

```bash
curl -X POST https://api.passport.agent/agents/register \
  -H "Authorization: Bearer $JWT" \
  -d '{"name":"support-agent","policies":["safe-web-search"]}'
```

### 5. Review the Audit Log

Every decision is logged with:
- Agent identity
- Tool and parameters
- Policy that triggered (if any)
- Decision and reason
- Cryptographic signature
- Timestamp

---

## Security Considerations

### Credentials
Agent secrets are hashed with PBKDF2-SHA256 (50k+ iterations, 32-byte salt) before storage. We never store raw secrets.

### Policy Enforcement
All policies are evaluated server-side. A compromised agent cannot bypass enforcement by modifying local code.

### Audit Integrity
Every log entry is signed with HMAC-SHA256 using a per-organization key. Tampering is detectable.

### Data Sovereignty
Audit logs live in your Firebase project. We never see your data. Enterprise plans support full on-premise deployment.

### Compliance
Built-in support for GDPR/CCPA data handling, audit exports, and policy versioning. SOC 2 Type II in progress.

---

## What's Next

We're looking for 10 teams building AI agents in production to try Passport Agent and give us unfiltered feedback.

**Specifically, we want to know:**
- What policy rules are missing from your use case?
- What integrations would make this a no-brainer?
- What's the biggest blocker to adopting this today?

**Try it:**
- [Interactive Demo](https://your-url.com/demo) — no signup, runs in your browser
- [Live Dashboard](https://your-url.com)
- [GitHub](https://github.com/jameserez-code/MVP-Netlify-Firebase)

**Pricing:**
- Free: 3 agents, 100 enforcements/day
- Pro: $29/mo, unlimited agents, 10K enforcements/day
- Enterprise: Custom, SSO/SAML, on-premise

---

Built by J. Rabinowitz and team. Questions? [Email us](mailto:hello@your-url.com) or open a GitHub issue.
