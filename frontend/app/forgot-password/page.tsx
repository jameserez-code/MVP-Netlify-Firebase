'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { forgotPassword } from '@/lib/api'
import { useToast } from '@/components/toast'
import { Shield, AlertCircle, Mail, CheckCircle, ArrowLeft, KeyRound } from 'lucide-react'

export default function ForgotPasswordPage() {
  const { addToast } = useToast()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [shakeCard, setShakeCard] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => emailRef.current?.focus(), 100)
  }, [])

  function validate(): boolean {
    const errors: Record<string, string> = {}
    if (!email.trim()) errors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) {
      setShakeCard(true)
      setTimeout(() => setShakeCard(false), 500)
      return
    }
    setError('')
    setLoading(true)
    try {
      await forgotPassword(email)
      setSent(true)
      addToast('Reset instructions sent', 'success')
    } catch (err: any) {
      const msg = err.message || 'Failed to send reset link'
      setError(msg)
      setShakeCard(true)
      setTimeout(() => setShakeCard(false), 500)
      addToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-passport-bg flex items-center justify-center px-4 py-12 relative">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(600px at 50% 40%, rgba(46,160,67,0.04) 0%, transparent 70%)' }} />
        <Link href="/login" className="absolute top-6 left-6 flex items-center gap-2 text-sm text-passport-muted hover:text-passport-text transition-colors">
          <ArrowLeft size={16} />
          Back to Login
        </Link>
        <div className="w-full max-w-sm relative z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border border-passport-border bg-passport-surface/50 backdrop-blur-sm mb-4">
              <KeyRound size={24} className="text-passport-green" />
            </div>
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <Shield size={20} className="text-passport-green group-hover:drop-shadow-[0_0_8px_rgba(46,160,67,0.4)] transition-all" />
              <span className="font-mono text-sm font-bold text-passport-green tracking-wider uppercase">
                Passport Agent
              </span>
            </Link>
          </div>
          <div className="glass-panel p-6 sm:p-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-passport-green/10 border border-passport-green/20 mb-4 animate-counter-pulse">
              <Mail size={28} className="text-passport-green" />
            </div>
            <h1 className="text-xl font-bold text-passport-text mb-2">Check Your Email</h1>
            <p className="text-sm text-passport-muted mb-6">
              If an account exists for <span className="font-mono text-passport-text">{email}</span>, you will receive reset instructions.
            </p>
            <Link href="/login" className="btn-primary w-full py-2.5 inline-block">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-passport-bg flex items-center justify-center px-4 py-12 relative">
      {/* Subtle background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(600px at 50% 40%, rgba(46,160,67,0.04) 0%, transparent 70%)',
        }}
      />

      <Link
        href="/login"
        className="absolute top-6 left-6 flex items-center gap-2 text-sm text-passport-muted hover:text-passport-text transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Login
      </Link>

      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border border-passport-border bg-passport-surface/50 backdrop-blur-sm mb-4">
            <KeyRound size={24} className="text-passport-green" />
          </div>
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <Shield size={20} className="text-passport-green group-hover:drop-shadow-[0_0_8px_rgba(46,160,67,0.4)] transition-all" />
            <span className="font-mono text-sm font-bold text-passport-green tracking-wider uppercase">
              Passport Agent
            </span>
          </Link>
        </div>

        <div className={`glass-panel p-6 sm:p-8 ${shakeCard ? 'animate-shake' : ''}`}>
          <div className="mb-6">
            <h1 className="text-xl font-bold text-passport-text mb-1">Reset Password</h1>
            <p className="text-sm text-passport-muted">Enter your email to receive reset instructions.</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-passport border border-passport-red/30 bg-passport-red/5 flex items-start gap-2">
              <AlertCircle size={16} className="text-passport-red mt-0.5 shrink-0" />
              <span className="text-sm text-passport-red">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="label-text">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-passport-dim" />
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setFieldErrors((prev) => ({ ...prev, email: '' })) }}
                  className={`input-field pl-10 ${fieldErrors.email ? 'border-passport-red' : ''}`}
                  placeholder="admin@example.com"
                  autoComplete="email"
                />
              </div>
              {fieldErrors.email && (
                <p className="text-xs text-passport-red mt-1">{fieldErrors.email}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-passport-green/30 border-t-passport-green rounded-full animate-spin" />
                  Sending...
                </span>
              ) : (
                <>
                  <Mail size={14} />
                  Send Reset Link
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-sm text-passport-muted">
          Remember your password?{' '}
          <Link href="/login" className="text-passport-azure hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
