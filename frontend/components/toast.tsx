'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastAction {
  label: string
  onClick: () => void
}

interface Toast {
  id: string
  message: string
  type: ToastType
  action?: ToastAction
  duration?: number
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType, action?: ToastAction) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

const toastIcons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={16} className="text-passport-green shrink-0" />,
  error: <AlertCircle size={16} className="text-passport-red shrink-0" />,
  warning: <AlertTriangle size={16} className="text-passport-amber shrink-0" />,
  info: <Info size={16} className="text-passport-azure shrink-0" />,
}

const toastStyles: Record<ToastType, string> = {
  success: 'border-passport-green/30 bg-passport-green/5',
  error: 'border-passport-red/30 bg-passport-red/5',
  warning: 'border-passport-amber/30 bg-passport-amber/5',
  info: 'border-passport-azure/30 bg-passport-azure/5',
}

const DEFAULT_DURATION = 5000

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast
  onRemove: (id: string) => void
}) {
  const duration = toast.duration ?? DEFAULT_DURATION
  const [progress, setProgress] = useState(100)
  const [exiting, setExiting] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const [translateX, setTranslateX] = useState(0)

  useEffect(() => {
    const start = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)
      if (remaining <= 0) {
        clearInterval(interval)
        handleDismiss()
      }
    }, 50)

    const timeout = setTimeout(() => {
      handleDismiss()
    }, duration)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [duration])

  function handleDismiss() {
    setExiting(true)
    setTimeout(() => onRemove(toast.id), 300)
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartX.current == null) return
    const diff = e.touches[0].clientX - touchStartX.current
    if (diff > 0) {
      setTranslateX(diff)
    }
  }

  function handleTouchEnd() {
    if (touchStartX.current == null) return
    if (translateX > 80) {
      handleDismiss()
    } else {
      setTranslateX(0)
    }
    touchStartX.current = null
  }

  return (
    <div
      className={`relative overflow-hidden ${exiting ? 'animate-toast-out' : 'animate-toast-in'}`}
      style={{
        transform: `translateX(${translateX}px)`,
        transition: translateX > 0 ? 'none' : 'transform 0.2s ease',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={`glass-panel p-3 flex items-start gap-2.5 ${toastStyles[toast.type]} border`}
        role="alert"
      >
        {toastIcons[toast.type]}
        <div className="flex-1 min-w-0">
          <span className="text-sm text-passport-text leading-relaxed block">{toast.message}</span>
          {toast.action && (
            <button
              onClick={() => {
                toast.action?.onClick()
                handleDismiss()
              }}
              className="mt-1.5 text-xs font-medium text-passport-azure hover:text-passport-azure/80 underline underline-offset-2"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="text-passport-dim hover:text-passport-text transition-colors shrink-0 mt-0.5 min-touch-target flex items-center justify-center"
          aria-label="Dismiss notification"
        >
          <X size={14} />
        </button>
      </div>
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-passport-surface-2">
        <div
          className="h-full transition-all duration-100 ease-linear"
          style={{
            width: `${progress}%`,
            backgroundColor:
              toast.type === 'success'
                ? '#2ea043'
                : toast.type === 'error'
                ? '#f85149'
                : toast.type === 'warning'
                ? '#d2991d'
                : '#58a6ff',
            opacity: 0.5,
          }}
        />
      </div>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((message: string, type: ToastType = 'info', action?: ToastAction) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type, action }])
  }, [])

  useEffect(() => {
    const handler = (event: CustomEvent<{ message: string; type: ToastType; action?: ToastAction }>) => {
      addToast(event.detail.message, event.detail.type, event.detail.action)
    }
    window.addEventListener('passport-toast' as any, handler as any)
    return () => {
      window.removeEventListener('passport-toast' as any, handler as any)
    }
  }, [addToast])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* aria-live region for screen readers */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {toasts.length > 0 && toasts[toasts.length - 1].message}
      </div>
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[320px] max-w-[calc(100vw-2rem)]" role="region" aria-label="Notifications">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
