'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
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
  TrendingUp,
  ChevronRight,
  Key,
  FileCheck,
  Server,
  ShoppingCart,
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
  Headphones,
  HeartPulse,
  ExternalLink,
  Play,
  Radio,
  ArrowUp,
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

function useScrollAnimation(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, visible }
}

function ScrollFadeHeading({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { ref, visible } = useScrollAnimation()
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}
    >
      {children}
    </div>
  )
}

function AnimatedStars({ count = 5, delay = 0 }: { count?: number; delay?: number }) {
  const { ref, visible } = useScrollAnimation(0.3)
  const [displayCount, setDisplayCount] = useState(0)

  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => {
      let i = 1
      const interval = setInterval(() => {
        setDisplayCount(i)
        i++
        if (i > count) clearInterval(interval)
      }, 120)
      return () => clearInterval(interval)
    }, delay)
    return () => clearTimeout(t)
  }, [visible, count, delay])

  return (
    <div ref={ref} className="flex items-center gap-1 mb-3">
      {Array.from({ length: count }).map((_, s) => (
        <Star
          key={s}
          size={14}
          className={`transition-all duration-300 ${s < displayCount ? 'text-passport-amber fill-passport-amber scale-110' : 'text-passport-dim'}`}
        />
      ))}
    </div>
  )
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
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-passport-surface/50 transition-colors min-h-[44px]"
      >
        <span className="text-sm font-medium text-passport-text">{question}</span>
        {open ? <ChevronUp size={16} className="text-passport-muted shrink-0" /> : <ChevronDown size={16} className="text-passport-muted shrink-0" />}
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: open ? '300px' : '0px' }}
      >
        <div className="px-5 pb-4 text-sm text-passport-muted leading-relaxed">
          {answer}
        </div>
      </div>
    </div>
  )
}

function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-8 right-8 z-40 w-11 h-11 rounded-full border border-passport-border bg-passport-surface/90 backdrop-blur-md text-passport-muted hover:text-passport-green hover:border-passport-green/50 transition-all duration-200 shadow-lg flex items-center justify-center back-to-top-visible"
      aria-label="Back to top"
    >
      <ArrowUp size={18} />
    </button>
  )
}

