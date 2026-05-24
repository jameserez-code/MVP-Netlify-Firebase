'use client'

import { ListSkeleton, SkeletonCard } from '@/components/loading'

export default function ApiKeysLoading() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-8 w-48 rounded-passport skeleton-shimmer" />
          <div className="h-4 w-64 rounded-passport skeleton-shimmer" />
        </div>
        <div className="h-10 w-32 rounded-passport skeleton-shimmer" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <ListSkeleton rows={5} />
    </div>
  )
}
