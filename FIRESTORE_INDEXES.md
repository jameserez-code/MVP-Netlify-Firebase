# Firestore Index Documentation

## Automatic single-field indexes (Firestore default)
All single-field equality queries work without manual indexes.

## Composite indexes needed for production

### `agents` — orgId + createdAt
```yaml
collection: agents
fields:
  - orgId ASC
  - createdAt DESC
```
**Used by:** GET /agents list queries

### `agents` — orgId + status + createdAt
```yaml
collection: agents
fields:
  - orgId ASC
  - status ASC
  - createdAt DESC
```
**Used by:** GET /agents with status filter

### `policies` — orgId + createdAt
```yaml
collection: policies
fields:
  - orgId ASC
  - createdAt DESC
```
**Used by:** GET /policies list queries

### `policies` — orgId + status + createdAt
```yaml
collection: policies
fields:
  - orgId ASC
  - status ASC
  - createdAt DESC
```
**Used by:** GET /policies with status filter

### `actionIntents` — orgId + createdAt
```yaml
collection: actionIntents
fields:
  - orgId ASC
  - createdAt DESC
```
**Used by:** GET /audit queries filtered by org

### `actionIntents` — orgId + decision + createdAt
```yaml
collection: actionIntents
fields:
  - orgId ASC
  - decision ASC
  - createdAt DESC
```
**Used by:** GET /audit with decision filter

### `tasks` — orgId + status + createdAt
```yaml
collection: tasks
fields:
  - orgId ASC
  - status ASC
  - createdAt DESC
```
**Used by:** GET /tasks with status filter

### `runs` — orgId + status + createdAt
```yaml
collection: runs
fields:
  - orgId ASC
  - status ASC
  - createdAt DESC
```
**Used by:** GET /runs with status filter

## Creating indexes
1. Go to Firebase Console → Firestore → Indexes
2. Click "Add Index"
3. Set collection and fields as listed above
4. Or: click the URL in any query error message to auto-create

## Deploy via CLI
```bash
firebase deploy --only firestore:indexes
```

## Query Patterns (current, no-index required)
| Endpoint | Query | Index needed? |
|----------|-------|--------------|
| GET /agents | orgId == X | No (single field) |
| GET /tasks | status == X | No (single field) |
| GET /audit | decision == X | No (single field) |
| GET /policies | orgId == X | No (single field) |

## Query Patterns (optimized with composite indexes)
| Endpoint | Query | Suggestion |
|----------|-------|-----------|
| GET /agents | orgId == X ORDER BY createdAt DESC | Composite |
| GET /agents | orgId == X AND status == Y ORDER BY createdAt DESC | Composite |
| GET /policies | orgId == X ORDER BY createdAt DESC | Composite |
| GET /audit | orgId == X AND decision == Y ORDER BY createdAt DESC | Composite |
| GET /tasks | orgId == X AND status == Y ORDER BY createdAt DESC | Composite |
| GET /runs | orgId == X AND status == Y ORDER BY createdAt DESC | Composite |
