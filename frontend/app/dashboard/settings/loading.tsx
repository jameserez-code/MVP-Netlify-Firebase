'use client'

import { FormSkeleton } from '@/components/loading'

export default function SettingsLoading() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="space-y-1">
        <div className="h-8 w-32 rounded-passport skeleton-shimmer" />
        <div className="h-4 w-64 rounded-passport skeleton-shimmer" />
      </div>
      <div className="glass-panel p-6">
        <div className="h-6 w-40 rounded-passport skeleton-shimmer mb-5" />
        <FormSkeleton fields={4} />
      </div>
      <div className="glass-panel p-6">
        <div className="h-6 w-44 rounded-passport skeleton-shimmer mb-5" />
        <FormSkeleton fields={3} />
      </div>
    </div>
  )
}
