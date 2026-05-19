'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { login, setToken } from '@/lib/api'
import { useToast } from '@/components/toast'
import { Terminal, Shield, AlertCircle, Eye, EyeOff, Info, CheckCircle } from 'lucide-react'

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

  useEffect(() => {
    const saved = localStorage.getItem('passport_remember_email')
    if (saved) {
      setEmail(saved)
      setRememberMe(true)
    }
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
    if (!validate()) return
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
      addToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const demoPassword = process.env.NEXT_PUBLIC_DEMO_PASSWORD || 'demo123'

  return (
    <div className="min-h-screen bg-passport-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <Shield size={24} className="text-passport-green group-hover:drop-shadow-[0_0_8px_rgba(46,160,67,0.4)] transition-all" />
            <span className="font-mono text-sm font-bold text-passport-green tracking-wider uppercase">
              Passport Agent
            </span>
          </Link>
        </div>

        {/* Demo banner */}
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

        {/* Card */}
        <div className="glass-panel p-6 sm:p-8">
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
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors((prev) => ({ ...prev, password: '' })) }}
                  className={`input-field pr-10 ${fieldErrors.password ? 'border-passport-red' : ''}`}
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
              {fieldErrors.password && (
                <p className="text-xs text-passport-red mt-1">{fieldErrors.password}</p>
              )}
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
          </form>
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
