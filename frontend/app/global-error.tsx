'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home, Terminal } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Passport Agent] Global error:', error)
  }, [error])

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-passport-bg flex items-center justify-center p-4">
        <div className="glass-panel p-8 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-passport-red/10 text-passport-red mb-4">
            <AlertTriangle size={28} />
          </div>
          <h1 className="text-2xl font-bold text-passport-text mb-2">
            Something went wrong on our end
          </h1>
          <p className="text-passport-muted mb-2">
            We&apos;re working on it. Our team has been notified automatically.
          </p>
          {error.digest && (
            <p className="font-mono text-[10px] text-passport-dim mb-6">
              Error ID: {error.digest}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={reset} className="btn-primary">
              <RefreshCw size={14} />
              Try Again
            </button>
            <a href="/dashboard" className="btn-secondary">
              <Home size={14} />
              Back to Dashboard
            </a>
          </div>

          <div className="mt-6 pt-4 border-t border-passport-border text-xs text-passport-dim">
            <p className="flex items-center justify-center gap-1.5">
              <Terminal size={12} />
              If this persists, contact{' '}
              <a href="mailto:support@agentpassport.dev" className="text-passport-azure hover:underline">
                support@agentpassport.dev
              </a>
            </p>
          </div>
        </div>
      </body>
    </html>
  )
}
