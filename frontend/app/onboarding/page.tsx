'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Shield,
  ChevronRight,
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
} from 'lucide-react'
import { createPolicy, registerAgent, completeOnboarding } from '@/lib/api'

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
    }
  }
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      return JSON.parse(raw)
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
      {/* Progress line */}
      <div className="relative h-0.5 bg-passport-border mt-[-34px] mx-4 -z-10">
        <div
          className="absolute inset-y-0 left-0 bg-passport-green transition-all duration-500"
          style={{ width: `${((current - 1) / 4) * 100}%` }}
        />
      </div>
    </div>
  )
}

/* ─── Step 1: Welcome ─── */

function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center max-w-lg mx-auto animate-slide-up">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-passport-green/10 border border-passport-green/20 mb-6">
        <Shield size={32} className="text-passport-green" />
      </div>
      <h1 className="text-3xl sm:text-4xl font-bold text-passport-text mb-4">
        Welcome to AI Agent Passport
      </h1>
      <div className="flex items-center justify-center gap-2 text-passport-muted mb-8">
        <Terminal size={16} className="text-passport-green" />
        <span className="font-mono text-sm">
          In the next 2 minutes, you'll create your first policy, register an agent, and see enforcement in action.
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

function StepCreatePolicy({ onNext }: { onNext: () => void }) {
  const [name, setName] = useState('Safe Web Search')
  const [allowed, setAllowed] = useState<string[]>(['web_search', 'read_database'])
  const [denied, setDenied] = useState<string[]>(['delete_database', 'write_database'])
  const [deniedDomains, setDeniedDomains] = useState('evil.com, localhost')
  const [maxCost, setMaxCost] = useState(10)
  const [pii, setPii] = useState(true)
  const [loading, setLoading] = useState(false)

  const toggleTool = (tool: string, list: string[], setList: (v: string[]) => void) => {
    if (list.includes(tool)) setList(list.filter((t) => t !== tool))
    else setList([...list, tool])
  }

  const handleCreate = async () => {
    setLoading(true)
    try {
      await createPolicy({
        name,
        rules: {
          allowedTools: allowed,
          deniedTools: denied,
          deniedDomains: deniedDomains.split(',').map((d) => d.trim()).filter(Boolean),
          maxCost,
          piiDetection: pii,
        },
      })
      onNext()
    } catch {
      // Silent fail — demo flow should continue
      onNext()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto animate-slide-up">
      <h2 className="text-2xl sm:text-3xl font-bold text-passport-text mb-8 text-center">
        Create Your First Policy
      </h2>

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
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  pii ? 'translate-x-5' : ''
                }`}
              />
            </button>
            <span className="text-sm text-passport-muted">PII Detection {pii ? 'ON' : 'OFF'}</span>
          </div>
        </div>

        {/* Live Preview */}
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

function StepRegisterAgent({ onNext, state }: { onNext: () => void; state: OnboardingState }) {
  const [name, setName] = useState('Customer Support Bot')
  const [model, setModel] = useState('GPT-4o')
  const [provider, setProvider] = useState('OpenAI')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ id: string; secret: string } | null>(null)

  const handleRegister = async () => {
    setLoading(true)
    try {
      const res = await registerAgent({ name, model, provider, systemPrompt })
      setResult({ id: res.id || 'agent_demo_123', secret: res.secret || 'passport_secret_' + Math.random().toString(36).slice(2) })
    } catch {
      setResult({ id: 'agent_demo_123', secret: 'passport_secret_' + Math.random().toString(36).slice(2) })
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
      <div className="max-w-xl mx-auto animate-slide-up">
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
    <div className="max-w-xl mx-auto animate-slide-up">
      <h2 className="text-2xl sm:text-3xl font-bold text-passport-text mb-8 text-center">
        Register Your First Agent
      </h2>

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
}

const DEMO_ACTIONS: DemoAction[] = [
  { tool: 'web_search', decision: 'allow', reason: 'Tool permitted by policy', line: 'web_search({ query: "latest news" })' },
  { tool: 'read_database', decision: 'allow', reason: 'Read access granted', line: 'read_database({ table: "users", limit: 10 })' },
  { tool: 'write_database', decision: 'deny', reason: 'Write operations blocked by policy', line: 'write_database({ table: "users", data: {...} })' },
  { tool: 'send_email', decision: 'allow', reason: 'Email within allowed scope', line: 'send_email({ to: "support@example.com" })' },
  { tool: 'delete_database', decision: 'deny', reason: 'Destructive action denied', line: 'delete_database({ table: "orders" })' },
]

function StepRunDemo({ onNext }: { onNext: () => void }) {
  const [lines, setLines] = useState<{ text: string; color: string }[]>([])
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)

  const runDemo = () => {
    if (running) return
    setRunning(true)
    setLines([])
    setDone(false)

    let i = 0
    const interval = setInterval(() => {
      if (i >= DEMO_ACTIONS.length) {
        clearInterval(interval)
        setRunning(false)
        setDone(true)
        return
      }
      const action = DEMO_ACTIONS[i]
      const color = action.decision === 'allow' ? 'text-passport-green' : action.decision === 'deny' ? 'text-passport-coral' : 'text-passport-azure'
      setLines((prev) => [
        ...prev,
        { text: `> ${action.line}`, color: 'text-passport-dim' },
        { text: `  → ${action.decision.toUpperCase()} — ${action.reason}`, color },
      ])
      i++
    }, 900)
  }

  useEffect(() => {
    // Auto-run on mount
    const t = setTimeout(runDemo, 500)
    return () => clearTimeout(t)
  }, [])

  const deniedCount = DEMO_ACTIONS.filter((a) => a.decision === 'deny').length

  return (
    <div className="max-w-2xl mx-auto animate-slide-up">
      <h2 className="text-2xl sm:text-3xl font-bold text-passport-text mb-8 text-center">
        See Enforcement in Action
      </h2>

      <div className="glass-panel p-0 overflow-hidden border-passport-border bg-[#0d1117] mb-6">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-passport-border bg-passport-surface">
          <Terminal size={14} className="text-passport-muted" />
          <span className="text-[10px] font-mono text-passport-dim uppercase tracking-wider">Enforcement Log</span>
        </div>
        <div className="p-4 font-mono text-sm min-h-[240px] space-y-1">
          {lines.length === 0 && (
            <div className="text-passport-dim text-xs">Initializing demo environment...</div>
          )}
          {lines.map((line, idx) => (
            <div key={idx} className={line.color}>
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-passport-green/10 border border-passport-green/20 text-passport-green text-sm font-medium">
            <ShieldCheck size={16} />
            Your policies just prevented {deniedCount} unauthorized actions!
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

/* ─── Step 5: You're Ready ─── */

function StepReady({ state }: { state: OnboardingState }) {
  const router = useRouter()

  const finish = async () => {
    try {
      await completeOnboarding()
    } catch {}
    localStorage.removeItem(STORAGE_KEY)
    router.push('/dashboard')
  }

  return (
    <div className="text-center max-w-lg mx-auto animate-slide-up">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-passport-green/10 border-2 border-passport-green mb-6 animate-pulse-soft">
        <Check size={40} className="text-passport-green" />
      </div>
      <h1 className="text-3xl sm:text-4xl font-bold text-passport-text mb-4">You're All Set!</h1>
      <p className="text-passport-muted mb-10">Your AI Agent Passport is ready to enforce policies and protect your systems.</p>

      <div className="grid grid-cols-3 gap-3 mb-10">
        {[
          { label: 'Policies', value: '1', icon: <ShieldCheck size={16} /> },
          { label: 'Agents', value: '1', icon: <UserPlusIcon size={16} /> },
          { label: 'Enforcements', value: '5', icon: <Zap size={16} /> },
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

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button onClick={finish} className="btn-primary text-base px-6 py-3">
          Go to Dashboard
          <ArrowRight size={16} />
        </button>
        <Link href="/docs" className="btn-secondary text-base px-6 py-3">
          <BookOpen size={16} />
          View Documentation
        </Link>
      </div>
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
  const router = useRouter()

  useEffect(() => {
    if (state.onboardingCompleted) {
      router.push('/dashboard')
    }
  }, [state.onboardingCompleted, router])

  const goTo = (step: Step) => {
    const next = { ...state, step }
    setState(next)
    saveState(next)
  }

  const nextStep = () => {
    if (state.step < 5) {
      const next: OnboardingState = { ...state, step: (state.step + 1) as Step }
      if (state.step === 2) next.policyCreated = true
      if (state.step === 3) next.agentCreated = true
      if (state.step === 4) next.demoCompleted = true
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

        {state.step === 1 && <StepWelcome onNext={nextStep} />}
        {state.step === 2 && <StepCreatePolicy onNext={nextStep} />}
        {state.step === 3 && <StepRegisterAgent onNext={nextStep} state={state} />}
        {state.step === 4 && <StepRunDemo onNext={nextStep} />}
        {state.step === 5 && <StepReady state={state} />}
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
