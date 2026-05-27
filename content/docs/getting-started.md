# Getting Started with AI Agent Passport

Get from zero to working policy enforcement in under 10 minutes.

---

## Prerequisites

- Node.js >= 20
- A Firebase project (or use demo mode for local testing)
- Git

---

## Step 1: Clone & Install

```bash
git clone https://github.com/jameserez-code/MVP-Netlify-Firebase.git
cd MVP-Netlify-Firebase
npm install
cd frontend && npm install && cd ..
```

**Expected output:**
```
added 284 packages in 12s

34 packages are looking for funding
  run `npm fund` for details
```

---

## Step 2: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your Firebase credentials:

| Variable | Where to Find |
|----------|--------------|
| `FIREBASE_PROJECT_ID` | Firebase Console → Project Settings |
| `FIREBASE_CLIENT_EMAIL` | Firebase Console → Service Accounts |
| `FIREBASE_PRIVATE_KEY` | Download JSON, extract `private_key` field |
| `JWT_SECRET` | Run: `openssl rand -hex 32` |
| `ENGINE_SECRET` | Run: `openssl rand -hex 32` |

**Important:** `private_key` must include actual newline characters, not `\n` literals.

**Screenshot:** [Firebase Service Account JSON with project_id, client_email, and private_key highlighted]

---

## Step 3: Run the Backend

```bash
# Development mode with hot reload
npm run dev
```

**Expected output:**
```
[ENV] All required environment variables present
[DB] Connected to Firestore: your-project-id
[API] Server listening on port 3000
[HEALTH] Healthcheck endpoint: http://localhost:3000/health
```

Test the health endpoint:
```bash
curl http://localhost:3000/health
# → {"status":"healthy","version":"2.1.0","uptime":12}
```

---

## Step 4: Run the Frontend

In a new terminal:

```bash
cd frontend
npm run dev
```

Visit http://localhost:3001

**Screenshot:** [Landing page with green "Start Building" button]

---

## Step 5: Create Your First Organization

1. Click **"Start Building"** on the landing page
2. Fill in organization name and admin password
3. You'll be redirected to the dashboard

**Screenshot:** [Registration form with organization name field]

---

## Step 6: Create Your First Policy

Navigate to **Dashboard → Policies**

Click **"New Policy"**

```json
{
  "name": "Safe Support Agent",
  "description": "Allow web search and DB reads. Block destructive actions.",
  "rules": {
    "allowedTools": ["web_search", "read_database", "query_database"],
    "blockedTools": ["delete_database", "drop_table", "send_email"]
  }
}
```

Click **Save**

**Screenshot:** [Policy builder with JSON editor and rule preview]

---

## Step 7: Register an Agent

Navigate to **Dashboard → Agents**

Click **"Register Agent"**

- Name: `support-agent-prod`
- Policies: Select `Safe Support Agent`

Copy the generated API key. **You won't see it again.**

**Screenshot:** [Agent registration form with API key reveal]

---

## Step 8: Enforce Your First Action

```bash
curl -X POST http://localhost:3000/enforce \
  -H "X-API-Key: pa_live_YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "web_search",
    "parameters": {"query": "customer support best practices"}
  }'
```

**Expected response:**
```json
{
  "decision": "allowed",
  "reason": "Tool permitted by policy Safe Support Agent",
  "ticket": "gt_abc123...",
  "policyName": "Safe Support Agent"
}
```

Now try a blocked action:

```bash
curl -X POST http://localhost:3000/enforce \
  -H "X-API-Key: pa_live_YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "delete_database",
    "parameters": {"name": "production"}
  }'
```

**Expected response:**
```json
{
  "decision": "denied",
  "reason": "Tool \"delete_database\" is explicitly blocked",
  "policyName": "Safe Support Agent"
}
```

---

## Step 9: View the Audit Log

Navigate to **Dashboard → Audit**

You'll see both decisions logged with:
- Agent identity
- Tool and parameters
- Decision and reason
- Timestamp
- Cryptographic signature

**Screenshot:** [Audit log table with allow/deny decisions]

---

## Step 10: Integrate Into Your Agent

```typescript
import { AgentControlPlane } from '@passport-agent/sdk'

const agent = new AgentControlPlane({
  apiKey: process.env.PASSPORT_API_KEY,
  baseUrl: 'http://localhost:3000'
})

// Wrap any tool call
async function safeToolCall(tool: string, params: any) {
  const result = await agent.enforce({ tool, parameters: params })
  
  if (result.decision === 'denied') {
    console.error(`Blocked: ${result.reason}`)
    return null
  }
  
  // Execute with signed ticket
  return await executeWithTicket(result.ticket)
}
```

---

## Troubleshooting

### "Failed to connect to Firestore"

**Cause:** Missing or incorrect `FIREBASE_PRIVATE_KEY`

**Fix:**
1. Download the service account JSON from Firebase Console
2. Copy the entire `private_key` value (including `-----BEGIN PRIVATE KEY-----`)
3. Paste into `.env` with actual newlines, not `\n`

### "JWT_SECRET is required"

**Cause:** `JWT_SECRET` not set

**Fix:**
```bash
export JWT_SECRET=$(openssl rand -hex 32)
```

### "CORS error in browser"

**Cause:** Frontend trying to access API from different origin

**Fix:**
```bash
# In .env
ALLOWED_ORIGINS=http://localhost:3001
```

### "Rate limit exceeded"

**Cause:** Default rate limit is 100 requests/minute per IP

**Fix:** For local development, rate limits are relaxed. In production, configure Redis for distributed rate limiting.

### "Policy not found"

**Cause:** Agent registered with policy ID that doesn't exist

**Fix:** Check Dashboard → Policies. Ensure the policy is active (not disabled).

### "Demo mode works but Firebase mode fails"

**Cause:** Firestore indexes not deployed

**Fix:**
```bash
firebase deploy --only firestore:indexes
```

### "Frontend shows 'API unavailable'"

**Cause:** Backend not running or wrong `NEXT_PUBLIC_API_URL`

**Fix:**
1. Ensure backend is running on port 3000
2. Check `frontend/.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:3000`

---

## Next Steps

- [ ] Read the [Security Guide](./security.md)
- [ ] Set up [Stripe billing](../dashboard/billing)
- [ ] Configure [webhooks](../dashboard/webhooks) for real-time alerts
- [ ] Review the [API specification](../../api-spec.yaml)
- [ ] Join our [Discord community](https://discord.gg/your-url) for support

---

Still stuck? Open a GitHub issue or email hello@your-url.com
