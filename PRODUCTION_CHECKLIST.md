# Production Readiness Checklist

## Before Deploying

### Credentials
- [ ] `service-account.json` stored securely (not in git)
- [ ] `JWT_SECRET` generated via `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] `ENGINE_SECRET` generated (different from JWT_SECRET)
- [ ] Firebase project has billing enabled
- [ ] Firestore in Native mode (not Datastore)

### Backups
- [ ] Firestore export scheduled (daily recommended)
- [ ] Export bucket created in GCS
- [ ] Retention policy set (30 days minimum)
- [ ] Backup restore tested at least once

### Rate Limits
- [ ] Per-IP limit reviewed (200 req/min default — adjust in `src/config.ts`)
- [ ] Any endpoint-specific limits configured
- [ ] Org-level rate limits reviewed

### Monitoring
- [ ] Health checks configured (GET /metrics every 30s)
- [ ] Worker heartbeat monitored (log "worker started" on boot)
- [ ] Alert on > 10 stuck tasks
- [ ] Alert on > 5 failed tasks in 10 minutes
- [ ] Alert on Firestore 503 responses

### Recovery
- [ ] Crash recovery tested (kill worker, restart, verify reconcile)
- [ ] Stale task recovery tested (leave task running > 5 min, verify auto-recovery)
- [ ] Manual repair commands documented and accessible
- [ ] Rollback plan: restart with previous `service-account.json`

### Security
- [ ] JWT expiry set to 15 minutes (adjusted in `src/config.ts` or `src/lib/jwt.ts`)
- [ ] `ENGINE_SECRET` different from `JWT_SECRET`
- [ ] Service account has minimum required permissions (Firestore read/write only)
- [ ] Org isolation verified (create two orgs, confirm cross-org access denied)
- [ ] Audit logs confirmed immutable (attempt to modify a log entry → denied)

### Deployment Validation
```bash
bash scripts/deploy-check.sh    # Pre-flight
npm run test                    # Unit tests
npm run test:integration        # Integration tests (requires running server)
```

---

## Scaling Assumptions

| Metric | Current Limit | Scaling Path |
|--------|--------------|--------------|
| Tasks/minute | 8 (single worker) | Multiple worker processes |
| API requests/sec | ~50 (single Fastify) | Multiple server instances behind load balancer |
| Firestore writes | 10,000/day (free tier) | Upgrade Spark → Blaze plan |
| Firestore reads | 50,000/day (free tier) | Same as above |
| Log retention | Indefinite (cost) | TTL on logs collection after 90 days |

---

## Monitoring Checks

Run these periodically:

```bash
# System health
curl http://localhost:3000/diagnostics
# → "healthy", collection counts, config status

# Consistency
curl http://localhost:3000/consistency
# → issues array — should be empty or near-empty

# Operational report  
curl http://localhost:3000/report
# → task totals, failure rates, avg duration

# Metrics
curl http://localhost:3000/metrics
# → active tasks, runs, agents, avg duration
```

---

## Degraded Mode

If Firestore becomes unavailable:
- API returns `503` with `error.code: "firestore"`
- Worker logs errors, retries next poll cycle
- No data loss — tasks remain in current state
- Clients should retry with exponential backoff

If worker is down:
- Tasks accumulate in `pending` state
- No data loss — tasks are persisted
- On restart: `recoverOnStartup()` reconciles

---

## Rollback Procedure

1. Stop current deployment
2. Restore previous `service-account.json` if rotated
3. Restart with previous code version
4. Run `GET /diagnostics` to verify Firestore connectivity
5. Run `GET /consistency` to verify no state corruption
6. Start worker: `npm run worker`

---

## Disaster Recovery

**Firestore data loss:**
1. Restore from most recent daily export
2. Re-seed organizations + demo users: `POST /org/seed`
3. Verify: `GET /diagnostics`, `GET /report`

**Credential compromise:**
1. Rotate compromised key immediately
2. Revoke affected agent keys: `POST /agents/:id/revoke`
3. Update env vars, restart server
4. Audit log for affected time range: `GET /audit/timeline`

**Worker corruption:**
1. Stop worker
2. Run `POST /repair { "action": "stuck" }` to clean any stuck tasks
3. Restart worker
4. Monitor: `GET /metrics` — active runs should stabilize
