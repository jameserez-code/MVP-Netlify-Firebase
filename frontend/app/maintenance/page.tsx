'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Wrench, Shield, Mail, Activity } from 'lucide-react'

export default function MaintenancePage() {
  const currentYear = useMemo(() => new Date().getFullYear(), [])
  const eta = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('eta')
    : null

  return (
    <div className="min-h-screen bg-passport-bg flex items-center justify-center px-4 py-12 relative">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(600px at 50% 40%, rgba(46,160,67,0.03) 0%, transparent 70%)',
        }}
      />

      <div className="w-full max-w-md relative z-10 text-center">
        <div className="glass-panel p-8 sm:p-10">
          <div className="w-20 h-20 rounded-full bg-passport-amber/10 border border-passport-amber/20 flex items-center justify-center mx-auto mb-6">
            <Wrench size={36} className="text-passport-amber" />
          </div>

          <h1 className="text-2xl font-bold text-passport-text mb-2">We&apos;ll be back soon</h1>
          <p className="text-sm text-passport-muted mb-6 max-w-sm mx-auto">
            Passport Agent is undergoing scheduled maintenance. We&apos;re working to improve the platform for you.
          </p>

          {eta && (
            <div className="p-3 rounded-passport bg-passport-surface/50 border border-passport-border mb-6 inline-block">
              <span className="text-xs text-passport-muted">Expected back by: </span>
              <span className="text-sm text-passport-text font-mono font-semibold">{eta}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <a
              href="mailto:support@passportagent.ai"
              className="btn-secondary w-full sm:w-auto"
            >
              <Mail size={14} />
              Contact Support
            </a>
            <Link
              href="/health"
              className="btn-primary w-full sm:w-auto"
            >
              <Activity size={14} />
              Check Status
            </Link>
          </div>

          <div className="pt-6 border-t border-passport-border">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <Shield size={20} className="text-passport-green" />
              <span className="font-mono text-sm font-bold text-passport-green tracking-wider uppercase">
                Passport Agent
              </span>
            </Link>
          </div>
        </div>

        <p className="text-xs text-passport-dim mt-6">
          {'\u00A9'} {currentYear} Passport Agent. All rights reserved.
        </p>
      </div>
    </div>
  )
}
