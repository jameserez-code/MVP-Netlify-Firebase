# Agent Control Plane — Core Backend

Minimal Node.js + TypeScript backend proving Firestore read/write, task creation,
agent run lifecycle, and uniform error handling.

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Add service account key
#    Firebase Console → Project Settings → Service accounts → Generate new private key
#    Save as: service-account.json in project root

# 3. Verify Firestore connection
npm run healthcheck
#   write success
#   read success
#   document contents: { ... }

# 4. Seed collections with sample data
npm run schema:seed
#   ✓ seeded { collection: "users", id: "user_seed_001" }
#   ✓ seeded { collection: "agents", id: "agent_seed_001" }
#   ✓ seeded { collection: "tasks", id: "task_seed_001" }
#   ✓ seeded { collection: "runs", id: "run_seed_001" }
#   ✓ seeded { collection: "logs", id: "log_seed_001" }

# 5. Start the API
npm run dev
#   server  → http://localhost:3000
#   POST   /task        — create task
#   GET    /task/:id    — read task
#   POST   /agent/run   — start run
```

## Firestore Collections

| Collection | Purpose |
|-----------|---------|
| `users` | Org members and credential holders |
| `agents` | Registered AI agents (model, provider, passport) |
| `tasks` | Assignable work items with payload + status |
| `runs` | Execution records tying agents to tasks |
| `logs` | Individual tool call decisions during a run |

## API Endpoints

### POST /task
Create a task.

**Request:** `{ "payload": { ... any data ... } }`
**Response (201):** `{ "id": "...", "payload": {...}, "status": "created", "createdAt": "..." }`
**Error (400):** `{ "error": { "code": "validation", "message": "payload is required" } }`

### GET /task/:id
Read a task by ID.

**Response (200):** `{ "id": "...", "payload": {...}, "status": "...", "createdAt": "..." }`
**Error (404):** `{ "error": { "code": "not_found", "message": "task {id} not found" } }`

### POST /agent/run
Start an agent run on a task. This is **atomic**: it creates a run document and
sets the task status to `running` in a single transaction.

**Request:** `{ "agentId": "...", "taskId": "..." }`
**Response (201):** `{ "id": "...", "agentId": "...", "taskId": "...", "status": "running", "startedAt": "..." }`
**Error (400):** `{ "error": { "code": "agent_not_found", "message": "agent {id} not found" } }`
**Error (400):** `{ "error": { "code": "task_not_found", "message": "task {id} not found" } }`
**Error (409):** `{ "error": { "code": "conflict", "message": "task {id} is already {status}", "currentStatus": "running" } }`

## Data Flow

```
POST /task          → writes tasks/{auto-id}         (status: "created")
GET  /task/:id      → reads  tasks/{id}              (any status)
POST /agent/run     → verifies agents/{agentId}      (exists)
                    → verifies tasks/{taskId}         (status: "created")
                    → writes  runs/{auto-id}          (transaction: run + task→running)
```

## Error Shape

All errors use the same format:

```json
{
  "error": {
    "code": "not_found | validation | agent_not_found | task_not_found | conflict | firestore",
    "message": "Human-readable description"
  }
}
```

HTTP status codes: `200`, `201`, `400`, `404`, `409`, `503`.

## Log Format

Every log line includes a timestamp, level indicator, message, and optional context:

```
[2026-05-12 18:23:35] ✓ task created  {"taskId":"abc123..."}
[2026-05-12 18:23:35] • task read     {"taskId":"abc123...","status":"created"}
[2026-05-12 18:23:36] ✗ seed failed   {"error":"service-account.json not found"}
```

Level indicators: `•` (info), `⚠` (warn), `✗` (error), `✓` (success).

## Scripts

| Command | What it does |
|---------|-------------|
| `npm run healthcheck` | Write/read a single Firestore document |
| `npm run schema:seed` | Seed 5 collections with sample data |
| `npm run tasks:verify` | Create + read a task, verify payload matches |
| `npm run dev` | Start the Fastify server on port 3000 |
| `npm test` | Run crypto + evaluator unit tests |
