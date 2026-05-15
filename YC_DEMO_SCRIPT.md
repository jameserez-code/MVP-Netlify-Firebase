# Passport Agent — Golden Demo Flow

**Duration:** 2 minutes 45 seconds  
**Mode:** Terminal-based (TUI)  
**Setup:** `curl ... | bash` then `npm run tui`  
**Guarantee:** Deterministic, reproducible, works every time

---

## Scene 0 — Launch (10s)

Operator runs the one-liner. TUI auto-launches within seconds.

```
PASSPORT AGENT  Operational Console       ● HEALTHY

Queue                    Agents
Pending: 0               1 registered
```

Narrator: "This is Passport Agent — a deterministic execution runtime for autonomous systems. Every action is governed, explained, and recoverable."

---

## Scene 1 — Register + Execute (30s)

**Action:** `:seed` — 3 demo tasks populate the queue.  
**Action:** `j j Enter` — select a task, inspect. Press `r` to run it.

```
▸ task_abc123  PEND  Demo task 1

Detail: task
status          running
payload         {"description":"Demo 1"}
```

Narrator: "The worker picks up the task. The agent executes. Every tool call passes through an 11-step enforcement engine before execution."

---

## Scene 2 — Enforcement Blocks Malicious Action (40s)

**Action:** In the agents panel (`Tab`), register a new agent. Create a policy that denies `send_email`.  
**Action:** Create a task that causes the agent to attempt `send_email`.

```
Live Events
14:23:01  lookup_order       allow
14:23:02  send_email         deny  tool_explicitly_blocked
```

Narrator: "The agent's LLM is tricked into calling send_email. But the enforcement layer blocks it. Before execution. Look at the event — 'tool_explicitly_blocked'. This is recorded immutably."

---

## Scene 3 — Explainability (30s)

**Action:** `k k Enter` — select the denied event to inspect. Press `Tab Tab` to switch to events, then `Enter`.

```
Detail: event
tool            send_email
decision        deny
reason          tool_explicitly_blocked
decisionPath    → policy violated → rule triggered → block
```

Narrator: "Every decision is explainable. Not just 'blocked' — exactly which rule, which step, which policy. This is what governance looks like for autonomous systems."

---

## Scene 4 — Worker Crash + Recovery (30s)

**Action:** Operator kills the worker process. The TUI health indicator changes.

```
PASSPORT AGENT                        ● STALLED
```

Narrator: "We simulate a worker crash. The system detects stalled tasks immediately. The health model shows STALLED with specific indicators."

**Action:** Restart worker. TUI shows recovery.

```
PASSPORT AGENT                        ● RECOVERING

Live Events
14:24:01  system.transition  recover  recovery started
14:24:02  task requeued       allow   recovered from stuck state
14:24:03  run started          allow   retry 1/3
```

Narrator: "The worker restarts. Crash recovery detects the stuck run, marks it timed_out, requeues the task. The agent retries with exponential backoff. Within seconds: HEALTHY again."

---

## Scene 5 — Replay Verification (25s)

**Action:** Select the completed run, press `Enter` to inspect.

```
Detail: run
status          completed
deterministic   ✓ verified
outputHash      sha256:8f3c2b1a...
replayCount     1
```

Narrator: "Every run is replayable. Same task + same agent + same policy = same output. The replay hash proves it. This is how you verify autonomous systems behave consistently."

---

## Scene 6 — Diagnostics (10s)

**Action:** Press `:` then type `diag` then `Enter`.

```
HEALTHY | All queues clear
stuckTasks: 0 | failedTasks: 0 | pendingTasks: 0
```

Narrator: "The system is healthy. Every task executed. Every decision explained. Every failure recovered. Every output verified. This is what trustworthy autonomous execution looks like."

---

## Key Lines (for the narrator)

- "Before execution" — repeats through the demo, emphasizes enforcement timing
- "Immutably recorded" — audit trail messaging
- "Explainable, not just blocked" — governance differentiation
- "Same input, same output, same hash" — determinism pitch
- "HEALTHY again" — recovery story arc
- "Not just what happened — why" — explainability hook

## Props

- Terminal window (TUI open)
- No slides, no browser, no prepared environment
- Live input, real feedback
- Everything happens in the terminal

## Fallback Plan

If the demo fails mid-flow:  
"Passport Agent is deterministic. Let me replay the exact sequence that failed. Watch the replay hash match — even failures are reproducible and diagnosable."
