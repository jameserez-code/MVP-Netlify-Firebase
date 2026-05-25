'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/navbar'
import GlassCard from '@/components/glass-card'
import TerminalCursor from '@/components/terminal-cursor'
import FeedbackWidget from '@/components/feedback-widget'
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
  Play,
  Radio,
  ArrowUp,
  Plus,
  Minus,
  ExternalLink,
  HeartPulse,
  Headphones,
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

function ScrollCountUp({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [value, setValue] = useState(0)
  const [triggered, setTriggered] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setTriggered(true)
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!triggered) return
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
  }, [triggered, target, duration])

  return <span ref={ref}>{value.toLocaleString()}</span>
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
      {/* Terminal window chrome */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-passport-border bg-passport-surface">
        <span className="w-2.5 h-2.5 rounded-full bg-[#f85149]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#d2991d]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#2ea043]" />
        <span className="ml-3 font-mono text-[10px] uppercase tracking-wider text-passport-dim">
          {lang === 'bash' ? 'terminal' : lang}
        </span>
        <div className="flex-1" />
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[10px] font-mono text-passport-muted hover:text-passport-text transition-colors"
          aria-label="Copy code"
        >
          {copied ? (
            <CheckCircle2 size={13} className="text-passport-green animate-bounce-check" />
          ) : (
            <Copy size={12} />
          )}
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
    if (part.startsWith('//')) return <span key={i} className="text-passport-coral italic">{part}</span>
    if (part === '{' || part === '}' || part === '(' || part === ')' || part === '[' || part === ']' || part === '=>')
      return <span key={i} className="text-passport-dim">{part}</span>
    return <span key={i}>{part}</span>
  })
}

/* ─── FAQ Accordion ─── */

function FaqItem({
  question,
  answer,
  defaultOpen = false,
  id,
}: {
  question: string
  answer: string
  defaultOpen?: boolean
  id: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div id={id} className="border border-passport-border rounded-md overflow-hidden scroll-mt-24">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-passport-surface/50 transition-colors min-h-[44px] gap-4"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-passport-text">{question}</span>
        <span
          className={`shrink-0 text-passport-muted transition-transform duration-300 ease-in-out ${open ? 'rotate-180' : 'rotate-0'}`}
        >
          {open ? <Minus size={16} /> : <Plus size={16} />}
        </span>
      </button>
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{ maxHeight: open ? '400px' : '0px' }}
      >
        <div className="px-5 pb-4 text-sm text-passport-muted leading-relaxed">
          {answer}
        </div>
      </div>
    </div>
  )
}

function StepCard({ step, index }: { step: { stepNum: string; icon: React.ReactNode; title: string; desc: string }; index: number }) {
  const { ref, visible } = useScrollAnimation(0.2)
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      <GlassCard className="text-center relative z-10 h-full" delay={0}>
        <div className="absolute top-3 right-4 font-mono text-5xl font-bold text-passport-dim/15 pointer-events-none select-none">
          {step.stepNum}
        </div>
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-passport-surface border border-passport-border mb-4 relative z-10">
          {step.icon}
        </div>
        <div className="label-text mb-1">Step {index + 1}</div>
        <h3 className="text-lg font-semibold text-passport-text mb-2 relative z-10">{step.title}</h3>
        <p className="text-sm text-passport-muted leading-relaxed">{step.desc}</p>
      </GlassCard>
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

/* ─── Subtle Code Rain ─── */
function CodeRain() {
  const chars = '{ } [ ] ( ) = > < / ; : * & | ! ? . , + - _ # @ $ % ^'
  const columns = 40
  const drops = useMemo(
    () =>
      Array.from({ length: columns }).map(() => ({
        top: Math.random() * 100,
        left: (Math.random() * 100),
        char: chars[Math.floor(Math.random() * chars.length)],
        opacity: 0.02 + Math.random() * 0.05,
        fontSize: 10 + Math.random() * 8,
        animDelay: Math.random() * 8,
      })),
    []
  )

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {drops.map((d, i) => (
        <span
          key={i}
          className="absolute font-mono text-passport-green animate-code-rain-fade"
          style={{
            top: `${d.top}%`,
            left: `${d.left}%`,
            opacity: d.opacity,
            fontSize: d.fontSize,
            animationDelay: `${d.animDelay}s`,
          }}
        >
          {d.char}
        </span>
      ))}
    </div>
  )
}

