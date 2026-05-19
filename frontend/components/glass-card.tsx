'use client'

import { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  delay?: number
}

export default function GlassCard({ children, className = '', hover = true, delay = 0 }: GlassCardProps) {
  return (
    <div
      className={`glass-panel p-5 ${hover ? 'glass-panel-hover' : ''} ${className}`}
      style={{
        animation: `slideUp 0.4s ease both`,
        animationDelay: `${delay}s`,
      }}
    >
      {children}
    </div>
  )
}
