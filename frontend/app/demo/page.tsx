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
} from 'lucide-react'

/* ────────────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────────────── */

type Decision = 'allowed' | 'denied' | 'modified'

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
}

interface Scenario {
  id: string
  label: string
  persona: string
  actions: SimAction[]
}

/* ────────────────────────────────────────────────────────────────
   Demo Data
   ──────────────────────────────────────────────────────────────── */

const SCENARIOS: Scenario[] = [
  {
    id: 'support',
    label: 'Customer Support Agent',
    persona: 'Handles tickets, searches docs, queries user data',
    actions: [
      { id: 's1', tool: 'web_search', params: { query: 'customer support best practices' }, raw: 'agent.web_search({ query: "customer support best practices" })' },
      { id: 's2', tool: 'query_database', params: { table: 'users', limit: 100 }, raw: 'agent.query_database({ table: "users", limit: 100 })' },
      { id: 's3', tool: 'send_email', params: { to: 'user@example.com', body: 'SSN: 123-45-6789' }, raw: 'agent.send_email({ to: "user@example.com", body: "SSN: 123-45-6789" })' },
      { id: 's4', tool: 'delete_database', params: { name: 'production' }, raw: 'agent.delete_database({ name: "production" })' },
      { id: 's5', tool: 'web_search', params: { query: 'latest news' }, raw: 'agent.web_search({ query: "latest news" })' },
      { id: 's6', tool: 'read_database', params: { table: 'tickets' }, raw: 'agent.read_database({ table: "tickets" })' },
      { id: 's7', tool: 'send_email', params: { to: 'admin@example.com', body: 'Password reset requested' }, raw: 'agent.send_email({ to: "admin@example.com", body: "Password reset requested" })' },
      { id: 's8', tool: 'query_database', params: { table: 'logs', limit: 500 }, raw: 'agent.query_database({ table: "logs", limit: 500 })' },
    ],
  },
  {
    id: 'analyst',
    label: 'Data Analyst',
    persona: 'Analyzes datasets, generates reports, exports data',
    actions: [
      { id: 'a1', tool: 'read_database', params: { table: 'sales' }, raw: 'agent.read_database({ table: "sales" })' },
      { id: 'a2', tool: 'query_database', params: { table: 'customers', columns: 'name,ssn,address' }, raw: 'agent.query_database({ table: "customers", columns: "name,ssn,address" })' },
      { id: 'a3', tool: 'export_data', params: { format: 'csv', table: 'sales' }, raw: 'agent.export_data({ format: "csv", table: "sales" })' },
      { id: 'a4', tool: 'drop_table', params: { table: 'temp_cache' }, raw: 'agent.drop_table({ table: "temp_cache" })' },
      { id: 'a5', tool: 'web_search', params: { query: 'market trends 2024' }, raw: 'agent.web_search({ query: "market trends 2024" })' },
      { id: 'a6', tool: 'generate_report', params: { type: 'quarterly' }, raw: 'agent.generate_report({ type: "quarterly" })' },
      { id: 'a7', tool: 'send_email', params: { to: 'exec@example.com', body: 'Report attached. Card: 4111-1111-1111-1111' }, raw: 'agent.send_email({ to: "exec@example.com", body: "Report attached. Card: 4111-1111-1111-1111" })' },
      { id: 'a8', tool: 'read_database', params: { table: 'forecasts' }, raw: 'agent.read_database({ table: "forecasts" })' },
    ],
  },
  {
    id: 'social',
    label: 'Social Media Manager',
    persona: 'Posts content, monitors trends, engages audience',
    actions: [
      { id: 'm1', tool: 'web_search', params: { query: 'trending hashtags' }, raw: 'agent.web_search({ query: "trending hashtags" })' },
      { id: 'm2', tool: 'post_twitter', params: { text: 'Exciting product update!' }, raw: 'agent.post_twitter({ text: "Exciting product update!" })' },
      { id: 'm3', tool: 'send_email', params: { to: 'partner@example.com', body: 'Passport: AB1234567' }, raw: 'agent.send_email({ to: "partner@example.com", body: "Passport: AB1234567" })' },
      { id: 'm4', tool: 'delete_database', params: { name: 'campaigns' }, raw: 'agent.delete_database({ name: "campaigns" })' },
      { id: 'm5', tool: 'read_database', params: { table: 'analytics' }, raw: 'agent.read_database({ table: "analytics" })' },
      { id: 'm6', tool: 'post_twitter', params: { text: 'Check out our blog!' }, raw: 'agent.post_twitter({ text: "Check out our blog!" })' },
      { id: 'm7', tool: 'web_search', params: { query: 'competitor news' }, raw: 'agent.web_search({ query: "competitor news" })' },
      { id: 'm8', tool: 'query_database', params: { table: 'engagement', limit: 50 }, raw: 'agent.query_database({ table: "engagement", limit: 50 })' },
    ],
  },
]

