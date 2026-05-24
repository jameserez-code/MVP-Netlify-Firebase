'use client'

import { ListSkeleton } from '@/components/loading'

export default function ExportsLoading() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-8 w-36 rounded-passport skeleton-shimmer" />
          <div className="h-4 w-56 rounded-passport skeleton-shimmer" />
        </div>
      </div>
      <div className="flex gap-3 flex-wrap">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-panel p-4 flex items-center gap-3 min-w-[140px]">
            <div className="w-8 h-8 rounded-passport skeleton-shimmer" />
            <div className="space-y-1">
              <div className="h-4 w-12 rounded-passport skeleton-shimmer" />
              <div className="h-3 w-8 rounded-passport skeleton-shimmer" />
            </div>
          </div>
        ))}
      </div>
      <div className="glass-panel p-5 space-y-3">
        <div className="h-6 w-32 rounded-passport skeleton-shimmer" />
        <ListSkeleton rows={3} />
      </div>
    </div>
  )
}
