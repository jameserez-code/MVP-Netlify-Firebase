'use client'

import { Bot, Plus } from 'lucide-react'

interface NoAgentsProps {
  onCreate?: () => void
  onLearnMore?: () => void
}

export function NoAgents({ onCreate, onLearnMore }: NoAgentsProps) {
  return (
    <div className="glass-panel p-10 text-center animate-fade-in">
      <div className="relative inline-flex mb-4">
        <div className="absolute inset-0 w-16 h-16 rounded-full bg-passport-green/10 blur-lg" />
        <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-passport-green/10 text-passport-green">
          <Bot size={32} />
        </div>
      </div>
      <h3 className="text-lg font-bold text-passport-text mb-1">No agents yet</h3>
      <p className="text-sm text-passport-muted mb-5 max-w-sm mx-auto">
        Register your first agent to start monitoring and enforcing policies on
        your AI fleet.
      </p>
      {onCreate && (
        <button onClick={onCreate} className="btn-primary animate-pulse-soft">
          <Plus size={14} />
          Register your first agent
        </button>
      )}
      {onLearnMore && (
        <div className="mt-3">
          <button
            onClick={onLearnMore}
            className="text-xs text-passport-muted hover:text-passport-azure transition-colors underline underline-offset-2"
          >
            Learn more about agents
          </button>
        </div>
      )}
    </div>
  )
}
