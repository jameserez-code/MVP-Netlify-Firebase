'use client'

import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="glass-panel p-10 text-center">
      <Icon size={32} className="text-passport-dim mx-auto mb-3" />
      <p className="text-passport-text font-medium">{title}</p>
      {description && <p className="text-sm text-passport-muted mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
