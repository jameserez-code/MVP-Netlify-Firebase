# Product Positioning — Why This Platform Exists

## What It Is

Passport Agent is an **execution infrastructure platform for AI agents.** It provides cryptographic agent identity, policy-based action enforcement, deterministic execution orchestration, and immutable audit trails — in a single, compact codebase.

It answers one question: **"What happens when an AI agent does something it shouldn't?"**

The answer: the agent tries, the enforcement layer blocks it, and the audit trail proves exactly what happened.

## The Problem

Every company deploying AI agents is running the same experiment: give an LLM access to tools (APIs, databases, emails, file systems) and hope it doesn't do anything catastrophic.

The failure modes are:
- **Prompt injection** → agent sends customer data to attacker
- **No visibility** → team can't prove what the agent did or didn't do
- **No recourse** → if something breaks, there's no undo, no replay, no trace
- **No isolation** → agent A can access agent B's resources
- **No enforcement** → even if you define rules, nothing actually blocks execution

These aren't theoretical. They're happening now. The tools exist (LLMs, function calling, APIs) but the **orchestration layer doesn't.**

## Why Naive Agent Execution Fails

### Cron Workers
```
0 */4 * * * python run_agent.py --task=report
```
- No identity — any process can impersonate any agent
- No enforcement — if the LLM calls `rm -rf`, cron happily runs it
- No audit — if the output is wrong, you can't prove what happened
- No replay — if the job fails, you can't reproduce the execution path
- No retry — if the job times out, it's gone until the next cron tick

### Stateless Function Wrappers
```python
result = agent.run(prompt)  # What does this actually do?
```
- Tool calls execute without any intermediary check
- No policy engine evaluating "should this agent call this tool with these parameters?"
- No signed action intents proving the agent's identity
- No gateway enforcing single-use execution tickets
- Output returned to caller with no audit trail of intermediate steps

### Unmanaged Autonomous Agents
```
while True: agent.act()  # Hope it behaves
```
- No execution lifecycle (pending → queued → running → completed/failed)
- No timeout protection (stuck agents run forever)
- No crash recovery (worker dies → state is lost)
- No retry policy (if it fails, it's over)
- No consistency checking (orphaned runs, invalid states accumulate silently)

## What Passport Agent Adds

| Layer | What it does | Why naive systems miss this |
|-------|-------------|---------------------------|
| Identity | Cryptographic agent keypair + passport | Any process can call itself "agent-1" without this |
| Policy engine | 11-step deterministic evaluation | Tool calls go straight from LLM → execution without this |
| Gateway | Single-use execution ticket with replay protection | Same action executes twice if called twice |
| Worker | Deterministic lifecycle with crash recovery | Stuck tasks are permanent without this |
| Audit | Every tool call, state transition, capability check logged | "What happened?" is unanswerable without this |
| Capabilities | Agent-scoped operation classes (filesystem, network, etc.) | Any agent can do anything without this |
| Replay | Same task → same agent → same output, verifiable | "Why did it do that?" is unanswerable without this |

## Failure Costs (What You Avoid)

### Duplicate Execution
Without idempotency: Agent processes the same invoice twice → customer charged twice.
With Passport Agent: `ensureSingleActiveRun()` prevents the second execution. The second attempt is logged as blocked.

### Missing Audit Trails
Without audit: SOC 2 auditor asks "Show me every action the billing agent took in Q1." You can't.
With Passport Agent: `GET /audit/timeline?from=2026-01-01&to=2026-03-31` → complete list.

### Unrecoverable State
Without recovery: Worker crashes mid-execution. Task stuck in `running` forever. No one notices for weeks.
With Passport Agent: `recoverOnStartup()` reconciles on boot. Stale check catches it within 60s. Operator dashboard shows it in red.

### Replay Attack Exposure
Without protection: Intercepted API key reused to execute the same action again. Funds transferred twice.
With Passport Agent: Gateway tickets are single-use, atomically marked. Second attempt returns `ticket_replayed`.

## Who This Is For

**Engineering teams deploying AI agents in production** — they have agents calling APIs, accessing databases, sending communications, and they need to prove they operate within defined boundaries.

**Compliance teams requiring SOC 2 / ISO 27001 evidence for AI systems** — they need immutable audit trails showing every agent action, every policy decision, and every blocked attempt.

**Platform teams building internal agent infrastructure** — they need a centralized execution layer with deterministic behavior, crash recovery, and org-level isolation.

## Architecture At a Glance

```
User/API → POST /task (pending)
            ↓
Worker polls → creates Run → Agent executes → logs tool calls
            ↓                              ↓
     Policy Engine (enforce)        Gateway (execute)
            ↓                              ↓
     ALLOW/DENY/MODIFY             Immutable audit log
            ↓
     Task completed/failed with timestamps
```

Everything is deterministic, idempotent, and replayable. Every state transition is atomic. Every action is logged.
