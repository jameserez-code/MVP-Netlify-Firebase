'use client'

import { SkeletonCard } from '@/components/loading'

export default function PolicyTemplatesLoading() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-8 w-52 rounded-passport skeleton-shimmer" />
          <div className="h-4 w-72 rounded-passport skeleton-shimmer" />
        </div>
      </div>
      <div className="h-10 w-full max-w-md rounded-passport skeleton-shimmer" />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  )
}
