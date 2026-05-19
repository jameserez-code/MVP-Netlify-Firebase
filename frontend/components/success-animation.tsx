'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

interface SuccessAnimationProps {
  message: string
  onDismiss?: () => void
  duration?: number
  showConfetti?: boolean
}

export function SuccessAnimation({
  message,
  onDismiss,
  duration = 3000,
  showConfetti = true,
}: SuccessAnimationProps) {
  const [visible, setVisible] = useState(true)
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    const start = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)
      if (remaining <= 0) {
        clearInterval(interval)
        setVisible(false)
        onDismiss?.()
      }
    }, 50)

    const timeout = setTimeout(() => {
      setVisible(false)
      onDismiss?.()
    }, duration)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [duration, onDismiss])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={() => { setVisible(false); onDismiss?.() }} />

      {/* Card */}
      <div className="relative glass-panel p-8 max-w-sm w-full text-center pointer-events-auto animate-slide-up">
        {/* Checkmark */}
        <div className="relative inline-flex items-center justify-center mb-4">
          <svg width="64" height="64" viewBox="0 0 64 64" className="transform -rotate-90">
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="rgba(46,160,67,0.15)"
              strokeWidth="3"
            />
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="#2ea043"
              strokeWidth="3"
              strokeDasharray={2 * Math.PI * 28}
              strokeDashoffset={0}
              strokeLinecap="round"
              className="animate-[drawCircle_0.6s_ease-out_forwards]"
              style={{
                strokeDasharray: 2 * Math.PI * 28,
                strokeDashoffset: 2 * Math.PI * 28,
                animation: 'drawCircle 0.6s ease-out 0.1s forwards',
              }}
            />
          </svg>
          <CheckCircle2
            size={32}
            className="absolute text-passport-green animate-[scaleIn_0.3s_ease-out_0.5s_both]"
          />
        </div>

        <h3 className="text-lg font-bold text-passport-text mb-1">{message}</h3>
        <p className="text-sm text-passport-muted">All set!</p>

        {/* Progress bar */}
        <div className="mt-5 h-1 w-full rounded-full bg-passport-surface-2 overflow-hidden">
          <div
            className="h-full bg-passport-green rounded-full transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Confetti particles */}
        {showConfetti && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-sm"
                style={{
                  backgroundColor: ['#2ea043', '#58a6ff', '#d2991d', '#f78166'][i % 4],
                  left: `${10 + Math.random() * 80}%`,
                  top: '50%',
                  animation: `confetti ${0.8 + Math.random() * 0.6}s ease-out ${Math.random() * 0.2}s forwards`,
                  opacity: 0,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes drawCircle {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes scaleIn {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(${-80 - Math.random() * 60}px) rotate(${Math.random() * 360}deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
