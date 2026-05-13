# Failure Modes + Diagnosis

## Task remains `pending` indefinitely

**Cause:** No active agents, or worker not running
**Check:** `curl localhost:3000/agents` — any with status `active`?
**Fix:** Start worker: `npm run worker`

## Run stuck in `running` for > 2 minutes

**Cause:** Worker crashed mid-execution, or execution exceeded timeout
**Auto-recovery:** Worker boot `recoverOnStartup()` marks as `timed_out`, requeues if retries < 3
**Manual check:** `curl localhost:3000/run/{id}/trace`
**Manual fix:** `curl -X PATCH localhost:3000/run/{id}/fail -d '{"error":"Manual recovery"}'`

## 503 / firestore unavailable

**Cause:** Firestore connection lost, quota exceeded, or credential expired
**Check:** Service account still valid? Quotas in Firebase Console?
**Fix:** Rotate service account key, check quota, restart

## 401 / unauthorized everywhere

**Cause:** JWT_SECRET changed or token expired
**Check:** `curl localhost:3000/security/ping -H "Authorization: Bearer {TOKEN}"`
**Fix:** Re-login via POST /auth/login

## 429 / rate limited

**Cause:** Too many requests from single IP
**Check:** Wait 60 seconds, retry. Limit: 200 req/min per IP
**Fix:** Reduce polling frequency, or increase limit in `src/config.ts`

## Duplicate runs detected

**Cause:** Two workers processing same task (race condition)
**Prevention:** `ensureSingleActiveRun()` idempotency guard on every poll
**Check:** `curl localhost:3000/run/{id}/trace` — any duplicate run IDs for same task?
**Fix:** Stop one worker instance. The idempotency guard prevents duplicates at create time

## Invalid state transition error (409)

**Cause:** Client trying to change a task/run to an invalid state
**Example:** Completing an already-completed run, running an already-running task
**Check:** Current state via GET /task/:id or GET /run/:id/trace
**Fix:** Read current state, only request valid transitions (see state-machine.ts)

## Firestore index error (FAILED_PRECONDITION)

**Cause:** Composite query without required index
**Example:** `findStuckTasks` needs index on (status, startedAt)
**Fix:** Click the URL in the error message to create the index in Firebase Console

## Worker polls but never executes

**Cause:** No pending tasks or no active agents
**Check:** `curl localhost:3000/metrics` — tasks pending > 0? agents active > 0?
**Fix:** POST /task to create a task. Register an agent if none active

## Gateway replay attack detected (ticket_replayed)

**Cause:** Same gateway ticket used twice (malicious or SDK bug)
**Prevention:** Tickets are single-use, marked `used` atomically in Firestore
**Check:** Audit log for the intentId — confirmed duplicate?
**Response:** No data leak. The second execution was blocked. Rotate agent key if repeated
