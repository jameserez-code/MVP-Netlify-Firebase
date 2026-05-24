'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { verifyEmail, resendVerification } from '@/lib/api'
import { Shield, CheckCircle, XCircle, Mail, ArrowLeft, Loader2, RefreshCw } from 'lucide-react'

export default function VerifyPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [resending, setResending] = useState(false)
  const called = useRef(false)

  useEffect(() => {
    if (called.current) return
    called.current = true

    if (!token) {
      setState('error')
      setErrorMessage('No verification token provided.')
      return
    }

    async function verify() {
      try {
        const result = await verifyEmail(token!)
        if (result?.redirect) {
          router.push(result.redirect)
          return
        }
        setState('success')
      } catch (err: any) {
        setState('error')
        setErrorMessage(err.message || 'Invalid or expired verification link.')
      }
    }

    verify()
  }, [token, router])

  async function handleResend() {
    if (!email) return
    setResending(true)
    try {
      await resendVerification(email)
    } catch (err: any) {
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-passport-bg flex items-center justify-center px-4 py-12 relative">
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
            <Mail size={24} className="text-passport-green" />
          </div>
          <Link href="/" className="inline-flex items-center gap-2.5">
            <Shield size={20} className="text-passport-green" />
            <span className="font-mono text-sm font-bold text-passport-green tracking-wider uppercase">
              Passport Agent
            </span>
          </Link>
        </div>

        <div className="glass-panel p-6 sm:p-8 text-center">
          {state === 'loading' && (
            <div className="py-4">
              <Loader2 size={36} className="animate-spin text-passport-green mx-auto mb-4" />
              <h1 className="text-lg font-bold text-passport-text mb-2">Verifying your email...</h1>
              <p className="text-sm text-passport-muted">Please wait while we confirm your account.</p>
            </div>
          )}

          {state === 'success' && (
            <div className="py-4">
              <div className="w-16 h-16 rounded-full bg-passport-green/10 border border-passport-green/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-passport-green" />
              </div>
              <h1 className="text-lg font-bold text-passport-text mb-2">Email verified!</h1>
              <p className="text-sm text-passport-muted mb-6">
                Your account has been activated. You can now sign in.
              </p>
              <Link href="/login" className="btn-primary w-full py-2.5 inline-flex">
                Go to Login
              </Link>
            </div>
          )}

          {state === 'error' && (
            <div className="py-4">
              <div className="w-16 h-16 rounded-full bg-passport-red/10 border border-passport-red/30 flex items-center justify-center mx-auto mb-4">
                <XCircle size={32} className="text-passport-red" />
              </div>
              <h1 className="text-lg font-bold text-passport-text mb-2">Verification Failed</h1>
              <p className="text-sm text-passport-muted mb-2">{errorMessage}</p>
              <p className="text-xs text-passport-dim mb-6">Invalid or expired verification link.</p>

              {email && (
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="btn-secondary w-full py-2.5 disabled:opacity-50 mb-3"
                >
                  {resending ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw size={14} className="animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    <>
                      <RefreshCw size={14} />
                      Resend verification email
                    </>
                  )}
                </button>
              )}

              <Link href="/login" className="btn-primary w-full py-2.5 inline-flex mt-2">
                Go to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
