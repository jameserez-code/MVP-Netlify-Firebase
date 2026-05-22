'use client'

import { Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface AutoSaveProps {
  status: SaveStatus
  onRetry?: () => void
  className?: string
}

const statusConfig: Record<SaveStatus, { icon: React.ReactNode; label: string; className: string }> = {
  idle: {
    icon: null,
    label: '',
    className: '',
  },
  saving: {
    icon: <Loader2 size={12} className="animate-spin" />,
    label: 'Saving...',
    className: 'text-passport-azure',
  },
  saved: {
    icon: <CheckCircle2 size={12} />,
    label: 'Saved',
    className: 'text-passport-green',
  },
  error: {
    icon: <AlertCircle size={12} />,
    label: 'Error saving',
    className: 'text-passport-red',
  },
}

export default function AutoSave({ status, onRetry, className = '' }: AutoSaveProps) {
  if (status === 'idle') return null

  const config = statusConfig[status]

  return (
    <div
      className={`inline-flex items-center gap-1.5 text-xs font-medium animate-fade-in ${config.className} ${className}`}
      role="status"
      aria-live="polite"
    >
      {config.icon}
      <span>{config.label}</span>
      {status === 'error' && onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1 ml-1 text-passport-red hover:text-passport-red/80 underline underline-offset-2"
        >
          <RefreshCw size={10} />
          Retry
        </button>
      )}
    </div>
  )
}
