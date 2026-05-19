'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { checkHealth } from '@/lib/api'

export default function ApiHealthCheck() {
  const [healthy, setHealthy] = useState<boolean | null>(null)

  useEffect(() => {
    // Delay slightly to avoid blocking initial render
    const timer = setTimeout(() => {
      checkHealth().then((result) => {
        setHealthy(result.ok)
      })
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  if (healthy !== false) return null

  return (
    <div
      role="alert"
      className="sticky top-0 z-[80] w-full border-b border-passport-red/30 bg-passport-red/10 px-4 py-2.5"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-2.5">
        <AlertTriangle size={16} className="shrink-0 text-passport-red" />
        <span className="text-sm text-passport-red">
          API unavailable — check your connection
        </span>
      </div>
    </div>
  )
}
