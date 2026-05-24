'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { resetPassword } from '@/lib/api'
import { useToast } from '@/components/toast'
import PasswordStrength from '@/components/password-strength'
import { Shield, AlertCircle, CheckCircle, Eye, EyeOff, KeyRound, ArrowLeft } from 'lucide-react'

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { addToast } = useToast()
  const token = searchParams.get('token')
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [shakeCard, setShakeCard] = useState(false)
  const [redirectCount, setRedirectCount] = useState(3)

  useEffect(() => {
    if (!token) {
      setTokenValid(false)
    } else {
      setTokenValid(true)
    }
  }, [token])

  useEffect(() => {
    if (success && redirectCount > 0) {
      const timer = setTimeout(() => setRedirectCount(redirectCount - 1), 1000)
      return () => clearTimeout(timer)
    }
    if (success && redirectCount === 0) {
      router.push('/login')
    }
  }, [success, redirectCount, router])

  function validate(): boolean {
    const errors: Record<string, string> = {}
    if (!newPassword) errors.newPassword = 'New password is required'
    else if (newPassword.length < 8) errors.newPassword = 'Password must be at least 8 characters'
    else if (!/\d/.test(newPassword)) errors.newPassword = 'Password must contain at least 1 number'
    else if (!/[^a-zA-Z0-9]/.test(newPassword)) errors.newPassword = 'Password must contain at least 1 special character'
    if (newPassword !== confirmPassword) errors.confirmPassword = 'Passwords do not match'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    if (!validate()) {
      setShakeCard(true)
      setTimeout(() => setShakeCard(false), 500)
      return
    }
    setError('')
    setLoading(true)
    try {
      await resetPassword(token, newPassword)
      setSuccess(true)
      addToast('Password updated successfully', 'success')
    } catch (err: any) {
      const msg = err.message || 'Failed to reset password'
      setError(msg)
      setShakeCard(true)
      setTimeout(() => setShakeCard(false), 500)
      addToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  if (tokenValid === null) {
    return (
      <div className="min-h-screen bg-passport-bg flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="animate-spin w-8 h-8 border-2 border-passport-green/30 border-t-passport-green rounded-full mx-auto mb-4" />
          <p className="text-sm text-passport-muted">Verifying reset link...</p>
        </div>
      </div>
    )
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-passport-bg flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="glass-panel p-6 sm:p-8 text-center">
            <AlertCircle size={40} className="text-passport-red mx-auto mb-4" />
            <h1 className="text-xl font-bold text-passport-text mb-2">Invalid Link</h1>
            <p className="text-sm text-passport-muted mb-6">This reset link is missing or has expired. Please request a new one.</p>
            <Link href="/forgot-password" className="btn-primary w-full py-2.5 inline-block">
              Request New Link
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-passport-bg flex items-center justify-center px-4 py-12 relative">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(600px at 50% 40%, rgba(46,160,67,0.04) 0%, transparent 70%)' }} />
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
            <CheckCircle size={40} className="text-passport-green mx-auto mb-4" />
            <h1 className="text-xl font-bold text-passport-text mb-2">Password Updated</h1>
            <p className="text-sm text-passport-muted mb-6">
              Your password has been reset successfully. Redirecting to login in {redirectCount}s...
            </p>
            <button
              onClick={() => router.push('/login')}
              className="btn-primary w-full py-2.5"
            >
              Go to Login Now
            </button>
          </div>
        </div>
      </div>
    )
  }

  const passwordsMatch = confirmPassword && newPassword === confirmPassword

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
            <h1 className="text-xl font-bold text-passport-text mb-1">New Password</h1>
            <p className="text-sm text-passport-muted">Enter your new password below.</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-passport border border-passport-red/30 bg-passport-red/5 flex items-start gap-2">
              <AlertCircle size={16} className="text-passport-red mt-0.5 shrink-0" />
              <span className="text-sm text-passport-red">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="label-text">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, newPassword: '' })) }}
                  className={`input-field pr-10 ${fieldErrors.newPassword ? 'border-passport-red' : ''}`}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-passport-dim hover:text-passport-text transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.newPassword && (
                <p className="text-xs text-passport-red mt-1">{fieldErrors.newPassword}</p>
              )}
              <PasswordStrength password={newPassword} />
            </div>

            <div>
              <label className="label-text">Confirm Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, confirmPassword: '' })) }}
                  className={`input-field pr-10 ${fieldErrors.confirmPassword ? 'border-passport-red' : passwordsMatch ? 'border-passport-green/50' : ''}`}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                {passwordsMatch && (
                  <CheckCircle size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-passport-green" />
                )}
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-passport-red mt-1">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              className="btn-primary w-full py-2.5 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-passport-green/30 border-t-passport-green rounded-full animate-spin" />
                  Updating...
                </span>
              ) : (
                <>
                  <KeyRound size={14} />
                  Reset Password
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-passport-bg flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="animate-spin w-8 h-8 border-2 border-passport-green/30 border-t-passport-green rounded-full mx-auto mb-4" />
          <p className="text-sm text-passport-muted">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
