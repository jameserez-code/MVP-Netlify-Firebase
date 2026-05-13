# Firestore Index Documentation

## Automatic single-field indexes (Firestore default)
All single-field equality queries work without manual indexes.

## Composite indexes needed for production

### `tasks` — status + startedAt
```yaml
collection: tasks
fields:
  - status ASC
  - startedAt ASC
```
**Used by:** `findStuckTasks()` — finds tasks in 'running' state beyond time threshold

### `policies` — orgId + status + priority
```yaml
collection: policies
fields:
  - orgId ASC
  - status ASC
  - priority ASC
```
**Used by:** Policy resolution in enforce endpoint (currently done in-memory, recommend index for scale)

### `actionIntents` — orgId + createdAt
```yaml
collection: actionIntents
fields:
  - orgId ASC
  - createdAt DESC
```
**Used by:** GET /audit queries filtered by org

### `runs` — taskId + agentId + status
```yaml
collection: runs
fields:
  - taskId ASC
  - agentId ASC
  - status ASC
```
**Used by:** `ensureSingleActiveRun()` idempotency guard

## Creating indexes
1. Go to Firebase Console → Firestore → Indexes
2. Click "Add Index"
3. Set collection and fields as listed above
4. Or: click the URL in any query error message to auto-create

## Query Patterns (current, no-index required)
| Endpoint | Query | Index needed? |
|----------|-------|--------------|
| GET /agents | orgId == X | No (single field) |
| GET /tasks | status == X | No (single field) |
| GET /audit | decision == X | No (single field) |
| GET /policies | orgId == X | No (single field) |

## Query Patterns (may benefit from composite index)
| Endpoint | Query | Suggestion |
|----------|-------|-----------|
| findStuckTasks | status == 'running' AND startedAt <= cutoff | Composite |
| enforce policies | orgId == X (filter status in memory) | Composite recommended |
