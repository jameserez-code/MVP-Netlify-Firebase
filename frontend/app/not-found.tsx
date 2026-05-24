'use client'

import Link from 'next/link'
import { Search, Terminal, Shield, LayoutDashboard, BookOpen, HelpCircle } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-passport-bg flex items-center justify-center px-4 py-12 relative">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(600px at 50% 40%, rgba(46,160,67,0.03) 0%, transparent 70%)',
        }}
      />

      <div className="w-full max-w-lg relative z-10">
        <div className="glass-panel p-8 sm:p-10 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-2 border-passport-border bg-passport-surface/50 mb-6">
            <span className="font-mono text-3xl font-bold text-passport-green">404</span>
          </div>

          <h1 className="text-2xl font-bold text-passport-text mb-2">Route not found</h1>
          <p className="text-sm text-passport-muted mb-8 max-w-sm mx-auto">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>

          <div className="relative mb-8">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-passport-dim pointer-events-none" />
            <input
              type="text"
              readOnly
              className="input-field pl-9 pr-4 py-2.5 text-sm cursor-not-allowed opacity-50"
              placeholder="Search (static placeholder)"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-8">
            <Link
              href="/"
              className="flex items-center gap-2 p-3 rounded-passport border border-passport-border bg-passport-surface/50 hover:border-passport-green/20 hover:bg-passport-surface transition-all"
            >
              <Shield size={16} className="text-passport-green" />
              <span className="text-sm text-passport-text">Home</span>
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 p-3 rounded-passport border border-passport-border bg-passport-surface/50 hover:border-passport-green/20 hover:bg-passport-surface transition-all"
            >
              <LayoutDashboard size={16} className="text-passport-azure" />
              <span className="text-sm text-passport-text">Dashboard</span>
            </Link>
            <Link
              href="/docs"
              className="flex items-center gap-2 p-3 rounded-passport border border-passport-border bg-passport-surface/50 hover:border-passport-green/20 hover:bg-passport-surface transition-all"
            >
              <BookOpen size={16} className="text-passport-amber" />
              <span className="text-sm text-passport-text">Docs</span>
            </Link>
            <a
              href="mailto:support@passportagent.ai"
              className="flex items-center gap-2 p-3 rounded-passport border border-passport-border bg-passport-surface/50 hover:border-passport-green/20 hover:bg-passport-surface transition-all"
            >
              <HelpCircle size={16} className="text-passport-coral" />
              <span className="text-sm text-passport-text">Support</span>
            </a>
          </div>

          <div className="p-3 rounded-passport bg-[#0d1117] border border-passport-border inline-block">
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-passport-dim" />
              <code className="font-mono text-xs text-passport-dim">
                <span className="text-passport-azure">policy_engine</span>
                <span className="text-passport-muted"> :: </span>
                <span className="text-passport-coral">not_found</span>
                <span className="text-passport-muted"> &gt; </span>
                <span className="text-passport-green">This route is not in the policy engine</span>
              </code>
            </div>
          </div>
        </div>

        <p className="text-center mt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 group"
          >
            <Shield size={20} className="text-passport-green" />
            <span className="font-mono text-sm font-bold text-passport-green tracking-wider uppercase">
              Passport Agent
            </span>
          </Link>
        </p>
      </div>
    </div>
  )
}
