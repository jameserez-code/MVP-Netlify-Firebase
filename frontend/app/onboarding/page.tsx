'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Shield,
  ChevronRight,
  ChevronLeft,
  Check,
  Copy,
  CheckCircle2,
  Terminal,
  ShieldCheck,
  Zap,
  X,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Loader2,
  Twitter,
  RefreshCw,
} from 'lucide-react'
import { createPolicy, registerAgent, enforceIntent, completeOnboarding } from '@/lib/api'

/* ─── Types ─── */

type Step = 1 | 2 | 3 | 4 | 5

interface OnboardingState {
  step: Step
  policyCreated: boolean
  agentCreated: boolean
  agentId: string
  agentSecret: string
  demoCompleted: boolean
  onboardingCompleted: boolean
  policyId: string
}

const STORAGE_KEY = 'passport_onboarding'

/* ─── Helpers ─── */

function loadState(): OnboardingState {
  if (typeof window === 'undefined') {
    return {
      step: 1,
      policyCreated: false,
      agentCreated: false,
      agentId: '',
      agentSecret: '',
      demoCompleted: false,
      onboardingCompleted: false,
      policyId: '',
    }
  }
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      // Skip logic: if policy already created, resume at step 3
      if (parsed.policyCreated && !parsed.agentCreated && parsed.step < 3) {
        parsed.step = 3
      }
      return parsed
    } catch {}
  }
  return {
    step: 1,
    policyCreated: false,
    agentCreated: false,
    agentId: '',
    agentSecret: '',
    demoCompleted: false,
    onboardingCompleted: false,
    policyId: '',
  }
}

function saveState(state: OnboardingState) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }
}

/* ─── Step Indicator ─── */

