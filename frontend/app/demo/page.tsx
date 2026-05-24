'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  Shield,
  Play,
  Pause,
  RotateCcw,
  Clock,
  CheckCircle2,
  XCircle,
  Info,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Terminal,
  Zap,
  Eye,
  MousePointerClick,
  Timer,
  CreditCard,
  FileText,
  Activity,
  Copy,
  X,
  Share2,
  History,
  Code2,
  BarChart3,
  Wifi,
  WifiOff,
  Server,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { getBaseUrl } from '@/lib/api'

/* ────────────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────────────── */

type Decision = 'allowed' | 'denied' | 'modified'
type RunMode = 'simulation' | 'live'

interface SimAction {
  id: string
  tool: string
  params: Record<string, unknown>
  raw: string
}

interface Policy {
  id: string
  name: string
  description: string
  active: boolean
  rules: {
    allowedTools?: string[]
    blockedTools?: string[]
    blockedPatterns?: { label: string; regex: RegExp }[]
  }
}

interface LogEntry {
  id: string
  action: SimAction
  decision: Decision
  reason: string
  policyName?: string
  timestamp: number
  latency?: number
  ticket?: string
  fullResponse?: Record<string, unknown>
}

interface Scenario {
  id: string
  label: string
  persona: string
  actions: SimAction[]
}

interface EnforcementResponse {
  [key: string]: unknown
  intentId?: string
  decision?: string
  reason?: string
  policyName?: string
  ticket?: string
  modifiedParameters?: Record<string, unknown>
  gatewayTicket?: string
}

interface ApiPolicy {
  id: string
  name: string
  description?: string
  status?: string
  active?: boolean
  rules?: {
    allowedTools?: string[]
    blockedTools?: string[]
    blockedPatterns?: { label?: string; pattern?: string; regex?: string }[]
  }
}

/* ────────────────────────────────────────────────────────────────
   Demo Data
   ──────────────────────────────────────────────────────────────── */

const SCENARIOS: Scenario[] = [
  {
    id: 'support',
    label: 'Customer Support Agent',
    persona: 'Handles tickets, looks up orders, searches knowledge base',
    actions: [
      { id: 's1', tool: 'lookup_order', params: { orderId: 'ORD-7823', customerEmail: 'user@example.com' }, raw: 'agent.lookup_order({ orderId: "ORD-7823", customerEmail: "user@example.com" })' },
      { id: 's2', tool: 'read_knowledge_base', params: { article: 'refund-policy-2024', section: 'eligibility' }, raw: 'agent.read_knowledge_base({ article: "refund-policy-2024", section: "eligibility" })' },
      { id: 's3', tool: 'send_email', params: { to: 'user@example.com', subject: 'Refund Update', body: 'Your refund of $149.99 is processing. Card: 4111-1111-1111-1111' }, raw: 'agent.send_email({ to: "user@example.com", subject: "Refund Update", body: "Your refund of $149.99 is processing. Card: 4111-1111-1111-1111" })' },
      { id: 's4', tool: 'delete_database', params: { name: 'production-customers' }, raw: 'agent.delete_database({ name: "production-customers" })' },
      { id: 's5', tool: 'check_shipping', params: { trackingNumber: '1Z999AA10123456784', carrier: 'ups' }, raw: 'agent.check_shipping({ trackingNumber: "1Z999AA10123456784", carrier: "ups" })' },
      { id: 's6', tool: 'update_ticket', params: { ticketId: 'TKT-4419', status: 'resolved', priority: 'low' }, raw: 'agent.update_ticket({ ticketId: "TKT-4419", status: "resolved", priority: "low" })' },
      { id: 's7', tool: 'query_database', params: { table: 'users', query: 'SELECT ssn, dob FROM users WHERE id = 8821' }, raw: 'agent.query_database({ table: "users", query: "SELECT ssn, dob FROM users WHERE id = 8821" })' },
      { id: 's8', tool: 'send_email', params: { to: 'admin@company.com', subject: 'Weekly Report', body: 'Ticket volume up 12% this week. Top issue: login failures.' }, raw: 'agent.send_email({ to: "admin@company.com", subject: "Weekly Report", body: "Ticket volume up 12% this week. Top issue: login failures." })' },
      { id: 's9', tool: 'web_search', params: { query: 'troubleshoot error code ERR_SSL_PROTOCOL_ERROR' }, raw: 'agent.web_search({ query: "troubleshoot error code ERR_SSL_PROTOCOL_ERROR" })' },
      { id: 's10', tool: 'query_database', params: { table: 'knowledge_articles', limit: 25 }, raw: 'agent.query_database({ table: "knowledge_articles", limit: 25 })' },
    ],
  },
  {
    id: 'analyst',
    label: 'Data Analyst',
    persona: 'Queries metrics, generates charts, exports reports',
    actions: [
      { id: 'a1', tool: 'query_metrics', params: { metric: 'mau', period: 'last_30_days', groupBy: 'region' }, raw: 'agent.query_metrics({ metric: "mau", period: "last_30_days", groupBy: "region" })' },
      { id: 'a2', tool: 'filter_data', params: { table: 'customers', columns: 'name,ssn,address,phone', where: 'signup_date > "2024-01-01"' }, raw: 'agent.filter_data({ table: "customers", columns: "name,ssn,address,phone", where: "signup_date > \\"2024-01-01\\"" })' },
      { id: 'a3', tool: 'generate_chart', params: { type: 'line', data: 'revenue_by_month', title: 'Revenue Trend Q1-Q4 2024' }, raw: 'agent.generate_chart({ type: "line", data: "revenue_by_month", title: "Revenue Trend Q1-Q4 2024" })' },
      { id: 'a4', tool: 'drop_table', params: { table: 'experimental_ab_tests' }, raw: 'agent.drop_table({ table: "experimental_ab_tests" })' },
      { id: 'a5', tool: 'aggregate_stats', params: { metric: 'avg_order_value', groupBy: 'customer_segment', filters: ['country=US', 'active=true'] }, raw: 'agent.aggregate_stats({ metric: "avg_order_value", groupBy: "customer_segment", filters: ["country=US", "active=true"] })' },
      { id: 'a6', tool: 'export_report', params: { format: 'csv', tables: ['sales', 'inventory'], destination: 's3://reports/q4-2024/' }, raw: 'agent.export_report({ format: "csv", tables: ["sales", "inventory"], destination: "s3://reports/q4-2024/" })' },
      { id: 'a7', tool: 'send_email', params: { to: 'cfo@company.com', subject: 'Q4 Earnings', body: 'Revenue: $12.4M (↑18%). Attached: full P&L. Passport: AB1234567' }, raw: 'agent.send_email({ to: "cfo@company.com", subject: "Q4 Earnings", body: "Revenue: $12.4M (↑18%). Attached: full P&L. Passport: AB1234567" })' },
      { id: 'a8', tool: 'query_database', params: { table: 'transactions', query: 'SELECT card_number, cvv FROM transactions LIMIT 1000' }, raw: 'agent.query_database({ table: "transactions", query: "SELECT card_number, cvv FROM transactions LIMIT 1000" })' },
      { id: 'a9', tool: 'read_database', params: { table: 'forecasts', columns: ['region', 'predicted_revenue', 'confidence'] }, raw: 'agent.read_database({ table: "forecasts", columns: ["region", "predicted_revenue", "confidence"] })' },
      { id: 'a10', tool: 'web_search', params: { query: 'saas retention rate benchmark 2024' }, raw: 'agent.web_search({ query: "saas retention rate benchmark 2024" })' },
    ],
  },
  {
    id: 'social',
    label: 'Social Media Manager',
    persona: 'Drafts posts, analyzes engagement, schedules content',
    actions: [
      { id: 'm1', tool: 'find_trending', params: { platform: 'twitter', region: 'US', category: 'tech' }, raw: 'agent.find_trending({ platform: "twitter", region: "US", category: "tech" })' },
      { id: 'm2', tool: 'draft_post', params: { platform: 'linkedin', text: 'We just shipped real-time agent governance. Zero trust, zero latency.', media: ['product_screenshot.png'] }, raw: 'agent.draft_post({ platform: "linkedin", text: "We just shipped real-time agent governance. Zero trust, zero latency.", media: ["product_screenshot.png"] })' },
      { id: 'm3', tool: 'send_email', params: { to: 'influencer@agency.com', subject: 'Collab Details', body: 'Attached: contract. SSN: 123-45-6789. Rate: $5k/post' }, raw: 'agent.send_email({ to: "influencer@agency.com", subject: "Collab Details", body: "Attached: contract. SSN: 123-45-6789. Rate: $5k/post" })' },
      { id: 'm4', tool: 'delete_database', params: { name: 'social_analytics_prod' }, raw: 'agent.delete_database({ name: "social_analytics_prod" })' },
      { id: 'm5', tool: 'analyze_engagement', params: { postId: 'POST-5521', metrics: ['likes', 'shares', 'comments', 'click_through'] }, raw: 'agent.analyze_engagement({ postId: "POST-5521", metrics: ["likes", "shares", "comments", "click_through"] })' },
      { id: 'm6', tool: 'reply_to_comment', params: { commentId: 'CMT-9981', text: 'Great question! DM us your account email for faster support.', platform: 'instagram' }, raw: 'agent.reply_to_comment({ commentId: "CMT-9981", text: "Great question! DM us your account email for faster support.", platform: "instagram" })' },
      { id: 'm7', tool: 'schedule_content', params: { posts: [{ platform: 'twitter', text: 'Thread: How we reduced agent latency 80%', scheduledAt: '2024-12-01T14:00:00Z' }] }, raw: 'agent.schedule_content({ posts: [{ platform: "twitter", text: "Thread: How we reduced agent latency 80%", scheduledAt: "2024-12-01T14:00:00Z" }] })' },
      { id: 'm8', tool: 'query_database', params: { table: 'user_dms', query: 'SELECT * FROM user_dms WHERE contains_pii = true' }, raw: 'agent.query_database({ table: "user_dms", query: "SELECT * FROM user_dms WHERE contains_pii = true" })' },
      { id: 'm9', tool: 'web_search', params: { query: 'competitor social media strategy analysis 2024' }, raw: 'agent.web_search({ query: "competitor social media strategy analysis 2024" })' },
      { id: 'm10', tool: 'draft_post', params: { platform: 'twitter', text: 'Big announcement dropping tomorrow. Set your reminders.' }, raw: 'agent.draft_post({ platform: "twitter", text: "Big announcement dropping tomorrow. Set your reminders." })' },
    ],
  },
]

