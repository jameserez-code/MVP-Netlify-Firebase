'use client'

import { useState, useCallback } from 'react'
import { Copy, Check } from 'lucide-react'

interface CopyButtonProps {
  text: string
  label?: string
  size?: 'sm' | 'md'
}

const sizeClasses: Record<string, string> = {
  sm: 'p-1.5 text-xs gap-1',
  md: 'px-2.5 py-1.5 text-xs gap-1.5',
}

const iconSizes: Record<string, number> = {
  sm: 12,
  md: 14,
}

export default function CopyButton({
  text,
  label = 'Copy',
  size = 'md',
}: CopyButtonProps) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle')

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setState('copied')
      setTimeout(() => setState('idle'), 2000)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 1500)
    }
  }, [text])

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={state !== 'idle'}
      className={[
        'inline-flex items-center rounded border border-passport-border bg-passport-surface-2/50 hover:bg-passport-surface-2 hover:border-passport-border-2 text-passport-muted hover:text-passport-text transition-all duration-150 font-mono',
        state !== 'idle' ? 'cursor-default' : '',
        sizeClasses[size],
      ].join(' ')}
      aria-label={`Copy ${label}`}
    >
      {state === 'idle' && <Copy size={iconSizes[size]} />}
      {state === 'copied' && <Check size={iconSizes[size]} className="text-passport-green animate-scaleIn" />}
      <span className={state === 'copied' ? 'text-passport-green' : state === 'error' ? 'text-passport-red' : ''}>
        {state === 'idle' ? label : state === 'copied' ? 'Copied!' : 'Failed'}
      </span>
    </button>
  )
}
