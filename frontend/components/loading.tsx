'use client'

import { Loader2 } from 'lucide-react'

export function Spinner({ size = 20, className = '' }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} />
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`glass-panel p-5 animate-pulse ${className}`}>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-passport bg-passport-surface-2" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-20 rounded bg-passport-surface-2" />
          <div className="h-6 w-16 rounded bg-passport-surface-2" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonRow({ className = '' }: { className?: string }) {
  return (
    <div className={`glass-panel p-4 animate-pulse ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-passport bg-passport-surface-2" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-32 rounded bg-passport-surface-2" />
          <div className="h-3 w-48 rounded bg-passport-surface-2" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonText({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 rounded bg-passport-surface-2" style={{ width: `${70 + Math.random() * 30}%` }} />
      ))}
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Spinner size={24} className="text-passport-green" />
    </div>
  )
}
