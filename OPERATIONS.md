# Operational Procedures

## Starting the platform

```bash
# Local development
npm run dev     # API server on :3000
npm run worker  # Background task worker

# Docker
docker compose up
```

## Health monitoring

```bash
# Check API health
curl http://localhost:3000/metrics   # Task/run/agent counts
curl http://localhost:3000/audit/timeline?limit=10  # Recent events

# Developer dashboard
open dev-dashboard.html   # Live metrics, active runs, timeline
```

## Recovery procedures

### Stuck tasks — automated
The worker runs startup recovery on boot. It detects:
- Runs stuck in `starting`/`running` for > 2 minutes → marks `timed_out`, requeues task if retries remain
- Tasks stuck in `running` for > 5 minutes → fails or requeues based on retry count

### Stuck tasks — manual

```bash
# Find stuck tasks
curl http://localhost:3000/audit?decision=deny | python3 -c "
import sys, json
data = json.load(sys.stdin)['data']
for d in data:
    print(d.get('taskId','?'), d.get('status','?'))
"

# Manually fail a task
curl -X PATCH http://localhost:3000/run/{RUN_ID}/fail \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {TOKEN}" \
  -d '{"error":"Manual intervention"}'
```

### Worker crash recovery
1. Restart worker: `npm run worker`
2. On boot, worker runs `recoverOnStartup()` which reconciles all stuck runs/tasks
3. Check dev-dashboard.html to verify stuck items were resolved
4. If tasks remain stuck after retries: manually fail them

## Credential rotation

### JWT secret
1. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. Update `JWT_SECRET` env var
3. Restart API server — existing tokens invalidated

### Firestore service account
1. Firebase Console → Service accounts → Generate new key
2. Replace `service-account.json`
3. Old key: revoke in Firebase Console → Service accounts → Manage keys

### Agent signing keys
POST /agents/{id}/rotate-key → returns new secret. Old key immediately invalid.

## Firestore backup

```bash
# Export to GCS (requires gcloud)
gcloud firestore export gs://{BUCKET}/backups/$(date +%Y%m%d)

# Import
gcloud firestore import gs://{BUCKET}/backups/{DATE}
```

For small datasets, use Firestore managed export in the console.

## Monitoring checks

| Check | Frequency | Tool |
|-------|-----------|------|
| API health | Every 30s | GET /metrics |
| Stuck tasks | Every 60s | Worker stale check |
| Firestore connectivity | On worker boot | src/healthcheck.ts |
| Rate limiting | Per-request | server onRequest hook |
| Crash recovery | On worker boot | recoverOnStartup() |
