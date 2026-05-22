'use client'

import { LucideIcon } from 'lucide-react'

interface NoDataProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  secondaryAction?: React.ReactNode
}

export function NoData({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
}: NoDataProps) {
  return (
    <div className="glass-panel p-10 text-center animate-fade-in">
      <div className="relative inline-flex mb-4">
        <div className="absolute inset-0 w-16 h-16 rounded-full bg-passport-surface-2 blur-lg" />
        <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-passport-surface-2 text-passport-dim">
          <Icon size={32} />
        </div>
      </div>
      <h3 className="text-lg font-bold text-passport-text mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-passport-muted mb-5 max-w-sm mx-auto">
          {description}
        </p>
      )}
      {action && <div className="animate-pulse-soft">{action}</div>}
      {secondaryAction && <div className="mt-3">{secondaryAction}</div>}
    </div>
  )
}