const DEFAULT_POLICIES: Policy[] = [
  {
    id: 'safe-web-search',
    name: 'Safe Read-Only',
    description: 'Allows: web_search, read_database, read_knowledge_base, query_database, query_metrics, generate_report, generate_chart, export_report, export_data, filter_data, aggregate_stats, lookup_order, check_shipping, draft_post, find_trending, analyze_engagement, schedule_content, reply_to_comment, update_ticket, post_twitter',
    active: true,
    rules: {
      allowedTools: [
        'web_search', 'read_database', 'read_knowledge_base', 'query_database', 'query_metrics',
        'generate_report', 'generate_chart', 'export_report', 'export_data', 'filter_data',
        'aggregate_stats', 'lookup_order', 'check_shipping', 'draft_post', 'find_trending',
        'analyze_engagement', 'schedule_content', 'reply_to_comment', 'update_ticket', 'post_twitter',
      ],
    },
  },
  {
    id: 'no-pii',
    name: 'No PII Access',
    description: 'Blocks: SSN, credit card, passport numbers in any request or response',
    active: true,
    rules: {
      blockedPatterns: [
        { label: 'SSN', regex: /\b\d{3}-\d{2}-\d{4}\b/ },
        { label: 'Credit Card', regex: /\b\d{4}-\d{4}-\d{4}-\d{4}\b/ },
        { label: 'Passport Number', regex: /\b[A-Z]{2}\d{7}\b/ },
      ],
    },
  },
  {
    id: 'no-destructive',
    name: 'No Destructive Actions',
    description: 'Blocks: delete_database, drop_table',
    active: true,
    rules: {
      blockedTools: ['delete_database', 'drop_table'],
    },
  },
]

/* ────────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────────── */

function evaluateAction(action: SimAction, policies: Policy[]): { decision: Decision; reason: string; policyName?: string } {
  const destructivePolicy = policies.find((p) => p.active && p.rules.blockedTools?.includes(action.tool))
  if (destructivePolicy) {
    return {
      decision: 'denied',
      reason: `tool "${action.tool}" is explicitly blocked`,
      policyName: destructivePolicy.name,
    }
  }

  const piiPolicy = policies.find((p) => p.active && p.rules.blockedPatterns)
  if (piiPolicy) {
    const rawParams = JSON.stringify(action.params)
    for (const pattern of piiPolicy.rules.blockedPatterns || []) {
      if (pattern.regex.test(rawParams)) {
        return {
          decision: 'denied',
          reason: `PII detected (${pattern.label} pattern found)`,
          policyName: piiPolicy.name,
        }
      }
    }
  }

  const safePolicy = policies.find((p) => p.active && p.rules.allowedTools?.includes(action.tool))
  if (safePolicy) {
    return {
      decision: 'allowed',
      reason: `policy "${safePolicy.name}" permits ${action.tool}`,
      policyName: safePolicy.name,
    }
  }

  return {
    decision: 'allowed',
    reason: 'no policy violations detected',
  }
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0')
  const s = (totalSeconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function mapApiDecision(apiDecision?: string): Decision {
  if (apiDecision === 'deny') return 'denied'
  if (apiDecision === 'modify') return 'modified'
  return 'allowed'
}

function generateCurlCommand(baseUrl: string, token: string, tool: string, params: Record<string, unknown>): string {
  const body = JSON.stringify({ agentId: 'agent_demo', tool, parameters: params })
  return `curl -X POST ${baseUrl}/enforce \\\n  -H "Content-Type: application/json" \\\n  -H "Authorization: Bearer ${token}" \\\n  -d '${body.replace(/'/g, "'\\''")}'`
}

function transformApiPolicies(apiPolicies: ApiPolicy[]): Policy[] {
  return apiPolicies.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description || '',
    active: p.status ? p.status === 'active' : (p.active ?? true),
    rules: {
      allowedTools: p.rules?.allowedTools || [],
      blockedTools: p.rules?.blockedTools || [],
      blockedPatterns: (p.rules?.blockedPatterns || []).map((bp) => ({
        label: bp.label || bp.pattern || '',
        regex: new RegExp(bp.pattern || bp.regex || '^$'),
      })),
    },
  }))
}

/* ────────────────────────────────────────────────────────────────
   Sub-Components
   ──────────────────────────────────────────────────────────────── */

function StatCard({ label, value, color, icon: Icon }: { label: string; value: number; color: string; icon: React.ElementType }) {
  return (
    <div className="glass-panel p-3 flex items-center gap-3">
      <div className={`w-8 h-8 rounded flex items-center justify-center ${color}`}>
        <Icon size={16} />
      </div>
      <div>
        <div className="font-mono text-lg font-bold text-passport-text leading-none">{value}</div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-passport-muted mt-1">{label}</div>
      </div>
    </div>
  )
}

