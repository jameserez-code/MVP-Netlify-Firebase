'use client'

import { useState, useId } from 'react'
import { X } from 'lucide-react'

interface FormInputProps {
  label: string
  name: string
  type?: string
  value: string
  onChange: (value: string) => void
  error?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  autoFocus?: boolean
  autoComplete?: string
  icon?: React.ReactNode
  hint?: string
  maxLength?: number
  showCharCount?: boolean
  onClear?: () => void
}

export default function FormInput({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  required = false,
  disabled = false,
  autoFocus = false,
  autoComplete,
  icon,
  hint,
  maxLength,
  showCharCount,
  onClear,
}: FormInputProps) {
  const id = useId()
  const [focused, setFocused] = useState(false)
  const hasValue = value.length > 0
  const showClear = hasValue && !disabled && onClear

  return (
    <div>
      <label htmlFor={id} className="label-text">
        {label}
        {required && <span className="text-passport-red ml-0.5">*</span>}
      </label>

      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-passport-dim pointer-events-none">
            {icon}
          </div>
        )}

        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          maxLength={maxLength}
          className={[
            'input-field',
            icon ? 'pl-10' : '',
            showClear ? 'pr-9' : '',
            error ? 'border-passport-red focus:border-passport-red focus:shadow-[0_0_0_2px_rgba(248,81,73,0.12)]' : '',
            disabled ? 'opacity-50 cursor-not-allowed' : '',
            focused && !error
              ? 'ring-2 ring-passport-azure/20 ring-offset-0'
              : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-invalid={!!error}
          aria-describedby={
            [
              error ? `${id}-error` : '',
              hint ? `${id}-hint` : '',
              maxLength && showCharCount ? `${id}-count` : '',
            ]
              .filter(Boolean)
              .join(' ') || undefined
          }
        />

        {showClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-passport-dim hover:text-passport-text transition-colors p-1 rounded-sm"
            aria-label={`Clear ${label}`}
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex items-start justify-between mt-1 min-h-[18px]">
        <div>
          {error && (
            <p
              id={`${id}-error`}
              className="text-xs text-passport-red animate-fade-in"
              role="alert"
            >
              {error}
            </p>
          )}
          {!error && hint && (
            <p id={`${id}-hint`} className="text-xs text-passport-dim">
              {hint}
            </p>
          )}
        </div>

        {maxLength && showCharCount && (
          <p
            id={`${id}-count`}
            className={`text-xs ml-2 shrink-0 ${
              value.length > maxLength * 0.9
                ? 'text-passport-red'
                : 'text-passport-dim'
            }`}
          >
            {value.length}/{maxLength}
          </p>
        )}
      </div>
    </div>
  )
}
