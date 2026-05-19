'use client'

import { ReactNode, forwardRef } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  delay?: number
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  function GlassCard({ children, className = '', hover = true, delay = 0 }, ref) {
    return (
      <div
        ref={ref}
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
)

export default GlassCard
