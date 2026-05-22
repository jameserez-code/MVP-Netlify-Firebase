'use client'

import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  secondaryAction?: React.ReactNode
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div className="glass-panel p-10 text-center animate-fade-in">
      <div className="relative inline-flex mb-4">
        <div className="absolute inset-0 w-16 h-16 rounded-full bg-passport-green/5 blur-xl" />
        <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-passport-surface-2">
          <Icon size={32} className="text-passport-dim" />
        </div>
      </div>
      <h3 className="text-lg font-bold text-passport-text mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-passport-muted mt-1 max-w-sm mx-auto">
          {description}
        </p>
      )}
      {action && <div className="mt-5 animate-pulse-soft">{action}</div>}
      {secondaryAction && <div className="mt-3">{secondaryAction}</div>}
    </div>
  )
}
