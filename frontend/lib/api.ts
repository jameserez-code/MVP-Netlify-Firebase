const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

// Token storage
let token: string | null = null

if (typeof window !== 'undefined') {
  token = localStorage.getItem('passport_token')
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

async function fetchJson(path: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...getHeaders(), ...(options?.headers || {}) },
  })

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('passport_token')
      window.location.href = '/login'
    }
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `HTTP ${res.status}`)
  }

  return res.json()
}

export function setToken(t: string) {
  token = t
  if (typeof window !== 'undefined') {
    localStorage.setItem('passport_token', t)
  }
}

export function getToken(): string | null {
  return token
}

export function clearToken() {
  token = null
  if (typeof window !== 'undefined') {
    localStorage.removeItem('passport_token')
  }
}

export function isLoggedIn(): boolean {
  return !!token
}

// Auth
export async function login(email: string, password: string) {
  return fetchJson('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

// Org
export async function seedOrg(name: string, email: string) {
  return fetchJson('/org/seed', {
    method: 'POST',
    body: JSON.stringify({ name, email }),
  })
}

// Agents
export async function listAgents() {
  return fetchJson('/agents')
}

export async function getAgent(id: string) {
  return fetchJson(`/agents/${id}`)
}

export async function registerAgent(data: { name: string; model: string; provider: string; systemPrompt?: string }) {
  return fetchJson('/agents/register', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function revokeAgent(id: string) {
  return fetchJson(`/agents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  })
}

// Policies
export async function listPolicies() {
  return fetchJson('/policies')
}

export async function createPolicy(data: { name: string; rules: Record<string, unknown> }) {
  return fetchJson('/policies', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// Audit
export async function getAudit(params?: { decision?: string; limit?: number }) {
  const search = new URLSearchParams()
  if (params?.decision) search.set('decision', params.decision)
  if (params?.limit) search.set('limit', String(params.limit))
  return fetchJson(`/audit?${search.toString()}`)
}

export async function getAuditTimeline() {
  return fetchJson('/audit/timeline')
}

// Metrics & Diagnostics
export async function getMetrics() {
  return fetchJson('/metrics')
}

export async function getDiagnostics() {
  return fetchJson('/diagnostics')
}

export async function getConsistency() {
  return fetchJson('/consistency')
}

export async function getReport() {
  return fetchJson('/report')
}

// Tasks
export async function createTask(payload: Record<string, unknown>) {
  return fetchJson('/task', {
    method: 'POST',
    body: JSON.stringify({ payload }),
  })
}

export async function getTask(id: string) {
  return fetchJson(`/task/${id}`)
}

// Runs
export async function startRun(agentId: string, taskId: string) {
  return fetchJson('/agent/run', {
    method: 'POST',
    body: JSON.stringify({ agentId, taskId }),
  })
}

export async function logAction(runId: string, data: { tool: string; decision: 'allow' | 'deny' | 'modify'; parameters?: Record<string, unknown>; reason?: string }) {
  return fetchJson(`/run/${runId}/log`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function completeRun(id: string) {
  return fetchJson(`/run/${id}/complete`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  })
}

export async function failRun(id: string, error?: string) {
  return fetchJson(`/run/${id}/fail`, {
    method: 'PATCH',
    body: JSON.stringify({ error }),
  })
}

export async function getRunTrace(id: string) {
  return fetchJson(`/run/${id}/trace`)
}

// Security
export async function securityPing() {
  return fetchJson('/security/ping')
}

// Enforcement
export async function enforceIntent(data: { intent: { intentId: string; agentId: string; tool: string; parameters?: Record<string, unknown> } }) {
  return fetchJson('/enforce', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// Gateway
export async function gatewayExecute(gatewayTicket: string, action: Record<string, unknown>) {
  return fetchJson('/gateway/execute', {
    method: 'POST',
    body: JSON.stringify({ gatewayTicket, action }),
  })
}