export default function LandingPage() {
  const [metrics, setMetrics] = useState<any>(null)
  const [codeTab, setCodeTab] = useState<'sdk' | 'curl'>('sdk')
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 })
  const currentYear = useMemo(() => new Date().getFullYear(), [])

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
            background: `radial-gradient(600px at ${mousePos.x * 100}% ${mousePos.y * 100}%, rgba(46,160,67,0.07) 0%, transparent 70%)`,
          }}
        />
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 hero-grid-bg opacity-25 pointer-events-none" />
        {/* Subtle code rain */}
        <CodeRain />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-passport-green/15 bg-passport-green/5 text-passport-green text-xs font-mono mb-8 animate-pulse-soft">
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

          {/* Trusted by counters */}
          <div className="flex flex-wrap items-center justify-center gap-8 mb-10">
            {[
              { value: 574, label: 'Tests Passing' },
              { value: 28, label: 'Routes' },
              { value: 45, label: 'Endpoints' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-mono text-2xl font-bold text-passport-green">
                  <ScrollCountUp target={stat.value} />
                  <span className="text-passport-green/60">+</span>
                </div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-passport-dim mt-1">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="btn-primary text-base px-8 py-3.5 w-full sm:w-auto btn-glow-hover">
              <Terminal size={16} />
              Start Building
              <ChevronRight size={16} />
            </Link>
            <Link href="/login" className="btn-secondary text-base px-8 py-3.5 w-full sm:w-auto">
              Sign In to Console
            </Link>
            <button
              onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
              className="btn-secondary text-base px-6 py-3.5 w-full sm:w-auto flex items-center gap-2"
            >
              <Play size={14} fill="currentColor" />
              Watch Demo
            </button>
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
        <div className="section-divider max-w-5xl mx-auto mb-12" />
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
        <div className="max-w-6xl mx-auto">
          <ScrollFadeHeading>
            <h2 className="text-3xl sm:text-4xl font-bold text-passport-text mb-4 text-center">
              The Problem {'\u0026'} The Solution
            </h2>
            <p className="text-passport-muted text-center max-w-xl mx-auto mb-14">
              Every AI agent deployment faces the same risks. Here's how Passport solves them.
            </p>
          </ScrollFadeHeading>

          <div className="grid md:grid-cols-2 gap-0 relative">
            {/* Animated divider */}
            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px z-10" style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(247,129,102,0.25) 20%, rgba(46,160,67,0.25) 50%, rgba(46,160,67,0.25) 80%, transparent 100%)' }} />
            <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-passport-green/30 blur-sm animate-pulse-soft z-20" />

            {/* Problem */}
            <div className="rounded-md p-6 md:p-8 relative" style={{ background: 'radial-gradient(ellipse at top right, rgba(248,81,73,0.06) 0%, transparent 60%)' }}>
              <h3 className="text-xl font-bold text-passport-text mb-2">
                Your AI Agents Are Unsupervised
              </h3>
              <p className="text-sm text-passport-muted mb-6 leading-relaxed">
                Without enforcement, AI agents with API keys can delete databases, leak customer data, and rack up $10K bills — and you won&apos;t know until it&apos;s too late.
              </p>
              <ul className="space-y-4">
                {[
                  'Agents with API keys have unrestricted access',
                  'No audit trail of what agents actually did',
                  'Policy changes require code deployments',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-passport-muted">
                    <span className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5 rounded-full bg-passport-red/10">
                      <X size={14} className="text-passport-coral" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Solution */}
            <div className="rounded-md p-6 md:p-8 relative" style={{ background: 'radial-gradient(ellipse at top left, rgba(46,160,67,0.06) 0%, transparent 60%)' }}>
              <h3 className="text-xl font-bold text-passport-text mb-2">
                Intercept. Verify. Log. BEFORE Execution.
              </h3>
              <p className="text-sm text-passport-muted mb-6 leading-relaxed">
                Passport Agent sits between your agent and its tools. Every tool call is intercepted, verified, and logged BEFORE execution.
              </p>
              <ul className="space-y-4">
                {[
                  'Pre-execution policy enforcement in &lt; 50ms',
                  'Immutable audit log with cryptographic signatures',
                  'Update policies without touching agent code',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-passport-muted">
                    <span className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5 rounded-full bg-passport-green/10">
                      <Check size={14} className="text-passport-green" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="section-divider mb-24" />
        <div className="max-w-6xl mx-auto">
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

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: <Shield size={20} className="text-passport-green" />, title: 'Agent Passports', desc: 'Cryptographically signed credentials that prove agent identity across any system.', borderClass: 'hover:border-passport-green/40', bgClass: 'bg-passport-green/10 border-passport-green/20' },
              { icon: <Lock size={20} className="text-passport-azure" />, title: 'Policy Enforcement', desc: 'Real-time intent evaluation with gateway tickets. Deny dangerous actions before they execute.', borderClass: 'hover:border-passport-azure/40', bgClass: 'bg-passport-azure/10 border-passport-azure/20' },
              { icon: <Eye size={20} className="text-passport-coral" />, title: 'Full Audit Trail', desc: 'Every action logged with cryptographic integrity. Timeline views and run traces included.', borderClass: 'hover:border-passport-coral/40', bgClass: 'bg-passport-coral/10 border-passport-coral/20' },
              { icon: <Zap size={20} className="text-passport-amber" />, title: 'Stateless Scaling', desc: 'No session state. JWT auth, horizontal scaling, and sub-50ms enforcement latency.', borderClass: 'hover:border-passport-amber/40', bgClass: 'bg-passport-amber/10 border-passport-amber/20' },
              { icon: <Key size={20} className="text-passport-green" />, title: 'Secret Rotation', desc: 'Automatic key rotation with zero-downtime revocation. Agents re-authenticate seamlessly.', borderClass: 'hover:border-passport-green/40', bgClass: 'bg-passport-green/10 border-passport-green/20' },
              { icon: <FileCheck size={20} className="text-passport-azure" />, title: 'Compliance Ready', desc: 'Built-in GDPR/CCPA data handling, audit exports, and policy versioning for regulated industries.', borderClass: 'hover:border-passport-azure/40', bgClass: 'bg-passport-azure/10 border-passport-azure/20' },
            ].map((feature, i) => (
              <GlassCard
                key={feature.title}
                delay={0.05 * (i + 1)}
                className={`h-full flex flex-col hover:scale-[1.02] transition-all duration-300 ${feature.borderClass}`}
              >
                <div className={`w-10 h-10 rounded-full ${feature.bgClass} flex items-center justify-center mb-4 shrink-0`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-passport-text mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-passport-muted leading-relaxed line-clamp-3 mb-3">
                  {feature.desc}
                </p>
                <div className="mt-auto pt-2">
                  <span className="text-xs font-mono text-passport-green hover:text-passport-text transition-colors cursor-pointer inline-flex items-center gap-1">
                    Learn more <ChevronRight size={10} />
                  </span>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Who Uses Passport Agent ─── */}
      <section id="use-cases" className="py-24 px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="section-divider mb-24" />
        <div className="max-w-6xl mx-auto">
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

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Card 1 */}
            <GlassCard delay={0.05} className="h-full flex flex-col hover:border-passport-green/40 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-passport-green/10 border border-passport-green/20 flex items-center justify-center shrink-0">
                  <Headphones size={18} className="text-passport-green" />
                </div>
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
                <div className="font-mono text-2xl font-bold text-passport-green">
                  <ScrollCountUp target={0} />
                </div>
                <div className="text-xs text-passport-muted mt-0.5">
                  unauthorized actions across 10K+ interactions/day
                </div>
              </div>
            </GlassCard>

            {/* Card 2 */}
            <GlassCard delay={0.1} className="h-full flex flex-col hover:border-passport-azure/40 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-passport-azure/10 border border-passport-azure/20 flex items-center justify-center shrink-0">
                  <TrendingUp size={18} className="text-passport-azure" />
                </div>
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

            {/* Card 3 */}
            <GlassCard delay={0.15} className="h-full flex flex-col hover:border-passport-coral/40 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-passport-coral/10 border border-passport-coral/20 flex items-center justify-center shrink-0">
                  <Server size={18} className="text-passport-coral" />
                </div>
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
                <div className="font-mono text-2xl font-bold text-passport-green">
                  <ScrollCountUp target={0} />
                </div>
                <div className="text-xs text-passport-muted mt-0.5">
                  production incidents in 6 months
                </div>
              </div>
            </GlassCard>

            {/* Card 4 */}
            <GlassCard delay={0.2} className="h-full flex flex-col hover:border-passport-amber/40 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-passport-amber/10 border border-passport-amber/20 flex items-center justify-center shrink-0">
                  <HeartPulse size={18} className="text-passport-amber" />
                </div>
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

            {/* Card 5 */}
            <GlassCard delay={0.25} className="h-full flex flex-col hover:border-passport-green/40 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-passport-green/10 border border-passport-green/20 flex items-center justify-center shrink-0">
                  <ShoppingCart size={18} className="text-passport-green" />
                </div>
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
                <div className="font-mono text-2xl font-bold text-passport-green">
                  <span>50</span><span className="text-passport-green/60">%</span> <span className="text-passport-text">Increase</span>
                </div>
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
        <div className="max-w-6xl mx-auto">
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
            <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-0.5" style={{ background: 'linear-gradient(90deg, rgba(46,160,67,0.4), rgba(46,160,67,0.2), rgba(46,160,67,0.4))' }} />
            <div className="hidden md:block absolute top-12 left-[50%] w-3 h-3 rounded-full bg-passport-green animate-connect-line -translate-x-1/2 -translate-y-1/2" />

            {[
              {
                stepNum: '01',
                icon: <ShieldCheck size={28} className="text-passport-green" />,
                title: 'Create Policies',
                desc: 'Define allowed tools, domains, cost limits, and PII rules in the dashboard or via the SDK.',
              },
              {
                stepNum: '02',
                icon: <UserPlus size={28} className="text-passport-azure" />,
                title: 'Register Agents',
                desc: 'Issue scoped credentials with automatic secret rotation and expiration.',
              },
              {
                stepNum: '03',
                icon: <Zap size={28} className="text-passport-amber" />,
                title: 'Enforce Automatically',
                desc: 'Every tool call is intercepted and evaluated in real-time with zero config.',
              },
            ].map((step, idx) => (
              <StepCard key={step.title} step={step} index={idx} />
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
              href="/playground"
              className="flex items-center gap-1.5 text-xs font-mono text-passport-green hover:text-passport-text transition-colors"
            >
              <Play size={12} />
              Try it in Playground
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
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                quote: 'We caught an agent trying to delete a production database before it happened.',
                name: 'Sarah Chen',
                title: 'Engineering Lead, SaaS Co',
                company: 'Acme AI',
              },
              {
                quote: 'Set up enforcement in 10 minutes. Sleep better at night.',
                name: 'Marcus Johnson',
                title: 'CTO, Fintech Startup',
                company: 'DataVault',
              },
              {
                quote: 'The audit trail alone saved us during our SOC 2 review.',
                name: 'Aisha Patel',
                title: 'Security Engineer',
                company: 'ByteForge',
              },
            ].map((t, i) => (
              <GlassCard key={i} delay={0.05 * (i + 1)} className="flex flex-col h-full hover:border-passport-green/20 hover:shadow-[0_0_24px_rgba(46,160,67,0.06)] transition-all duration-300">
                <div className="text-passport-green text-4xl font-serif leading-none mb-2 select-none">{"\u201C"}</div>
                <p className="text-sm text-passport-text leading-relaxed mb-6 flex-1">{t.quote}</p>
                <AnimatedStars count={5} delay={i * 200} />
                <div className="font-semibold text-passport-text text-sm">{t.name}</div>
                <div className="text-xs text-passport-muted">{t.title}</div>
                <div className="mt-2 pt-2 border-t border-passport-border/50">
                  <span className="font-mono text-[10px] text-passport-dim uppercase tracking-widest">{t.company}</span>
                </div>
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
            <p className="text-passport-muted text-sm mb-6">No credit card required. Cancel anytime.</p>
            <div className="inline-flex items-center gap-0 bg-passport-surface border border-passport-border rounded-md p-0.5 relative">
              <div
                className="absolute top-0.5 bottom-0.5 rounded bg-passport-green/15 transition-all duration-300 ease-in-out"
                style={{
                  left: billingCycle === 'monthly' ? '2px' : 'calc(50% + 1px)',
                  width: 'calc(50% - 3px)',
                }}
              />
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`relative z-10 px-4 py-1.5 rounded text-xs font-mono font-semibold transition-colors ${
                  billingCycle === 'monthly' ? 'text-passport-green' : 'text-passport-muted hover:text-passport-text'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`relative z-10 px-4 py-1.5 rounded text-xs font-mono font-semibold transition-colors ${
                  billingCycle === 'annual' ? 'text-passport-green' : 'text-passport-muted hover:text-passport-text'
                }`}
              >
                Annual
              </button>
            </div>
            {billingCycle === 'annual' && (
              <p className="text-xs text-passport-green mt-2 animate-fade-in">2 months free with annual billing</p>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Free */}
            <GlassCard hover={false} className="flex flex-col h-full transition-transform duration-300 hover:scale-[1.01]">
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
              <p className="text-[10px] text-passport-dim text-center mt-3 font-mono">No credit card required</p>
            </GlassCard>

            {/* Pro */}
            <GlassCard hover={false} className="flex flex-col relative border-passport-green/30 pro-card-glow h-full scale-[1.02]">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-passport-green text-[10px] font-mono font-bold text-white tracking-wider uppercase animate-badge-glow">
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
              <p className="text-[10px] text-passport-dim text-center mt-3 font-mono">30-day money-back guarantee</p>
            </GlassCard>

            {/* Enterprise */}
            <GlassCard hover={false} className="flex flex-col h-full transition-transform duration-300 hover:scale-[1.01]">
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
              <p className="text-[10px] text-passport-dim text-center mt-3 font-mono">Custom pricing {'\u0026'} SLAs</p>
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
              id="faq-1"
              defaultOpen
              question="What is AI Agent Passport?"
              answer="It's like OAuth for AI agents. Instead of giving agents unrestricted API keys, you issue scoped credentials and define policies that enforce what they can and cannot do."
            />
            <FaqItem
              id="faq-2"
              question="How is this different from API keys?"
              answer="API keys grant all-or-nothing access. Passport Agent enforces fine-grained policies in real-time — allowing, denying, or modifying every tool call before it executes."
            />
            <FaqItem
              id="faq-3"
              question="Can I use this with OpenAI, Anthropic, or custom agents?"
              answer="Yes, the SDK works with any agent framework. Whether you're using LangChain, CrewAI, or a custom Python agent, you wrap tool calls with our enforcement layer."
            />
            <FaqItem
              id="faq-4"
              question="Is my data secure?"
              answer="All audit logs are stored in your own Firebase project. We never see your data. Enterprise plans support on-premise deployment for full data sovereignty."
            />
            <FaqItem
              id="faq-5"
              question="Do you support on-premise deployment?"
              answer="Yes, the entire system can run in your infrastructure. Contact sales for custom contracts and dedicated support."
            />
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section id="cta" className="py-24 px-4 sm:px-6 lg:px-8 scroll-mt-20 relative">
        <div className="section-divider mb-24" />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(46,160,67,0.06) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 pointer-events-none animate-cta-glow opacity-50" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
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
              <p className="text-sm text-passport-text italic">{"\u201C"}Set up enforcement in 10 minutes. Best investment we made for our agent fleet.{"\u201D"}</p>
              <p className="text-xs text-passport-muted mt-2">— Marcus Johnson, CTO at DataVault</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="btn-primary text-base px-10 py-4 w-full sm:w-auto btn-glow-pulse font-mono font-bold"
              >
                <Terminal size={18} />
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
        <div className="section-divider max-w-3xl mx-auto" />
        <div className="max-w-3xl mx-auto text-center px-4 mt-8">
          <h3 className="text-2xl font-bold text-passport-text mb-4">Open Source</h3>
          <p className="text-passport-muted mb-6">Passport Agent is MIT licensed. Star us on GitHub.</p>
          <a href="https://github.com/jameserez-code/MVP-Netlify-Firebase" target="_blank" rel="noopener noreferrer" className="btn-primary px-6 py-3 text-base">
            <Star size={18} />
            Star on GitHub
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer id="footer" className="py-12 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(46,160,67,0.15), transparent)' }} />
        <div className="max-w-5xl mx-auto pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <h4 className="font-mono text-xs text-passport-text font-semibold tracking-wider mb-4">Product</h4>
              <ul className="space-y-2">
                <li><Link href="#features" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Features</Link></li>
                <li><Link href="/demo" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Demo</Link></li>
                <li><Link href="#pricing" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Pricing</Link></li>
                <li><Link href="/enterprise" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Enterprise</Link></li>
                <li><Link href="/roi" className="text-xs text-passport-muted hover:text-passport-text transition-colors">ROI Calculator</Link></li>
                <li><Link href="/compare" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Comparison</Link></li>
                <li><Link href="/changelog" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Changelog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-mono text-xs text-passport-text font-semibold tracking-wider mb-4">Developers</h4>
              <ul className="space-y-2">
                <li><Link href="/docs" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Documentation</Link></li>
                <li><Link href="/docs" className="text-xs text-passport-muted hover:text-passport-text transition-colors">API Reference</Link></li>
                <li><a href="https://www.npmjs.com/package/@passport-agent/sdk" target="_blank" rel="noopener noreferrer" className="text-xs text-passport-muted hover:text-passport-text transition-colors">SDK (npm)</a></li>
                <li><Link href="/playground" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Playground</Link></li>
                <li><a href="https://github.com/jameserez-code/MVP-Netlify-Firebase" target="_blank" rel="noopener noreferrer" className="text-xs text-passport-muted hover:text-passport-text transition-colors">GitHub</a></li>
                <li><Link href="/status" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Status</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-mono text-xs text-passport-text font-semibold tracking-wider mb-4">Company</h4>
              <ul className="space-y-2">
                <li><Link href="/blog" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Blog</Link></li>
                <li><Link href="/case-studies" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Case Studies</Link></li>
                <li><Link href="/security" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Security</Link></li>
                <li><Link href="/privacy" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Privacy</Link></li>
                <li><Link href="/terms" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Terms</Link></li>
                <li><a href="mailto:hello@passport-agent.com" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-mono text-xs text-passport-text font-semibold tracking-wider mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><Link href="/blog/why-every-ai-agent-needs-a-passport" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Getting Started</Link></li>
                <li><Link href="/docs" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Integrations</Link></li>
                <li><Link href="/dashboard/policies/templates" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Policy Templates</Link></li>
                <li><a href="https://discord.gg/passport-agent" target="_blank" rel="noopener noreferrer" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Community</a></li>
              </ul>
            </div>
          </div>
          <div className="text-center border-t border-passport-border/50 pt-6">
            <p className="font-mono text-[10px] text-passport-dim tracking-wider mb-2">
              {'\u00A9'} {currentYear} Passport Agent {'\u00B7'} Built by J. Rabinowitz
            </p>
            <p className="font-mono text-[9px] text-passport-dim/60 tracking-wider">
              v2.1 {'\u00B7'} 2 runtime deps {'\u00B7'} 18 endpoints {'\u00B7'} Zero frameworks
            </p>
          </div>
        </div>
      </footer>

      <BackToTop />
      <FeedbackWidget />
    </div>
  )
}
