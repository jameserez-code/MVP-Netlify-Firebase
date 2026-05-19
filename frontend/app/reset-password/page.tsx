'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { resetPassword } from '@/lib/api'
import { useToast } from '@/components/toast'
import { Shield, AlertCircle, CheckCircle, Eye, EyeOff, KeyRound } from 'lucide-react'

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { addToast } = useToast()
  const token = searchParams.get('token')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [strength, setStrength] = useState(0)

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token.')
    }
  }, [token])

  useEffect(() => {
    let score = 0
    if (newPassword.length >= 8) score++
    if (/\d/.test(newPassword)) score++
    if (/[^a-zA-Z0-9]/.test(newPassword)) score++
    if (newPassword.length >= 12) score++
    setStrength(score)
  }, [newPassword])

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
    if (!validate()) return
    setError('')
    setLoading(true)
    try {
      await resetPassword(token, newPassword)
      setSuccess(true)
      addToast('Password updated successfully', 'success')
    } catch (err: any) {
      const msg = err.message || 'Failed to reset password'
      setError(msg)
      addToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const strengthColor = ['bg-passport-red', 'bg-passport-red', 'bg-passport-amber', 'bg-passport-green', 'bg-passport-green'][strength]

  if (success) {
    return (
      <div className="min-h-screen bg-passport-bg flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <Shield size={24} className="text-passport-green group-hover:drop-shadow-[0_0_8px_rgba(46,160,67,0.4)] transition-all" />
              <span className="font-mono text-sm font-bold text-passport-green tracking-wider uppercase">
                Passport Agent
              </span>
            </Link>
          </div>
          <div className="glass-panel p-6 sm:p-8 text-center">
            <CheckCircle size={40} className="text-passport-green mx-auto mb-4" />
            <h1 className="text-xl font-bold text-passport-text mb-2">Password Updated</h1>
            <p className="text-sm text-passport-muted mb-6">Your password has been reset successfully.</p>
            <button
              onClick={() => router.push('/login')}
              className="btn-primary w-full py-2.5"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-passport-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <Shield size={24} className="text-passport-green group-hover:drop-shadow-[0_0_8px_rgba(46,160,67,0.4)] transition-all" />
            <span className="font-mono text-sm font-bold text-passport-green tracking-wider uppercase">
              Passport Agent
            </span>
          </Link>
        </div>

        <div className="glass-panel p-6 sm:p-8">
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
              {/* Strength indicator */}
              <div className="mt-2 flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full ${i < strength ? strengthColor : 'bg-passport-border'}`} />
                ))}
              </div>
              <p className="text-[10px] text-passport-muted mt-1">
                {strength <= 1 ? 'Weak' : strength === 2 ? 'Fair' : strength === 3 ? 'Good' : 'Strong'}
              </p>
            </div>

            <div>
              <label className="label-text">Confirm Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, confirmPassword: '' })) }}
                className={`input-field ${fieldErrors.confirmPassword ? 'border-passport-red' : ''}`}
                placeholder="••••••••"
              />
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
