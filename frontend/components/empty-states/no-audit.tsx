'use client'

import { ClipboardList, Play } from 'lucide-react'

interface NoAuditProps {
  onRun?: () => void
  onLearnMore?: () => void
}

export function NoAudit({ onRun, onLearnMore }: NoAuditProps) {
  return (
    <div className="glass-panel p-10 text-center animate-fade-in">
      <div className="relative inline-flex mb-4">
        <div className="absolute inset-0 w-16 h-16 rounded-full bg-passport-amber/10 blur-lg" />
        <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-passport-amber/10 text-passport-amber">
          <ClipboardList size={32} />
        </div>
      </div>
      <h3 className="text-lg font-bold text-passport-text mb-1">
        No audit events yet
      </h3>
      <p className="text-sm text-passport-muted mb-5 max-w-sm mx-auto">
        Run some enforcements to generate audit events. All agent decisions will
        be logged here.
      </p>
      {onRun && (
        <button onClick={onRun} className="btn-primary animate-pulse-soft">
          <Play size={14} />
          Run enforcement
        </button>
      )}
      {onLearnMore && (
        <div className="mt-3">
          <button
            onClick={onLearnMore}
            className="text-xs text-passport-muted hover:text-passport-amber transition-colors underline underline-offset-2"
          >
            Learn more about audit events
          </button>
        </div>
      )}
    </div>
  )
}