function DecisionBadge({ decision }: { decision: Decision }) {
  if (decision === 'allowed')
    return (
      <span className="inline-flex items-center gap-1 text-passport-green font-mono text-xs">
        <CheckCircle2 size={12} />
        ALLOWED
      </span>
    )
  if (decision === 'denied')
    return (
      <span className="inline-flex items-center gap-1 text-passport-coral font-mono text-xs">
        <XCircle size={12} />
        DENIED
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 text-passport-azure font-mono text-xs">
      <Info size={12} />
      MODIFIED
    </span>
  )
}

function MiniSparkline({ data }: { data: Decision[] }) {
  if (data.length === 0) {
    return <div className="text-[10px] text-passport-dim font-mono">—</div>
  }
  const w = 100
  const h = 20
  const barW = Math.max(2, Math.floor(w / Math.max(data.length, 1)))
  const colorMap: Record<Decision, string> = { allowed: '#2ea043', denied: '#f78166', modified: '#58a6ff' }
  return (
    <svg width={w} height={h} className="block">
      {data.map((d, i) => (
        <rect
          key={i}
          x={i * barW}
          y={0}
          width={barW - 1}
          height={h}
          fill={colorMap[d]}
          opacity={0.7}
          rx={1}
          style={{ animation: `fadeIn 0.3s ${i * 15}ms both` }}
        />
      ))}
    </svg>
  )
}

