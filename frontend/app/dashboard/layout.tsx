'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/sidebar'
import { isLoggedIn } from '@/lib/api'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-passport-bg">
      <Sidebar />
      {/* Shimmer bar */}
      <div
        className="fixed top-0 left-0 right-0 h-[2px] z-30"
        style={{
          background: 'linear-gradient(90deg, transparent, #2ea043, transparent)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 3s infinite linear',
        }}
      />
      <main className="lg:ml-60 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
