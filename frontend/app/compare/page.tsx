'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import Navbar from '@/components/navbar'
import GlassCard from '@/components/glass-card'
import {
  Check,
  X,
  Minus,
  Shield,
  Key,
  Lock,
  Code2,
  ArrowRight,
  Zap,
  Terminal,
  ExternalLink,
} from 'lucide-react'

interface ComparisonRow {
  feature: string
  passport: 'check' | 'cross' | 'varies'
  apiKeys: 'check' | 'cross' | 'varies'
  oauth: 'check' | 'cross' | 'varies'
  callbacks: 'check' | 'cross' | 'varies'
  custom: 'check' | 'cross' | 'varies'
}

const comparisonData: ComparisonRow[] = [
  {
    feature: 'Pre-execution enforcement',
    passport: 'check',
    apiKeys: 'cross',
    oauth: 'cross',
    callbacks: 'cross',
    custom: 'varies',
  },
  {
    feature: 'Fine-grained policies',
    passport: 'check',
    apiKeys: 'cross',
    oauth: 'varies',
    callbacks: 'cross',
    custom: 'varies',
  },
  {
    feature: 'Tool allowlists/denylists',
    passport: 'check',
    apiKeys: 'cross',
    oauth: 'cross',
    callbacks: 'cross',
    custom: 'varies',
  },
  {
    feature: 'Domain restrictions',
    passport: 'check',
    apiKeys: 'cross',
    oauth: 'cross',
    callbacks: 'cross',
    custom: 'varies',
  },
  {
    feature: 'PII detection',
    passport: 'check',
    apiKeys: 'cross',
    oauth: 'cross',
    callbacks: 'cross',
    custom: 'varies',
  },
  {
    feature: 'Cost limits',
    passport: 'check',
    apiKeys: 'cross',
    oauth: 'cross',
    callbacks: 'cross',
    custom: 'varies',
  },
  {
    feature: 'Immutable audit trail',
    passport: 'check',
    apiKeys: 'cross',
    oauth: 'varies',
    callbacks: 'varies',
    custom: 'varies',
  },
  {
    feature: 'No code changes to agents',
    passport: 'check',
    apiKeys: 'cross',
    oauth: 'cross',
    callbacks: 'cross',
    custom: 'cross',
  },
  {
    feature: 'Works with any framework',
    passport: 'check',
    apiKeys: 'cross',
    oauth: 'varies',
    callbacks: 'cross',
    custom: 'cross',
  },
  {
    feature: 'Deploy in &lt; 30 minutes',
    passport: 'check',
    apiKeys: 'cross',
    oauth: 'cross',
    callbacks: 'cross',
    custom: 'cross',
  },
  {
    feature: 'SOC 2 ready',
    passport: 'check',
    apiKeys: 'cross',
    oauth: 'varies',
    callbacks: 'cross',
    custom: 'varies',
  },
  {
    feature: 'Enterprise SSO',
    passport: 'check',
    apiKeys: 'cross',
    oauth: 'check',
    callbacks: 'cross',
    custom: 'varies',
  },
  {
    feature: 'Pricing',
    passport: 'check',
    apiKeys: 'check',
    oauth: 'varies',
    callbacks: 'check',
    custom: 'cross',
  },
]

function CellValue({
  value,
  label,
}: {
  value: 'check' | 'cross' | 'varies'
  label?: string
}) {
  if (value === 'check') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="w-6 h-6 flex items-center justify-center rounded-full bg-passport-green/15">
          <Check size={14} className="text-passport-green" />
        </span>
        {label && (
          <span className="text-xs font-mono text-passport-green">{label}</span>
        )}
      </div>
    )
  }

  if (value === 'cross') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="w-6 h-6 flex items-center justify-center rounded-full bg-passport-red/10">
          <X size={14} className="text-passport-red" />
        </span>
        {label && (
          <span className="text-xs font-mono text-passport-red">{label}</span>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="w-6 h-6 flex items-center justify-center rounded-full bg-passport-amber/10">
        <Minus size={14} className="text-passport-amber" />
      </span>
      {label && (
        <span className="text-xs font-mono text-passport-amber">{label}</span>
      )}
    </div>
  )
}

function PricingCell({ value }: { value: 'check' | 'cross' | 'varies' }) {
  if (value === 'check') {
    return (
      <span className="text-xs font-mono text-passport-green font-semibold">
        Free-$29/mo
      </span>
    )
  }
  if (value === 'cross') {
    return (
      <span className="text-xs font-mono text-passport-red font-semibold">
        $20K-100K+
      </span>
    )
  }
  return (
    <span className="text-xs font-mono text-passport-amber font-semibold">
      Varies
    </span>
  )
}

