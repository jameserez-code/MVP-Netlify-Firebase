'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Page error:', error)
    }
  }, [error])

  return (
    <div className="min-h-screen bg-passport-bg flex items-center justify-center px-4 py-12 relative">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(600px at 50% 40%, rgba(248,81,73,0.03) 0%, transparent 70%)',
        }}
      />

      <div className="w-full max-w-md relative z-10">
        <div className="glass-panel p-8 sm:p-10 text-center">
          <div className="w-20 h-20 rounded-full bg-passport-red/10 border border-passport-red/20 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={36} className="text-passport-red" />
          </div>

          <h1 className="text-2xl font-bold text-passport-text mb-2">Something went wrong</h1>
          <p className="text-sm text-passport-muted mb-6 max-w-sm mx-auto">
            An unexpected error occurred. Please try again or return home.
          </p>

          {error.digest && (
            <div className="p-3 rounded-passport bg-passport-surface/50 border border-passport-border mb-6 inline-block">
              <span className="text-[10px] text-passport-dim font-mono uppercase tracking-wider">Error ID: </span>
              <code className="text-xs text-passport-muted font-mono">{error.digest}</code>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={reset}
              className="btn-primary"
            >
              <RefreshCw size={14} />
              Try Again
            </button>
            <Link href="/" className="btn-secondary">
              <Home size={14} />
              Go Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
