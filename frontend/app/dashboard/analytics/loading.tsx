'use client'

import { SkeletonCard, ChartSkeleton } from '@/components/loading'

export default function AnalyticsLoading() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="space-y-1">
        <div className="h-8 w-44 rounded-passport skeleton-shimmer" />
        <div className="h-4 w-60 rounded-passport skeleton-shimmer" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="glass-panel p-5 space-y-3">
          <div className="h-6 w-40 rounded-passport skeleton-shimmer" />
          <ChartSkeleton type="bar" />
        </div>
        <div className="glass-panel p-5 space-y-3">
          <div className="h-6 w-40 rounded-passport skeleton-shimmer" />
          <ChartSkeleton type="bar" />
        </div>
      </div>
    </div>
  )
}
