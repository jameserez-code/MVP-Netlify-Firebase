# Operational Trust Statement

## What Operators Can Trust

### 1. Deterministic execution
Same task payload + same agent + same policy → same enforcement decision. The evaluator is a pure function with zero side effects. The worker follows a documented, single-process polling loop. No hidden state. No random scheduling. No race conditions in the execution path (idempotency guard prevents them).

### 2. Atomic state transitions  
Every state change is a Firestore transaction. A task cannot be `running` with no corresponding run. A run cannot complete without the task being updated. If any part of a transaction fails, the entire change is rolled back. There are no partial states.

### 3. Immutable audit trails  
Every tool call, state transition, and capability check writes to the `logs` collection. These are append-only from the server's perspective. `GET /audit/timeline` retrieves them chronologically. `GET /run/:id/trace` replays an entire execution with timestamps.

### 4. Crash recovery  
On worker boot, `recoverOnStartup()` finds stuck runs and tasks, marks them appropriately, and requeues if retries remain. No manual intervention needed for normal crash scenarios.

### 5. Idempotent execution  
`ensureSingleActiveRun()` prevents a task from being picked up by two workers simultaneously. `idempotentTaskCreate()` prevents duplicate tasks with the same key. Repeated API calls with the same intent produce the same result.

### 6. Replayability  
Any completed or failed task can be replayed: clone the payload, create a new task, execute with the same agent. The output can be compared to the original via the stored execution artifact.

---

## What Operators Should Verify

- **Rate limits are configured** — default 200 req/min per IP. Adjust in `src/config.ts`.
- **JWT secrets are unique** — `JWT_SECRET` and `ENGINE_SECRET` must differ.
- **Service account is not committed** — verified by `.gitignore`.
- **Firestore backups exist** — `OPERATIONS.md` has export commands.
- **Consistency checks run periodically** — `GET /consistency` should return zero issues.
- **Diagnostics return healthy** — `GET /diagnostics` → `"healthy"`.

---

## Failure Transparency

**When things go wrong, the system tells you exactly what happened:**

- Invalid state transition → `409` with `"task X cannot go from completed → running"`
- Rate limit exceeded → `429` with `"Too many requests. Slow down."`
- Firestore unavailable → `503` with `"write failed, try again"`
- Agent revoked → `403` with `"agent_revoked"`
- Missing capability → capability denial logged with `"missing_capability: filesystem:write"`
- Duplicate execution prevented → `"duplicate run prevented by idempotency guard"`

**Nothing is swallowed silently.** Every error propagates to either the API response or the log.

---

## What This System Deliberately Does NOT Do

- **Content filtering** — It blocks tool calls, not LLM text output. If the agent says something harmful in chat, that's output filtering (separate layer).
- **LLM prompt quality** — It enforces what tools can be called, not whether the agent's reasoning is correct.
- **Network security** — It doesn't provide firewall, DDoS protection, or TLS termination. Those are infrastructure concerns.
- **User authentication** — MVP uses hardcoded password. Production needs real auth.
- **Distributed coordination** — Single worker process. Multiple workers can coexist but don't coordinate (idempotency prevents conflicts).

Honest about what it does and doesn't do. No marketing spin.

---

## Deterministic Replay: Why It Matters

A naive agent system runs: LLM decides → tool executes → output returned. If the output is wrong, you can't reproduce the execution path. The LLM's state is gone. The tool's side effects are done. You have a result and a guess about what happened.

With deterministic replay:
1. The exact task payload is stored
2. The exact agent identity is known
3. The exact policy enforced is recorded
4. The audit trail shows every tool call, every decision, every timestamp

Replay the task → get the same enforcement decisions → compare outputs. If they differ, the agent is non-deterministic (which it shouldn't be). If they match, you've proven reproducibility.

This matters for:
- **Compliance:** Prove the agent followed the rules
- **Debugging:** Reproduce a failure exactly
- **Trust:** Verify the system behaves consistently