function CircularTimer({ seconds, total }: { seconds: number; total: number }) {
  const radius = 18
  const circumference = 2 * Math.PI * radius
  const progress = Math.max(0, Math.min(1, seconds / total))
  const offset = circumference * (1 - progress)
  const isUrgent = seconds <= 30
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={44} height={44} className="-rotate-90">
        <circle cx={22} cy={22} r={radius} fill="none" stroke="#30363d" strokeWidth={3} />
        <circle
          cx={22}
          cy={22}
          r={radius}
          fill="none"
          stroke={isUrgent ? '#f78166' : '#2ea043'}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.5s ease' }}
        />
      </svg>
      <span className={`absolute font-mono text-[10px] font-bold ${isUrgent ? 'text-passport-coral' : 'text-passport-green'}`}>
        {formatTime(seconds)}
      </span>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────
   Main Page
   ──────────────────────────────────────────────────────────────── */

export default function DemoPage() {
  const [started, setStarted] = useState(false)
  const [scenarioId, setScenarioId] = useState<string>('support')
  const [policies, setPolicies] = useState<Policy[]>(DEFAULT_POLICIES.map((p) => ({ ...p })))
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState<1 | 2 | 4>(1)
  const [actionIndex, setActionIndex] = useState(0)
  const [sessionSeconds, setSessionSeconds] = useState(600)
  const [expandedPolicies, setExpandedPolicies] = useState<Set<string>>(new Set())
  const [showCta, setShowCta] = useState(false)
  const [dismissedCta, setDismissedCta] = useState(false)
  const [ctaCountdown, setCtaCountdown] = useState(30)
  const [triggeredPolicyId, setTriggeredPolicyId] = useState<string | null>(null)
  const [enforcementLatency, setEnforcementLatency] = useState(0)
  const [decisionHistory, setDecisionHistory] = useState<Decision[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [visibleSteps, setVisibleSteps] = useState<Set<number>>(new Set())
  const [phase, setPhase] = useState<'idle' | 'typing' | 'evaluating' | 'complete'>('idle')
  const [typedText, setTypedText] = useState('')
  const [processingDots, setProcessingDots] = useState(0)
  const [pendingAction, setPendingAction] = useState<SimAction | null>(null)

  // ── Live API mode state ──
  const [mode, setMode] = useState<RunMode>('simulation')
  const [apiOnline, setApiOnline] = useState<boolean | null>(null)
  const [apiChecking, setApiChecking] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [tokenLoading, setTokenLoading] = useState(false)
  const [policiesLoading, setPoliciesLoading] = useState(false)
  const [expandedResultIds, setExpandedResultIds] = useState<Set<string>>(new Set())
  const [liveApiError, setLiveApiError] = useState<string | null>(null)

  const consoleEndRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const simTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const typeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const speedRef = useRef(speed)
  const policiesRef = useRef(policies)
  const isPlayingRef = useRef(isPlaying)
  const modeRef = useRef(mode)
  const tokenRef = useRef(token)
  const cancelledRef = useRef(false)

  const API_BASE = getBaseUrl()
  const isLocalDemo = API_BASE.includes('localhost') || API_BASE.includes('127.0.0.1')

  useEffect(() => { speedRef.current = speed }, [speed])
  useEffect(() => { policiesRef.current = policies }, [policies])
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])
  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { tokenRef.current = token }, [token])

  const scenario = SCENARIOS.find((s) => s.id === scenarioId) || SCENARIOS[0]
  const totalActions = logs.length
  const allowedCount = logs.filter((l) => l.decision === 'allowed').length
  const deniedCount = logs.filter((l) => l.decision === 'denied').length
  const modifiedCount = logs.filter((l) => l.decision === 'modified').length
  const activePolicyCount = policies.filter((p) => p.active).length
  const lastFiveLogs = logs.slice(-5)
  const historyLogs = logs.slice(-10).reverse()

  const clearAllTimers = useCallback(() => {
    simTimersRef.current.forEach(clearTimeout)
    simTimersRef.current = []
    if (typeIntervalRef.current) {
      clearInterval(typeIntervalRef.current)
      typeIntervalRef.current = null
    }
  }, [])

  // ── Health check on mount ──
  useEffect(() => {
    let cancelled = false
    setApiChecking(true)
    fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(5000) })
      .then((r) => {
        if (cancelled) return
        setApiOnline(r.ok)
        setApiChecking(false)
      })
      .catch(() => {
        if (cancelled) return
        setApiOnline(false)
        setApiChecking(false)
      })
    return () => { cancelled = true }
  }, [API_BASE])

  // ── Auto-login for live mode ──
  useEffect(() => {
    if (mode !== 'live' || apiOnline === false) return
    setTokenLoading(true)
    setLiveApiError(null)
    fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@demo.com', password: 'demo123' }),
      signal: AbortSignal.timeout(10000),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.token) {
          setToken(data.token)
          tokenRef.current = data.token
        } else {
          throw new Error(data.error?.message || 'No token in response')
        }
        setTokenLoading(false)
      })
      .catch((err) => {
        setLiveApiError(`Login failed: ${err.message}`)
        setApiOnline(false)
        setTokenLoading(false)
      })
  }, [mode, apiOnline, API_BASE])

  // ── Fetch real policies in live mode ──
  useEffect(() => {
    if (mode !== 'live' || !token) return
    setPoliciesLoading(true)
    fetch(`${API_BASE}/policies`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
    })
      .then((r) => r.json())
      .then((data) => {
        const apiPolicies: ApiPolicy[] = data.policies || data
        if (Array.isArray(apiPolicies) && apiPolicies.length > 0) {
          setPolicies(transformApiPolicies(apiPolicies))
        }
        setPoliciesLoading(false)
      })
      .catch(() => {
        setPoliciesLoading(false)
      })
  }, [mode, token, API_BASE])

  // ── Heartbeat re-check ──
  useEffect(() => {
    if (!started) return
    const interval = setInterval(() => {
      fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) })
        .then((r) => setApiOnline(r.ok))
        .catch(() => setApiOnline(false))
    }, 30000)
    return () => clearInterval(interval)
  }, [started, API_BASE])

  // Auto-scroll console
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, typedText, phase])

  // Session countdown timer
  useEffect(() => {
    if (!started) return
    timerRef.current = setInterval(() => {
      setSessionSeconds((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [started])

  // CTA countdown timer
  useEffect(() => {
    if (!started) return
    const interval = setInterval(() => {
      setCtaCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          setShowCta(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [started])

  // Processing dots animation
  useEffect(() => {
    if (phase !== 'evaluating') {
      setProcessingDots(0)
      return
    }
    const interval = setInterval(() => {
      setProcessingDots((prev) => (prev + 1) % 4)
    }, 400)
    return () => clearInterval(interval)
  }, [phase])

  // Scroll reveal for How It Works
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const step = Number(entry.target.getAttribute('data-step'))
            if (!isNaN(step)) {
              setVisibleSteps((prev) => new Set([...prev, step]))
            }
          }
        })
      },
      { threshold: 0.3 }
    )
    const elements = document.querySelectorAll('[data-step]')
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  // Toast auto-dismiss
  useEffect(() => {
    if (!showToast) return
    const t = setTimeout(() => setShowToast(false), 2500)
    return () => clearTimeout(t)
  }, [showToast])

  // ─── Simulation / Live Runner ───
  useEffect(() => {
    if (!isPlaying) {
      clearAllTimers()
      return
    }

    const currentScenario = SCENARIOS.find((s) => s.id === scenarioId) || SCENARIOS[0]
    const actions = currentScenario.actions

    // Loop back
    if (actionIndex >= actions.length) {
      const loopLog: LogEntry = {
        id: `loop-${Date.now()}`,
        action: { id: 'loop', tool: 'system', params: {}, raw: '--- Restarting simulation sequence ---' },
        decision: 'allowed',
        reason: 'loop marker',
        timestamp: Date.now(),
      }
      setLogs((prev) => [...prev, loopLog])
      const t = setTimeout(() => setActionIndex(0), 600 / speedRef.current)
      simTimersRef.current.push(t)
      return () => clearAllTimers()
    }

    const action = actions[actionIndex]
    const shouldAnimateTyping = actionIndex < 3 && logs.length < 3

    // ── LIVE API MODE ──
    if (modeRef.current === 'live' && tokenRef.current) {
      let cancelled = false
      cancelledRef.current = false

      setPendingAction(action)
      setPhase('typing')
      setTypedText('')
      setTriggeredPolicyId(null)

      let charIdx = 0
      if (shouldAnimateTyping) {
        typeIntervalRef.current = setInterval(() => {
          charIdx++
          setTypedText(action.raw.slice(0, charIdx))
          if (charIdx >= action.raw.length) {
            if (typeIntervalRef.current) clearInterval(typeIntervalRef.current)
            typeIntervalRef.current = null
            if (!cancelled) setPhase('evaluating')
          }
        }, 14)
      } else {
        setTypedText(action.raw)
        const t = setTimeout(() => {
          if (!cancelled) setPhase('evaluating')
        }, 60 / speedRef.current)
        simTimersRef.current.push(t)
      }

      const evalDelay = shouldAnimateTyping ? 300 : 150

      const evalTimer = setTimeout(() => {
        if (cancelled) return

        const currentToken = tokenRef.current
        if (!currentToken) {
          if (!cancelled) {
            setLiveApiError('JWT expired — switching to simulation')
            setMode('simulation')
          }
          return
        }

        const startTime = performance.now()

        fetch(`${API_BASE}/enforce`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentToken}`,
          },
          body: JSON.stringify({
            agentId: 'agent_demo',
            tool: action.tool,
            parameters: action.params,
          }),
          signal: AbortSignal.timeout(15000),
        })
          .then((r) => {
            if (!r.ok) {
              return r.json().then((err) => {
                throw new Error(err.error?.message || `HTTP ${r.status}`)
              })
            }
            return r.json()
          })
          .then((data: EnforcementResponse) => {
            if (cancelled) return

            const latency = Math.round(performance.now() - startTime)
            const decision = mapApiDecision(data.decision)
            const reason = data.reason || (decision === 'allowed' ? 'allowed by policy engine' : 'denied by policy engine')

            const newLog: LogEntry = {
              id: `${action.id}-${Date.now()}`,
              action,
              decision,
              reason,
              policyName: data.policyName,
              timestamp: Date.now(),
              latency,
              ticket: data.gatewayTicket || data.ticket,
              fullResponse: data,
            }

            setLogs((prev) => [...prev, newLog])
            setEnforcementLatency(latency)
            setDecisionHistory((prev) => [...prev, decision].slice(-30))
            setTriggeredPolicyId(data.policyName || null)
            setPhase('complete')
            setPendingAction(null)

            const nextDelay = 400 / speedRef.current
            const advanceTimer = setTimeout(() => {
              setActionIndex((prev) => prev + 1)
              setPhase('idle')
            }, nextDelay)
            simTimersRef.current.push(advanceTimer)
          })
          .catch((err) => {
            if (cancelled) return

            const errorMsg = err.message || 'Unknown API error'

            // If 401, try to refresh token
            if (err.message?.includes('401') || err.message?.includes('token')) {
              fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'admin@demo.com', password: 'demo123' }),
                signal: AbortSignal.timeout(10000),
              })
                .then((r) => r.json())
                .then((data) => {
                  if (data.token && !cancelled) {
                    setToken(data.token)
                    tokenRef.current = data.token
                    setLiveApiError('Token refreshed — continuing')
                    setTimeout(() => setLiveApiError(null), 3000)
                  } else if (!cancelled) {
                    setLiveApiError('Token refresh failed — using simulation')
                    setMode('simulation')
                  }
                })
                .catch(() => {
                  if (!cancelled) {
                    setLiveApiError('API unreachable — using simulation')
                    setMode('simulation')
                  }
                })
            } else {
              // Fallback to simulation evaluation
              setLiveApiError(`API error: ${errorMsg} — using simulation`)
              const simResult = evaluateAction(action, policiesRef.current)
              const latency = Math.round(performance.now() - startTime)
              const newLog: LogEntry = {
                id: `${action.id}-${Date.now()}`,
                action,
                decision: simResult.decision,
                reason: `[SIM] ${simResult.reason}`,
                policyName: simResult.policyName,
                timestamp: Date.now(),
                latency,
              }
              setLogs((prev) => [...prev, newLog])
              setEnforcementLatency(latency)
              setDecisionHistory((prev) => [...prev, simResult.decision].slice(-30))
              setTriggeredPolicyId(simResult.policyName || null)
              setPhase('complete')
              setPendingAction(null)

              const nextDelay = 400 / speedRef.current
              const advanceTimer = setTimeout(() => {
                setActionIndex((prev) => prev + 1)
                setPhase('idle')
              }, nextDelay)
              simTimersRef.current.push(advanceTimer)
            }
          })

      }, evalDelay / speedRef.current)
      simTimersRef.current.push(evalTimer)

      return () => {
        cancelled = true
        cancelledRef.current = true
        clearAllTimers()
      }
    }

    // ── SIMULATION MODE (existing) ──
    setPendingAction(action)
    setPhase('typing')
    setTypedText('')
    setTriggeredPolicyId(null)

    let charIdx = 0
    if (shouldAnimateTyping) {
      typeIntervalRef.current = setInterval(() => {
        charIdx++
        setTypedText(action.raw.slice(0, charIdx))
        if (charIdx >= action.raw.length) {
          if (typeIntervalRef.current) clearInterval(typeIntervalRef.current)
          typeIntervalRef.current = null
          setPhase('evaluating')
        }
      }, 18)
    } else {
      setTypedText(action.raw)
      const t = setTimeout(() => setPhase('evaluating'), 80 / speedRef.current)
      simTimersRef.current.push(t)
    }

    const baseMin = shouldAnimateTyping ? 800 : 1000
    const baseMax = shouldAnimateTyping ? 1200 : 1500
    const evalDelay = (baseMin + Math.random() * (baseMax - baseMin)) / speedRef.current

    const evalTimer = setTimeout(() => {
      const result = evaluateAction(action, policiesRef.current)
      const latency = 23 + Math.floor(Math.random() * 23)
      const newLog: LogEntry = {
        id: `${action.id}-${Date.now()}`,
        action,
        decision: result.decision,
        reason: result.reason,
        policyName: result.policyName,
        timestamp: Date.now(),
      }
      setLogs((prev) => [...prev, newLog])
      setDecisionHistory((prev) => [...prev, result.decision].slice(-30))
      setTriggeredPolicyId(result.policyName || null)
      setEnforcementLatency(latency)
      setPhase('complete')
      setPendingAction(null)

      const nextDelay = (shouldAnimateTyping ? 500 : 300) / speedRef.current
      const advanceTimer = setTimeout(() => {
        setActionIndex((prev) => prev + 1)
        setPhase('idle')
      }, nextDelay)
      simTimersRef.current.push(advanceTimer)
    }, evalDelay)
    simTimersRef.current.push(evalTimer)

    return () => clearAllTimers()
  }, [isPlaying, actionIndex, scenarioId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Callbacks ───

  const togglePolicy = useCallback(async (id: string) => {
    const policy = policies.find((p) => p.id === id)
    if (!policy) return

    const newActive = !policy.active

    if (modeRef.current === 'live' && tokenRef.current) {
      try {
        await fetch(`${API_BASE}/policies/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenRef.current}`,
          },
          body: JSON.stringify({ status: newActive ? 'active' : 'inactive' }),
          signal: AbortSignal.timeout(5000),
        })
      } catch {
        // Update local state even if API call fails
      }
    }
    setPolicies((prev) => prev.map((p) => (p.id === id ? { ...p, active: newActive } : p)))
  }, [policies, API_BASE])

  const resetPolicies = useCallback(() => {
    setPolicies(DEFAULT_POLICIES.map((p) => ({ ...p })))
  }, [])

  const toggleExpand = useCallback((id: string) => {
    setExpandedPolicies((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleResultExpand = useCallback((id: string) => {
    setExpandedResultIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const copyCurl = useCallback(async (action: SimAction) => {
    const currentToken = tokenRef.current || 'YOUR_JWT_TOKEN'
    const cmd = generateCurlCommand(API_BASE, currentToken, action.tool, action.params)
    try {
      await navigator.clipboard.writeText(cmd)
      setToastMessage('cURL command copied!')
    } catch {
      setToastMessage('Failed to copy cURL')
    }
    setShowToast(true)
  }, [API_BASE])

  const handleStart = () => {
    setStarted(true)
    setIsPlaying(true)
    setLogs([])
    setActionIndex(0)
    setSessionSeconds(600)
    setShowCta(false)
    setDismissedCta(false)
    setCtaCountdown(30)
    setDecisionHistory([])
    setTriggeredPolicyId(null)
    setPhase('idle')
    setPendingAction(null)
    setLiveApiError(null)
  }

  const handleReset = () => {
    setLogs([])
    setActionIndex(0)
    setSessionSeconds(600)
    setIsPlaying(true)
    setShowCta(false)
    setDismissedCta(false)
    setCtaCountdown(30)
    setDecisionHistory([])
    setTriggeredPolicyId(null)
    setPhase('idle')
    setPendingAction(null)
    setLiveApiError(null)
  }

  const handleScenarioChange = (id: string) => {
    setScenarioId(id)
    setLogs([])
    setActionIndex(0)
    setIsPlaying(true)
    setShowCta(false)
    setDismissedCta(false)
    setCtaCountdown(30)
    setDecisionHistory([])
    setTriggeredPolicyId(null)
    setPhase('idle')
    setPendingAction(null)
    setLiveApiError(null)
  }

  const handleModeToggle = (newMode: RunMode) => {
    if (newMode === mode) return
    setMode(newMode)
    if (newMode === 'live' && apiOnline === false) {
      // Will attempt to connect; if it fails, apiOnline stays false
    }
    // Reset simulation state when switching modes
    setIsPlaying(false)
    setLogs([])
    setActionIndex(0)
    setPhase('idle')
    setPendingAction(null)
    setLiveApiError(null)
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setToastMessage('Link copied to clipboard!')
    } catch {
      setToastMessage('Failed to copy link')
    }
    setShowToast(true)
  }

  const handleEmbed = () => {
    const snippet = `<iframe src="${window.location.origin}/demo" width="100%" height="600" frameborder="0" style="border-radius:8px;border:1px solid #30363d"></iframe>`
    navigator.clipboard.writeText(snippet).then(() => {
      setToastMessage('Embed snippet copied!')
      setShowToast(true)
    }).catch(() => {
      setToastMessage('Failed to copy embed')
      setShowToast(true)
    })
  }

  const ctaProgressPercent = ((30 - ctaCountdown) / 30) * 100

  return (
    <div className="min-h-screen bg-passport-bg text-passport-text">
      {/* Toast */}
      <div
        className={`fixed top-4 right-4 z-50 glass-panel px-4 py-2.5 flex items-center gap-2 font-mono text-xs text-passport-text shadow-lg transition-all duration-300 ${
          showToast ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
        }`}
        aria-live="polite"
      >
        <CheckCircle2 size={14} className="text-passport-green shrink-0" />
        {toastMessage}
      </div>

      {/* Demo Mode Banner */}
      {isLocalDemo && (
        <div className="bg-passport-amber/5 border-b border-passport-amber/20 py-1.5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center gap-2">
            <Server size={12} className="text-passport-amber shrink-0" />
            <p className="text-[11px] font-mono text-passport-amber/80 leading-relaxed">
              Running in demo mode — enforcement is using local policies. Deploy with Firebase for production use.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-passport-border bg-passport-bg/92 backdrop-blur-xl sticky top-0 z-40">
        <div
          className="absolute top-0 left-0 w-full h-[2px]"
          style={{
            background: 'linear-gradient(90deg, transparent, #2ea043, transparent)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 3s infinite linear',
          }}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group" prefetch>
            <Shield size={20} className="text-passport-green group-hover:drop-shadow-[0_0_8px_rgba(46,160,67,0.4)] transition-all" />
            <span className="font-mono text-sm font-bold text-passport-green tracking-wider uppercase">Passport Agent</span>
          </Link>
          <nav className="flex items-center gap-3">
            {/* API Status */}
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono">
              {apiChecking ? (
                <>
                  <Loader2 size={12} className="text-passport-muted animate-spin" />
                  <span className="text-passport-dim">Checking...</span>
                </>
              ) : apiOnline === true ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-passport-green" />
                  <span className="text-passport-green/70">API Connected</span>
                </>
              ) : apiOnline === false ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-passport-coral" />
                  <span className="text-passport-coral/70">API Offline — using simulation</span>
                </>
              ) : null}
            </div>
            {started && (
              <>
                <button
                  onClick={handleEmbed}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-passport-surface-2 transition-colors text-passport-muted hover:text-passport-text"
                  aria-label="Copy embed snippet"
                >
                  <Code2 size={14} />
                </button>
                <button
                  onClick={handleShare}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-passport-surface-2 transition-colors text-passport-muted hover:text-passport-text"
                  aria-label="Share demo"
                >
                  <Share2 size={14} />
                </button>
              </>
            )}
            <Link href="/register" className="btn-primary text-xs">
              <Terminal size={12} />
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="pt-16 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-passport-text tracking-tight leading-[1.15] mb-4">
            Try AI Agent Passport — <span className="text-passport-green">No Signup Required</span>
          </h1>
          <p className="text-base sm:text-lg text-passport-muted max-w-xl mx-auto mb-8">
            See how policies enforce agent behavior in real-time
          </p>

          {!started ? (
            <div className="flex flex-col items-center gap-4 animate-fade-in">
              <button
                onClick={handleStart}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-passport-coral hover:bg-[#e07055] text-white font-mono font-semibold text-sm rounded-md transition-all duration-200 shadow-[0_0_20px_rgba(247,129,102,0.2)] hover:shadow-[0_0_30px_rgba(247,129,102,0.35)] hover:-translate-y-0.5"
              >
                <Play size={18} fill="currentColor" />
                Start Demo
              </button>
              <div className="flex items-center gap-1.5 text-xs text-passport-muted font-mono">
                <Timer size={12} className="text-passport-amber" />
                <span>Takes 30 seconds</span>
                <span className="text-passport-dim mx-1">&middot;</span>
                <span>No credit card</span>
                <span className="text-passport-dim mx-1">&middot;</span>
                <span>No account</span>
              </div>
            </div>
          ) : (
            <div className="animate-fade-in">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border font-mono text-xs ${
                mode === 'live'
                  ? apiOnline ? 'border-passport-azure/30 bg-passport-azure/5 text-passport-azure' : 'border-passport-coral/30 bg-passport-coral/5 text-passport-coral'
                  : 'border-passport-green/20 bg-passport-green/5 text-passport-green'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full animate-live-pulse ${
                  mode === 'live' ? (apiOnline ? 'bg-passport-azure' : 'bg-passport-coral') : 'bg-passport-green'
                }`} />
                {mode === 'live' && tokenLoading && <Loader2 size={12} className="animate-spin" />}
                {mode === 'live'
                  ? (apiOnline ? 'Live API Running' : 'Live API — Offline Fallback')
                  : 'Live Simulation Running'}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── Main Interface ─── */}
      {started && (
        <section className="px-4 sm:px-6 lg:px-8 pb-12">
          <div className="max-w-7xl mx-auto">
            {/* Top Bar: Mode Toggle + Scenario Selector */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {/* Mode Toggle */}
              <div className="flex items-center rounded border border-passport-border overflow-hidden mr-3">
                <button
                  onClick={() => handleModeToggle('simulation')}
                  className={`px-3 py-1.5 text-xs font-mono font-medium transition-all duration-150 border-r border-passport-border ${
                    mode === 'simulation'
                      ? 'bg-passport-green/10 text-passport-green'
                      : 'text-passport-muted hover:text-passport-text bg-passport-surface/30'
                  }`}
                >
                  <WifiOff size={11} className="inline mr-1.5 -mt-0.5" />
                  Simulation
                </button>
                <button
                  onClick={() => handleModeToggle('live')}
                  className={`px-3 py-1.5 text-xs font-mono font-medium transition-all duration-150 ${
                    mode === 'live'
                      ? 'bg-passport-azure/10 text-passport-azure'
                      : 'text-passport-muted hover:text-passport-text bg-passport-surface/30'
                  }`}
                >
                  <Wifi size={11} className="inline mr-1.5 -mt-0.5" />
                  Live API
                </button>
              </div>

              <span className="text-[10px] font-mono uppercase tracking-widest text-passport-dim mr-2">Scenario</span>
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleScenarioChange(s.id)}
                  className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-all duration-150 ${
                    scenarioId === s.id
                      ? 'bg-passport-green/10 text-passport-green border border-passport-green/30'
                      : 'text-passport-muted hover:text-passport-text border border-passport-border hover:border-passport-border-2'
                  }`}
                >
                  {s.label}
                </button>
              ))}
              <div className="ml-auto text-xs text-passport-muted font-mono hidden sm:block">{scenario.persona}</div>
            </div>

            {/* Live API Error Banner */}
            {liveApiError && (
              <div className="mb-4 p-2.5 rounded border border-passport-coral/30 bg-passport-coral/5 flex items-center gap-2 animate-fade-in">
                <AlertTriangle size={13} className="text-passport-coral shrink-0" />
                <span className="text-[11px] font-mono text-passport-coral/80">{liveApiError}</span>
                <button
                  onClick={() => setLiveApiError(null)}
                  className="ml-auto text-passport-dim hover:text-passport-text"
                >
                  <X size={13} />
                </button>
              </div>
            )}

            {/* Three Column Layout */}
            <div className="flex flex-col lg:flex-row gap-4">
              {/* LEFT: Agent Console (40%) */}
              <div className="w-full lg:w-[40%] flex flex-col">
                <div className="glass-panel flex-1 flex flex-col min-h-[480px] overflow-hidden">
                  {/* Console Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-passport-border bg-passport-surface/50">
                    <div className="flex items-center gap-2">
                      <Terminal size={14} className="text-passport-green" />
                      <span className="font-mono text-xs font-semibold text-passport-text">Agent Simulation</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setShowHistory(!showHistory)}
                        className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${showHistory ? 'bg-passport-azure/10 text-passport-azure' : 'hover:bg-passport-surface-2 text-passport-muted'}`}
                        aria-label="Command history"
                      >
                        <History size={14} />
                      </button>
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-passport-surface-2 transition-colors"
                        aria-label={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? <Pause size={14} className="text-passport-amber" /> : <Play size={14} className="text-passport-green" />}
                      </button>
                      <button
                        onClick={handleReset}
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-passport-surface-2 transition-colors"
                        aria-label="Reset"
                      >
                        <RotateCcw size={14} className="text-passport-muted" />
                      </button>
                      {[1, 2, 4].map((s) => (
                        <button
                          key={s}
                          onClick={() => setSpeed(s as 1 | 2 | 4)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                            speed === s
                              ? 'bg-passport-azure/15 text-passport-azure shadow-[0_0_6px_rgba(88,166,255,0.15)]'
                              : 'text-passport-dim hover:text-passport-muted'
                          }`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* History Panel (slide-down) */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      showHistory ? 'max-h-64 border-b border-passport-border' : 'max-h-0'
                    }`}
                  >
                    <div className="px-4 py-3 bg-passport-surface/30">
                      <div className="flex items-center gap-2 mb-2">
                        <History size={12} className="text-passport-muted" />
                        <span className="text-[10px] font-mono uppercase tracking-wider text-passport-dim">Command History</span>
                        <span className="text-[10px] text-passport-dim ml-auto">{historyLogs.length} entries</span>
                      </div>
                      {historyLogs.length === 0 ? (
                        <p className="text-[10px] text-passport-dim italic">No commands yet</p>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {historyLogs.map((log) => (
                            <div
                              key={log.id}
                              className="flex items-center gap-2 text-[11px] font-mono text-passport-muted hover:text-passport-text transition-colors cursor-default"
                            >
                              <span className="text-passport-dim w-12 shrink-0 text-right">
                                {new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                              {log.decision === 'allowed' && <CheckCircle2 size={10} className="text-passport-green shrink-0" />}
                              {log.decision === 'denied' && <XCircle size={10} className="text-passport-coral shrink-0" />}
                              {log.decision === 'modified' && <Info size={10} className="text-passport-azure shrink-0" />}
                              <span className="text-passport-text truncate">{log.action.tool}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Console Output */}
                  <div className="flex-1 overflow-y-auto p-4 font-mono text-[13px] leading-relaxed bg-[#0a0c10] relative">
                    {/* Scanline overlay */}
                    <div
                      className="absolute inset-0 pointer-events-none opacity-[0.03]"
                      style={{
                        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(46,160,67,0.3) 2px, rgba(46,160,67,0.3) 4px)',
                      }}
                    />

                    {logs.length === 0 && phase === 'idle' && (
                      <div className="text-passport-dim italic relative z-10">
                        <span className="text-passport-green animate-cursor-blink">█</span> Awaiting agent actions...
                      </div>
                    )}

                    {logs.map((log, logIdx) => {
                      if (log.action.tool === 'system') {
                        return (
                          <div key={log.id} className="text-passport-dim border-y border-passport-border/30 py-2 my-2 text-center text-[11px] uppercase tracking-wider relative z-10">
                            {log.action.raw}
                          </div>
                        )
                      }
                      return (
                        <div key={log.id} className="animate-slide-up relative z-10 mb-3">
                          <div className="flex">
                            <span className="text-passport-dim mr-3 select-none w-6 text-right shrink-0 text-[11px]">{logIdx + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-passport-muted mb-1">
                                <span className="text-passport-azure">{'>'}</span> {log.action.raw}
                              </div>
                              <div className="flex items-start gap-2 flex-wrap">
                                <DecisionBadge decision={log.decision} />
                                <span className="text-passport-muted text-[12px]">— {log.reason}</span>
                                {log.latency !== undefined && (
                                  <span className="text-passport-azure text-[10px] font-mono ml-1">
                                    {log.latency}ms
                                  </span>
                                )}
                              </div>
                              {log.policyName && triggeredPolicyId === log.policyName && (
                                <div className="text-[10px] text-passport-amber mt-1 font-mono">Policy triggered: {log.policyName}</div>
                              )}
                              {log.ticket && (
                                <div className="text-[10px] text-passport-azure mt-1 font-mono">
                                  <span className="text-passport-dim">ticket:</span> {log.ticket}
                                </div>
                              )}
                              {/* Expand: Full Response (Live API only) */}
                              {log.fullResponse && (
                                <div className="mt-1.5">
                                  <button
                                    onClick={() => toggleResultExpand(log.id)}
                                    className="text-[10px] font-mono text-passport-dim hover:text-passport-muted transition-colors flex items-center gap-1"
                                  >
                                    {expandedResultIds.has(log.id) ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                                    Full Response
                                  </button>
                                  {expandedResultIds.has(log.id) && (
                                    <pre className="mt-1 p-2 rounded bg-passport-surface-2 border border-passport-border text-[10px] text-passport-muted overflow-x-auto max-h-32 animate-fade-in">
                                      {JSON.stringify(log.fullResponse, null, 2)}
                                    </pre>
                                  )}
                                </div>
                              )}
                              {/* Copy cURL (Live API only) */}
                              {log.fullResponse && (
                                <button
                                  onClick={() => copyCurl(log.action)}
                                  className="mt-1 text-[10px] font-mono text-passport-dim hover:text-passport-azure transition-colors flex items-center gap-1"
                                >
                                  <Copy size={10} />
                                  Copy cURL
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    {/* Pending action - typing animation */}
                    {pendingAction && (phase === 'typing' || phase === 'evaluating') && (
                      <div className="relative z-10">
                        <div className="flex">
                          <span className="text-passport-dim mr-3 select-none w-6 text-right shrink-0 text-[11px]">{logs.length + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-passport-muted mb-1">
                              <span className="text-passport-azure">{'>'}</span>{' '}
                              {typedText}
                              {phase === 'typing' && (
                                <span className="inline-block w-2 h-[1.1em] bg-passport-green align-middle animate-cursor-blink ml-0.5" />
                              )}
                            </div>
                            {phase === 'evaluating' && (
                              <div className="flex items-center gap-2 text-passport-amber">
                                <span className="w-2 h-2 bg-passport-amber rounded-full animate-pulse" />
                                <span className="text-[11px] font-mono">
                                  Evaluating{'.'.repeat(processingDots)}&nbsp;
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={consoleEndRef} />
                  </div>

                  {/* Console Footer */}
                  <div className="px-4 py-2 border-t border-passport-border bg-passport-surface/30 flex items-center justify-between text-[10px] font-mono text-passport-dim">
                    <span>Action {Math.min(actionIndex + 1, scenario.actions.length)} / {scenario.actions.length}</span>
                    <div className="flex items-center gap-4">
                      {enforcementLatency > 0 && (
                        <span className="text-passport-azure">
                          latency: {enforcementLatency}ms
                        </span>
                      )}
                      <span className={mode === 'live' ? 'text-passport-azure' : 'text-passport-green'}>
                        {mode === 'live' ? 'agent_demo.api' : `${scenario.id}.agent.sim`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CENTER: Policy Board (35%) */}
              <div className="w-full lg:w-[35%]">
                <div className="glass-panel p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Shield size={14} className="text-passport-azure" />
                      <span className="font-mono text-xs font-semibold text-passport-text">Policy Board</span>
                      {policiesLoading && <Loader2 size={12} className="text-passport-muted animate-spin" />}
                    </div>
                    <button onClick={resetPolicies} className="text-[10px] font-mono text-passport-muted hover:text-passport-text transition-colors flex items-center gap-1">
                      <RotateCcw size={10} />
                      Reset
                    </button>
                  </div>

                  {policiesLoading && policies.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 size={20} className="text-passport-muted animate-spin" />
                      <span className="text-[11px] font-mono text-passport-dim ml-2">Fetching policies...</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {policies.map((policy) => {
                        const isTriggered = triggeredPolicyId === policy.id
                        return (
                          <div
                            key={policy.id}
                            className={`rounded border transition-all duration-300 ${
                              isTriggered
                                ? 'border-passport-amber/40 bg-passport-amber/[0.04] shadow-[0_0_12px_rgba(210,153,29,0.12)]'
                                : policy.active
                                ? 'border-passport-green/20 bg-passport-green/[0.03]'
                                : 'border-passport-border bg-passport-surface/30 opacity-70'
                            }`}
                          >
                            <div className="flex items-start justify-between p-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                                      isTriggered ? 'bg-passport-amber animate-pulse' : policy.active ? 'bg-passport-green' : 'bg-passport-dim'
                                    }`}
                                  />
                                  <span className="font-mono text-xs font-semibold text-passport-text">{policy.name}</span>
                                  {isTriggered && (
                                    <span className="text-[9px] font-mono text-passport-amber animate-fade-in">TRIGGERED</span>
                                  )}
                                </div>
                                <p className="text-[11px] text-passport-muted mt-1 leading-relaxed">{policy.description}</p>
                              </div>
                              <div className="flex items-center gap-2 ml-3">
                                <button
                                  onClick={() => toggleExpand(policy.id)}
                                  className="text-passport-dim hover:text-passport-text transition-colors"
                                  aria-label={expandedPolicies.has(policy.id) ? 'Collapse' : 'Expand'}
                                >
                                  {expandedPolicies.has(policy.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                                <button
                                  onClick={() => togglePolicy(policy.id)}
                                  className={`relative w-9 h-5 rounded-full transition-all duration-300 ${
                                    policy.active ? 'bg-passport-green shadow-[0_0_6px_rgba(46,160,67,0.3)]' : 'bg-passport-surface-2'
                                  }`}
                                  aria-label={policy.active ? 'Disable policy' : 'Enable policy'}
                                >
                                  <span
                                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ease-out ${
                                      policy.active ? 'left-[calc(100%-18px)] scale-100' : 'left-0.5 scale-90'
                                    }`}
                                  />
                                </button>
                              </div>
                            </div>

                            {expandedPolicies.has(policy.id) && (
                              <div className="px-3 pb-3 border-t border-passport-border/50 pt-2 animate-fade-in">
                                {policy.rules.allowedTools && policy.rules.allowedTools.length > 0 && (
                                  <div className="mb-2">
                                    <span className="text-[10px] font-mono uppercase tracking-wider text-passport-green block mb-1">Allowed Tools</span>
                                    <div className="flex flex-wrap gap-1">
                                      {policy.rules.allowedTools.map((t) => (
                                        <span key={t} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-passport-green/10 text-passport-green border border-passport-green/20">
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {policy.rules.blockedTools && policy.rules.blockedTools.length > 0 && (
                                  <div className="mb-2">
                                    <span className="text-[10px] font-mono uppercase tracking-wider text-passport-coral block mb-1">Blocked Tools</span>
                                    <div className="flex flex-wrap gap-1">
                                      {policy.rules.blockedTools.map((t) => (
                                        <span key={t} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-passport-coral/10 text-passport-coral border border-passport-coral/20">
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {policy.rules.blockedPatterns && policy.rules.blockedPatterns.length > 0 && (
                                  <div>
                                    <span className="text-[10px] font-mono uppercase tracking-wider text-passport-coral block mb-1">Blocked Patterns</span>
                                    <div className="flex flex-wrap gap-1">
                                      {policy.rules.blockedPatterns.map((p) => (
                                        <span key={p.label} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-passport-coral/10 text-passport-coral border border-passport-coral/20">
                                          {p.label}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <div className="mt-4 p-3 rounded border border-passport-border/50 bg-passport-surface/20">
                    <div className="flex items-start gap-2">
                      <Info size={12} className="text-passport-azure shrink-0 mt-0.5" />
                      <p className="text-[11px] text-passport-muted leading-relaxed">
                        Toggle policies to see how agent actions are affected in real-time. Disabling <span className="text-passport-coral">No PII Access</span> will allow sensitive data through.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT: Live Stats (25%) */}
              <div className="w-full lg:w-[25%] flex flex-col gap-3">
                <div className="glass-panel p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity size={14} className="text-passport-amber" />
                    <span className="font-mono text-xs font-semibold text-passport-text">Live Stats</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <StatCard label="Total" value={totalActions} color="bg-passport-azure/10 text-passport-azure" icon={FileText} />
                    <StatCard label="Allowed" value={allowedCount} color="bg-passport-green/10 text-passport-green" icon={CheckCircle2} />
                    <StatCard label="Denied" value={deniedCount} color="bg-passport-coral/10 text-passport-coral" icon={XCircle} />
                    <StatCard label="Modified" value={modifiedCount} color="bg-passport-azure/10 text-passport-azure" icon={Zap} />
                  </div>

                  {/* Sparkline */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-passport-muted">Activity</span>
                      <div className="flex items-center gap-2 text-[9px] font-mono">
                        <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-sm bg-passport-green inline-block" /> Allow</span>
                        <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-sm bg-passport-coral inline-block" /> Deny</span>
                        <span className="flex items-center gap-0.5"><span className="w-2 h-2 rounded-sm bg-passport-azure inline-block" /> Mod</span>
                      </div>
                    </div>
                    <MiniSparkline data={decisionHistory} />
                  </div>

                  <div className="border-t border-passport-border pt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-passport-muted">Enforcement</span>
                      <span className="font-mono text-sm font-bold text-passport-azure">
                        {enforcementLatency > 0 ? `${enforcementLatency}ms` : '--'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-passport-muted">Session</span>
                      <CircularTimer seconds={sessionSeconds} total={600} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-passport-muted">Policies Active</span>
                      <span className="font-mono text-sm font-bold text-passport-green">{activePolicyCount} / {DEFAULT_POLICIES.length}</span>
                    </div>
                    {/* CTA Progress Bar */}
                    {!showCta && !dismissedCta && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-passport-muted">More in</span>
                          <span className="text-[10px] font-mono text-passport-dim">{ctaCountdown}s</span>
                        </div>
                        <div className="w-full h-1 bg-passport-surface-2 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-passport-coral/50 rounded-full transition-all duration-1000 ease-linear"
                            style={{ width: `${ctaProgressPercent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mini Log */}
                <div className="glass-panel p-4 flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Eye size={14} className="text-passport-muted" />
                    <span className="font-mono text-xs font-semibold text-passport-text">Recent Decisions</span>
                  </div>
                  {lastFiveLogs.length === 0 ? (
                    <p className="text-[11px] text-passport-dim italic">No decisions yet</p>
                  ) : (
                    <div className="space-y-2">
                      {lastFiveLogs.map((log) => (
                        <div key={log.id} className="flex items-start gap-2 text-[11px]">
                          {log.decision === 'allowed' && <CheckCircle2 size={12} className="text-passport-green shrink-0 mt-0.5" />}
                          {log.decision === 'denied' && <XCircle size={12} className="text-passport-coral shrink-0 mt-0.5" />}
                          {log.decision === 'modified' && <Zap size={12} className="text-passport-azure shrink-0 mt-0.5" />}
                          <div className="min-w-0">
                            <div className="text-passport-text truncate">{log.action.tool}</div>
                            <div className="text-passport-dim truncate">{log.reason}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── How It Works ─── */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 border-t border-passport-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-passport-text mb-3">How It Works</h2>
            <p className="text-passport-muted max-w-lg mx-auto text-sm">Every tool call is intercepted, evaluated, and logged before execution.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 relative">
            {/* Connector lines with pulsing dots */}
            <div className="hidden md:block absolute top-10 left-[16.67%] right-[16.67%] h-px bg-passport-border" />
            <div className="hidden md:block absolute top-9 left-[33.33%] -translate-x-1/2">
              <span className="block w-2 h-2 rounded-full bg-passport-green animate-connect-line" />
            </div>
            <div className="hidden md:block absolute top-9 left-[66.67%] -translate-x-1/2">
              <span className="block w-2 h-2 rounded-full bg-passport-amber animate-connect-line" />
            </div>

            {[
              {
                icon: <Terminal size={22} className="text-passport-green" />,
                title: 'Agent Generates Tool Call',
                desc: 'The AI agent decides to use a tool — search, query, email, or delete.',
              },
              {
                icon: <Shield size={22} className="text-passport-azure" />,
                title: 'Passport Intercepts & Evaluates',
                desc: 'Every call is checked against active policies in under 50ms.',
              },
              {
                icon: <MousePointerClick size={22} className="text-passport-amber" />,
                title: 'Decision with Audit Log',
                desc: 'Allow, Deny, or Modify — with a cryptographically signed record.',
              },
            ].map((step, idx) => (
              <div
                key={idx}
                data-step={idx}
                className={`glass-panel p-6 text-center relative z-10 transition-all duration-500 ${
                  visibleSteps.has(idx) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                }`}
              >
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-passport-surface border border-passport-border mb-4">
                  {step.icon}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-passport-dim mb-2">Step {idx + 1}</div>
                <h3 className="text-sm font-semibold text-passport-text mb-2">{step.title}</h3>
                <p className="text-xs text-passport-muted leading-relaxed">{step.desc}</p>
                {idx === 2 && (
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-1.5 mt-3 text-[11px] font-mono text-passport-green hover:text-passport-text transition-colors"
                  >
                    Start free trial <ChevronRight size={12} />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Footer ─── */}
      {((showCta && !dismissedCta) || !started) && (
        <section
          className={`px-4 sm:px-6 lg:px-8 py-16 border-t border-passport-border transition-all duration-500 ${
            started && showCta ? 'translate-y-0 opacity-100' : ''
          }`}
        >
          <div className="max-w-2xl mx-auto text-center">
            <div className="glass-panel p-8 sm:p-10 relative">
              {started && (
                <button
                  onClick={() => setDismissedCta(true)}
                  className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded hover:bg-passport-surface-2 transition-colors text-passport-dim hover:text-passport-text"
                  aria-label="Dismiss"
                >
                  <X size={14} />
                </button>
              )}
              <CreditCard size={28} className="text-passport-green mx-auto mb-5" />
              <h2 className="text-xl sm:text-2xl font-bold text-passport-text mb-3">
                {started ? 'Ready to build your own?' : 'Ready to secure your agents?'}
              </h2>
              <p className="text-sm text-passport-muted mb-8 max-w-md mx-auto">
                Create policies, register agents, and enforce permissions automatically across your entire fleet.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/register" className="btn-primary text-sm px-5 py-2.5 w-full sm:w-auto justify-center">
                  <Terminal size={14} />
                  Create Free Account
                  <ChevronRight size={14} />
                </Link>
                <Link href="/" className="btn-secondary text-sm px-5 py-2.5 w-full sm:w-auto justify-center">
                  View Documentation
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-6 px-4 text-center border-t border-passport-border">
        <p className="font-mono text-[10px] text-passport-dim tracking-wider">
          Passport Agent v2.1 &middot; Interactive Demo &middot;
          {mode === 'live' ? ' Real API enforcement via ' + API_BASE : ' No data is sent to any server'}
        </p>
      </footer>
    </div>
  )
}
