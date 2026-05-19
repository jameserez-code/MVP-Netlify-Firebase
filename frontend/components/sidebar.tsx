'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Shield, LayoutDashboard, Bot, FileText, ClipboardList, LogOut, Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { isLoggedIn, clearToken } from '@/lib/api'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/agents', label: 'Agents', icon: Bot },
  { href: '/dashboard/policies', label: 'Policies', icon: FileText },
  { href: '/dashboard/audit', label: 'Audit', icon: ClipboardList },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    setLoggedIn(isLoggedIn())
  }, [pathname])

  function handleLogout() {
    clearToken()
    window.location.href = '/login'
  }

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 glass-panel rounded-passport text-passport-muted hover:text-passport-text transition-colors"
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-60 z-40 border-r border-passport-border bg-passport-surface/95 backdrop-blur-xl flex flex-col transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand */}
        <div className="p-5 border-b border-passport-border">
          <Link href="/" className="flex items-center gap-3 group">
            <Shield size={22} className="text-passport-green group-hover:drop-shadow-[0_0_6px_rgba(46,160,67,0.4)] transition-all" />
            <div>
              <div className="font-mono text-sm font-bold text-passport-green tracking-wider uppercase">
                Passport
              </div>
              <div className="font-mono text-[10px] text-passport-dim tracking-widest uppercase">
                Agent Control
              </div>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-passport text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-passport-green/10 text-passport-green border border-passport-green/20'
                    : 'text-passport-muted hover:text-passport-text hover:bg-passport-surface-2'
                }`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-passport-green animate-pulse-soft" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-passport-border">
          {loggedIn ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 w-full rounded-passport text-sm text-passport-muted hover:text-passport-coral hover:bg-passport-red/5 transition-all duration-150"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-3 px-3 py-2.5 rounded-passport text-sm text-passport-muted hover:text-passport-text hover:bg-passport-surface-2 transition-all duration-150"
            >
              <LogOut size={16} />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </aside>
    </>
  )
}
