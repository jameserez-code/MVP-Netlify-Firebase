'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { seedOrg, setToken } from '@/lib/api'
import { Terminal, Shield, AlertCircle, CheckCircle } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // First login as demo user to get a token
      const loginRes = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@passport.local', password: 'demo123' }),
      })
      const loginData = await loginRes.json()
      if (loginData.token) {
        setToken(loginData.token)
      }

      const data = await seedOrg(name, email)
      setResult(data)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  if (success && result) {
    return (
      <div className="min-h-screen bg-passport-bg flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="glass-panel p-6 sm:p-8 text-center">
            <CheckCircle size={40} className="text-passport-green mx-auto mb-4" />
            <h1 className="text-xl font-bold text-passport-text mb-2">
              Organization Created
            </h1>
            <p className="text-sm text-passport-muted mb-6">
              Your isolated demo environment is ready.
            </p>

            <div className="text-left bg-passport-bg rounded-passport p-4 border border-passport-border mb-6">
              <div className="label-text mb-1">Organization ID</div>
              <div className="font-mono text-sm text-passport-text break-all">{result.orgId}</div>
              <div className="label-text mt-3 mb-1">Admin Email</div>
              <div className="font-mono text-sm text-passport-text">{email}</div>
            </div>

            <button
              onClick={() => router.push('/dashboard')}
              className="btn-primary w-full py-2.5"
            >
              <Terminal size={14} />
              Go to Dashboard
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
            <h1 className="text-xl font-bold text-passport-text mb-1">
              Create Organization
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-text">Organization Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                placeholder="Acme Corp"
                required
              />
            </div>

            <div>
              <label className="label-text">Admin Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="admin@example.com"
                required
              />
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
                  Create Organization
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
