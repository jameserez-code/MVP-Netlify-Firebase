'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { verifyEmail } from '@/lib/api'
import { useToast } from '@/components/toast'
import { Shield, CheckCircle, XCircle, Loader2 } from 'lucide-react'

function VerifyContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { addToast } = useToast()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [message, setMessage] = useState('Verifying your email...')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Invalid or missing verification token.')
      return
    }

    let cancelled = false
    verifyEmail(token)
      .then(() => {
        if (cancelled) return
        setStatus('success')
        setMessage('Email verified successfully!')
        addToast('Email verified', 'success')
      })
      .catch((err: any) => {
        if (cancelled) return
        setStatus('error')
        setMessage(err.message || 'Invalid or expired token.')
        addToast(err.message || 'Verification failed', 'error')
      })

    return () => { cancelled = true }
  }, [token, addToast])

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
          {status === 'verifying' && (
            <>
              <Loader2 size={40} className="text-passport-azure mx-auto mb-4 animate-spin" />
              <h1 className="text-xl font-bold text-passport-text mb-2">Verifying...</h1>
              <p className="text-sm text-passport-muted">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle size={40} className="text-passport-green mx-auto mb-4" />
              <h1 className="text-xl font-bold text-passport-text mb-2">Email Verified!</h1>
              <p className="text-sm text-passport-muted mb-6">{message}</p>
              <button
                onClick={() => router.push('/login')}
                className="btn-primary w-full py-2.5"
              >
                Go to Login
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle size={40} className="text-passport-red mx-auto mb-4" />
              <h1 className="text-xl font-bold text-passport-text mb-2">Verification Failed</h1>
              <p className="text-sm text-passport-muted mb-6">{message}</p>
              <button
                onClick={() => router.push('/register')}
                className="btn-primary w-full py-2.5"
              >
                Go to Register
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-passport-bg flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <Loader2 size={40} className="text-passport-azure mx-auto mb-4 animate-spin" />
          <p className="text-sm text-passport-muted">Loading...</p>
        </div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  )
}
