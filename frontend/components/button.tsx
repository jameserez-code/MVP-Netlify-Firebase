'use client'

import { Loader2 } from 'lucide-react'
import { ReactNode, forwardRef } from 'react'

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  icon?: ReactNode
  children: ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  fullWidth?: boolean
  tooltip?: string
}

const variantClasses: Record<string, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
  ghost:
    'inline-flex items-center justify-center gap-1.5 text-passport-muted hover:text-passport-text hover:bg-passport-surface-2 rounded transition-all duration-200 font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-passport-azure focus-visible:outline-offset-2',
}

const sizeClasses: Record<string, string> = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3.5 py-2 text-sm',
  lg: 'px-5 py-3 text-sm',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    icon,
    children,
    onClick,
    type = 'button',
    fullWidth = false,
    tooltip,
  },
  ref
) {
  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      title={tooltip}
      className={[
        variantClasses[variant],
        variant !== 'ghost' ? sizeClasses[size] : sizeClasses[size],
        fullWidth ? 'w-full' : '',
        isDisabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : '',
        !isDisabled ? 'active:scale-[0.97] transition-transform' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {loading ? (
        <Loader2 size={size === 'sm' ? 12 : 14} className="animate-spin shrink-0" />
      ) : (
        icon
      )}
      <span className={loading ? '' : ''}>
        {loading ? 'Loading...' : children}
      </span>
    </button>
  )
})

export default Button