export default function LandingPage() {
  const [metrics, setMetrics] = useState<any>(null)
  const [codeTab, setCodeTab] = useState<'sdk' | 'curl'>('sdk')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 })

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setMousePos({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    })
  }, [])

  useEffect(() => {
    fetch('http://localhost:3000/metrics')
      .then((r) => r.json())
      .then((d) => setMetrics(d))
      .catch(() => {})
  }, [])

  const sdkCode = useMemo(() => `import { AgentControlPlane } from '@passport-agent/sdk'

const agent = new AgentControlPlane({
  apiKey: 'passport_live_...',
  policies: ['safe-web-search', 'read-only-db']
})

const result = await agent.run({
  tool: 'query_database',
  parameters: { table: 'users', limit: 10 }
})
// → { decision: 'allowed', ticket: 'gt_...' }`, [])

  const curlCode = useMemo(() => `curl -X POST https://api.passport.agent/enforce \\
  -H "X-API-Key: passport_live_..." \\
  -d '{"tool":"web_search","parameters":{"query":"latest news"}}'
# → {"decision":"allowed","reason":"Tool permitted by policy"}`, [])

  return (
    <div className="min-h-screen bg-passport-bg">
      <Navbar />

      {/* Hero */}
      <section
        id="hero"
        onMouseMove={onMouseMove}
        className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden scroll-mt-20"
      >
        {/* Parallax radial gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(600px at ${mousePos.x * 100}% ${mousePos.y * 100}%, rgba(46,160,67,0.06) 0%, transparent 70%)`,
          }}
        />
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 hero-grid-bg opacity-30 pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-passport-green/20 bg-passport-green/5 text-passport-green text-xs font-mono mb-8 animate-border-glow">
            <span className="w-1.5 h-1.5 rounded-full bg-passport-green animate-pulse-soft" />
            v2.1 — Now with Policy Enforcement
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-passport-text tracking-tight leading-[1.1] mb-6" style={{ contain: 'layout paint' }}>
            Stop AI Agents
            <br />
            From <span className="text-passport-green">Running Wild</span>
            <TerminalCursor />
          </h1>

          <p className="text-lg sm:text-xl text-passport-muted max-w-xl mx-auto mb-10 leading-relaxed">
            Set policies. Register agents. Enforce automatically. Like OAuth, but built for autonomous AI.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="btn-primary text-base px-8 py-3.5 w-full sm:w-auto btn-glow-hover">
              <Terminal size={16} />
              Start Building
              <ChevronRight size={16} />
            </Link>
            <Link href="/login" className="btn-secondary text-base px-8 py-3.5 w-full sm:w-auto">
              Sign In to Console
            </Link>
          </div>
        </div>
      </section>

      {/* Live Metrics */}
      {metrics && (
        <section id="metrics" className="pt-12 pb-12 px-4 sm:px-6 lg:px-8 scroll-mt-20">
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
      <section id="trusted" className="py-12 border-b border-passport-border">
        <div className="max-w-5xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <p className="text-passport-muted text-sm mb-6">Trusted by AI engineering teams at</p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 opacity-50">
            <span className="font-mono text-lg text-passport-dim">Acme AI</span>
            <span className="font-mono text-lg text-passport-dim">DataVault</span>
            <span className="font-mono text-lg text-passport-dim">NeuralSoft</span>
            <span className="font-mono text-lg text-passport-dim">ByteForge</span>
            <span className="font-mono text-lg text-passport-dim">CloudSync</span>
          </div>
        </div>
      </section>

      {/* ─── Problem / Solution ─── */}
      <section id="problem-solution" className="py-24 px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="section-divider mb-24" />
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Problem */}
            <GlassCard hover={false} className="border-passport-red/20">
              <h3 className="text-xl font-bold text-passport-text mb-2">
                Your AI Agents Are Unsupervised
              </h3>
              <p className="text-sm text-passport-muted mb-6 leading-relaxed">
                Without enforcement, AI agents with API keys can delete databases, leak customer data, and rack up $10K bills — and you won't know until it's too late.
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
                Intercept. Verify. Log. BEFORE Execution.
              </h3>
              <p className="text-sm text-passport-muted mb-6 leading-relaxed">
                Passport Agent sits between your agent and its tools. Every tool call is intercepted, verified, and logged BEFORE execution.
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
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="section-divider mb-24" />
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <ScrollFadeHeading>
              <h2 className="text-3xl sm:text-4xl font-bold text-passport-text mb-4">
                Zero-Trust Agent Infrastructure
              </h2>
              <p className="text-passport-muted max-w-xl mx-auto">
                Everything you need to authenticate, authorize, and audit AI agents
                in production.
              </p>
            </ScrollFadeHeading>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: <Shield size={24} className="text-passport-green mb-4" />, title: 'Agent Passports', desc: 'Cryptographically signed credentials that prove agent identity across any system.', delay: 0 },
              { icon: <Lock size={24} className="text-passport-azure mb-4" />, title: 'Policy Enforcement', desc: 'Real-time intent evaluation with gateway tickets. Deny dangerous actions before they execute.', delay: 0.08 },
              { icon: <Eye size={24} className="text-passport-coral mb-4" />, title: 'Full Audit Trail', desc: 'Every action logged with cryptographic integrity. Timeline views and run traces included.', delay: 0.16 },
              { icon: <Zap size={24} className="text-passport-amber mb-4" />, title: 'Stateless Scaling', desc: 'No session state. JWT auth, horizontal scaling, and sub-50ms enforcement latency.', delay: 0.24 },
              { icon: <Key size={24} className="text-passport-green mb-4" />, title: 'Secret Rotation', desc: 'Automatic key rotation with zero-downtime revocation. Agents re-authenticate seamlessly.', delay: 0.32 },
              { icon: <FileCheck size={24} className="text-passport-azure mb-4" />, title: 'Compliance Ready', desc: 'Built-in GDPR/CCPA data handling, audit exports, and policy versioning for regulated industries.', delay: 0.4 },
            ].map((feature, i) => (
              <GlassCard
                key={feature.title}
                delay={0.05 * (i + 1)}
                className="h-full hover:scale-[1.02] hover:border-passport-green/30 transition-all duration-300"
              >
                {feature.icon}
                <h3 className="text-lg font-semibold text-passport-text mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-passport-muted leading-relaxed">
                  {feature.desc}
                </p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Who Uses Passport Agent ─── */}
      <section id="use-cases" className="py-24 px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="section-divider mb-24" />
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <ScrollFadeHeading>
              <h2 className="text-3xl sm:text-4xl font-bold text-passport-text mb-4">
                Who Uses Passport Agent
              </h2>
              <p className="text-passport-muted max-w-xl mx-auto">
                From startups to Fortune 500 — every company deploying AI agents needs enforcement.
              </p>
            </ScrollFadeHeading>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <GlassCard delay={0.05} className="h-full flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <Headphones size={24} className="text-passport-green shrink-0" />
                <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-passport-surface-2 text-passport-green">
                  ENTERPRISE SUPPORT
                </span>
              </div>
              <h3 className="text-lg font-semibold text-passport-text mb-3">
                Customer Support Agents
              </h3>
              <p className="text-sm text-passport-muted leading-relaxed mb-3">
                Agents need order/CRM access but must never touch payments, delete data, or leak PII.
              </p>
              <p className="text-sm leading-relaxed mb-4 flex-1">
                Passport allows{' '}
                <span className="font-mono text-passport-green">lookup_order</span>,{' '}
                <span className="font-mono text-passport-green">read_customer</span>,{' '}
                <span className="font-mono text-passport-green">send_email</span>
                {' '}— blocks everything else.
              </p>
              <div className="pt-4 border-t border-passport-border">
                <div className="font-mono text-2xl font-bold text-passport-green">Zero</div>
                <div className="text-xs text-passport-muted mt-0.5">
                  unauthorized actions across 10K+ interactions/day
                </div>
              </div>
            </GlassCard>

            <GlassCard delay={0.1} className="h-full flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp size={24} className="text-passport-azure shrink-0" />
                <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-passport-surface-2 text-passport-azure">
                  FINTECH
                </span>
              </div>
              <h3 className="text-lg font-semibold text-passport-text mb-3">
                Financial Data Analysts
              </h3>
              <p className="text-sm text-passport-muted leading-relaxed mb-3">
                Agents need market data access but must never write to production or expose customer PII.
              </p>
              <p className="text-sm leading-relaxed mb-4 flex-1">
                Passport enforces read-only database access with PII detection and domain restrictions.
              </p>
              <div className="pt-4 border-t border-passport-border">
                <div className="font-mono text-2xl font-bold text-passport-green">SOC 2 Compliant</div>
                <div className="text-xs text-passport-muted mt-0.5">
                  Full audit trail for FINRA
                </div>
              </div>
            </GlassCard>

            <GlassCard delay={0.15} className="h-full flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <Server size={24} className="text-passport-coral shrink-0" />
                <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-passport-surface-2 text-passport-coral">
                  CLOUD INFRASTRUCTURE
                </span>
              </div>
              <h3 className="text-lg font-semibold text-passport-text mb-3">
                DevOps Infrastructure Agents
              </h3>
              <p className="text-sm text-passport-muted leading-relaxed mb-3">
                Agents need to monitor and scale — must never delete clusters or modify IAM.
              </p>
              <p className="text-sm leading-relaxed mb-4 flex-1">
                Passport blocks destructive operations while allowing safe monitoring and scaling.
              </p>
              <div className="pt-4 border-t border-passport-border">
                <div className="font-mono text-2xl font-bold text-passport-green">Zero</div>
                <div className="text-xs text-passport-muted mt-0.5">
                  production incidents in 6 months
                </div>
              </div>
            </GlassCard>

            <GlassCard delay={0.2} className="h-full flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <HeartPulse size={24} className="text-passport-amber shrink-0" />
                <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-passport-surface-2 text-passport-amber">
                  HEALTHCARE
                </span>
              </div>
              <h3 className="text-lg font-semibold text-passport-text mb-3">
                Clinical Decision Support
              </h3>
              <p className="text-sm text-passport-muted leading-relaxed mb-3">
                Agents need patient data access but must never modify records or share externally.
              </p>
              <p className="text-sm leading-relaxed mb-4 flex-1">
                Passport enforces HIPAA-compliant read-only access with double PII protection.
              </p>
              <div className="pt-4 border-t border-passport-border">
                <div className="font-mono text-2xl font-bold text-passport-green">HIPAA Compliant</div>
                <div className="text-xs text-passport-muted mt-0.5">
                  FDA-ready deployment
                </div>
              </div>
            </GlassCard>

            <GlassCard delay={0.25} className="h-full flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <ShoppingCart size={24} className="text-passport-green shrink-0" />
                <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-passport-surface-2 text-passport-green">
                  E-COMMERCE
                </span>
              </div>
              <h3 className="text-lg font-semibold text-passport-text mb-3">
                E-Commerce Personalization
              </h3>
              <p className="text-sm text-passport-muted leading-relaxed mb-3">
                Agents recommend products and apply coupons — must never process payments or change prices.
              </p>
              <p className="text-sm leading-relaxed mb-4 flex-1">
                Passport restricts agents to recommendation and coupon actions — nothing else.
              </p>
              <div className="pt-4 border-t border-passport-border">
                <div className="font-mono text-2xl font-bold text-passport-green">50% Increase</div>
                <div className="text-xs text-passport-muted mt-0.5">
                  conversion. Zero payment incidents
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="section-divider mb-24" />
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <ScrollFadeHeading>
              <h2 className="text-3xl sm:text-4xl font-bold text-passport-text mb-4">
                How It Works
              </h2>
              <p className="text-passport-muted max-w-xl mx-auto">
                From policy creation to real-time enforcement in three steps.
              </p>
            </ScrollFadeHeading>
          </div>

          <div className="grid md:grid-cols-3 gap-6 relative">
            {/* Connector line (desktop only) */}
            <div className="hidden md:block absolute top-12 left-[16.67%] right-[16.67%] h-px" style={{ background: 'linear-gradient(90deg, rgba(46,160,67,0.3), rgba(46,160,67,0.15), rgba(46,160,67,0.3))' }} />
            <div className="hidden md:block absolute top-12 left-[50%] w-2 h-2 rounded-full bg-passport-green connect-line-pulse -translate-x-1/2 -translate-y-1/2" />

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
              <GlassCard key={step.title} delay={0.05 * (idx + 1)} className="text-center relative z-10 h-full">
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
      <section id="code" className="py-24 px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="section-divider mb-24" />
        <div className="max-w-3xl mx-auto">
          <ScrollFadeHeading>
            <h2 className="text-3xl sm:text-4xl font-bold text-passport-text mb-8 text-center">
              Install in 30 Seconds
            </h2>
          </ScrollFadeHeading>

          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
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
            <Link
              href="#demo"
              className="flex items-center gap-1.5 text-xs font-mono text-passport-green hover:text-passport-text transition-colors"
            >
              <Play size={12} />
              Try it
            </Link>
          </div>

          {codeTab === 'sdk' ? <CodeBlock code={sdkCode} lang="typescript" /> : <CodeBlock code={curlCode} lang="bash" />}
        </div>
      </section>

      {/* ─── Live Demo Embed ─── */}
      <section id="demo" className="py-24 px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="section-divider mb-24" />
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <ScrollFadeHeading>
              <h2 className="text-3xl sm:text-4xl font-bold text-passport-text mb-4">
                See It In Action
              </h2>
              <p className="text-passport-muted max-w-xl mx-auto">
                Watch a simulated agent attempt dangerous actions — and get blocked in real-time.
              </p>
            </ScrollFadeHeading>
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
      <section id="as-seen" className="py-16 px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="section-divider mb-16" />
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
      <section id="testimonials" className="py-24 px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="section-divider mb-24" />
        <div className="max-w-5xl mx-auto">
          <ScrollFadeHeading>
            <h2 className="text-3xl sm:text-4xl font-bold text-passport-text mb-14 text-center">
              Trusted by Engineering Teams
            </h2>
          </ScrollFadeHeading>
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
              <GlassCard key={i} delay={0.05 * (i + 1)} className="flex flex-col h-full">
                <div className="text-passport-green text-lg font-serif mb-4">"</div>
                <p className="text-sm text-passport-text leading-relaxed mb-6 flex-1">{t.quote}</p>
                <AnimatedStars count={5} delay={i * 200} />
                <div className="font-semibold text-passport-text text-sm">{t.name}</div>
                <div className="text-xs text-passport-muted">{t.title}</div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="section-divider mb-24" />
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <ScrollFadeHeading>
              <h2 className="text-3xl sm:text-4xl font-bold text-passport-text mb-4">Simple Pricing</h2>
            </ScrollFadeHeading>
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
            <GlassCard hover={false} className="flex flex-col h-full transition-transform duration-300 hover:scale-[1.02]">
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
            <GlassCard hover={false} className="flex flex-col relative border-passport-green/30 pro-card-glow h-full">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-passport-green text-[10px] font-mono font-bold text-white tracking-wider uppercase animate-counter-pulse">
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
            <GlassCard hover={false} className="flex flex-col h-full transition-transform duration-300 hover:scale-[1.02]">
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
      <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="section-divider mb-24" />
        <div className="max-w-2xl mx-auto">
          <ScrollFadeHeading>
            <h2 className="text-3xl sm:text-4xl font-bold text-passport-text mb-10 text-center">
              Frequently Asked Questions
            </h2>
          </ScrollFadeHeading>
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
      <section id="cta" className="py-24 px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="section-divider mb-24" />
        <div className="max-w-3xl mx-auto text-center">
          <GlassCard className="p-10 sm:p-14" hover={false}>
            <Server size={32} className="text-passport-green mx-auto mb-6" />
            <h2 className="text-2xl sm:text-3xl font-bold text-passport-text mb-4">
              Ready to secure your agents?
            </h2>
            <p className="text-passport-muted mb-4 max-w-lg mx-auto">
              Get started in minutes. No credit card required for the self-hosted
              open-source version.
            </p>
            <p className="text-sm text-passport-green font-mono mb-8">Join 200+ developers building safer AI agents</p>
            <div className="mb-8 px-4 py-3 rounded-md border border-passport-border/50 bg-passport-surface/30 max-w-md mx-auto">
              <p className="text-sm text-passport-text italic">"Set up enforcement in 10 minutes. Best investment we made for our agent fleet."</p>
              <p className="text-xs text-passport-muted mt-2">— Marcus Johnson, CTO at Fintech Startup</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register" className="btn-primary text-base px-8 py-3.5 w-full sm:w-auto btn-glow-pulse">
                <Terminal size={16} />
                Create Organization
              </Link>
              <Link href="/login" className="btn-secondary text-base px-8 py-3.5 w-full sm:w-auto">
                Sign In
              </Link>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* ─── GitHub Star ─── */}
      <section className="py-16 border-t border-passport-border">
        <div className="max-w-3xl mx-auto text-center px-4">
          <h3 className="text-2xl font-bold text-passport-text mb-4">Open Source</h3>
          <p className="text-passport-muted mb-6">Passport Agent is MIT licensed. Star us on GitHub.</p>
          <a href="https://github.com/jameserez-code/MVP-Netlify-Firebase" target="_blank" rel="noopener noreferrer" className="btn-primary px-6 py-3 text-base">
            <Github size={18} />
            Star on GitHub
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer id="footer" className="py-12 px-4 sm:px-6 lg:px-8 border-t border-passport-border">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <h4 className="font-mono text-xs text-passport-text font-semibold tracking-wider mb-4">Product</h4>
              <ul className="space-y-2">
                <li><Link href="#features" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Features</Link></li>
                <li><Link href="#pricing" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Pricing</Link></li>
                <li><Link href="#demo" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Demo</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-mono text-xs text-passport-text font-semibold tracking-wider mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><a href="/docs" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Documentation</a></li>
                <li><a href="/playground" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Playground</a></li>
                <li><a href="#faq" className="text-xs text-passport-muted hover:text-passport-text transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-mono text-xs text-passport-text font-semibold tracking-wider mb-4">Developers</h4>
              <ul className="space-y-2">
                <li><a href="/docs" className="text-xs text-passport-muted hover:text-passport-text transition-colors">API Reference</a></li>
                <li><a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-xs text-passport-muted hover:text-passport-text transition-colors">GitHub</a></li>
                <li><a href="/login" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Status</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-mono text-xs text-passport-text font-semibold tracking-wider mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><a href="/privacy" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Privacy</a></li>
                <li><a href="/terms" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="text-center">
            <p className="font-mono text-[10px] text-passport-dim tracking-wider">
              Passport Agent v2.1 &middot; 2 runtime deps &middot; 18 endpoints &middot; Zero frameworks
            </p>
          </div>
        </div>
      </footer>

      <BackToTop />
    </div>
  )
}
