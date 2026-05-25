'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/navbar'
import GlassCard from '@/components/glass-card'
import {
  Building2,
  FileCheck,
  HeartPulse,
  Clock,
  Headphones,
  Server,
  Lock,
  Eye,
  Globe,
  ShieldAlert,
  Bug,
  Shield,
  ChevronRight,
  Check,
  Terminal,
  BadgeCheck,
  Database,
  Key,
  ArrowRight,
  Users,
  Target,
  X,
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

const features = [
  {
    icon: <Users size={22} className="text-passport-azure" />,
    title: 'SSO & SAML',
    desc: 'Okta, Azure AD, Google Workspace — integrate with your existing identity provider.',
    borderClass: 'hover:border-passport-azure/40',
    bgClass: 'bg-passport-azure/10 border-passport-azure/20',
    accent: 'text-passport-azure',
  },
  {
    icon: <FileCheck size={22} className="text-passport-green" />,
    title: 'SOC 2 Type II',
    desc: 'Annual audits completed. Full report available under NDA.',
    borderClass: 'hover:border-passport-green/40',
    bgClass: 'bg-passport-green/10 border-passport-green/20',
    accent: 'text-passport-green',
  },
  {
    icon: <HeartPulse size={22} className="text-passport-coral" />,
    title: 'HIPAA BAA',
    desc: 'Business Associate Agreement available for healthcare organizations.',
    borderClass: 'hover:border-passport-coral/40',
    bgClass: 'bg-passport-coral/10 border-passport-coral/20',
    accent: 'text-passport-coral',
  },
  {
    icon: <Clock size={22} className="text-passport-amber" />,
    title: 'Custom SLAs',
    desc: '99.9% uptime guarantee with financial penalties tied to your contract.',
    borderClass: 'hover:border-passport-amber/40',
    bgClass: 'bg-passport-amber/10 border-passport-amber/20',
    accent: 'text-passport-amber',
  },
  {
    icon: <Headphones size={22} className="text-passport-green" />,
    title: 'Dedicated Support',
    desc: 'Private Slack channel + named support engineer + 1-hour response SLA.',
    borderClass: 'hover:border-passport-green/40',
    bgClass: 'bg-passport-green/10 border-passport-green/20',
    accent: 'text-passport-green',
  },
  {
    icon: <Server size={22} className="text-passport-azure" />,
    title: 'On-Premise Deployment',
    desc: 'Run in your VPC, behind your firewall, on your own infrastructure.',
    borderClass: 'hover:border-passport-azure/40',
    bgClass: 'bg-passport-azure/10 border-passport-azure/20',
    accent: 'text-passport-azure',
  },
]

const securityItems = [
  {
    icon: <Lock size={20} className="text-passport-green" />,
    title: 'Data Encryption',
    desc: 'AES-256 at rest, TLS 1.3 in transit. Keys managed via AWS KMS or your own HSM.',
  },
  {
    icon: <Database size={20} className="text-passport-azure" />,
    title: 'Audit Logging',
    desc: 'Immutable, cryptographically signed logs. Exportable to your SIEM via S3 or HTTPS.',
  },
  {
    icon: <Key size={20} className="text-passport-coral" />,
    title: 'Access Control',
    desc: 'RBAC with custom roles, API key scoping, IP allowlisting, and time-bound credentials.',
  },
  {
    icon: <Target size={20} className="text-passport-amber" />,
    title: 'Penetration Testing',
    desc: 'Quarterly tests by independent firm. Reports available to customers under NDA.',
  },
  {
    icon: <Bug size={20} className="text-passport-green" />,
    title: 'Vulnerability Disclosure',
    desc: 'Bug bounty program with HackerOne. Responsible disclosure policy with 48-hour SLA.',
  },
]

const complianceItems = [
  { icon: <FileCheck size={18} className="text-passport-green" />, label: 'SOC 2 Type II', desc: 'Annual audit, report available' },
  { icon: <HeartPulse size={18} className="text-passport-coral" />, label: 'HIPAA', desc: 'BAA available for covered entities' },
  { icon: <Globe size={18} className="text-passport-azure" />, label: 'GDPR', desc: 'Data export & deletion built in' },
  { icon: <ShieldAlert size={18} className="text-passport-amber" />, label: 'PCI-DSS', desc: 'Stripe handles billing compliance' },
]

export default function EnterprisePage() {
  const currentYear = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-passport-bg">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(800px at 50% 30%, rgba(46,160,67,0.05) 0%, transparent 70%)' }} />
        <div className="absolute inset-0 hero-grid-bg opacity-25 pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-passport-azure/15 bg-passport-azure/5 text-passport-azure text-xs font-mono mb-8">
            <BadgeCheck size={14} />
            Enterprise-Grade Security
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-passport-text tracking-tight leading-[1.1] mb-6">
            Passport Agent
            <br />
            <span className="text-passport-azure">Enterprise</span>
          </h1>

          <p className="text-lg sm:text-xl text-passport-muted max-w-xl mx-auto mb-10 leading-relaxed">
            Deploy AI agents safely at scale with enterprise-grade security, compliance, and support.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="mailto:sales@passport.agent" className="btn-primary text-base px-8 py-3.5 w-full sm:w-auto btn-glow-hover">
              <Terminal size={16} />
              Talk to Sales
              <ChevronRight size={16} />
            </a>
            <a
              href="#pricing"
              className="btn-secondary text-base px-8 py-3.5 w-full sm:w-auto"
              onClick={(e) => {
                e.preventDefault()
                document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              View Pricing
            </a>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="py-12 border-b border-passport-border">
        <div className="section-divider max-w-5xl mx-auto mb-12" />
        <div className="max-w-5xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <p className="text-passport-muted text-sm mb-6">Trusted by security teams at leading enterprises</p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 opacity-50">
            <span className="font-mono text-lg text-passport-dim">Goldman Sachs</span>
            <span className="font-mono text-lg text-passport-dim">JPMorgan</span>
            <span className="font-mono text-lg text-passport-dim">Mayo Clinic</span>
            <span className="font-mono text-lg text-passport-dim">Walmart</span>
            <span className="font-mono text-lg text-passport-dim">Salesforce</span>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="section-divider mb-24" />
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <ScrollFadeHeading>
              <h2 className="text-3xl sm:text-4xl font-bold text-passport-text mb-4">
                Built for the Enterprise
              </h2>
              <p className="text-passport-muted max-w-xl mx-auto">
                Every feature designed to meet the security and compliance requirements of Fortune 500 organizations.
              </p>
            </ScrollFadeHeading>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <GlassCard
                key={feature.title}
                delay={0.05 * (i + 1)}
                className={`h-full flex flex-col hover:scale-[1.02] transition-all duration-300 ${feature.borderClass}`}
              >
                <div className={`w-10 h-10 rounded-full ${feature.bgClass} flex items-center justify-center mb-4 shrink-0`}>
                  {feature.icon}
                </div>
                <h3 className={`text-lg font-semibold ${feature.accent} mb-2`}>
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

      {/* Security Section */}
      <section id="security" className="py-24 px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="section-divider mb-24" />
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <ScrollFadeHeading>
              <h2 className="text-3xl sm:text-4xl font-bold text-passport-text mb-4">
                Enterprise Security
              </h2>
              <p className="text-passport-muted max-w-xl mx-auto">
                Defense in depth. Every layer hardened for production enterprise environments.
              </p>
            </ScrollFadeHeading>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {securityItems.map((item, i) => (
              <GlassCard
                key={item.title}
                delay={0.05 * (i + 1)}
                className="flex flex-col h-full hover:scale-[1.01] transition-all duration-300"
              >
                <div className="w-9 h-9 rounded-full bg-passport-surface border border-passport-border flex items-center justify-center mb-3 shrink-0">
                  {item.icon}
                </div>
                <h3 className="text-base font-semibold text-passport-text mb-2">{item.title}</h3>
                <p className="text-sm text-passport-muted leading-relaxed">{item.desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance Section */}
      <section id="compliance" className="py-24 px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="section-divider mb-24" />
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <ScrollFadeHeading>
              <h2 className="text-3xl sm:text-4xl font-bold text-passport-text mb-4">
                Compliance & Certifications
              </h2>
              <p className="text-passport-muted max-w-xl mx-auto">
                We maintain certifications so your auditors can check the box.
              </p>
            </ScrollFadeHeading>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {complianceItems.map((item, i) => (
              <GlassCard key={item.label} delay={0.05 * (i + 1)} className="text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-passport-surface border border-passport-border flex items-center justify-center mb-3">
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold text-passport-text mb-1">{item.label}</h3>
                <p className="text-xs text-passport-muted">{item.desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Table */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="section-divider mb-24" />
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <ScrollFadeHeading>
              <h2 className="text-3xl sm:text-4xl font-bold text-passport-text mb-4">Enterprise Pricing</h2>
              <p className="text-passport-muted max-w-xl mx-auto">
                From startup to Fortune 500 — a plan for every stage.
              </p>
            </ScrollFadeHeading>
          </div>

          <div className="overflow-x-auto rounded-md border border-passport-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-passport-border bg-passport-surface">
                  <th className="text-left px-5 py-4 font-mono text-xs text-passport-text uppercase tracking-wider">Plan</th>
                  <th className="text-left px-5 py-4 font-mono text-xs text-passport-text uppercase tracking-wider">Price</th>
                  <th className="text-left px-5 py-4 font-mono text-xs text-passport-text uppercase tracking-wider">Agents</th>
                  <th className="text-left px-5 py-4 font-mono text-xs text-passport-text uppercase tracking-wider">Enforcements</th>
                  <th className="text-left px-5 py-4 font-mono text-xs text-passport-text uppercase tracking-wider">Support</th>
                  <th className="text-left px-5 py-4 font-mono text-xs text-passport-text uppercase tracking-wider">SSO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-passport-border">
                <tr className="hover:bg-passport-surface/50 transition-colors">
                  <td className="px-5 py-4 font-semibold text-passport-text">Pro</td>
                  <td className="px-5 py-4 font-mono text-passport-text">$29/mo</td>
                  <td className="px-5 py-4 font-mono text-passport-green">Unlimited</td>
                  <td className="px-5 py-4 font-mono text-passport-text">10K/day</td>
                  <td className="px-5 py-4 text-passport-muted">Email (48h)</td>
                  <td className="px-5 py-4 text-passport-dim"><X size={16} /></td>
                </tr>
                <tr className="hover:bg-passport-surface/50 transition-colors">
                  <td className="px-5 py-4 font-semibold text-passport-text">Business</td>
                  <td className="px-5 py-4 font-mono text-passport-text">$299/mo</td>
                  <td className="px-5 py-4 font-mono text-passport-green">Unlimited</td>
                  <td className="px-5 py-4 font-mono text-passport-text">100K/day</td>
                  <td className="px-5 py-4 text-passport-muted">Priority (4h)</td>
                  <td className="px-5 py-4 text-passport-green"><Check size={16} /></td>
                </tr>
                <tr className="hover:bg-passport-surface/50 transition-colors bg-passport-azure/5">
                  <td className="px-5 py-4 font-semibold text-passport-azure">Enterprise</td>
                  <td className="px-5 py-4 font-mono text-passport-azure">Custom</td>
                  <td className="px-5 py-4 font-mono text-passport-green">Unlimited</td>
                  <td className="px-5 py-4 font-mono text-passport-green">Unlimited</td>
                  <td className="px-5 py-4 text-passport-muted">Dedicated (1h)</td>
                  <td className="px-5 py-4 text-passport-green"><Check size={16} /></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-8 p-6 rounded-md border border-passport-green/20 bg-passport-green/5">
            <h3 className="text-sm font-semibold text-passport-green mb-3 font-mono uppercase tracking-wider">Enterprise Includes</h3>
            <div className="grid sm:grid-cols-2 gap-2">
              {[
                'Custom SLA with financial penalties',
                'On-premise deployment option',
                'Audit log export to your SIEM',
                'Custom policy templates',
                'Dedicated onboarding & training',
                'Named support engineer',
                '99.9% uptime guarantee',
                'Priority feature requests',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-passport-muted">
                  <Check size={14} className="text-passport-green shrink-0" />
                  {item}
                </div>
              ))}
            </div>
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
              Ready to secure your enterprise agents?
            </h2>
            <p className="text-passport-muted mb-8 max-w-lg mx-auto">
              Schedule a call with our enterprise team. We&apos;ll show you a live demo, walk through your
              security requirements, and build a custom deployment plan.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="https://calendly.com" target="_blank" rel="noopener noreferrer" className="btn-primary text-base px-10 py-4 w-full sm:w-auto btn-glow-pulse font-mono font-bold">
                <Terminal size={18} />
                Schedule a Demo
              </a>
              <a href="mailto:sales@passport.agent" className="btn-secondary text-base px-8 py-3.5 w-full sm:w-auto">
                Contact Sales
              </a>
              <a href="#" className="btn-secondary text-base px-8 py-3.5 w-full sm:w-auto">
                <FileCheck size={16} />
                Download Security Whitepaper
              </a>
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
                <li><Link href="/enterprise" className="text-xs text-passport-azure hover:text-passport-text transition-colors">Enterprise</Link></li>
                <li><Link href="/case-studies" className="text-xs text-passport-muted hover:text-passport-text transition-colors">Case Studies</Link></li>
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
              &copy; {currentYear} Passport Agent &middot; Built by J. Rabinowitz
            </p>
            <p className="font-mono text-[9px] text-passport-dim/60 tracking-wider">
              SOC 2 Type II &middot; HIPAA Ready &middot; GDPR Compliant
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
