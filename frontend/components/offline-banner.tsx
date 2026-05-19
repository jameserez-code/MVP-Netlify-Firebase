'use client'

import { useEffect, useState } from 'react'
import { WifiOff, Wifi } from 'lucide-react'

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState<boolean>(true)

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) return null

  return (
    <div
      role="alert"
      aria-live="polite"
      className="sticky top-0 z-[90] w-full border-b border-passport-amber/30 bg-passport-amber/10 px-4 py-2.5"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-2.5">
        <WifiOff size={16} className="shrink-0 text-passport-amber" />
        <span className="text-sm text-passport-amber">
          You&apos;re offline. Changes will sync when you reconnect.
        </span>
      </div>
    </div>
  )
}