const DEFAULT_POLICIES: Policy[] = [
  {
    id: 'safe-web-search',
    name: 'Safe Web Search',
    description: 'Allows: web_search, read_database, query_database, generate_report, export_data, post_twitter',
    active: true,
    rules: {
      allowedTools: ['web_search', 'read_database', 'query_database', 'generate_report', 'export_data', 'post_twitter'],
    },
  },
  {
    id: 'no-pii',
    name: 'No PII Access',
    description: 'Blocks: SSN, credit card, passport numbers',
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
  // 1. Check blocked tools (destructive first)
  const destructivePolicy = policies.find((p) => p.active && p.rules.blockedTools?.includes(action.tool))
  if (destructivePolicy) {
    return {
      decision: 'denied',
      reason: `tool "${action.tool}" is explicitly blocked`,
      policyName: destructivePolicy.name,
    }
  }

  // 2. Check PII patterns
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

  // 3. Check allowed tools
  const safePolicy = policies.find((p) => p.active && p.rules.allowedTools?.includes(action.tool))
  if (safePolicy) {
    return {
      decision: 'allowed',
      reason: `policy "${safePolicy.name}" permits ${action.tool}`,
      policyName: safePolicy.name,
    }
  }

  // 4. Default allow if no matching policy
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
  const consoleEndRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const simTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const scenario = SCENARIOS.find((s) => s.id === scenarioId) || SCENARIOS[0]
  const totalActions = logs.length
  const allowedCount = logs.filter((l) => l.decision === 'allowed').length
  const deniedCount = logs.filter((l) => l.decision === 'denied').length
  const modifiedCount = logs.filter((l) => l.decision === 'modified').length
  const activePolicyCount = policies.filter((p) => p.active).length
  const lastFiveLogs = logs.slice(-5)

  // Auto-scroll console
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

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

  // Show CTA after 30 seconds
  useEffect(() => {
    if (!started) return
    const ctaTimer = setTimeout(() => setShowCta(true), 30000)
    return () => clearTimeout(ctaTimer)
  }, [started])

  // Simulation runner
  useEffect(() => {
    if (!isPlaying) {
      if (simTimerRef.current) clearInterval(simTimerRef.current)
      return
    }
    const baseDelay = 2000
    const delay = baseDelay / speed
    simTimerRef.current = setInterval(() => {
      setActionIndex((prev) => {
        const currentScenario = SCENARIOS.find((s) => s.id === scenarioId) || SCENARIOS[0]
        if (prev >= currentScenario.actions.length) {
          // Loop back to start
          setLogs((prevLogs) => [
            ...prevLogs,
            {
              id: `loop-${Date.now()}`,
              action: { id: 'loop', tool: 'system', params: {}, raw: '--- Restarting simulation sequence ---' },
              decision: 'allowed',
              reason: 'loop marker',
              timestamp: Date.now(),
            },
          ])
          return 0
        }
        const action = currentScenario.actions[prev]
        const result = evaluateAction(action, policies)
        setLogs((prevLogs) => [
          ...prevLogs,
          {
            id: `${action.id}-${Date.now()}`,
            action,
            decision: result.decision,
            reason: result.reason,
            policyName: result.policyName,
            timestamp: Date.now(),
          },
        ])
        return prev + 1
      })
    }, delay)
    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current)
    }
  }, [isPlaying, speed, scenarioId, policies])

  const togglePolicy = useCallback((id: string) => {
    setPolicies((prev) => prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p)))
  }, [])

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

  const handleStart = () => {
    setStarted(true)
    setIsPlaying(true)
    setLogs([])
    setActionIndex(0)
    setSessionSeconds(600)
    setShowCta(false)
  }

  const handleReset = () => {
    setLogs([])
    setActionIndex(0)
    setSessionSeconds(600)
    setIsPlaying(true)
    setShowCta(false)
  }

  const handleScenarioChange = (id: string) => {
    setScenarioId(id)
    setLogs([])
    setActionIndex(0)
    setIsPlaying(true)
    setShowCta(false)
  }

  return (
    <div className="min-h-screen bg-passport-bg text-passport-text">
      {/* Simple Header */}
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
                <span className="text-passport-dim mx-1">•</span>
                <span>No credit card</span>
                <span className="text-passport-dim mx-1">•</span>
                <span>No account</span>
              </div>
            </div>
          ) : (
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-passport-green/20 bg-passport-green/5 text-passport-green text-xs font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-passport-green animate-live-pulse" />
                Live Simulation Running
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── Main Interface ─── */}
      {started && (
        <section className="px-4 sm:px-6 lg:px-8 pb-12">
          <div className="max-w-7xl mx-auto">
            {/* Scenario Selector */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
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
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                            speed === s ? 'bg-passport-azure/15 text-passport-azure' : 'text-passport-dim hover:text-passport-muted'
                          }`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Console Output */}
                  <div className="flex-1 overflow-y-auto p-4 font-mono text-[13px] leading-relaxed space-y-3 bg-[#0a0c10]">
                    {logs.length === 0 && (
                      <div className="text-passport-dim italic">Waiting for agent actions...</div>
                    )}
                    {logs.map((log) => {
                      if (log.action.tool === 'system') {
                        return (
                          <div key={log.id} className="text-passport-dim border-y border-passport-border/30 py-2 my-2 text-center text-[11px] uppercase tracking-wider">
                            {log.action.raw}
                          </div>
                        )
                      }
                      return (
                        <div key={log.id} className="animate-slide-up">
                          <div className="text-passport-muted mb-1">
                            <span className="text-passport-azure">{'>'}</span> {log.action.raw}
                          </div>
                          <div className="flex items-start gap-2">
                            <DecisionBadge decision={log.decision} />
                            <span className="text-passport-muted text-[12px]">— {log.reason}</span>
                          </div>
                        </div>
                      )
                    })}
                    {isPlaying && (
                      <div className="flex items-center gap-2 text-passport-dim animate-pulse">
                        <span className="w-2 h-2 bg-passport-green rounded-full" />
                        <span className="text-[11px]">Evaluating next action...</span>
                      </div>
                    )}
                    <div ref={consoleEndRef} />
                  </div>

                  {/* Console Footer */}
                  <div className="px-4 py-2 border-t border-passport-border bg-passport-surface/30 flex items-center justify-between text-[10px] font-mono text-passport-dim">
                    <span>Action {Math.min(actionIndex + 1, scenario.actions.length)} / {scenario.actions.length}</span>
                    <span className="text-passport-green">{scenario.id}.agent.sim</span>
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
                    </div>
                    <button onClick={resetPolicies} className="text-[10px] font-mono text-passport-muted hover:text-passport-text transition-colors flex items-center gap-1">
                      <RotateCcw size={10} />
                      Reset
                    </button>
                  </div>

                  <div className="space-y-3">
                    {policies.map((policy) => (
                      <div key={policy.id} className={`rounded border transition-all duration-200 ${policy.active ? 'border-passport-green/20 bg-passport-green/[0.03]' : 'border-passport-border bg-passport-surface/30'}`}>
                        <div className="flex items-start justify-between p-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${policy.active ? 'bg-passport-green' : 'bg-passport-dim'}`} />
                              <span className="font-mono text-xs font-semibold text-passport-text">{policy.name}</span>
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
                              className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${policy.active ? 'bg-passport-green' : 'bg-passport-surface-2'}`}
                              aria-label={policy.active ? 'Disable policy' : 'Enable policy'}
                            >
                              <span
                                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${policy.active ? 'translate-x-4' : 'translate-x-0'}`}
                              />
                            </button>
                          </div>
                        </div>

                        {expandedPolicies.has(policy.id) && (
                          <div className="px-3 pb-3 border-t border-passport-border/50 pt-2 animate-fade-in">
                            {policy.rules.allowedTools && (
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
                            {policy.rules.blockedTools && (
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
                            {policy.rules.blockedPatterns && (
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
                    ))}
                  </div>

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

                  <div className="border-t border-passport-border pt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-passport-muted">Session Timer</span>
                      <span className={`font-mono text-sm font-bold ${sessionSeconds < 60 ? 'text-passport-coral' : 'text-passport-text'}`}>
                        <Clock size={12} className="inline mr-1 -mt-0.5" />
                        {formatTime(sessionSeconds)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-passport-muted">Active Policies</span>
                      <span className="font-mono text-sm font-bold text-passport-green">{activePolicyCount}</span>
                    </div>
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
            {/* Connector lines */}
            <div className="hidden md:block absolute top-10 left-[16.67%] right-[16.67%] h-px bg-passport-border" />
            <div className="hidden md:block absolute top-8 left-[33.33%] w-0 h-0 border-l-[5px] border-l-passport-border border-y-[4px] border-y-transparent" />
            <div className="hidden md:block absolute top-8 left-[66.67%] w-0 h-0 border-l-[5px] border-l-passport-border border-y-[4px] border-y-transparent" />

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
              <div key={idx} className="glass-panel p-6 text-center relative z-10">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-passport-surface border border-passport-border mb-4">
                  {step.icon}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-passport-dim mb-2">Step {idx + 1}</div>
                <h3 className="text-sm font-semibold text-passport-text mb-2">{step.title}</h3>
                <p className="text-xs text-passport-muted leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Footer ─── */}
      {(showCta || !started) && (
        <section className="px-4 sm:px-6 lg:px-8 py-16 border-t border-passport-border">
          <div className="max-w-2xl mx-auto text-center">
            <div className="glass-panel p-8 sm:p-10">
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
              {started && (
                <button
                  onClick={() => setShowCta(false)}
                  className="mt-4 text-[11px] font-mono text-passport-dim hover:text-passport-muted transition-colors"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-6 px-4 text-center border-t border-passport-border">
        <p className="font-mono text-[10px] text-passport-dim tracking-wider">
          Passport Agent v2.1 &middot; Interactive Demo &middot; No data is sent to any server
        </p>
      </footer>
    </div>
  )
}
