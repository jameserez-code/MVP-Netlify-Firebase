'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void
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

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      removeToast(id)
    }, 5000)
  }, [removeToast])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* aria-live region for screen readers */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {toasts.length > 0 && toasts[toasts.length - 1].message}
      </div>
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[320px] max-w-[calc(100vw-2rem)]" role="region" aria-label="Notifications">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`glass-panel p-3 flex items-start gap-2.5 ${toastStyles[toast.type]} animate-toast-in`}
            role="alert"
          >
            {toastIcons[toast.type]}
            <span className="text-sm text-passport-text flex-1 leading-relaxed">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-passport-dim hover:text-passport-text transition-colors shrink-0 mt-0.5"
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
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
