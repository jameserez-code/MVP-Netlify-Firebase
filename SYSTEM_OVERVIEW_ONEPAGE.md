# Passport Agent — System Overview (One Page)

## What It Is

**A deterministic execution runtime for autonomous systems.**

AI agents generate tool calls (API requests, database writes, file operations). Passport Agent intercepts every call, cryptographically verifies the agent's identity, evaluates the action against defined policies, and either allows, denies, or modifies the action — all before execution. Every decision is immutably logged. Every run is deterministically replayable. Every failure is recoverable.

## The Problem

Naive agent execution runs LLM output directly. No enforcement. No audit. No recovery. A prompt-injected agent sends customer data to an attacker — no system blocks it, no system records it, no system recovers from it.

## How It Works

```
Agent → POST /enforce → Policy Engine (11-step) → Gateway Ticket
  ↓ deny                                    ↓ allow
  Blocked + logged                   POST /gateway/execute → tool runs → audit log
```

1. **Identity:** Every agent has a cryptographic keypair. Actions are HMAC-signed.
2. **Enforcement:** 11-step evaluator checks tools, domains, parameters, PII patterns
3. **Execution:** Gateway tickets are single-use, replay-protected
4. **Audit:** Every decision logged with timestamps, parameters, and rationale
5. **Recovery:** Crash recovery, retry with backoff, stale task detection
6. **Replay:** Any run can be re-executed and verified deterministically

## Core Differentiators

| | Passport Agent | Raw LLM | LangChain | Auth0 |
|---|---|---|---|---|
| Pre-execution enforcement | ✓ | ✗ | ✗ | ✗ |
| Deterministic replay | ✓ | ✗ | ✗ | ✗ |
| Explainable decisions | ✓ | ✗ | ✗ | ✗ |
| Crash recovery | ✓ | ✗ | ✗ | ✗ |
| Capability scoping | ✓ | ✗ | ✗ | ✗ |
| Immutable audit | ✓ | ✗ | Partial | ✓ |
| Zero-config demo | ✓ | ✗ | ✗ | ✗ |

## Run It

```bash
curl -fsSL https://raw.githubusercontent.com/jameserez-code/MVP-Netlify-Firebase/main/install.sh | bash
```

That's it. No Firebase. No API keys. No configuration. The TUI auto-launches.
