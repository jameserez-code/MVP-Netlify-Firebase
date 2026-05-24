'use client'

import { SkeletonCard } from '@/components/loading'

export default function BillingLoading() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="space-y-1">
        <div className="h-8 w-36 rounded-passport skeleton-shimmer" />
        <div className="h-4 w-56 rounded-passport skeleton-shimmer" />
      </div>
      <div className="glass-panel p-6 space-y-4">
        <div className="h-6 w-32 rounded-passport skeleton-shimmer" />
        <div className="h-10 w-48 rounded-passport skeleton-shimmer" />
        <div className="h-4 w-full rounded-passport skeleton-shimmer" />
        <div className="h-4 w-3/4 rounded-passport skeleton-shimmer" />
        <div className="h-10 w-40 rounded-passport skeleton-shimmer" />
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  )
}
