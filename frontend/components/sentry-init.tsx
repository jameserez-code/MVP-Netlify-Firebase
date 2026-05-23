'use client'
import { initSentry } from '@/lib/sentry'
import { useEffect } from 'react'

export default function SentryInit() {
  useEffect(() => { initSentry() }, [])
  return null
}
