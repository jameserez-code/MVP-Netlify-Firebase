'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from '@/components/sidebar'
import { isLoggedIn } from '@/lib/api'
import { ChevronRight } from 'lucide-react'

function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  const labels: Record<string, string> = {
    dashboard: 'Dashboard',
    agents: 'Agents',
    policies: 'Policies',
    audit: 'Audit',
  }

  return (
    <nav className="flex items-center gap-1.5 text-xs text-passport-dim mb-4">
      <span className="font-mono uppercase tracking-wider">{labels[segments[0]] || segments[0]}</span>
      {segments.length > 1 && (
        <>
          <ChevronRight size={12} />
          <span className="text-passport-muted capitalize">{labels[segments[1]] || segments[1]}</span>
        </>
      )}
    </nav>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-passport-bg">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      {/* Shimmer bar */}
      <div
        className="fixed top-0 left-0 right-0 h-[2px] z-30"
        style={{
          background: 'linear-gradient(90deg, transparent, #2ea043, transparent)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 3s infinite linear',
        }}
      />
      <main
        className={`min-h-screen transition-all duration-200 ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <Breadcrumbs />
          {children}
        </div>
      </main>
    </div>
  )
}
