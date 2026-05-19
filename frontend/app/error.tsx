'use client'

import { useEffect } from 'react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to console
    console.error('[Passport Agent] Render error:', error)

    // Log to Sentry if configured
    if (process.env.NODE_ENV === 'production') {
      import('@/lib/sentry')
        .then(({ captureApiError }) => {
          captureApiError(error, { digest: error.digest, location: 'error_boundary' })
        })
        .catch(() => {
          // Sentry not available
        })
    }
  }, [error])

  return (
    <div className="min-h-screen bg-passport-bg flex items-center justify-center px-4">
      <div className="glass-panel p-8 max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="font-mono text-sm uppercase tracking-[3px] text-passport-green">
            Passport Agent
          </h1>
          <h2 className="text-2xl font-bold text-passport-text">Something went wrong</h2>
          <p className="text-sm text-passport-muted">
            An unexpected error occurred. We&apos;ve logged the issue and are working on a fix.
          </p>
        </div>

        {process.env.NODE_ENV !== 'production' && (
          <div className="text-left p-3 rounded-passport bg-passport-bg border border-passport-border overflow-auto">
            <pre className="font-mono text-xs text-passport-red whitespace-pre-wrap">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          <button onClick={reset} className="btn-primary">
            Try Again
          </button>
          <a href="/" className="btn-secondary">
            Go Home
          </a>
        </div>
      </div>
    </div>
  )
}
