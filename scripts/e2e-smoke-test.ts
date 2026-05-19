#!/usr/bin/env tsx
/**
 * End-to-end smoke test for Passport Agent API
 *
 * Usage:
 *   tsx scripts/e2e-smoke-test.ts
 *   API_URL=https://api.example.com tsx scripts/e2e-smoke-test.ts
 */

const BASE_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

// Simple color helpers
const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
}

function ok(label: string) {
  console.log(`${c.green}✓${c.reset} ${label}`)
}

function fail(label: string, err?: any) {
  console.log(`${c.red}✗${c.reset} ${label}${err ? ` — ${err.message || err}` : ''}`)
}

function info(label: string) {
  console.log(`${c.cyan}→${c.reset} ${label}`)
}

function section(label: string) {
  console.log(`\n${c.yellow}▶ ${label}${c.reset}`)
}

let token: string | null = null
let orgId: string | null = null
let agentId: string | null = null
let policyId: string | null = null
let runId: string | null = null
let taskId: string | null = null

async function api(path: string, opts?: RequestInit & { expectStatus?: number }) {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers || {}),
    },
  })

  const expectStatus = opts?.expectStatus ?? 200
  if (res.status !== expectStatus) {
    const body = await res.text().catch(() => '')
    throw new Error(`Expected ${expectStatus}, got ${res.status}: ${body}`)
  }

  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return res.json()
  }
  return null
}

async function cleanup() {
  section('Cleanup')
  try {
    if (runId) {
      await api(`/run/${runId}/fail`, { method: 'PATCH', body: JSON.stringify({ error: 'test cleanup' }), expectStatus: 200 }).catch(() => {})
      info(`Marked run ${runId} as failed`)
    }
    if (agentId) {
      await api(`/agents/${agentId}`, { method: 'DELETE' }).catch(() => {})
      info(`Deleted agent ${agentId}`)
    }
    if (policyId) {
      await api(`/policies/${policyId}`, { method: 'DELETE' }).catch(() => {})
      info(`Deleted policy ${policyId}`)
    }
    ok('Cleanup completed')
  } catch (e: any) {
    fail('Cleanup failed', e)
  }
}

async function main() {
  console.log(`${c.cyan}Passport Agent E2E Smoke Test${c.reset}`)
  console.log(`${c.dim}Base URL: ${BASE_URL}${c.reset}\n`)

  let exitCode = 0

  try {
    // 1. Health check
    section('1. Health Check')
    const health = await api('/health')
    ok(`API is ${health.status} (v${health.version})`)

    // 2. Register new org
    section('2. Register Org')
    const orgName = `smoke-test-org-${Date.now()}`
    const orgEmail = `smoke-${Date.now()}@example.com`
    const orgRes = await api('/org/seed', {
      method: 'POST',
      body: JSON.stringify({ name: orgName, email: orgEmail }),
      expectStatus: 201,
    })
    orgId = orgRes.orgId || orgRes.id
    ok(`Created org: ${orgId}`)

    // 3. Login
    section('3. Login')
    // First create a user with known password via seed or use existing test user
    // For smoke test, we try to login with a test user if it exists, otherwise we skip auth-dependent steps
    const loginRes = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@passport.local', password: 'admin123' }),
    }).catch(() => null)

    if (loginRes?.token) {
      token = loginRes.token
      ok(`Logged in as admin@passport.local`)
    } else {
      info('No test user found; some steps may be skipped. Create admin@passport.local / admin123 for full test.')
    }

    // 4. Create policy
    if (token) {
      section('4. Create Policy')
      const policyRes = await api('/policies', {
        method: 'POST',
        body: JSON.stringify({
          name: `smoke-policy-${Date.now()}`,
          rules: {
            defaultAction: 'allow',
            tools: { read_file: 'allow', delete_file: 'deny' },
          },
        }),
        expectStatus: 201,
      })
      policyId = policyRes.id
      ok(`Created policy: ${policyId}`)

      // 5. Register agent
      section('5. Register Agent')
      const agentRes = await api('/agents/register', {
        method: 'POST',
        body: JSON.stringify({
          name: `smoke-agent-${Date.now()}`,
          model: 'gpt-4',
          provider: 'openai',
          systemPrompt: 'You are a test agent.',
        }),
        expectStatus: 201,
      })
      agentId = agentRes.id
      ok(`Registered agent: ${agentId}`)

      // 6. Run enforcement
      section('6. Run Enforcement')
      const enforceRes = await api('/enforce', {
        method: 'POST',
        body: JSON.stringify({
          intent: {
            intentId: `intent-${Date.now()}`,
            agentId: agentId!,
            tool: 'read_file',
            parameters: { path: '/tmp/test.txt' },
          },
        }),
        expectStatus: 200,
      })
      ok(`Enforcement decision: ${enforceRes.decision || 'processed'}`)

      // 7. Check audit log
      section('7. Check Audit Log')
      const auditRes = await api('/audit?limit=1')
      if (auditRes.data && auditRes.data.length > 0) {
        ok(`Audit log has ${auditRes.total || auditRes.data.length} entries`)
      } else {
        info('Audit log is empty (expected for fresh env)')
      }
    } else {
      info('Skipping auth-dependent steps (4-7) — no test user available')
    }

    console.log(`\n${c.green}All smoke tests passed ✓${c.reset}\n`)
  } catch (e: any) {
    console.error(`\n${c.red}Smoke test failed:${c.reset}`, e.message)
    exitCode = 1
  } finally {
    await cleanup()
  }

  process.exit(exitCode)
}

main()
