'use client'

import { Loader2 } from 'lucide-react'

export function Spinner({ size = 20, className = '' }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} />
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`glass-panel p-5 ${className}`}>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-passport skeleton-shimmer" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-20 rounded-passport skeleton-shimmer" />
          <div className="h-6 w-16 rounded-passport skeleton-shimmer" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonRow({ className = '' }: { className?: string }) {
  return (
    <div className={`glass-panel p-4 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-passport skeleton-shimmer" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-32 rounded-passport skeleton-shimmer" />
          <div className="h-3 w-48 rounded-passport skeleton-shimmer" />
        </div>
      </div>
    </div>
  )
}

export function SkeletonText({
  lines = 3,
  className = '',
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded-passport skeleton-shimmer"
          style={{ width: `${70 + ((i * 13) % 30)}%` }}
        />
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

export function ListSkeleton({
  rows = 5,
  className = '',
}: {
  rows?: number
  className?: string
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="glass-panel p-4 flex items-center gap-4"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="w-8 h-8 rounded-passport skeleton-shimmer shrink-0" />
          <div className="flex-1 space-y-2 min-w-0">
            <div className="h-4 w-2/5 rounded-passport skeleton-shimmer" />
            <div className="h-3 w-3/5 rounded-passport skeleton-shimmer" />
          </div>
          <div className="w-16 h-6 rounded-passport skeleton-shimmer shrink-0" />
        </div>
      ))}
    </div>
  )
}

export function FormSkeleton({
  fields = 4,
  className = '',
}: {
  fields?: number
  className?: string
}) {
  return (
    <div className={`space-y-5 ${className}`}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} style={{ animationDelay: `${i * 80}ms` }}>
          <div className="h-3 w-24 rounded-passport skeleton-shimmer mb-2" />
          <div className="h-10 w-full rounded-passport skeleton-shimmer" />
        </div>
      ))}
      <div className="flex items-center gap-3 pt-2">
        <div className="h-10 w-24 rounded-passport skeleton-shimmer" />
        <div className="h-10 w-24 rounded-passport skeleton-shimmer" />
      </div>
    </div>
  )
}

export function ChartSkeleton({
  type = 'bar',
  className = '',
}: {
  type?: 'bar' | 'circle'
  className?: string
}) {
  if (type === 'circle') {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height: 200 }}
      >
        <div className="relative">
          <div
            className="rounded-full skeleton-shimmer"
            style={{ width: 140, height: 140 }}
          />
          <div
            className="absolute inset-[30px] rounded-full bg-passport-bg"
          />
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-end gap-3 px-4 ${className}`} style={{ height: 180 }}>
      {[60, 85, 45, 100, 70, 90, 55].map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-passport skeleton-shimmer"
          style={{
            height: `${h}%`,
            animationDelay: `${i * 100}ms`,
          }}
        />
      ))}
    </div>
  )
}
