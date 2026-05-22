import { captureApiError } from './sentry'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

// Token storage
let token: string | null = null

if (typeof window !== 'undefined') {
  token = localStorage.getItem('passport_token')
}

export function getBaseUrl(): string {
  return API_BASE
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

const DEBUG_API = process.env.NEXT_PUBLIC_DEBUG_API === 'true' || process.env.DEBUG_API === 'true'

function stripAuth(headers: Record<string, string>): Record<string, string> {
  const sanitized = { ...headers }
  delete sanitized['Authorization']
  delete sanitized['authorization']
  return sanitized
}

function mergeHeaders(base: Record<string, string>, extra?: HeadersInit): Record<string, string> {
  const merged = { ...base }
  if (!extra) return merged
  if (Array.isArray(extra)) {
    for (const [k, v] of extra) merged[k] = v
  } else if ('entries' in (extra as any)) {
    for (const [k, v] of (extra as Headers).entries()) merged[k] = v
  } else {
    Object.assign(merged, extra)
  }
  return merged
}

async function fetchJson(path: string, options?: RequestInit) {
  const url = `${API_BASE}${path}`
  const start = DEBUG_API ? performance.now() : 0

  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, 10_000)

  const allHeaders = mergeHeaders(getHeaders(), options?.headers)

  try {
    if (DEBUG_API) {
      console.log(`[API] → ${options?.method || 'GET'} ${url}`, {
        headers: stripAuth({ ...allHeaders }),
        body: options?.body,
      })
    }

    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: allHeaders,
    })

    clearTimeout(timeoutId)

    const duration = DEBUG_API ? Math.round(performance.now() - start) : 0
    if (DEBUG_API) {
      console.log(`[API] ← ${options?.method || 'GET'} ${url} — ${res.status} (${duration}ms)`)
    }

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
  } catch (error: any) {
    clearTimeout(timeoutId)

    if (error.name === 'AbortError') {
      const toastMessage = 'Request timed out. Please try again.'
      if (typeof window !== 'undefined') {
        // We can't use hooks here, so dispatch a custom event for the toast
        window.dispatchEvent(
          new CustomEvent('passport-toast', {
            detail: { message: toastMessage, type: 'error' },
          })
        )
      }
      throw new Error(toastMessage)
    }

    throw error
  }
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

export async function register(name: string, email: string, password: string) {
  return fetchJson('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
}

export async function verifyEmail(token: string) {
  return fetchJson(`/auth/verify?token=${encodeURIComponent(token)}`)
}

export async function resendVerification(email: string) {
  return fetchJson('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function forgotPassword(email: string) {
  return fetchJson('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function resetPassword(token: string, newPassword: string) {
  return fetchJson('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  })
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return fetchJson('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

export async function getSessions() {
  return fetchJson('/auth/sessions')
}

export async function revokeSession(id: string) {
  return fetchJson(`/auth/sessions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
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

// Policy Templates
export async function listPolicyTemplates(params?: { category?: string; search?: string }) {
  const search = new URLSearchParams()
  if (params?.category) search.set('category', params.category)
  if (params?.search) search.set('search', params.search)
  const query = search.toString()
  return fetchJson(`/policies/templates${query ? '?' + query : ''}`)
}

export async function createPolicyFromTemplate(data: { templateId: string; name?: string; overrides?: Record<string, unknown> }) {
  return fetchJson('/policies/from-template', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function savePolicyTemplate(data: { name: string; description?: string; policyIds: string[]; public?: boolean }) {
  return fetchJson('/policies/templates', {
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

export async function getPrometheusMetrics() {
  const url = `${API_BASE}/metrics`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10_000)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'text/plain' },
    })
    clearTimeout(timeoutId)
    if (!res.ok) throw new Error(`Prometheus metrics failed (HTTP ${res.status})`)
    return res.text()
  } catch (error: any) {
    clearTimeout(timeoutId)
    throw error
  }
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

// Notifications
export async function getNotificationSettings() {
  return fetchJson('/notifications/settings')
}

export async function updateNotificationSettings(data: {
  email: {
    policyViolations: boolean
    agentRevocations: boolean
    systemAlerts: boolean
    weeklyDigest: boolean
  }
  webhookEnabled: boolean
}) {
  return fetchJson('/notifications/settings', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function sendTestEmail() {
  return fetchJson('/notifications/test', {
    method: 'POST',
  })
}

// Billing
export async function getBillingPlans() {
  return fetchJson('/billing/plans')
}

export async function getSubscription() {
  return fetchJson('/billing/subscription')
}

export async function getUsage() {
  return fetchJson('/billing/usage')
}

export async function createCheckoutSession(planId: string) {
  return fetchJson('/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({ planId }),
  })
}

export async function createPortalSession() {
  return fetchJson('/billing/portal', {
    method: 'POST',
  })
}

export async function getInvoices() {
  return fetchJson('/billing/invoices')
}

export async function cancelSubscription() {
  return fetchJson('/billing/cancel', {
    method: 'POST',
  })
}

// Health check helper
export async function checkHealth(): Promise<{ ok: boolean; data?: any }> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(`${API_BASE}/health`, {
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    if (res.ok) {
      const data = await res.json()
      return { ok: true, data }
    }
    return { ok: false }
  } catch {
    return { ok: false }
  }
}
