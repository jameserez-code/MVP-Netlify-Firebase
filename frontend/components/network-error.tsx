'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { WifiOff, RefreshCw, X } from 'lucide-react'

interface NetworkStatus {
  hasError: boolean
  setNetworkError: (hasError: boolean) => void
  retryFn: (() => void) | null
  setRetryFn: (fn: (() => void) | null) => void
}

const NetworkContext = createContext<NetworkStatus>({
  hasError: false,
  setNetworkError: () => {},
  retryFn: null,
  setRetryFn: () => {},
})

export function useNetworkStatus() {
  return useContext(NetworkContext)
}

export function NetworkErrorProvider({ children }: { children: ReactNode }) {
  const [hasError, setHasError] = useState(false)
  const [retryFn, setRetryFn] = useState<(() => void) | null>(null)
  const [dismissed, setDismissed] = useState(false)

  const setNetworkError = useCallback((error: boolean) => {
    if (error) {
      setHasError(true)
      setDismissed(false)
    } else {
      setHasError(false)
      setRetryFn(null)
    }
  }, [])

  useEffect(() => {
    const handleOnline = () => {
      setHasError(false)
      setDismissed(false)
    }
    const handleOffline = () => {
      setHasError(true)
      setDismissed(false)
    }
    const handleNetworkError = () => {
      setHasError(true)
      setDismissed(false)
    }
    const handleNetworkSuccess = () => {
      setHasError(false)
      setRetryFn(null)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('passport-network-error' as any, handleNetworkError)
    window.addEventListener('passport-network-success' as any, handleNetworkSuccess)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('passport-network-error' as any, handleNetworkError)
      window.removeEventListener('passport-network-success' as any, handleNetworkSuccess)
    }
  }, [])

  const dismiss = useCallback(() => {
    setDismissed(true)
  }, [])

  const retry = useCallback(() => {
    setDismissed(false)
    setHasError(false)
    retryFn?.()
    setRetryFn(null)
  }, [retryFn])

  return (
    <NetworkContext.Provider value={{ hasError, setNetworkError, retryFn, setRetryFn }}>
      {children}
      {hasError && !dismissed && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed top-0 left-0 right-0 z-[95] border-b border-passport-red/30 bg-passport-red/10 backdrop-blur-md"
        >
          <div className="mx-auto flex max-w-6xl items-center gap-2.5 px-4 py-2.5">
            <WifiOff size={16} className="shrink-0 text-passport-red" />
            <span className="text-sm text-passport-red flex-1">
              Unable to connect to server. Check your connection.
            </span>
            {retryFn && (
              <button
                onClick={retry}
                className="btn-secondary text-xs py-1 px-3 flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw size={12} />
                Retry
              </button>
            )}
            <button
              onClick={dismiss}
              className="p-1 rounded text-passport-red hover:text-passport-text hover:bg-passport-red/10 transition-colors shrink-0 min-touch-target flex items-center justify-center"
              aria-label="Dismiss network error"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </NetworkContext.Provider>
  )
}
