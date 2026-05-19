import { captureApiError } from './sentry'

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
    throw new Error('Session expired. Please sign in again.')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const message = err.error?.message || err.message
    const error = new Error(message || `Request failed (HTTP ${res.status})`)
    captureApiError(error, { path, status: res.status }).catch(() => {})
    if (message) throw error
    if (res.status === 403) throw new Error('Access denied. You do not have permission.')
    if (res.status === 404) throw new Error('Resource not found.')
    if (res.status === 409) throw new Error('Conflict: resource already exists.')
    if (res.status >= 500) throw new Error('Server error. Please try again later.')
    throw error
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

export async function suspendAgent(id: string) {
  return fetchJson(`/agents/${id}/suspend`, {
    method: 'PATCH',
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

export async function deletePolicy(id: string) {
  return fetchJson(`/policies/${id}`, {
    method: 'DELETE',
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

// Analytics
export async function getAnalyticsOverview(period = '7d') {
  return fetchJson(`/analytics/overview?period=${encodeURIComponent(period)}`)
}

export async function getAnalyticsTrends(period = '7d') {
  return fetchJson(`/analytics/trends?period=${encodeURIComponent(period)}`)
}

export async function getAnalyticsAgents(period = '7d') {
  return fetchJson(`/analytics/agents?period=${encodeURIComponent(period)}`)
}

export async function getAnalyticsPolicies(period = '7d') {
  return fetchJson(`/analytics/policies?period=${encodeURIComponent(period)}`)
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

// API Keys
export async function listApiKeys() {
  return fetchJson('/api-keys')
}

export async function createApiKey(data: { name: string; scopes?: string[] }) {
  return fetchJson('/api-keys', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function deleteApiKey(id: string) {
  return fetchJson(`/api-keys/${id}`, {
    method: 'DELETE',
  })
}

export async function rotateApiKey(id: string) {
  return fetchJson(`/api-keys/${id}/rotate`, {
    method: 'POST',
  })
}

// Onboarding
export async function completeOnboarding() {
  return fetchJson('/onboarding/complete', {
    method: 'POST',
    body: JSON.stringify({ completedAt: new Date().toISOString() }),
  })
}

// Webhooks
export async function listWebhooks() {
  return fetchJson('/webhooks')
}

export async function getWebhook(id: string) {
  return fetchJson(`/webhooks/${id}`)
}

export async function createWebhook(data: { name: string; url: string; events: string[]; secret?: string; active?: boolean }) {
  return fetchJson('/webhooks', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function deleteWebhook(id: string) {
  return fetchJson(`/webhooks/${id}`, {
    method: 'DELETE',
  })
}

export async function testWebhook(id: string) {
  return fetchJson(`/webhooks/${id}/test`, {
    method: 'POST',
  })
}

export async function rotateWebhook(id: string) {
  return fetchJson(`/webhooks/${id}/rotate`, {
    method: 'POST',
  })
}
