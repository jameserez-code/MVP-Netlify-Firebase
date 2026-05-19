'use client'

import { ReactNode } from 'react'

interface ChartCardProps {
  title?: string
  children: ReactNode
  className?: string
  delay?: number
  action?: ReactNode
}

export default function ChartCard({ title, children, className = '', delay = 0, action }: ChartCardProps) {
  return (
    <div
      className={`glass-panel p-5 ${className}`}
      style={{
        animation: `slideUp 0.4s ease both`,
        animationDelay: `${delay}s`,
      }}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h3 className="text-sm font-semibold text-passport-text">{title}</h3>
          )}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
