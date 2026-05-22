'use client'

import { Shield, Plus } from 'lucide-react'

interface NoPoliciesProps {
  onCreate?: () => void
  onLearnMore?: () => void
}

export function NoPolicies({ onCreate, onLearnMore }: NoPoliciesProps) {
  return (
    <div className="glass-panel p-10 text-center animate-fade-in">
      <div className="relative inline-flex mb-4">
        <div className="absolute inset-0 w-16 h-16 rounded-full bg-passport-azure/10 blur-lg" />
        <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-passport-azure/10 text-passport-azure">
          <Shield size={32} />
        </div>
      </div>
      <h3 className="text-lg font-bold text-passport-text mb-1">
        No policies yet
      </h3>
      <p className="text-sm text-passport-muted mb-5 max-w-sm mx-auto">
        Create your first policy to define what your agents can and cannot do.
      </p>
      {onCreate && (
        <button onClick={onCreate} className="btn-primary animate-pulse-soft">
          <Plus size={14} />
          Create your first policy
        </button>
      )}
      {onLearnMore && (
        <div className="mt-3">
          <button
            onClick={onLearnMore}
            className="text-xs text-passport-muted hover:text-passport-azure transition-colors underline underline-offset-2"
          >
            Learn more about policies
          </button>
        </div>
      )}
    </div>
  )
}
