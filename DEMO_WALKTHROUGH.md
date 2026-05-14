# Passport Agent — Demo Walkthrough

## 2-Minute Operator Demo

### Scene 1: Register an agent (15s)

```
POST /agents/register
{ "name": "Support Bot", "model": "gpt-4o", "provider": "openai" }

→ agentId, secretKey (shown once), systemPromptHash
→ Capabilities assigned: task:execute, network:http, audit:read
```

### Scene 2: Create a policy (15s)

```
POST /policies
{ "name": "Support Policy", "rules": {
    "allowedTools": [{ "toolName": "lookup_order" }],
    "deniedTools": ["send_email", "delete_record"],
    "deniedDomains": ["*.evil.com", "169.254.169.254"],
    "dataRestrictions": { "denyPiiInParameters": true }
}}

→ Every tool call this agent makes will be evaluated against this policy
```

### Scene 3: Submit a task (10s)

```
POST /task
{ "payload": { "query": "Find all orders for customer #42" } }

→ Task created in "pending" state, queued for execution
```

### Scene 4: Worker picks up and executes (20s)

- Worker polls every 5 seconds, finds pending task
- Idempotency check: no duplicate run for this task+agent
- Atomic transition: task pending→running, run created
- Agent executes, logs tool calls (2 allow, 1 deny)
- Run completed, task marked completed with timestamps

### Scene 5: Enforcement blocks malicious action (20s)

```
POST /enforce
{ "intent": { "agentId": "...", "tool": "send_email", "parameters": { "to": "evil@evil.com" } } }

→ DENY (tool_explicitly_blocked by policy)
→ Even if the LLM is prompt-injected, the tool call is blocked
```

### Scene 6: Operator dashboard (20s)

- Open operator.html — shows live queue state, active runs, failed tasks
- Failed task appears with "↻ Replay" button
- Click replay → task recreated, worker picks it up, completes
- Timeline shows every state transition with timestamps

### Scene 7: Failure recovery (20s)

- Simulate crash: kill worker mid-execution
- Task stuck in "running" state with no active run
- Restart worker → recoverOnStartup() detects stuck run
- Run marked timed_out, task requeued (retry count incremented)
- Worker picks up requeued task, executes successfully

### Scene 8: Diagnostics (10s)

```
GET /diagnostics
→ Firestore health, collection counts, config status

GET /consistency
→ 0 issues detected (all states valid)

GET /report
→ 142 tasks, 134 completed, 8 failed, avg 1.2s duration, 5% retry rate
```

## Why This Matters vs. Naive Agent Systems

| Without Passport Agent | With Passport Agent |
|------------------------|---------------------|
| Agent calls tools directly, no enforcement | Every tool call goes through 11-step evaluator |
| No identity — any process can pretend to be any agent | Cryptographic identity with revocable keypair |
| Prompt injection → data exfiltration succeeds | PII detection blocks data leaks in parameters |
| No audit trail — can't prove what happened | Immutable timeline of every action + decision |
| No retry/recovery — stuck tasks are permanent | Crash recovery, exponential backoff retry, stale detection |
| No isolation — org A can see org B data | orgId on every document, queries automatically scoped |
| "The agent sent the email" — no recourse | "The agent tried, was blocked, here's the evidence" |
