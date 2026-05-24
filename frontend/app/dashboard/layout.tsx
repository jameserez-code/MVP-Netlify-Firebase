'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from '@/components/sidebar'
import GlobalSearch from '@/components/global-search'
import NotificationCenter from '@/components/notification-center'
import { isLoggedIn } from '@/lib/api'
import { ChevronRight } from 'lucide-react'

function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  const labels: Record<string, string> = {
    dashboard: 'Dashboard',
    agents: 'Agents',
    policies: 'Policies',
    templates: 'Policy Templates',
    audit: 'Audit Log',
    'api-keys': 'API Keys',
    billing: 'Billing',
    exports: 'Exports',
    settings: 'Settings',
    webhooks: 'Webhooks',
    analytics: 'Analytics',
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-passport-dim">
      {segments.map((seg, i) => (
        <React.Fragment key={seg}>
          {i > 0 && <ChevronRight size={12} />}
          <span className={i === segments.length - 1 ? 'text-passport-muted' : 'text-passport-dim'}>
            {labels[seg] || seg}
          </span>
        </React.Fragment>
      ))}
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
  const [mounted, setMounted] = useState(false)
  const mainRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push('/login')
    }
  }, [router])

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen bg-passport-bg">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:px-4 focus:py-2 focus:bg-passport-green focus:text-white focus:rounded-passport focus:outline-none focus:ring-2 focus:ring-passport-azure focus:ring-offset-2 focus:ring-offset-passport-bg"
      >
        Skip to main content
        <span className="ml-2 font-mono text-[10px] opacity-70">
          <kbd className="kbd">Press Ctrl+K to search</kbd>
        </span>
      </a>
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
        id="main-content"
        ref={mainRef}
        className={`min-h-screen transition-all duration-200 ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'
        }`}
      >
        <div
          className={`max-w-6xl mx-auto px-4 sm:px-6 py-6 ${
            mounted ? 'animate-fade-in-up' : ''
          }`}
        >
          <div className="sticky top-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 -mt-6 mb-2 bg-passport-bg/80 backdrop-blur-md border-b border-passport-border/50">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <Breadcrumbs />
                <GlobalSearch />
              </div>
              <NotificationCenter />
            </div>
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}