const columnHeaders = [
  { key: 'feature' as const, label: 'Feature', className: '' },
  {
    key: 'passport' as const,
    label: 'Passport Agent',
    className: 'text-passport-green',
  },
  { key: 'apiKeys' as const, label: 'API Keys', className: '' },
  { key: 'oauth' as const, label: 'OAuth 2.0', className: '' },
  {
    key: 'callbacks' as const,
    label: 'LangChain Callbacks',
    className: '',
  },
  { key: 'custom' as const, label: 'Custom Code', className: '' },
] as const

const alternativeCards = [
  {
    icon: <Key size={22} className="text-passport-coral" />,
    title: 'API Keys',
    color: 'coral' as const,
    description:
      "API keys grant all-or-nothing access. Once an agent has the key, it can do anything — delete tables, access customer data, make purchases. No way to restrict specific tools or set limits.",
    highlights: [
      'No tool-level restrictions',
      'No cost limits or rate limiting by action',
      'No audit of what agents actually did',
      'No way to revoke specific capabilities',
    ],
  },
  {
    icon: <Lock size={22} className="text-passport-amber" />,
    title: 'OAuth 2.0',
    color: 'amber' as const,
    description:
      "OAuth was designed for human users who can click 'Allow' buttons. AI agents can't interact with consent screens. The scopes are coarse-grained and can't express tool-level or domain-level restrictions.",
    highlights: [
      'Designed for human, not agent, interaction',
      'Coarse scopes — no tool-level granularity',
      'No pre-execution enforcement',
      'Consent screens are impossible for agents',
    ],
  },
  {
    icon: <Terminal size={22} className="text-passport-azure" />,
    title: 'LangChain / LlamaIndex Callbacks',
    color: 'azure' as const,
    description:
      'These frameworks log agent actions AFTER they happen. You find out about the problem in your logs — not before the damage is done. Great for debugging, useless for enforcement.',
    highlights: [
      'Post-execution logging only',
      'No real-time blocking capability',
      'Tied to specific frameworks (LangChain-only)',
      'No audit trail integrity guarantees',
    ],
  },
  {
    icon: <Code2 size={22} className="text-passport-red" />,
    title: 'Custom Code',
    color: 'red' as const,
    description:
      'Every company building AI agents ends up writing their own enforcement layer. It takes 4-8 weeks, costs $20K-100K+, requires ongoing maintenance, and usually lacks audit trails, PII detection, and proper access controls.',
    highlights: [
      '4-8 weeks of engineering time',
      '$20K-$100K+ in initial build cost',
      '20% annual maintenance overhead',
      'Rarely includes PII detection or audit trails',
    ],
  },
]

const colorMap = {
  coral: {
    bg: 'bg-passport-coral/10',
    border: 'border-passport-coral/20',
    text: 'text-passport-coral',
    hover: 'hover:border-passport-coral/40',
  },
  amber: {
    bg: 'bg-passport-amber/10',
    border: 'border-passport-amber/20',
    text: 'text-passport-amber',
    hover: 'hover:border-passport-amber/40',
  },
  azure: {
    bg: 'bg-passport-azure/10',
    border: 'border-passport-azure/20',
    text: 'text-passport-azure',
    hover: 'hover:border-passport-azure/40',
  },
  red: {
    bg: 'bg-passport-red/10',
    border: 'border-passport-red/20',
    text: 'text-passport-red',
    hover: 'hover:border-passport-red/40',
  },
} as const

