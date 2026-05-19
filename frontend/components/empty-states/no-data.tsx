import { LucideIcon } from 'lucide-react'

interface NoDataProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export function NoData({ icon: Icon, title, description, action }: NoDataProps) {
  return (
    <div className="glass-panel p-10 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-passport-surface-2 text-passport-dim mb-4">
        <Icon size={32} />
      </div>
      <h3 className="text-lg font-bold text-passport-text mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-passport-muted mb-5 max-w-sm mx-auto">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}
