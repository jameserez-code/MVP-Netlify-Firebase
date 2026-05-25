'use client'

import Link from 'next/link'
import Navbar from '@/components/navbar'
import {
  ArrowLeft,
  GitCommit,
  Star,
  Sparkles,
  Bug,
  Shield,
  Zap,
  Wrench,
  ArrowUpRight,
  Rss,
} from 'lucide-react'

interface ChangelogEntry {
  date: string
  version: string
  items: { type: 'Feature' | 'Improvement' | 'Fix' | 'Security'; text: string }[]
}

const changelog: ChangelogEntry[] = [
  {
    date: 'May 25, 2026',
    version: 'v2.1.0',
    items: [
      { type: 'Feature', text: 'Interactive demo mode with real API enforcement' },
      { type: 'Feature', text: 'Command palette (Cmd+K) for quick navigation' },
      { type: 'Feature', text: 'Global search across agents, policies, and audit logs' },
      { type: 'Feature', text: 'Notification center with real-time activity' },
      { type: 'Feature', text: 'ROI Calculator and comparison pages' },
      { type: 'Feature', text: 'Enterprise page with SSO, SLA, and compliance details' },
      { type: 'Feature', text: 'Case studies with customer metrics' },
      { type: 'Security', text: 'Fixed XSS vulnerability in playground' },
      { type: 'Security', text: 'Replaced insecure Math.random() with crypto.getRandomValues()' },
      { type: 'Security', text: 'Removed all hardcoded credentials from source' },
      { type: 'Fix', text: 'Server-side pagination for audit logs' },
      { type: 'Fix', text: '20+ quality issues from comprehensive audit' },
      { type: 'Improvement', text: '574 tests (up from 46), 32 frontend routes' },
      { type: 'Improvement', text: 'WCAG AA accessibility compliance' },
      { type: 'Improvement', text: 'Performance optimization: bundle size, font loading, SEO' },
    ],
  },
  {
    date: 'May 18, 2026',
    version: 'v2.0.0',
    items: [
      { type: 'Feature', text: 'Initial release with Fastify backend and Next.js frontend' },
      { type: 'Feature', text: 'Policy engine with tool/domain/PII/cost enforcement' },
      { type: 'Feature', text: 'Agent registration and lifecycle management' },
      { type: 'Feature', text: 'Immutable audit logging' },
      { type: 'Feature', text: 'JWT and API key authentication' },
      { type: 'Feature', text: 'Webhook notifications' },
      { type: 'Feature', text: 'Stripe billing integration' },
      { type: 'Feature', text: 'Real-time WebSocket updates' },
      { type: 'Feature', text: 'Email notifications for violations and alerts' },
      { type: 'Feature', text: 'Interactive demo with 3 scenarios' },
      { type: 'Feature', text: 'Onboarding wizard' },
      { type: 'Feature', text: 'SDK for OpenAI, Anthropic, LangChain, CrewAI' },
      { type: 'Feature', text: '18+ API endpoints' },
      { type: 'Feature', text: '10 pre-built policy templates' },
    ],
  },
]

const badgeConfig = {
  Feature: { icon: <Sparkles size={11} />, className: 'bg-passport-green/10 text-passport-green border-passport-green/20' },
  Improvement: { icon: <Zap size={11} />, className: 'bg-passport-azure/10 text-passport-azure border-passport-azure/20' },
  Fix: { icon: <Wrench size={11} />, className: 'bg-passport-coral/10 text-passport-coral border-passport-coral/20' },
  Security: { icon: <Shield size={11} />, className: 'bg-passport-amber/10 text-passport-amber border-passport-amber/20' },
}

function TypeBadge({ type }: { type: ChangelogEntry['items'][0]['type'] }) {
  const { icon, className } = badgeConfig[type]
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${className}`}>
      {icon}
      {type}
    </span>
  )
}

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-passport-bg">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-28">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-passport-muted hover:text-passport-text transition-colors mb-8"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>

        {/* Header */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-passport bg-passport-green/10">
              <GitCommit size={24} className="text-passport-green" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-passport-text tracking-tight">
                Changelog
              </h1>
              <p className="text-passport-muted text-sm mt-1">
                Product updates, improvements, and fixes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Rss size={14} className="text-passport-amber" />
            <span className="text-xs text-passport-muted">Subscribe via</span>
            <a href="#" className="text-xs font-mono text-passport-azure hover:underline">
              RSS
            </a>
            <span className="text-xs text-passport-dim">or</span>
            <a href="#" className="text-xs font-mono text-passport-azure hover:underline">
              Atom
            </a>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div
            className="absolute left-[22px] top-2 bottom-0 w-px"
            style={{
              background: 'linear-gradient(180deg, rgba(46,160,67,0.3) 0%, rgba(48,54,61,1) 100%)',
            }}
          />

          <div className="space-y-16">
            {changelog.map((entry, entryIdx) => (
              <div key={entry.version} className="relative">
                {/* Timeline dot */}
                <div className="absolute left-[14px] top-2 w-[18px] h-[18px] rounded-full border-2 border-passport-green bg-passport-bg z-10 flex items-center justify-center">
                  <div className="w-[8px] h-[8px] rounded-full bg-passport-green" />
                </div>

                {/* Entry content */}
                <div className="ml-12">
                  {/* Date & Version header */}
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="font-mono text-xs text-passport-dim">{entry.date}</span>
                    <span className="font-mono text-sm font-bold text-passport-green bg-passport-green/5 border border-passport-green/10 px-2 py-0.5 rounded">
                      {entry.version}
                    </span>
                    {entryIdx === 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-passport-green/10 border border-passport-green/20 text-[10px] font-mono text-passport-green font-semibold">
                        <Star size={10} />
                        Latest
                      </span>
                    )}
                  </div>

                  {/* Items card */}
                  <div className="glass-panel p-5 hover:border-passport-border-2 hover:[transform:translateY(-2px)] transition-all duration-200">
                    <ul className="space-y-2.5">
                      {entry.items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <TypeBadge type={item.type} />
                          <span className="text-sm text-passport-text leading-relaxed">{item.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-20 pt-10 border-t border-passport-border text-center">
          <p className="text-xs text-passport-dim mb-2">More updates coming soon</p>
          <a href="#" className="inline-flex items-center gap-1 text-xs font-mono text-passport-azure hover:underline">
            <Rss size={12} />
            Subscribe to updates
            <ArrowUpRight size={10} />
          </a>
        </div>
      </div>
    </div>
  )
}
