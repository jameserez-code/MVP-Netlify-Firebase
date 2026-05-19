// Integration test — verifies full API flow against a deployed instance
// Run: API_URL=https://passport-agent-api.onrender.com npx tsx scripts/test-integration.ts

const API_URL = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '')

const RESET = '\x1b[0m'
const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const CYAN = '\x1b[36m'

let token = ''
let agentId = ''
let intentId = ''

function ok(label: string) {
  console.log(`${GREEN}  ✓${RESET} ${label}`)
}

function fail(label: string, detail?: string) {
  console.log(`${RED}  ✗${RESET} ${label}${detail ? ` — ${detail}` : ''}`)
}

async function request(path: string, opts: RequestInit = {}) {
  const url = `${API_URL}${path}`
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  })
  const body = await res.json().catch(() => ({}))
  return { status: res.status, body }
}

async function runTests() {
  console.log(`${CYAN}Passport Agent — Integration Tests${RESET}`)
  console.log(`API: ${API_URL}\n`)

  let failed = 0

  // 1. Health check
  try {
    const { status, body } = await request('/health')
    if (status === 200 && body.status === 'ok') {
      ok('Health check')
    } else {
      fail('Health check', JSON.stringify(body))
      failed++
    }
  } catch (e: any) {
    fail('Health check', e.message)
    failed++
  }

  // 2. Login
  try {
    const { status, body } = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@passport-agent.dev',
        password: process.env.ADMIN_PASSWORD || 'changeme',
      }),
    })
    if (status === 200 && body.token) {
      token = body.token
      ok('Login')
    } else {
      fail('Login', JSON.stringify(body))
      failed++
    }
  } catch (e: any) {
    fail('Login', e.message)
    failed++
  }

  // 3. Create agent
  try {
    const { status, body } = await request('/agents/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Integration Test Agent',
        model: 'gpt-4o',
        provider: 'openai',
      }),
    })
    if (status === 201 && body.agentId) {
      agentId = body.agentId
      ok('Create agent')
    } else {
      fail('Create agent', JSON.stringify(body))
      failed++
    }
  } catch (e: any) {
    fail('Create agent', e.message)
    failed++
  }

  // 4. Enforce
  try {
    intentId = `intent_test_${Date.now()}`
    const { status, body } = await request('/enforce', {
      method: 'POST',
      body: JSON.stringify({
        intent: {
          intentId,
          agentId,
          tool: 'lookup_order',
          parameters: { orderId: '123' },
        },
      }),
    })
    if (status === 200 && (body.decision === 'allow' || body.decision === 'deny')) {
      ok('Enforce intent')
    } else {
      fail('Enforce intent', JSON.stringify(body))
      failed++
    }
  } catch (e: any) {
    fail('Enforce intent', e.message)
    failed++
  }

  // 5. Get audit
  try {
    const { status, body } = await request('/audit')
    if (status === 200 && Array.isArray(body.data)) {
      ok('Get audit log')
    } else {
      fail('Get audit log', JSON.stringify(body))
      failed++
    }
  } catch (e: any) {
    fail('Get audit log', e.message)
    failed++
  }

  console.log('')
  if (failed === 0) {
    console.log(`${GREEN}All tests passed ✓${RESET}`)
    process.exit(0)
  } else {
    console.log(`${RED}${failed} test(s) failed ✗${RESET}`)
    process.exit(1)
  }
}

runTests().catch((err) => {
  console.error(`${RED}Unexpected error:${RESET}`, err)
  process.exit(1)
})
