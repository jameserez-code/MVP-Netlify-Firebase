'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { login, setToken } from '@/lib/api'
import { useToast } from '@/components/toast'
import PasswordStrength from '@/components/password-strength'
import { Terminal, Shield, AlertCircle, Eye, EyeOff, Info, CheckCircle, ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [shakeCard, setShakeCard] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('passport_remember_email')
    if (saved) {
      setEmail(saved)
      setRememberMe(true)
    }
    setTimeout(() => emailRef.current?.focus(), 100)
  }, [])

  function validate(): boolean {
    const errors: Record<string, string> = {}
    if (!email.trim()) errors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email'
    if (!password) errors.password = 'Password is required'
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
      const data = await login(email, password)
      setToken(data.token)
      if (rememberMe) {
        localStorage.setItem('passport_remember_email', email)
      } else {
        localStorage.removeItem('passport_remember_email')
      }
      addToast('Signed in successfully', 'success')
      router.push('/dashboard')
    } catch (err: any) {
      const msg = err.message || 'Invalid credentials'
      setError(msg)
      setShakeCard(true)
      setTimeout(() => setShakeCard(false), 500)
      addToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const demoPassword = process.env.NEXT_PUBLIC_DEMO_PASSWORD

  return (
    <div className="min-h-screen bg-passport-bg flex items-center justify-center px-4 py-12 relative">
      {/* Subtle background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(600px at 50% 40%, rgba(46,160,67,0.04) 0%, transparent 70%)',
        }}
      />

      {/* Back to Home */}
      <Link
        href="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-sm text-passport-muted hover:text-passport-text transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Home
      </Link>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border border-passport-border bg-passport-surface/50 backdrop-blur-sm mb-4">
            <Terminal size={24} className="text-passport-green" />
          </div>
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <Shield size={20} className="text-passport-green group-hover:drop-shadow-[0_0_8px_rgba(46,160,67,0.4)] transition-all" />
            <span className="font-mono text-sm font-bold text-passport-green tracking-wider uppercase">
              Passport Agent
            </span>
          </Link>
        </div>

        {/* Demo banner */}
        {demoPassword && (
        <div className="mb-4 p-3 rounded-passport border border-passport-azure/20 bg-passport-azure/5 flex items-start gap-2">
          <Info size={16} className="text-passport-azure mt-0.5 shrink-0" />
          <div className="text-xs text-passport-azure">
            <p className="font-semibold mb-0.5">Demo Mode</p>
            <p>
              Use demo credentials:<br />
              <span className="font-mono">admin@example.com</span> / <span className="font-mono">{demoPassword}</span>
            </p>
          </div>
        </div>
        )}

        {/* Card */}
        <div className={`glass-panel p-6 sm:p-8 ${shakeCard ? 'animate-shake' : ''}`}>
          <div className="mb-6">
            <h1 className="text-xl font-bold text-passport-text mb-1">
              Sign In
            </h1>
            <p className="text-sm text-passport-muted">
              Access your agent control plane
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
              <label className="label-text">Email</label>
              <input
                ref={emailRef}
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setFieldErrors((prev) => ({ ...prev, email: '' })) }}
                className={`input-field ${fieldErrors.email ? 'border-passport-red' : ''}`}
                placeholder="admin@example.com"
                autoComplete="email"
              />
              {fieldErrors.email && (
                <p className="text-xs text-passport-red mt-1">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label-text mb-0">Password</label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, password: '' })) }}
                  className={`input-field pr-10 ${fieldErrors.password ? 'border-passport-red' : ''}`}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-passport-dim hover:text-passport-text transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-passport-red mt-1">{fieldErrors.password}</p>
              )}
              <PasswordStrength password={password} />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-4 h-4 rounded border border-passport-border bg-passport-bg peer-checked:bg-passport-green peer-checked:border-passport-green transition-all flex items-center justify-center">
                  {rememberMe && <CheckCircle size={10} className="text-passport-bg" />}
                </div>
                <span className="text-xs text-passport-muted group-hover:text-passport-text transition-colors">
                  Remember me
                </span>
              </label>
              <Link href="/forgot-password" className="text-xs text-passport-azure hover:underline">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-passport-green/30 border-t-passport-green rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : (
                <>
                  <Terminal size={14} />
                  Sign In
                </>
              )}
            </button>

            <p className="text-center text-[10px] text-passport-dim">
              Press <kbd className="px-1 py-0.5 text-[9px] border border-passport-border rounded bg-passport-surface font-mono">Enter</kbd> to sign in
            </p>
          </form>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-passport-border" />
            <span className="text-[10px] text-passport-dim font-mono uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-passport-border" />
          </div>
        </div>

        <p className="text-center mt-6 text-sm text-passport-muted">
          Need an organization?{' '}
          <Link href="/register" className="text-passport-azure hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}
