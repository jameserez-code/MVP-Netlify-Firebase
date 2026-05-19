'use client'

import { SkeletonCard, SkeletonRow, SkeletonText } from './loading'

export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded bg-passport-surface-2 animate-pulse" />
          <div className="h-4 w-72 rounded bg-passport-surface-2 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-24 rounded bg-passport-surface-2 animate-pulse" />
          <div className="h-9 w-32 rounded bg-passport-surface-2 animate-pulse" />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Content cards */}
      <div className="glass-panel p-5 space-y-3">
        <div className="h-6 w-32 rounded bg-passport-surface-2 animate-pulse" />
        <SkeletonText lines={4} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass-panel p-5 space-y-3">
          <div className="h-6 w-40 rounded bg-passport-surface-2 animate-pulse" />
          <SkeletonText lines={3} />
        </div>
        <div className="glass-panel p-5 space-y-3">
          <div className="h-6 w-40 rounded bg-passport-surface-2 animate-pulse" />
          <SkeletonText lines={3} />
        </div>
      </div>

      {/* List rows */}
      <div className="grid gap-3">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    </div>
  )
}
