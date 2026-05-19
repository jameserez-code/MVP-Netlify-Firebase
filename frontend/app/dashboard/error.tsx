'use client'

import { useEffect, useState } from 'react'
import GlassCard from '@/components/glass-card'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface SectionError {
  section: string
  message: string
}

export default function DashboardErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [section, setSection] = useState<SectionError | null>(null)

  useEffect(() => {
    console.error('[Passport Agent] Dashboard render error:', error)

    // Try to infer which section failed from the error message or stack
    const sections = ['metrics', 'diagnostics', 'report', 'agents', 'policies', 'audit', 'webhooks', 'api-keys']
    const lowerMessage = (error.message || '').toLowerCase()
    const lowerStack = (error.stack || '').toLowerCase()
    const matchedSection = sections.find(
      (s) => lowerMessage.includes(s) || lowerStack.includes(s)
    )

    setSection(
      matchedSection
        ? { section: matchedSection, message: error.message }
        : { section: 'dashboard', message: error.message }
    )

    if (process.env.NODE_ENV === 'production') {
      import('@/lib/sentry')
        .then(({ captureApiError }) => {
          captureApiError(error, {
            digest: error.digest,
            location: 'dashboard_error_boundary',
            failedSection: matchedSection || 'unknown',
          })
        })
        .catch(() => {})
    }
  }, [error])

  return (
    <div className="space-y-6">
      <GlassCard>
        <div className="flex items-start gap-4 p-2">
          <div className="p-2.5 rounded-passport bg-passport-red/10 text-passport-red shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="space-y-2 flex-1">
            <h2 className="text-lg font-semibold text-passport-text">
              {section ? (
                <>
                  <span className="capitalize">{section.section}</span> section failed to load
                </>
              ) : (
                'Dashboard section failed to load'
              )}
            </h2>
            <p className="text-sm text-passport-muted">
              We encountered an error while loading this part of the dashboard. You can retry just
              this section or return to the dashboard home.
            </p>

            {process.env.NODE_ENV !== 'production' && (
              <div className="mt-3 p-3 rounded-passport bg-passport-bg border border-passport-border overflow-auto">
                <pre className="font-mono text-xs text-passport-red whitespace-pre-wrap">
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button onClick={reset} className="btn-primary">
                <RefreshCw size={14} />
                Retry Section
              </button>
              <a href="/dashboard" className="btn-secondary">
                <Home size={14} />
                Dashboard Home
              </a>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
