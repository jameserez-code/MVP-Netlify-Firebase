# Reliability Guarantees + Demonstrations

## What This System Guarantees

| Guarantee | Mechanism | Verified by |
|-----------|-----------|-------------|
| No duplicate execution | Idempotency guard (`ensureSingleActiveRun`) | resilience.test.ts |
| Atomic state transitions | Firestore transactions on every state change | transitions.ts |
| Replayable execution | Same task payload → same result, stored as artifact | agent-contract.ts: `getExecutionArtifact()` |
| Crash recovery | `recoverOnStartup()` reconciles stuck runs/tasks | worker.ts boot sequence |
| Timed-out runs fail cleanly | 30s execution timeout + stale check every 60s | worker.ts timeout handler |
| Ticket replay prevention | Single-use gateway tickets, atomically marked | Firestore `gatewayTickets` collection |
| No partial state | Transactions span task + run updates | All write paths use `runTransaction()` |
| Audit completeness | Every tool call, state transition, and capability check logged | `logs` collection |

## What This System Does NOT Guarantee

| Non-guarantee | Why | Mitigation |
|---------------|-----|------------|
| Exactly-once delivery | Network partitions can cause task creation to retry without idempotency keys | Use`idempotentTaskCreate()` with a client-generated key |
| Real-time execution | Worker polls every 5 seconds — tasks queue for up to 5s | Adjust `POLL_INTERVAL_MS` in `src/config.ts` |
| Cross-region consistency | Firestore is strongly consistent within a region, eventually across regions | Single-region deployment for MVP |
| Byzantine fault tolerance | Single Firestore instance — if Firestore is compromised, all bets are off | Standard Google Cloud security model |
| LLM output quality | The platform enforces what tools can be called, not what the LLM says | Content filtering is a separate layer |

## Recovery Semantics

### Worker crash mid-execution
1. Run is in `running` state with no active process
2. Worker restart → `recoverOnStartup()` detects run stuck > 2 minutes
3. Run marked `timed_out`, task reset to `pending` (if retries < 3)
4. Worker polls, picks up requeued task, executes fresh

### Firestore temporarily unavailable
1. Worker logs error, retries next poll cycle (5s later)
2. Tasks remain in `pending` state — no data loss
3. API returns `503` with `error.code: "firestore"` — clients should retry

### Double worker start
1. Two worker processes poll simultaneously
2. `ensureSingleActiveRun()` prevents duplicate run creation
3. Second worker sees existing active run, skips

### API rate limit exceeded
1. `429 Too Many Requests` returned
2. Client backs off (exponential, 1s base). Server clears the rate limit window after 60s.
3. No server state is corrupted — rate limiting is stateless

## Deterministic Assumptions

- Same task payload + same agent + same policy → same enforcement decision (evaluator is a pure function)
- Same execution with same inputs → same output (agent contract requires deterministic behavior)
- Replay of a prior run uses the stored execution artifact for comparison
- Gateway tickets are non-deterministic (unique per issuance) but verified deterministically
- Worker scheduling is non-deterministic (first active agent, first pending task) but idempotent

## Benchmark Scenarios

Run with: `npm run bench`

### Task throughput (single worker)
```
Worker polls 5s → picks 1 task → executes 1s → 6s per task
Theoretical max: 10 tasks/minute (single worker)
Practical: 8 tasks/minute (overhead)
```

### Transition latency
```
task pending → running: ~50ms (Firestore transaction)
logging a tool call: ~40ms (Firestore write)
run → completed: ~60ms (transaction: run + task)
```

### Crash recovery speed
```
Worker restart → recoverOnStartup(): ~500ms per 100 stuck runs
Stale check cycle: 60s (configurable)
```

### Consistency repair speed
```
POST /repair (orphaned): ~200ms per 50 runs
POST /repair (stuck): ~150ms per 50 tasks
```
