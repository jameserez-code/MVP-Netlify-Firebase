'use client'

import { useSearchParams } from 'next/navigation'
import { Wrench, Clock, Mail, ArrowLeft } from 'lucide-react'

export default function MaintenancePage() {
  const searchParams = useSearchParams()
  const eta = searchParams?.get('eta')

  return (
    <div className="min-h-screen bg-passport-bg flex items-center justify-center p-4">
      <div className="glass-panel p-8 max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-passport-amber/10 text-passport-amber mb-4">
          <Wrench size={28} />
        </div>
        <h1 className="text-2xl font-bold text-passport-text mb-2">
          We&apos;ll be back soon
        </h1>
        <p className="text-passport-muted mb-6">
          We&apos;re performing scheduled maintenance to improve your experience. The system will be available shortly.
        </p>

        {eta && (
          <div className="flex items-center justify-center gap-2 p-3 rounded-passport bg-passport-surface border border-passport-border mb-6">
            <Clock size={14} className="text-passport-azure" />
            <span className="text-sm text-passport-text">
              Estimated time: <span className="font-mono text-passport-azure">{eta}</span>
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="/" className="btn-primary">
            <ArrowLeft size={14} />
            Back to Home
          </a>
          <a href="mailto:support@agentpassport.dev" className="btn-secondary">
            <Mail size={14} />
            Contact Support
          </a>
        </div>

        <div className="mt-6 pt-4 border-t border-passport-border">
          <p className="text-xs text-passport-dim">
            For updates, check our{' '}
            <a href="#" className="text-passport-azure hover:underline">
              status page
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
