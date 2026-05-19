'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import Navbar from '@/components/navbar'
import GlassCard from '@/components/glass-card'
import TerminalCursor from '@/components/terminal-cursor'
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

export default function LandingPage() {
  const [metrics, setMetrics] = useState<any>(null)

  useEffect(() => {
    fetch('http://localhost:3000/metrics')
      .then((r) => r.json())
      .then((d) => setMetrics(d))
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-passport-bg">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-passport-green/20 bg-passport-green/5 text-passport-green text-xs font-mono mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-passport-green animate-pulse-soft" />
            v2.0 — Now with Policy Enforcement
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
          Passport Agent v2.0 &middot; 2 runtime deps &middot; 18 endpoints &middot; Zero frameworks
        </p>
      </footer>
    </div>
  )
}
