'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { register, resendVerification, seedOrg, setToken, login } from '@/lib/api'
import { useToast } from '@/components/toast'
import { Terminal, Shield, AlertCircle, CheckCircle, Mail, RefreshCw } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const errors: Record<string, string> = {}
    if (!name.trim()) errors.name = 'Organization name is required'
    if (!email.trim()) errors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email'
    if (!password) errors.password = 'Password is required'
    else if (password.length < 8) errors.password = 'Password must be at least 8 characters'
    else if (!/\d/.test(password)) errors.password = 'Password must contain at least 1 number'
    else if (!/[^a-zA-Z0-9]/.test(password)) errors.password = 'Password must contain at least 1 special character'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setError('')
    setLoading(true)
    try {
      await register(name, email, password)
      setSuccess(true)
      addToast('Account created. Check your email for verification link.', 'success')
    } catch (err: any) {
      const msg = err.message || 'Registration failed'
      setError(msg)
      addToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    if (!email) return
    setResending(true)
    try {
      await resendVerification(email)
      addToast('Verification email resent', 'success')
    } catch (err: any) {
      addToast(err.message || 'Failed to resend', 'error')
    } finally {
      setResending(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-passport-bg flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="glass-panel p-6 sm:p-8 text-center">
            <Mail size={40} className="text-passport-azure mx-auto mb-4" />
            <h1 className="text-xl font-bold text-passport-text mb-2">
              Check Your Email
            </h1>
            <p className="text-sm text-passport-muted mb-6">
              We sent a verification link to <span className="text-passport-text font-mono">{email}</span>. Click the link to activate your account.
            </p>
            <button
              onClick={handleResend}
              disabled={resending}
              className="btn-secondary w-full py-2.5 disabled:opacity-50"
            >
              {resending ? (
                <span className="flex items-center gap-2">
                  <RefreshCw size={14} className="animate-spin" />
                  Sending...
                </span>
              ) : (
                <>
                  <RefreshCw size={14} />
                  Resend Verification Email
                </>
              )}
            </button>
            <p className="text-center mt-4 text-sm text-passport-muted">
              <Link href="/login" className="text-passport-azure hover:underline">
                Go to Sign In
              </Link>
            </p>
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
            <h1 className="text-xl font-bold text-passport-text mb-1">
              Create Account
            </h1>
            <p className="text-sm text-passport-muted">
              Set up your isolated agent control plane
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-passport border border-passport-red/30 bg-passport-red/5 flex items-start gap-2">
              <AlertCircle size={16} className="text-passport-red mt-0.5 shrink-0" />
              <span className="text-sm text-passport-red">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="label-text">Organization Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setFieldErrors((prev) => ({ ...prev, name: '' })) }}
                className={`input-field ${fieldErrors.name ? 'border-passport-red' : ''}`}
                placeholder="Acme Corp"
              />
              {fieldErrors.name && (
                <p className="text-xs text-passport-red mt-1">{fieldErrors.name}</p>
              )}
            </div>

            <div>
              <label className="label-text">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setFieldErrors((prev) => ({ ...prev, email: '' })) }}
                className={`input-field ${fieldErrors.email ? 'border-passport-red' : ''}`}
                placeholder="admin@example.com"
              />
              {fieldErrors.email && (
                <p className="text-xs text-passport-red mt-1">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label className="label-text">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, password: '' })) }}
                className={`input-field ${fieldErrors.password ? 'border-passport-red' : ''}`}
                placeholder="••••••••"
              />
              {fieldErrors.password && (
                <p className="text-xs text-passport-red mt-1">{fieldErrors.password}</p>
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
                  Creating...
                </span>
              ) : (
                <>
                  <Terminal size={14} />
                  Create Account
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-sm text-passport-muted">
          Already have an account?{' '}
          <Link href="/login" className="text-passport-azure hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