export default function ComparePage() {
  const currentYear = useMemo(() => new Date().getFullYear(), [])
  return (
    <div className="min-h-screen bg-passport-bg">
      <Navbar />

      {/* Header */}
      <section className="pt-28 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-passport-green/15 bg-passport-green/5 text-passport-green text-xs font-mono mb-6">
            <Shield size={14} />
            Feature Comparison
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-passport-text tracking-tight mb-3">
            Passport Agent vs Alternatives
          </h1>
          <p className="text-lg text-passport-muted max-w-2xl mx-auto">
            Why companies choose Passport Agent over building their own, using API
            keys, or relying on framework callbacks
          </p>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-5xl mx-auto">
          <div className="overflow-x-auto rounded-md border border-passport-border">
            <div className="min-w-[750px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-passport-border bg-passport-surface/50">
                    {columnHeaders.map((col) => (
                      <th
                        key={col.key}
                        className={`text-left py-3 px-4 text-xs font-mono uppercase tracking-wider ${
                          col.className || 'text-passport-dim'
                        } ${
                          col.key === 'passport'
                            ? 'bg-passport-green/3 border-x border-passport-green/15'
                            : ''
                        }`}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-passport-border/30">
                  {comparisonData.map((row, idx) => (
                    <tr
                      key={row.feature}
                      className={`transition-colors ${
                        idx % 2 === 1 ? 'bg-passport-surface/15' : ''
                      } hover:bg-passport-surface/30`}
                    >
                      <td className="py-3 px-4 text-passport-text font-medium whitespace-nowrap">
                        {row.feature}
                      </td>
                      {(['passport', 'apiKeys', 'oauth', 'callbacks', 'custom'] as const).map(
                        (col) => (
                          <td
                            key={col}
                            className={`py-3 px-4 ${
                              col === 'passport'
                                ? 'bg-passport-green/3 border-x border-passport-green/10'
                                : ''
                            }`}
                          >
                            {col === 'passport' &&
                            row.feature === 'Pricing' ? (
                              <PricingCell value={row[col]} />
                            ) : (
                              <CellValue
                                value={row[col]}
                                label={
                                  row.feature === 'Pricing'
                                    ? undefined
                                    : undefined
                                }
                              />
                            )}
                          </td>
                        )
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Alternative Breakdown Cards */}
      <section className="px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-5xl mx-auto">
          <div className="section-divider mb-12" />
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-passport-text mb-3">
              Why alternatives fall short
            </h2>
            <p className="text-passport-muted max-w-xl mx-auto">
              Each approach was designed for something else — not for AI agent
              governance
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {alternativeCards.map((card) => {
              const colors = colorMap[card.color]
              return (
                <GlassCard
                  key={card.title}
                  hover={false}
                  className={`h-full flex flex-col ${colors.hover} transition-colors`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`w-10 h-10 rounded-full ${colors.bg} border ${colors.border} flex items-center justify-center shrink-0`}
                    >
                      {card.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-passport-text">
                      {card.title}
                    </h3>
                  </div>
                  <p className="text-sm text-passport-muted leading-relaxed mb-4">
                    {card.description}
                  </p>
                  <div className="mt-auto">
                    <ul className="space-y-2">
                      {card.highlights.map((h) => (
                        <li
                          key={h}
                          className="flex items-start gap-2 text-xs text-passport-muted"
                        >
                          <X
                            size={12}
                            className={`${colors.text} shrink-0 mt-0.5`}
                          />
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                </GlassCard>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-6 lg:px-8 pb-16 relative">
        <div className="section-divider mb-12" />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(46,160,67,0.05) 0%, transparent 70%)' }} />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <GlassCard className="p-10 sm:p-14" hover={false}>
            <Shield size={32} className="text-passport-green mx-auto mb-6" />
            <h2 className="text-2xl sm:text-3xl font-bold text-passport-text mb-4">
              Ready to upgrade your agent security?
            </h2>
            <p className="text-passport-muted mb-8 max-w-lg mx-auto">
              Deploy enforcement in 30 minutes. No agent code changes required.
              Works with any framework.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/demo"
                className="btn-primary text-base px-8 py-3.5 w-full sm:w-auto btn-glow-hover"
              >
                <Zap size={16} />
                See Passport Agent in Action
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/register"
                className="btn-secondary text-base px-8 py-3.5 w-full sm:w-auto"
              >
                <Terminal size={16} />
                Start Free Trial
              </Link>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 relative">
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(46,160,67,0.15), transparent)',
          }}
        />
        <div className="max-w-5xl mx-auto pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <h4 className="font-mono text-xs text-passport-text font-semibold tracking-wider mb-4">
                Product
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/#features"
                    className="text-xs text-passport-muted hover:text-passport-text transition-colors"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#pricing"
                    className="text-xs text-passport-muted hover:text-passport-text transition-colors"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#demo"
                    className="text-xs text-passport-muted hover:text-passport-text transition-colors"
                  >
                    Demo
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-mono text-xs text-passport-text font-semibold tracking-wider mb-4">
                Resources
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/docs"
                    className="text-xs text-passport-muted hover:text-passport-text transition-colors"
                  >
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link
                    href="/playground"
                    className="text-xs text-passport-muted hover:text-passport-text transition-colors"
                  >
                    Playground
                  </Link>
                </li>
                <li>
                  <Link
                    href="/roi"
                    className="text-xs text-passport-muted hover:text-passport-text transition-colors"
                  >
                    ROI Calculator
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-mono text-xs text-passport-text font-semibold tracking-wider mb-4">
                Developers
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/docs"
                    className="text-xs text-passport-muted hover:text-passport-text transition-colors"
                  >
                    API Reference
                  </Link>
                </li>
                <li>
                  <a
                    href="https://github.com/jameserez-code/MVP-Netlify-Firebase"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-passport-muted hover:text-passport-text transition-colors inline-flex items-center gap-1"
                  >
                    GitHub
                    <ExternalLink size={10} />
                  </a>
                </li>
                <li>
                  <Link
                    href="/login"
                    className="text-xs text-passport-muted hover:text-passport-text transition-colors"
                  >
                    Status
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-mono text-xs text-passport-text font-semibold tracking-wider mb-4">
                Legal
              </h4>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/privacy"
                    className="text-xs text-passport-muted hover:text-passport-text transition-colors"
                  >
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-xs text-passport-muted hover:text-passport-text transition-colors"
                  >
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="text-center border-t border-passport-border/50 pt-6">
            <p className="font-mono text-[10px] text-passport-dim tracking-wider">
              {'\u00A9'} {currentYear} Passport Agent {'\u00B7'} Built by J.
              Rabinowitz
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
