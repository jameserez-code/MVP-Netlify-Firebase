'use client'

import { CheckCircle } from 'lucide-react'

interface PasswordStrengthProps {
  password: string
  className?: string
}

function calculateScore(password: string): number {
  let score = 0
  if (password.length >= 8) score++
  if (/[0-9]/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  return score
}

const scoreConfig = [
  { label: 'Weak', color: '#f85149', width: '25%' },
  { label: 'Weak', color: '#f85149', width: '25%' },
  { label: 'Fair', color: '#d2991d', width: '50%' },
  { label: 'Good', color: '#2ea043', width: '75%' },
  { label: 'Strong', color: '#2ea043', width: '100%' },
]

export default function PasswordStrength({
  password,
  className = '',
}: PasswordStrengthProps) {
  const score = password.length > 0 ? calculateScore(password) : 0
  const config = scoreConfig[score]

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full bg-passport-surface-2 overflow-hidden"
          >
            <div
              className="h-full rounded-full transition-all duration-300 ease-out"
              style={{
                width: i < score ? '100%' : '0%',
                backgroundColor: config.color,
                transitionDelay: `${i * 60}ms`,
              }}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <p
          className="text-[10px] font-medium uppercase tracking-wider transition-colors duration-300"
          style={{ color: score > 0 ? config.color : '#484f58' }}
        >
          {score > 0 ? config.label : 'Enter a password'}
        </p>
        {score === 4 && (
          <CheckCircle
            size={12}
            className="text-passport-green animate-scaleIn"
          />
        )}
      </div>
    </div>
  )
}
