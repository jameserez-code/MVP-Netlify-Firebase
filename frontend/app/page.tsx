'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import Navbar from '@/components/navbar'
import GlassCard from '@/components/glass-card'
import TerminalCursor from '@/components/terminal-cursor'
import { isLoggedIn, createCheckoutSession } from '@/lib/api'
import {
  Shield,
  Lock,
  Eye,
  Zap,
  Terminal,
  ChevronRight,
  Activity,
  Key,
  FileCheck,
  Server,
  X,
  Check,
  ShieldCheck,
  UserPlus,
  Copy,
  CheckCircle2,
  Star,
  ChevronDown,
  ChevronUp,
  Github,
  MessageSquare,
  ExternalLink,
  Play,
  Radio,
} from 'lucide-react'

function CountUp({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let start = 0
    const step = Math.max(1, Math.ceil(target / (duration / 16)))
    const timer = setInterval(() => {
      start += step
      if (start >= target) {
        setValue(target)
        clearInterval(timer)
      } else {
        setValue(start)
      }
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])

  return <span>{value.toLocaleString()}</span>
}

/* ─── Code Snippet Helpers ─── */

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative rounded-md overflow-hidden bg-[#0d1117] border border-passport-border">
      <div className="flex items-center justify-between px-3 py-2 border-b border-passport-border bg-passport-surface">
        <span className="font-mono text-[10px] uppercase tracking-wider text-passport-dim">{lang}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[10px] font-mono text-passport-muted hover:text-passport-text transition-colors"
        >
          {copied ? <CheckCircle2 size={12} className="text-passport-green" /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed font-mono">
        <code>{highlightCode(code, lang)}</code>
      </pre>
    </div>
  )
}

function highlightCode(code: string, lang: string) {
  if (lang === 'bash') {
    const lines = code.split('\n')
    return lines.map((line, i) => (
      <div key={i}>
        {line.startsWith('#') ? (
          <span className="text-passport-coral">{line}</span>
        ) : (
          line.split(/('[^']*')/g).map((part, j) =>
            part.startsWith("'") && part.endsWith("'") ? (
              <span key={j} className="text-passport-green">{part}</span>
            ) : (
              <span key={j}>{part}</span>
            )
          )
        )}
      </div>
    ))
  }

  // TypeScript
  const keywords = ['import', 'from', 'const', 'new', 'await', 'return', 'async', 'function', 'class', 'export', 'default']
  const parts = code.split(/('[^']*'|`[^`]*`|"[^"]*"|\b(?:import|from|const|new|await|return|async|function|class|export|default)\b|\/\/.*|\{|\}|\(|\)|\[|\]|=>|;|:|,)/g)

  return parts.map((part, i) => {
    if (part.match(/^['"`].*['"`]$/)) return <span key={i} className="text-passport-green">{part}</span>
    if (keywords.includes(part)) return <span key={i} className="text-passport-azure">{part}</span>
    if (part.startsWith('//')) return <span key={i} className="text-passport-coral">{part}</span>
    if (part === '{' || part === '}' || part === '(' || part === ')' || part === '[' || part === ']' || part === '=>')
      return <span key={i} className="text-passport-dim">{part}</span>
    return <span key={i}>{part}</span>
  })
}

/* ─── FAQ Accordion ─── */

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-passport-border rounded-md overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-passport-surface/50 transition-colors"
      >
        <span className="text-sm font-medium text-passport-text">{question}</span>
        {open ? <ChevronUp size={16} className="text-passport-muted shrink-0" /> : <ChevronDown size={16} className="text-passport-muted shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-passport-muted leading-relaxed animate-fade-in">
          {answer}
        </div>
      )}
    </div>
  )
}

export default function LandingPage() {
  const [metrics, setMetrics] = useState<any>(null)
  const [codeTab, setCodeTab] = useState<'sdk' | 'curl'>('sdk')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')

  useEffect(() => {
    fetch('http://localhost:3000/metrics')
      .then((r) => r.json())
      .then((d) => setMetrics(d))
      .catch(() => {})
  }, [])

  const sdkCode = `import { AgentControlPlane } from '@passport-agent/sdk'

const agent = new AgentControlPlane({
  apiKey: 'passport_live_...',
  policies: ['safe-web-search', 'read-only-db']
})

const result = await agent.run({
  tool: 'query_database',
  parameters: { table: 'users', limit: 10 }
})
// → { decision: 'allowed', ticket: 'gt_...' }`

  const curlCode = `curl -X POST https://api.passport.agent/enforce \\
  -H "X-API-Key: passport_live_..." \\
  -d '{"tool":"web_search","parameters":{"query":"latest news"}}'
# → {"decision":"allowed","reason":"Tool permitted by policy"}`

  return (
    <div className="min-h-screen bg-passport-bg">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-passport-green/20 bg-passport-green/5 text-passport-green text-xs font-mono mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-passport-green animate-pulse-soft" />
            v2.1 — Now with Policy Enforcement
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-passport-text tracking-tight leading-[1.1] mb-6">
            Identity & Permissions
            <br />
            for <span className="text-passport-green">AI Agents</span>
            <TerminalCursor />
          </h1>

          <p className="text-lg sm:text-xl text-passport-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            OAuth for AI Agents. Create VISAs, issue Passports, and enforce
            zero-trust permissions across your agent fleet.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="btn-primary text-base px-6 py-3">
              <Terminal size={16} />
              Start Building
              <ChevronRight size={16} />
            </Link>
            <Link href="/login" className="btn-secondary text-base px-6 py-3">
              Sign In to Console
            </Link>
          </div>
        </div>
      </section>

      {/* Live Metrics */}
      {metrics && (
        <section className="pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="font-mono text-[10px] uppercase tracking-widest text-passport-dim mb-4 text-center">
              Live System Metrics
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <GlassCard delay={0.05} className="text-center py-5">
                <div className="label-text mb-2">Total Tasks</div>
                <div className="font-mono text-2xl font-bold text-passport-green">
                  <CountUp target={metrics.tasks?.total || 0} />
                </div>
              </GlassCard>
              <GlassCard delay={0.1} className="text-center py-5">
                <div className="label-text mb-2">Pending</div>
                <div className="font-mono text-2xl font-bold text-passport-amber">
                  <CountUp target={metrics.tasks?.pending || 0} />
                </div>
              </GlassCard>
              <GlassCard delay={0.15} className="text-center py-5">
                <div className="label-text mb-2">Active</div>
                <div className="font-mono text-2xl font-bold text-passport-azure">
                  <CountUp target={metrics.tasks?.active || 0} />
                </div>
              </GlassCard>
              <GlassCard delay={0.2} className="text-center py-5">
                <div className="label-text mb-2">Failed</div>
                <div className="font-mono text-2xl font-bold text-passport-red">
                  <CountUp target={metrics.tasks?.failed || 0} />
                </div>
              </GlassCard>
              <GlassCard delay={0.25} className="text-center py-5">
                <div className="label-text mb-2">Active Runs</div>
                <div className="font-mono text-2xl font-bold text-passport-text">
                  <CountUp target={metrics.runs?.active || 0} />
                </div>
              </GlassCard>
              <GlassCard delay={0.3} className="text-center py-5">
                <div className="label-text mb-2">Agents</div>
                <div className="font-mono text-2xl font-bold text-passport-text">
                  <CountUp target={metrics.agents?.active || 0} />
                </div>
              </GlassCard>
            </div>
          </div>
        </section>
      )}

      {/* ─── Trusted By ─── */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 border-t border-passport-border">
        <div className="max-w-5xl mx-auto">
          <div className="font-mono text-[10px] uppercase tracking-widest text-passport-dim mb-6 text-center">
            Trusted by developers at
          </div>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-40">
            {['Acme Corp', 'TechStart', 'DataFlow', 'CloudNine', 'SecureAI'].map((name) => (
              <div key={name} className="flex items-center gap-2 text-passport-muted font-semibold text-sm sm:text-base">
                <div className="w-6 h-6 rounded bg-passport-surface border border-passport-border flex items-center justify-center">
                  <span className="text-[10px] font-mono">{name.charAt(0)}</span>
                </div>
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Problem / Solution ─── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-passport-border">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Problem */}
            <GlassCard hover={false} className="border-passport-red/20">
              <h3 className="text-xl font-bold text-passport-text mb-2">
                AI Agents Can Take Unauthorized Actions
              </h3>
              <p className="text-sm text-passport-muted mb-6 leading-relaxed">
                Without enforcement, agents can delete databases, leak PII, make unauthorized purchases, or access restricted systems.
              </p>
              <ul className="space-y-3">
                {[
                  'Agents with API keys have unrestricted access',
                  'No audit trail of what agents actually did',
                  'Policy changes require code deployments',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-passport-muted">
                    <X size={16} className="text-passport-coral shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </GlassCard>

            {/* Solution */}
            <GlassCard hover={false} className="border-passport-green/20">
              <h3 className="text-xl font-bold text-passport-text mb-2">
                Intercept and Enforce Before Execution
              </h3>
              <p className="text-sm text-passport-muted mb-6 leading-relaxed">
                Passport Agent sits between your agent and its tools. Every call is verified, evaluated, and logged before execution.
              </p>
              <ul className="space-y-3">
                {[
                  'Pre-execution policy enforcement in < 50ms',
                  'Immutable audit log with cryptographic signatures',
                  'Update policies without touching agent code',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-passport-muted">
                    <Check size={16} className="text-passport-green shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-passport-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-passport-text mb-4">
              Zero-Trust Agent Infrastructure
            </h2>
            <p className="text-passport-muted max-w-xl mx-auto">
              Everything you need to authenticate, authorize, and audit AI agents
              in production.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <GlassCard delay={0.05}>
              <Shield size={24} className="text-passport-green mb-4" />
              <h3 className="text-lg font-semibold text-passport-text mb-2">
                Agent Passports
              </h3>
              <p className="text-sm text-passport-muted leading-relaxed">
                Cryptographically signed credentials that prove agent identity
                across any system.
              </p>
            </GlassCard>

            <GlassCard delay={0.1}>
              <Lock size={24} className="text-passport-azure mb-4" />
              <h3 className="text-lg font-semibold text-passport-text mb-2">
                Policy Enforcement
              </h3>
              <p className="text-sm text-passport-muted leading-relaxed">
                Real-time intent evaluation with gateway tickets. Deny dangerous
                actions before they execute.
              </p>
            </GlassCard>

            <GlassCard delay={0.15}>
              <Eye size={24} className="text-passport-coral mb-4" />
              <h3 className="text-lg font-semibold text-passport-text mb-2">
                Full Audit Trail
              </h3>
              <p className="text-sm text-passport-muted leading-relaxed">
                Every action logged with cryptographic integrity. Timeline views
                and run traces included.
              </p>
            </GlassCard>

            <GlassCard delay={0.2}>
              <Zap size={24} className="text-passport-amber mb-4" />
              <h3 className="text-lg font-semibold text-passport-text mb-2">
                Stateless Scaling
              </h3>
              <p className="text-sm text-passport-muted leading-relaxed">
                No session state. JWT auth, horizontal scaling, and sub-50ms
                enforcement latency.
              </p>
            </GlassCard>

            <GlassCard delay={0.25}>
              <Key size={24} className="text-passport-green mb-4" />
              <h3 className="text-lg font-semibold text-passport-text mb-2">
                Secret Rotation
              </h3>
              <p className="text-sm text-passport-muted leading-relaxed">
                Automatic key rotation with zero-downtime revocation. Agents
                re-authenticate seamlessly.
              </p>
            </GlassCard>

            <GlassCard delay={0.3}>
              <FileCheck size={24} className="text-passport-azure mb-4" />
              <h3 className="text-lg font-semibold text-passport-text mb-2">
                Compliance Ready
              </h3>
              <p className="text-sm text-passport-muted leading-relaxed">
                Built-in GDPR/CCPA data handling, audit exports, and policy
                versioning for regulated industries.
              </p>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-passport-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-passport-text mb-4">
              How It Works
            </h2>
            <p className="text-passport-muted max-w-xl mx-auto">
              From policy creation to real-time enforcement in three steps.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 relative">
            {/* Connector line (desktop only) */}
            <div className="hidden md:block absolute top-12 left-[16.67%] right-[16.67%] h-px bg-passport-border" />
            <div className="hidden md:block absolute top-10 left-[33.33%] w-0 h-0 border-l-[5px] border-l-passport-border border-y-[4px] border-y-transparent" />
            <div className="hidden md:block absolute top-10 left-[66.67%] w-0 h-0 border-l-[5px] border-l-passport-border border-y-[4px] border-y-transparent" />

            {[
              {
                icon: <ShieldCheck size={28} className="text-passport-green" />,
                title: 'Create Policies',
                desc: 'Define allowed tools, domains, cost limits, and PII rules',
              },
              {
                icon: <UserPlus size={28} className="text-passport-azure" />,
                title: 'Register Agents',
                desc: 'Issue scoped credentials with automatic secret rotation',
              },
              {
                icon: <Zap size={28} className="text-passport-amber" />,
                title: 'Enforce Automatically',
                desc: 'Every tool call is intercepted and evaluated in real-time',
              },
            ].map((step, idx) => (
              <GlassCard key={step.title} delay={0.05 * (idx + 1)} className="text-center relative z-10">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-passport-surface border border-passport-border mb-4">
                  {step.icon}
                </div>
                <div className="label-text mb-2">Step {idx + 1}</div>
                <h3 className="text-lg font-semibold text-passport-text mb-2">{step.title}</h3>
                <p className="text-sm text-passport-muted leading-relaxed">{step.desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Code Snippet ─── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-passport-border">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-passport-text mb-8 text-center">
            Install in 30 Seconds
          </h2>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setCodeTab('sdk')}
              className={`px-4 py-1.5 rounded text-xs font-mono font-semibold transition-colors ${
                codeTab === 'sdk'
                  ? 'bg-passport-green/10 text-passport-green border border-passport-green/30'
                  : 'text-passport-muted hover:text-passport-text border border-transparent'
              }`}
            >
              SDK
            </button>
            <button
              onClick={() => setCodeTab('curl')}
              className={`px-4 py-1.5 rounded text-xs font-mono font-semibold transition-colors ${
                codeTab === 'curl'
                  ? 'bg-passport-green/10 text-passport-green border border-passport-green/30'
                  : 'text-passport-muted hover:text-passport-text border border-transparent'
              }`}
            >
              cURL
            </button>
          </div>

          {codeTab === 'sdk' ? <CodeBlock code={sdkCode} lang="typescript" /> : <CodeBlock code={curlCode} lang="bash" />}
        </div>
      </section>

      {/* ─── Live Demo Embed ─── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-passport-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-passport-text mb-4">
              See It In Action
            </h2>
            <p className="text-passport-muted max-w-xl mx-auto">
              Watch a simulated agent attempt dangerous actions — and get blocked in real-time.
            </p>
          </div>
          <div className="relative rounded-md overflow-hidden border border-passport-border bg-passport-surface">
            <div className="flex items-center justify-between px-4 py-2 border-b border-passport-border bg-passport-bg">
              <div className="flex items-center gap-2">
                <Radio size={12} className="text-passport-green animate-pulse" />
                <span className="font-mono text-[10px] text-passport-dim uppercase tracking-wider">Live Demo</span>
              </div>
              <Link href="/demo" className="flex items-center gap-1.5 text-[10px] font-mono text-passport-green hover:text-passport-text transition-colors">
                <ExternalLink size={10} />
                Open full demo
              </Link>
            </div>
            <div className="aspect-video bg-[#0a0c10] flex items-center justify-center">
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 px-6 py-3 bg-passport-coral hover:bg-[#e07055] text-white font-mono font-semibold text-sm rounded-md transition-all duration-200 shadow-[0_0_20px_rgba(247,129,102,0.2)] hover:shadow-[0_0_30px_rgba(247,129,102,0.35)] hover:-translate-y-0.5"
              >
                <Play size={18} fill="currentColor" />
                Start Interactive Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── As Seen On ─── */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 border-t border-passport-border">
        <div className="max-w-5xl mx-auto">
          <div className="font-mono text-[10px] uppercase tracking-widest text-passport-dim mb-6 text-center">
            As seen on
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 opacity-30">
            {['Hacker News', 'Product Hunt', 'Reddit r/MachineLearning', 'GitHub Trending'].map((name) => (
              <span key={name} className="text-passport-muted font-semibold text-xs sm:text-sm">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-passport-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-passport-text mb-14 text-center">
            Trusted by Engineering Teams
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                quote: 'We caught an agent trying to delete a production database before it happened.',
                name: 'Sarah Chen',
                title: 'Engineering Lead, SaaS Co',
              },
              {
                quote: 'Set up enforcement in 10 minutes. Sleep better at night.',
                name: 'Marcus Johnson',
                title: 'CTO, Fintech Startup',
              },
              {
                quote: 'The audit trail alone saved us during our SOC 2 review.',
                name: 'Aisha Patel',
                title: 'Security Engineer',
              },
            ].map((t, i) => (
              <GlassCard key={i} delay={0.05 * (i + 1)} className="flex flex-col">
                <div className="text-passport-green text-lg font-serif mb-4">"</div>
                <p className="text-sm text-passport-text leading-relaxed mb-6 flex-1">{t.quote}</p>
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} size={14} className="text-passport-amber fill-passport-amber" />
                  ))}
                </div>
                <div className="font-semibold text-passport-text text-sm">{t.name}</div>
                <div className="text-xs text-passport-muted">{t.title}</div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-passport-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-passport-text mb-4">Simple Pricing</h2>
            <div className="inline-flex items-center gap-2 bg-passport-surface border border-passport-border rounded-md p-1">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded text-xs font-mono font-semibold transition-colors ${
                  billingCycle === 'monthly' ? 'bg-passport-green/15 text-passport-green' : 'text-passport-muted hover:text-passport-text'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-1.5 rounded text-xs font-mono font-semibold transition-colors ${
                  billingCycle === 'annual' ? 'bg-passport-green/15 text-passport-green' : 'text-passport-muted hover:text-passport-text'
                }`}
              >
                Annual
              </button>
            </div>
            {billingCycle === 'annual' && (
              <p className="text-xs text-passport-green mt-2 animate-fade-in">2 months free with annual billing</p>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {/* Free */}
            <GlassCard hover={false} className="flex flex-col">
              <div className="label-text mb-2">Free</div>
              <div className="text-3xl font-bold text-passport-text mb-6">$0<span className="text-base font-normal text-passport-muted">/month</span></div>
              <ul className="space-y-3 mb-8 flex-1">
                {['1 organization', '3 agents', '100 enforcements/month', 'Basic policies', 'Community support'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-passport-muted">
                    <Check size={14} className="text-passport-green shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="btn-secondary w-full text-center">Get Started</Link>
            </GlassCard>

            {/* Pro */}
            <GlassCard hover={false} className="flex flex-col relative border-passport-green/30">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-passport-green text-[10px] font-mono font-bold text-white tracking-wider uppercase">
                Most Popular
              </div>
              <div className="label-text mb-2">Pro</div>
              <div className="text-3xl font-bold text-passport-text mb-6">
                ${billingCycle === 'annual' ? '24' : '29'}
                <span className="text-base font-normal text-passport-muted">/month</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {['Unlimited agents', '10,000 enforcements/month', 'Advanced policies + webhooks', 'Team members', 'Priority email support'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-passport-muted">
                    <Check size={14} className="text-passport-green shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={async () => {
                  if (!isLoggedIn()) {
                    window.location.href = '/register'
                    return
                  }
                  try {
                    const { url } = await createCheckoutSession('pro')
                    if (url) window.location.href = url
                  } catch (e: any) {
                    alert(e.message || 'Checkout failed')
                  }
                }}
                className="btn-primary w-full text-center"
              >
                Start Pro Trial
              </button>
            </GlassCard>

            {/* Enterprise */}
            <GlassCard hover={false} className="flex flex-col">
              <div className="label-text mb-2">Enterprise</div>
              <div className="text-3xl font-bold text-passport-text mb-6">Custom</div>
              <ul className="space-y-3 mb-8 flex-1">
                {['Unlimited everything', 'SSO/SAML', 'Custom contracts', 'Dedicated support', 'On-premise option'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-passport-muted">
                    <Check size={14} className="text-passport-green shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="btn-secondary w-full text-center">Contact Sales</Link>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-passport-border">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-passport-text mb-10 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            <FaqItem
              question="What is AI Agent Passport?"
              answer="It's like OAuth for AI agents. Instead of giving agents unrestricted API keys, you issue scoped credentials and define policies that enforce what they can and cannot do."
            />
            <FaqItem
              question="How is this different from API keys?"
              answer="API keys grant all-or-nothing access. Passport Agent enforces fine-grained policies in real-time — allowing, denying, or modifying every tool call before it executes."
            />
            <FaqItem
              question="Can I use this with OpenAI, Anthropic, or custom agents?"
              answer="Yes, the SDK works with any agent framework. Whether you're using LangChain, CrewAI, or a custom Python agent, you wrap tool calls with our enforcement layer."
            />
            <FaqItem
              question="Is my data secure?"
              answer="All audit logs are stored in your own Firebase project. We never see your data. Enterprise plans support on-premise deployment for full data sovereignty."
            />
            <FaqItem
              question="Do you support on-premise deployment?"
              answer="Yes, the entire system can run in your infrastructure. Contact sales for custom contracts and dedicated support."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-passport-border">
        <div className="max-w-3xl mx-auto text-center">
          <GlassCard className="p-10 sm:p-14" hover={false}>
            <Server size={32} className="text-passport-green mx-auto mb-6" />
            <h2 className="text-2xl sm:text-3xl font-bold text-passport-text mb-4">
              Ready to secure your agents?
            </h2>
            <p className="text-passport-muted mb-8 max-w-lg mx-auto">
              Get started in minutes. No credit card required for the self-hosted
              open-source version.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register" className="btn-primary text-base px-6 py-3">
                <Terminal size={16} />
                Create Organization
              </Link>
              <Link href="/login" className="btn-secondary text-base px-6 py-3">
                Sign In
              </Link>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 text-center border-t border-passport-border">
        <p className="font-mono text-[10px] text-passport-dim tracking-wider">
          Passport Agent v2.1 &middot; 2 runtime deps &middot; 18 endpoints &middot; Zero frameworks
        </p>
      </footer>
    </div>
  )
}
