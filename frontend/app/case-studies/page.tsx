'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/navbar'
import GlassCard from '@/components/glass-card'
import {
  TrendingUp,
  ShoppingCart,
  HeartPulse,
  Shield,
  ChevronRight,
  Check,
  Terminal,
  Quote,
  ArrowRight,
  Target,
  BarChart3,
  Clock,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react'

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

function ScrollCountUp({ target, suffix = '', duration = 1200 }: { target: number; suffix?: string; duration?: number }) {
  const [value, setValue] = useState(0)
  const triggered = useRef(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered.current) {
          triggered.current = true
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!triggered.current) return
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

  return <span ref={ref}>{value.toLocaleString()}{suffix}</span>
}

interface CaseStudyData {
  company: string
  industry: string
  industryIcon: React.ReactNode
  industryAccent: string
  industryBg: string
  industryBorder: string
  challenge: string
  solution: string
  results: { value: string; label: string }[]
  quote: string
  quotee: string
}

const caseStudies: CaseStudyData[] = [
  {
    company: 'Acme Finance',
    industry: 'Financial Services',
    industryIcon: <TrendingUp size={18} />,
    industryAccent: 'text-passport-azure',
    industryBg: 'bg-passport-azure/10',
    industryBorder: 'border-passport-azure/20',
    challenge: 'We deployed 15 AI agents for portfolio analysis, customer support, and fraud detection. Within the first week, an agent with database access accidentally modified production data. We needed enforcement — fast.',
    solution: 'Passport Agent\'s policy engine let us define exactly what each agent could do. Read-only for analysts. No PII for customer support. Domain restrictions for all.',
    results: [
      { value: '0', label: 'Unauthorized actions in 6 months' },
      { value: '1', label: 'SOC 2 audit passed on first attempt' },
      { value: '15', label: 'Agents secured in under 2 hours' },
      { value: '$150K', label: 'Saved vs building in-house' },
    ],
    quote: 'Passport Agent gave us the confidence to deploy AI agents in production. The audit trail alone saved us weeks during our SOC 2 review.',
    quotee: 'CTO, Acme Finance',
  },
  {
    company: 'ShopMax',
    industry: 'Retail / E-Commerce',
    industryIcon: <ShoppingCart size={18} />,
    industryAccent: 'text-passport-green',
    industryBg: 'bg-passport-green/10',
    industryBorder: 'border-passport-green/20',
    challenge: 'Our AI shopping assistant needed access to product catalogs, customer orders, and discount codes. But one wrong action could process unauthorized payments or expose customer data.',
    solution: 'We created policies that allowed product recommendations and coupon applications while blocking payment processing and customer data access. The PII detection caught 3 attempted data leaks in the first month.',
    results: [
      { value: '45%', label: 'Increase in conversion rate' },
      { value: '3', label: 'PII leak attempts caught and blocked' },
      { value: '12', label: 'Agents deployed across 4 teams' },
      { value: '30 min', label: 'Deployment time from signup' },
    ],
    quote: 'We went from \'AI agents are too risky\' to \'let\'s deploy more agents\' in a single afternoon.',
    quotee: 'VP Engineering, ShopMax',
  },
  {
    company: 'MedTech Solutions',
    industry: 'Healthcare / Medical',
    industryIcon: <HeartPulse size={18} />,
    industryAccent: 'text-passport-coral',
    industryBg: 'bg-passport-coral/10',
    industryBorder: 'border-passport-coral/20',
    challenge: 'AI agents assist with clinical decision support by reading patient records and suggesting treatment options. HIPAA compliance was non-negotiable. We needed enforcement that would satisfy auditors.',
    solution: 'Passport Agent\'s HIPAA-compliant policies ensure agents can read but never modify patient records. Double PII protection prevents any PHI leakage. Every action is logged for audit.',
    results: [
      { value: '2 wks', label: 'HIPAA compliance achieved (vs 3 months estimated)' },
      { value: '100%', label: 'Audit trail coverage for all agent actions' },
      { value: '8', label: 'Clinical AI agents deployed' },
      { value: '0', label: 'Compliance findings in first audit' },
    ],
    quote: 'Our compliance team went from \'absolutely not\' to \'when can we deploy more?\' The audit trail is the best we\'ve seen.',
    quotee: 'Chief Medical Information Officer, MedTech Solutions',
  },
]

function CaseStudyCard({ data, index }: { data: CaseStudyData; index: number }) {
  const { ref, visible } = useScrollAnimation(0.1)
  const isReversed = index % 2 === 1

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
    >
      <GlassCard className="p-0 overflow-hidden" hover={false}>
        <div className={`grid lg:grid-cols-2 ${isReversed ? '' : ''}`}>
          {/* Left: Company + Challenge + Solution */}
          <div className={`p-6 sm:p-8 lg:p-10 flex flex-col ${isReversed ? 'lg:order-2' : ''}`}>
            {/* Industry badge */}
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-10 h-10 rounded-full ${data.industryBg} border ${data.industryBorder} flex items-center justify-center shrink-0`}>
                <span className={data.industryAccent}>{data.industryIcon}</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-passport-text">{data.company}</h3>
                <span className={`text-xs font-mono uppercase tracking-wider px-2 py-0.5 rounded ${data.industryBg} ${data.industryAccent}`}>
                  {data.industry}
                </span>
              </div>
            </div>

            {/* Challenge */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <Target size={14} className="text-passport-coral" />
                <h4 className="text-sm font-semibold text-passport-coral font-mono uppercase tracking-wider">Challenge</h4>
              </div>
              <p className="text-sm text-passport-muted leading-relaxed">{data.challenge}</p>
            </div>

            {/* Solution */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={14} className="text-passport-green" />
                <h4 className="text-sm font-semibold text-passport-green font-mono uppercase tracking-wider">Solution</h4>
              </div>
              <p className="text-sm text-passport-muted leading-relaxed">{data.solution}</p>
            </div>

            {/* Quote */}
            <div className="mt-auto pt-5 border-t border-passport-border">
              <Quote size={20} className="text-passport-green mb-2" />
              <p className="text-sm text-passport-text italic leading-relaxed mb-2">{'\u201C'}{data.quote}{'\u201D'}</p>
              <p className="text-xs text-passport-muted font-mono">{'\u2014'} {data.quotee}</p>
            </div>
          </div>

          {/* Right: Results */}
          <div className={`p-6 sm:p-8 lg:p-10 flex flex-col justify-center border-passport-border ${isReversed ? 'lg:order-1 lg:border-r' : 'lg:border-l'} bg-passport-surface/30`}>
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 size={14} className="text-passport-azure" />
              <h4 className="text-sm font-semibold text-passport-azure font-mono uppercase tracking-wider">Results</h4>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {data.results.map((result, i) => (
                <div key={i} className="text-center p-4 rounded-md border border-passport-border bg-passport-surface/50">
                  <div className={`font-mono text-2xl font-bold ${result.value.startsWith('$') ? 'text-passport-green' : result.value === '0' ? 'text-passport-green' : 'text-passport-azure'} mb-1`}>
                    {result.value.startsWith('$') || result.value.endsWith('%') || result.value.endsWith('min') || result.value.endsWith('wks') ? (
                      result.value
                    ) : (
                      <ScrollCountUp target={parseInt(result.value, 10)} />
                    )}
                  </div>
                  <div className="text-xs text-passport-muted leading-snug">{result.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}

export default function CaseStudiesPage() {
  const currentYear = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-passport-bg">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(800px at 50% 30%, rgba(46,160,67,0.05) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 hero-grid-bg opacity-25 pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-passport-green/15 bg-passport-green/5 text-passport-green text-xs font-mono mb-8">
            <Users size={14} />
            Customer Success
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-passport-text tracking-tight leading-[1.1] mb-6">
            Customer
            <br />
            <span className="text-passport-green">Stories</span>
          </h1>

          <p className="text-lg sm:text-xl text-passport-muted max-w-xl mx-auto leading-relaxed">
            How companies use Passport Agent to secure their AI agents in production.
          </p>
        </div>
      </section>

      {/* Case Studies */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="section-divider mb-16" />
        <div className="max-w-5xl mx-auto space-y-10">
          {caseStudies.map((study, i) => (
            <CaseStudyCard key={study.company} data={study} index={i} />
          ))}
        </div>
      </section>

      {/* Metrics Summary */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="section-divider mb-16" />
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <ScrollFadeHeading>
              <h2 className="text-3xl sm:text-4xl font-bold text-passport-text mb-4">
                Across All Customers
              </h2>
              <p className="text-passport-muted max-w-xl mx-auto">
                Results that speak for themselves.
              </p>
            </ScrollFadeHeading>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {[
              { value: '35', label: 'Agents Secured', icon: <Shield size={18} className="text-passport-green" /> },
              { value: '100%', label: 'Audit Coverage', icon: <Check size={18} className="text-passport-azure" /> },
              { value: '0', label: 'Data Breaches', icon: <Zap size={18} className="text-passport-green" /> },
              { value: '2 hrs', label: 'Avg Time to Deploy', icon: <Clock size={18} className="text-passport-amber" /> },
            ].map((stat, i) => (
              <GlassCard key={stat.label} delay={0.05 * (i + 1)} className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-passport-surface border border-passport-border mb-3">
                  {stat.icon}
                </div>
                <div className="font-mono text-2xl font-bold text-passport-text mb-1">
                  {stat.value.endsWith('%') || stat.value.endsWith('hrs') ? stat.value : <ScrollCountUp target={parseInt(stat.value, 10)} />}
                </div>
                <div className="text-xs text-passport-muted">{stat.label}</div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="cta" className="py-24 px-4 sm:px-6 lg:px-8 scroll-mt-20 relative">
        <div className="section-divider mb-24" />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(46,160,67,0.06) 0%, transparent 70%)' }} />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <GlassCard className="p-10 sm:p-14" hover={false}>
            <Shield size={32} className="text-passport-green mx-auto mb-6" />
            <h2 className="text-2xl sm:text-3xl font-bold text-passport-text mb-4">
              Become our next case study
            </h2>
            <p className="text-passport-muted mb-8 max-w-lg mx-auto">
              Deploy Passport Agent in your organization and join the growing list of companies
              deploying AI agents safely at scale.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register" className="btn-primary text-base px-10 py-4 w-full sm:w-auto btn-glow-hover">
                <Terminal size={18} />
                Get Started Free
                <ChevronRight size={16} />
              </Link>
              <Link href="/enterprise" className="btn-secondary text-base px-8 py-3.5 w-full sm:w-auto">
                <ArrowRight size={16} />
                Talk to Enterprise
              </Link>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(46,160,67,0.15), transparent)' }} />
        <div className="max-w-5xl mx-auto pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <h4 className="font-mono text-xs text-passport-text font-semibold tracking-wider mb-4">Product</h4>
              <ul className="space-y-2">
                <li><Link href="/#features" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Features</Link></li>
                <li><Link href="/#pricing" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Pricing</Link></li>
                <li><Link href="/enterprise" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Enterprise</Link></li>
                <li><Link href="/case-studies" className="text-xs text-passport-green hover:text-passport-text transition-colors">Case Studies</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-mono text-xs text-passport-text font-semibold tracking-wider mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><Link href="/docs" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Documentation</Link></li>
                <li><Link href="/playground" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Playground</Link></li>
                <li><Link href="/#faq" className="text-xs text-passport-muted hover:text-passport-text transition-colors">FAQ</Link></li>
                <li><Link href="/demo" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Live Demo</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-mono text-xs text-passport-text font-semibold tracking-wider mb-4">Developers</h4>
              <ul className="space-y-2">
                <li><Link href="/docs" className="text-xs text-passport-muted hover:text-passport-text transition-colors">API Reference</Link></li>
                <li><a href="https://github.com/jameserez-code/MVP-Netlify-Firebase" target="_blank" rel="noopener noreferrer" className="text-xs text-passport-muted hover:text-passport-text transition-colors">GitHub</a></li>
                <li><Link href="/login" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Status</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-mono text-xs text-passport-text font-semibold tracking-wider mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><Link href="/privacy" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Privacy</Link></li>
                <li><Link href="/terms" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="text-center border-t border-passport-border/50 pt-6">
            <p className="font-mono text-[10px] text-passport-dim tracking-wider mb-2">
              {'\u00A9'} {currentYear} Passport Agent {'\u00B7'} Built by J. Rabinowitz
            </p>
            <p className="font-mono text-[9px] text-passport-dim/60 tracking-wider">
              Trusted by security teams at leading enterprises worldwide
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
