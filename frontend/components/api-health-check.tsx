'use client'
import { useEffect, useState } from 'react'
import { Wifi } from 'lucide-react'
import { getBaseUrl } from '@/lib/api'

export default function ApiHealthCheck() {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${getBaseUrl()}/health`)
        if (res.ok) setStatus('ok')
        else setStatus('error')
      } catch {
        setStatus('error')
      }
    }
    const t = setTimeout(check, 500)
    return () => clearTimeout(t)
  }, [])

  if (status !== 'error') return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-passport-red/10 border-b border-passport-red/30 px-4 py-2 flex items-center justify-center gap-2 text-sm text-passport-red">
      <Wifi size={14} />
      API unreachable. Check your connection.
    </div>
  )
}
