'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useFocusTrap } from '@/lib/use-focus-trap'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  actions?: React.ReactNode
}

const sizeClasses: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  actions,
}: ModalProps) {
  const titleId = useId()
  const descId = useId()
  const [mounted, setMounted] = useState(false)
  const [animating, setAnimating] = useState(false)

  const focusTrapRef = useFocusTrap(open)

  useEffect(() => {
    if (open) {
      setMounted(true)
      document.body.style.overflow = 'hidden'
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimating(true))
      })
    } else {
      setAnimating(false)
      document.body.style.overflow = ''
      const timer = setTimeout(() => setMounted(false), 200)
      return () => clearTimeout(timer)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  useEffect(() => {
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  if (!mounted) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descId : undefined}
    >
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${
          animating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={focusTrapRef}
        className={`relative w-full ${sizeClasses[size]} glass-panel p-6 border border-passport-border transition-all duration-200 ${
          animating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        <div className="flex items-start justify-between mb-4">
            <div>
              {title && (
                <h2 id={titleId} className="text-lg font-bold text-passport-text">
                  {title}
                </h2>
              )}
              {description && (
                <p id={descId} className="text-sm text-passport-muted mt-1">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-passport hover:bg-passport-surface-2 text-passport-dim hover:text-passport-text transition-colors -mr-1 -mt-1 shrink-0 ml-4 min-touch-target flex items-center justify-center"
              aria-label="Close dialog"
            >
              <X size={16} />
            </button>
          </div>

        <div>{children}</div>

        {actions && (
          <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-passport-border">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
