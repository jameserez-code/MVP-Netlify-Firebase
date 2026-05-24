'use client'

import { Shield, Terminal } from 'lucide-react'

export default function LoadingPage() {
  return (
    <div className="min-h-screen bg-passport-bg flex items-center justify-center relative">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(600px at 50% 50%, rgba(46,160,67,0.06) 0%, transparent 70%)',
        }}
      />

      <div className="text-center relative z-10">
        <div className="relative inline-flex mb-6">
          <div className="absolute inset-0 rounded-full bg-passport-green/10 blur-2xl animate-pulse" />
          <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full border border-passport-border bg-passport-surface/50 backdrop-blur-sm">
            <Shield size={36} className="text-passport-green" />
          </div>
        </div>

        <div className="flex items-center justify-center gap-2.5 mb-4">
          <Terminal size={18} className="text-passport-green" />
          <span className="font-mono text-lg font-bold text-passport-green tracking-wider uppercase">
            Passport Agent
          </span>
        </div>

        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-5 h-5 border-2 border-passport-green/30 border-t-passport-green rounded-full animate-spin" />
        </div>
        <p className="text-sm text-passport-muted font-mono">Loading...</p>
      </div>
    </div>
  )
}
