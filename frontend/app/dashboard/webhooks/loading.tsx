'use client'

import { ListSkeleton } from '@/components/loading'

export default function WebhooksLoading() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-8 w-48 rounded-passport skeleton-shimmer" />
          <div className="h-4 w-72 rounded-passport skeleton-shimmer" />
        </div>
        <div className="h-10 w-36 rounded-passport skeleton-shimmer" />
      </div>
      <ListSkeleton rows={4} />
    </div>
  )
}