function ProgressBar({ current }: { current: Step }) {
  const steps = ['Welcome', 'Policy', 'Agent', 'Demo', 'Ready']
  return (
    <div className="w-full max-w-xl mx-auto mb-12">
      <div className="flex items-center justify-between">
        {steps.map((label, idx) => {
          const stepNum = (idx + 1) as Step
          const isActive = stepNum === current
          const isDone = stepNum < current
          return (
            <div key={label} className="flex flex-col items-center gap-2 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
                  isDone
                    ? 'bg-passport-green/15 border-passport-green text-passport-green'
                    : isActive
                    ? 'bg-passport-azure/15 border-passport-azure text-passport-azure'
                    : 'bg-passport-surface border-passport-border text-passport-dim'
                }`}
              >
                {isDone ? <Check size={14} /> : stepNum}
              </div>
              <span className={`text-[10px] font-mono uppercase tracking-wider hidden sm:block ${isActive ? 'text-passport-text' : 'text-passport-dim'}`}>
                {label}
              </span>
            </div>
          )
        })}
      </div>
      <div className="relative h-0.5 bg-passport-border mt-[-34px] mx-4 -z-10">
        <div
          className="absolute inset-y-0 left-0 bg-passport-green transition-all duration-500"
          style={{ width: `${((current - 1) / 4) * 100}%` }}
        />
      </div>
    </div>
  )
}

/* ─── Slide animation wrapper ─── */

function StepWrapper({
  children,
  direction,
  stepKey,
}: {
  children: React.ReactNode
  direction: 'forward' | 'back' | 'none'
  stepKey: number
}) {
  return (
    <div
      key={stepKey}
      className={
        direction === 'forward'
          ? 'animate-onboard-slide-in-left'
          : direction === 'back'
          ? 'animate-onboard-slide-in-right'
          : 'animate-onboard-fade-in'
      }
    >
      {children}
    </div>
  )
}

/* ─── Step 1: Welcome ─── */

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center max-w-lg mx-auto">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-passport-green/10 border border-passport-green/20 mb-6">
        <Shield size={32} className="text-passport-green" />
      </div>
      <h1 className="text-3xl sm:text-4xl font-bold text-passport-text mb-4">
        Welcome to AI Agent Passport
      </h1>
      <div className="flex items-center justify-center gap-2 text-passport-muted mb-8">
        <Terminal size={16} className="text-passport-green" />
        <span className="font-mono text-sm">
          In the next 2 minutes, you&apos;ll create your first policy, register an agent, and see enforcement in action.
        </span>
        <span className="inline-block w-2 h-4 bg-passport-green animate-cursor-blink align-middle" />
      </div>
      <button onClick={onNext} className="btn-primary text-base px-6 py-3">
        Get Started
        <ArrowRight size={16} />
      </button>
    </div>
  )
}

/* ─── Step 2: Create First Policy ─── */

const ALL_TOOLS = ['web_search', 'read_database', 'write_database', 'delete_database', 'send_email', 'api_call']

function StepCreatePolicy({ onNext, onPolicyCreated }: { onNext: () => void; onPolicyCreated: (id: string) => void }) {
  const [name, setName] = useState('Safe Web Search')
  const [allowed, setAllowed] = useState<string[]>(['web_search', 'read_database'])
  const [denied, setDenied] = useState<string[]>(['delete_database', 'write_database'])
  const [deniedDomains, setDeniedDomains] = useState('evil.com, localhost')
  const [maxCost, setMaxCost] = useState(10)
  const [pii, setPii] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const toggleTool = (tool: string, list: string[], setList: (v: string[]) => void) => {
    if (list.includes(tool)) setList(list.filter((t) => t !== tool))
    else setList([...list, tool])
  }

  const handleCreate = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await createPolicy({
        name,
        rules: {
          allowedTools: allowed,
          deniedTools: denied,
          deniedDomains: deniedDomains.split(',').map((d) => d.trim()).filter(Boolean),
          maxCost,
          piiDetection: pii,
        },
      })
      if (result.id) onPolicyCreated(result.id)
      onNext()
    } catch (err: any) {
      setError(err.message || 'Failed to create policy')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl sm:text-3xl font-bold text-passport-text mb-8 text-center">
        Create Your First Policy
      </h2>

      {error && (
        <div className="p-3 rounded-passport border border-passport-red/30 bg-passport-red/5 flex items-center gap-2 mb-4">
          <AlertTriangle size={16} className="text-passport-red shrink-0" />
          <span className="text-sm text-passport-red flex-1">{error}</span>
          <button onClick={handleCreate} className="text-xs text-passport-red underline hover:no-underline flex items-center gap-1">
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label className="label-text">Policy Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
          />
        </div>

        <div>
          <label className="label-text">Allowed Tools</label>
          <div className="flex flex-wrap gap-2">
            {ALL_TOOLS.map((tool) => (
              <button
                key={tool}
                onClick={() => toggleTool(tool, allowed, setAllowed)}
                className={`px-3 py-1.5 rounded text-xs font-mono border transition-colors ${
                  allowed.includes(tool)
                    ? 'bg-passport-green/10 border-passport-green/40 text-passport-green'
                    : 'bg-passport-surface border-passport-border text-passport-muted hover:text-passport-text'
                }`}
              >
                {allowed.includes(tool) && <Check size={10} className="inline mr-1" />}
                {tool}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label-text">Denied Tools</label>
          <div className="flex flex-wrap gap-2">
            {ALL_TOOLS.map((tool) => (
              <button
                key={tool}
                onClick={() => toggleTool(tool, denied, setDenied)}
                className={`px-3 py-1.5 rounded text-xs font-mono border transition-colors ${
                  denied.includes(tool)
                    ? 'bg-passport-red/10 border-passport-red/40 text-passport-red'
                    : 'bg-passport-surface border-passport-border text-passport-muted hover:text-passport-text'
                }`}
              >
                {denied.includes(tool) && <X size={10} className="inline mr-1" />}
                {tool}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label-text">Denied Domains</label>
          <textarea
            value={deniedDomains}
            onChange={(e) => setDeniedDomains(e.target.value)}
            className="input-field h-20 resize-none"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="label-text">Max Cost ($)</label>
            <input
              type="number"
              value={maxCost}
              onChange={(e) => setMaxCost(Number(e.target.value))}
              className="input-field"
            />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <button
              onClick={() => setPii(!pii)}
              className={`relative w-11 h-6 rounded-full transition-colors ${pii ? 'bg-passport-green' : 'bg-passport-border'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${pii ? 'translate-x-5' : ''}`}
              />
            </button>
            <span className="text-sm text-passport-muted">PII Detection {pii ? 'ON' : 'OFF'}</span>
          </div>
        </div>

        <div className="glass-panel p-4 border-passport-border/60">
          <div className="label-text mb-3">Policy Preview</div>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex items-center gap-2">
              <ShieldCheck size={12} className="text-passport-green" />
              <span className="text-passport-muted">Allows:</span>
              <span className="text-passport-green">{allowed.join(', ') || 'none'}</span>
            </div>
            <div className="flex items-center gap-2">
              <X size={12} className="text-passport-red" />
              <span className="text-passport-muted">Denies:</span>
              <span className="text-passport-red">{denied.join(', ') || 'none'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={12} className="text-passport-amber" />
              <span className="text-passport-muted">Max cost:</span>
              <span className="text-passport-text">${maxCost}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button onClick={handleCreate} disabled={loading} className="btn-primary text-base px-6 py-3">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          Create Policy
        </button>
      </div>
    </div>
  )
}

/* ─── Step 3: Register First Agent ─── */

function StepRegisterAgent({ onNext, state, onAgentCreated }: { onNext: () => void; state: OnboardingState; onAgentCreated: (id: string, secret: string) => void }) {
  const [name, setName] = useState('Customer Support Bot')
  const [model, setModel] = useState('GPT-4o')
  const [provider, setProvider] = useState('OpenAI')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ id: string; secret: string } | null>(null)

  const handleRegister = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await registerAgent({ name, model, provider, systemPrompt })
      const id = res.id || res.agentId
      const secret = res.secret || res.secretKey
      if (!id) throw new Error('No agent ID returned from server')
      setResult({ id, secret: secret || 'No secret returned' })
      onAgentCreated(id, secret || '')
    } catch (err: any) {
      setError(err.message || 'Failed to register agent')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!result) return
    const blob = new Blob(
      [JSON.stringify({ agentId: result.id, secretKey: result.secret, model, provider }, null, 2)],
      { type: 'application/json' }
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name.toLowerCase().replace(/\s+/g, '-')}-credentials.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (result) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-passport-green/10 border border-passport-green/20 mb-4">
            <Check size={24} className="text-passport-green" />
          </div>
          <h2 className="text-2xl font-bold text-passport-text">Agent Registered</h2>
        </div>

        <div className="space-y-4 mb-8">
          <div className="glass-panel p-4">
            <div className="label-text">Agent ID</div>
            <div className="font-mono text-sm text-passport-text break-all">{result.id}</div>
          </div>

          <div className="glass-panel p-4 flex flex-col items-center">
            <div className="label-text mb-2">Agent QR Code</div>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(result.id)}`}
              alt="Agent QR Code"
              className="rounded border border-passport-border"
              width={150}
              height={150}
            />
            <span className="text-[10px] font-mono text-passport-dim mt-1">Scan to verify agent identity</span>
          </div>

          <div className="glass-panel p-4 border-passport-amber/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={12} className="text-passport-amber" />
              <span className="label-text m-0 text-passport-amber">Secret Key (shown once)</span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-sm text-passport-text break-all bg-passport-bg p-2 rounded border border-passport-border">
                {result.secret}
              </code>
              <CopyButton text={result.secret} />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button onClick={handleDownload} className="btn-secondary">
            Download Credentials
          </button>
          <button onClick={onNext} className="btn-primary">
            Continue
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl sm:text-3xl font-bold text-passport-text mb-8 text-center">
        Register Your First Agent
      </h2>

      {error && (
        <div className="p-3 rounded-passport border border-passport-red/30 bg-passport-red/5 flex items-center gap-2 mb-4">
          <AlertTriangle size={16} className="text-passport-red shrink-0" />
          <span className="text-sm text-passport-red flex-1">{error}</span>
          <button onClick={handleRegister} className="text-xs text-passport-red underline hover:no-underline flex items-center gap-1">
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label className="label-text">Agent Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" />
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="label-text">Model</label>
            <select value={model} onChange={(e) => setModel(e.target.value)} className="input-field">
              <option>GPT-4o</option>
              <option>GPT-4o-mini</option>
              <option>Claude 3.5 Sonnet</option>
              <option>Claude 3 Opus</option>
              <option>Gemini 1.5 Pro</option>
            </select>
          </div>
          <div>
            <label className="label-text">Provider</label>
            <select value={provider} onChange={(e) => setProvider(e.target.value)} className="input-field">
              <option>OpenAI</option>
              <option>Anthropic</option>
              <option>Google</option>
              <option>Custom</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label-text">System Prompt</label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="You are a helpful customer support agent..."
            className="input-field h-28 resize-none"
          />
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button onClick={handleRegister} disabled={loading} className="btn-primary text-base px-6 py-3">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          Register Agent
        </button>
      </div>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="p-2 rounded border border-passport-border hover:border-passport-green/40 text-passport-muted hover:text-passport-green transition-colors"
      title="Copy"
    >
      {copied ? <CheckCircle2 size={16} className="text-passport-green" /> : <Copy size={16} />}
    </button>
  )
}

/* ─── Step 4: Run Demo Enforcement ─── */

interface DemoAction {
  tool: string
  decision: 'allow' | 'deny' | 'modify'
  reason: string
  line: string
  policyName?: string
}

const DEMO_ACTIONS: DemoAction[] = [
  { tool: 'web_search', decision: 'allow', reason: 'Tool permitted by policy Safe Web Search', line: 'web_search({ query: "latest news" })', policyName: 'Safe Web Search' },
  { tool: 'read_database', decision: 'allow', reason: 'Read access granted by Safe Web Search', line: 'read_database({ table: "users", limit: 10 })', policyName: 'Safe Web Search' },
  { tool: 'write_database', decision: 'deny', reason: 'Write operations blocked by policy Safe Web Search', line: 'write_database({ table: "users", data: {...} })', policyName: 'Safe Web Search' },
  { tool: 'send_email', decision: 'allow', reason: 'Email within allowed scope', line: 'send_email({ to: "support@example.com" })' },
  { tool: 'delete_database', decision: 'deny', reason: 'Destructive action denied by No Destructive Actions', line: 'delete_database({ table: "orders" })', policyName: 'No Destructive Actions' },
  { tool: 'api_call', decision: 'modify', reason: 'PII detected in parameters — data redacted', line: 'api_call({ url: "api.example.com/users", payload: { ssn: "■■■" } })', policyName: 'No PII Access' },
]

function StepRunDemo({ onNext, agentId }: { onNext: () => void; agentId: string }) {
  const [lines, setLines] = useState<{ text: string; color: string }[]>([])
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [currentActionIdx, setCurrentActionIdx] = useState(-1)
  const [apiConnected, setApiConnected] = useState(true)
  const actionRef = useRef<number>(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const runDemo = useCallback(() => {
    if (running) return
    setRunning(true)
    setLines([])
    setDone(false)
    setCurrentActionIdx(-1)
    actionRef.current = 0
    setApiConnected(true)

    const runNext = async () => {
      const i = actionRef.current
      if (i >= DEMO_ACTIONS.length) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        setRunning(false)
        setDone(true)
        return
      }
      const action = DEMO_ACTIONS[i]
      setCurrentActionIdx(i)

      if (agentId && apiConnected) {
        try {
          const intentId = `intent_${Date.now()}_${i}`
          const result = await enforceIntent({
            intent: {
              intentId,
              agentId,
              tool: action.tool,
              parameters: { action: action.tool, index: i },
            },
          })
          const decision = result.decision || 'allow'
          const color = decision === 'allow' ? 'text-passport-green' : decision === 'deny' ? 'text-passport-red' : 'text-passport-azure'
          setLines((prev) => [
            ...prev,
            { text: `> ${action.line}`, color: 'text-passport-dim' },
            { text: `  ─ Evaluating against active policies...`, color: 'text-passport-muted' },
            { text: `  ${decision === 'allow' ? '✓' : decision === 'deny' ? '✗' : '⚠'} ${decision.toUpperCase()} — ${result.reason || action.reason}`, color },
            ...(action.policyName ? [{ text: `  ─ Matched policy: ${action.policyName}`, color: 'text-passport-muted' }] : []),
          ])
        } catch {
          setApiConnected(false)
          const color = action.decision === 'allow' ? 'text-passport-green' : action.decision === 'deny' ? 'text-passport-red' : 'text-passport-azure'
          setLines((prev) => [
            ...prev,
            { text: `> ${action.line}`, color: 'text-passport-dim' },
            { text: `  ─ (Simulated) Evaluating against active policies...`, color: 'text-passport-muted' },
            { text: `  ${action.decision === 'allow' ? '✓' : action.decision === 'deny' ? '✗' : '⚠'} ${action.decision.toUpperCase()} — ${action.reason}`, color },
            ...(action.policyName ? [{ text: `  ─ Matched policy: ${action.policyName}`, color: 'text-passport-muted' }] : []),
          ])
        }
      } else {
        const color = action.decision === 'allow' ? 'text-passport-green' : action.decision === 'deny' ? 'text-passport-red' : 'text-passport-azure'
        setLines((prev) => [
          ...prev,
          { text: `> ${action.line}`, color: 'text-passport-dim' },
          { text: `  ─ (Simulated) Evaluating against active policies...`, color: 'text-passport-muted' },
          { text: `  ${action.decision === 'allow' ? '✓' : action.decision === 'deny' ? '✗' : '⚠'} ${action.decision.toUpperCase()} — ${action.reason}`, color },
          ...(action.policyName ? [{ text: `  ─ Matched policy: ${action.policyName}`, color: 'text-passport-muted' }] : []),
        ])
      }

      actionRef.current++
      setTimeout(runNext, 1200)
    }

    intervalRef.current = setTimeout(runNext, 500) as any
  }, [running, agentId, apiConnected])

  useEffect(() => {
    runDemo()
    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current)
    }
  }, [runDemo])

  const rerunDemo = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setRunning(false)
    setDone(false)
    setLines([])
    setCurrentActionIdx(-1)
    actionRef.current = 0
    setTimeout(runDemo, 300)
  }

  const deniedCount = DEMO_ACTIONS.filter((a) => a.decision === 'deny').length
  const modifiedCount = DEMO_ACTIONS.filter((a) => a.decision === 'modify').length
  const allowedCount = DEMO_ACTIONS.filter((a) => a.decision === 'allow').length

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl sm:text-3xl font-bold text-passport-text mb-8 text-center">
        See Enforcement in Action
      </h2>

      <div className="glass-panel p-0 overflow-hidden border-passport-border bg-[#0d1117] mb-6">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-passport-border bg-passport-surface">
          <Terminal size={14} className="text-passport-muted" />
          <span className="text-[10px] font-mono text-passport-dim uppercase tracking-wider">Enforcement Log</span>
          <span className="ml-auto text-[10px] font-mono text-passport-dim">
            {currentActionIdx + 1}/{DEMO_ACTIONS.length}
          </span>
          <button onClick={rerunDemo} className="text-passport-dim hover:text-passport-text transition-colors p-0.5" title="Re-run">
            <RefreshCw size={12} className={running ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="p-4 font-mono text-sm min-h-[320px] space-y-1">
          {lines.length === 0 && (
            <div className="text-passport-dim text-xs">Initializing demo environment...</div>
          )}
          {lines.map((line, idx) => (
            <div key={idx} className={`${line.color} animate-fade-in`}>
              {line.text}
            </div>
          ))}
          {running && (
            <div className="flex items-center gap-2 text-passport-dim text-xs mt-2">
              <Loader2 size={12} className="animate-spin" />
              Evaluating...
            </div>
          )}
        </div>
      </div>

      {done && (
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-passport-green/10 border border-passport-green/20 text-passport-green text-sm font-medium mb-4">
            <ShieldCheck size={16} />
            Demo complete — {allowedCount} allowed, {deniedCount} denied, {modifiedCount} modified
          </div>
          <div className="flex items-center justify-center gap-2 mt-2">
            <button onClick={rerunDemo} className="text-xs text-passport-muted hover:text-passport-text transition-colors flex items-center gap-1">
              <RefreshCw size={12} />
              Re-run demo
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={onNext} disabled={running} className="btn-primary text-base px-6 py-3">
          Continue
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}

/* ─── Step 5: Completion ─── */

function Confetti() {
  const pieces = useRef<{ id: number; x: number; color: string; delay: number; size: number }[]>([])

  if (pieces.current.length === 0) {
    const colors = ['#2ea043', '#58a6ff', '#f78166', '#d2991d', '#f85149', '#c9d1d9']
    for (let i = 0; i < 50; i++) {
      pieces.current.push({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 2,
        size: 4 + Math.random() * 8,
      })
    }
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.current.map((p) => (
        <div
          key={p.id}
          className="absolute top-0 animate-confetti-fall"
          style={{
            left: `${p.x}%`,
            background: p.color,
            width: `${p.size}px`,
            height: `${p.size * 0.6}px`,
            borderRadius: '2px',
            animationDelay: `${p.delay}s`,
            animationDuration: `${2.5 + Math.random() * 3}s`,
          }}
        />
      ))}
    </div>
  )
}

function StepReady({ state }: { state: OnboardingState }) {
  const router = useRouter()
  const [finishing, setFinishing] = useState(false)

  const finish = async () => {
    setFinishing(true)
    try {
      await completeOnboarding()
      setTimeout(() => {
        localStorage.removeItem(STORAGE_KEY)
        router.push('/dashboard')
      }, 2000)
    } catch {
      localStorage.removeItem(STORAGE_KEY)
      router.push('/dashboard')
    }
  }

  const shareUrl = 'https://passport-agent-demo.netlify.app'
  const shareText = encodeURIComponent("I just set up my AI Agent Passport! Policies, agents, and enforcement in under 2 minutes. \n\nControl what your AI agents can do with pre-execution policy enforcement.")

  return (
    <div className="text-center max-w-lg mx-auto">
      <Confetti />
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-passport-green/10 border-2 border-passport-green mb-6 animate-pulse-soft">
        <Check size={40} className="text-passport-green" />
      </div>
      <h1 className="text-3xl sm:text-4xl font-bold text-passport-text mb-4">You&apos;re All Set!</h1>
      <p className="text-passport-muted mb-10">Your AI Agent Passport is ready to enforce policies and protect your systems.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
        {[
          { label: 'Policies', value: '1', icon: <ShieldCheck size={16} /> },
          { label: 'Agents', value: '1', icon: <UserPlusIcon size={16} /> },
          { label: 'Enforcements', value: '7', icon: <Zap size={16} /> },
        ].map((s) => (
          <div key={s.label} className="glass-panel p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-passport-green mb-1">
              {s.icon}
              <span className="text-lg font-bold text-passport-text">{s.value}</span>
            </div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-passport-dim">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
        <button onClick={finish} disabled={finishing} className="btn-primary text-base px-6 py-3">
          {finishing ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          Go to Dashboard
        </button>
        <Link href="/docs" className="btn-secondary text-base px-6 py-3">
          <BookOpen size={16} />
          View Documentation
        </Link>
      </div>

      <a
        href={`https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(shareUrl)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-secondary text-sm px-4 py-2"
      >
        <Twitter size={16} />
        Share on Twitter
      </a>
    </div>
  )
}

function UserPlusIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  )
}

/* ─── Main Page ─── */

export default function OnboardingPage() {
  const [state, setState] = useState<OnboardingState>(loadState())
  const [direction, setDirection] = useState<'forward' | 'back' | 'none'>('none')
  const router = useRouter()

  useEffect(() => {
    if (state.onboardingCompleted) {
      router.push('/dashboard')
    }
  }, [state.onboardingCompleted, router])

  const goTo = (step: Step) => {
    const prevStep = state.step
    setDirection(step > prevStep ? 'forward' : 'back')
    const next = { ...state, step }
    setState(next)
    saveState(next)
  }

  const setPolicyId = (policyId: string) => {
    const next = { ...state, policyId }
    setState(next)
    saveState(next)
  }

  const setAgentData = (agentId: string, agentSecret: string) => {
    const next = { ...state, agentId, agentSecret }
    setState(next)
    saveState(next)
  }

  const nextStep = () => {
    if (state.step < 5) {
      setDirection('forward')
      const next: OnboardingState = { ...state, step: (state.step + 1) as Step }
      if (state.step === 2) next.policyCreated = true
      if (state.step === 3) next.agentCreated = true
      if (state.step === 4) next.demoCompleted = true
      setState(next)
      saveState(next)
    }
  }

  const prevStep = () => {
    if (state.step > 1) {
      setDirection('back')
      const next = { ...state, step: (state.step - 1) as Step }
      setState(next)
      saveState(next)
    }
  }

  const skip = () => {
    const next: OnboardingState = { ...state, step: 5, onboardingCompleted: true }
    setState(next)
    saveState(next)
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-passport-bg flex flex-col">
      {/* Header */}
      <header className="border-b border-passport-border bg-passport-bg/92 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Shield size={20} className="text-passport-green" />
            <span className="font-mono text-sm font-bold text-passport-green tracking-wider uppercase">
              Passport Agent
            </span>
          </div>
          <button onClick={skip} className="text-xs font-mono text-passport-dim hover:text-passport-text transition-colors">
            Skip onboarding
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12">
        <ProgressBar current={state.step} />

        <div className="w-full flex items-start justify-center">
          {state.step > 1 && (
            <button
              onClick={prevStep}
              className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full border border-passport-border text-passport-dim hover:text-passport-text hover:border-passport-border-2 transition-all mr-2 mt-32 shrink-0"
              aria-label="Previous step"
            >
              <ChevronLeft size={18} />
            </button>
          )}

          <div className="min-h-[400px] flex items-center justify-center w-full max-w-3xl">
            <StepWrapper direction={direction} stepKey={state.step}>
              {state.step === 1 && <StepWelcome onNext={nextStep} />}
              {state.step === 2 && <StepCreatePolicy onNext={nextStep} onPolicyCreated={setPolicyId} />}
              {state.step === 3 && <StepRegisterAgent onNext={nextStep} state={state} onAgentCreated={setAgentData} />}
              {state.step === 4 && <StepRunDemo onNext={nextStep} agentId={state.agentId} />}
              {state.step === 5 && <StepReady state={state} />}
            </StepWrapper>
          </div>

          {state.step < 5 && (
            <button
              onClick={nextStep}
              className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full border border-passport-green/30 text-passport-green hover:bg-passport-green/10 transition-all ml-2 mt-32 shrink-0"
              aria-label="Next step"
            >
              <ChevronRight size={18} />
            </button>
          )}
        </div>

        {/* Mobile nav */}
        <div className="sm:hidden flex items-center gap-4 mt-6">
          {state.step > 1 && (
            <button onClick={prevStep} className="btn-secondary">
              <ChevronLeft size={14} />
              Back
            </button>
          )}
          {state.step < 5 && (
            <button onClick={nextStep} className="btn-primary ml-auto">
              Next
              <ChevronRight size={14} />
            </button>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center border-t border-passport-border">
        <p className="font-mono text-[10px] text-passport-dim tracking-wider">
          Passport Agent v2.1 &middot; Step {state.step} of 5
        </p>
      </footer>
    </div>
  )
}
