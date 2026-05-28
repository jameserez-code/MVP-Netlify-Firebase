'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Shield,
  LayoutDashboard,
  Bot,
  FileText,
  ClipboardList,
  KeyRound,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  Building2,
  Settings,
  CreditCard,
  Download,
  ChevronDown,
  Webhook,
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { isLoggedIn, clearToken } from '@/lib/api'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, shortcut: '1' },
  { href: '/dashboard/agents', label: 'Agents', icon: Bot, shortcut: '2' },
  { href: '/dashboard/policies', label: 'Policies', icon: FileText, shortcut: '3' },
  { href: '/dashboard/audit', label: 'Audit', icon: ClipboardList, shortcut: '4' },
  { href: '/dashboard/api-keys', label: 'API Keys', icon: KeyRound, shortcut: '5' },
  { href: '/dashboard/webhooks', label: 'Webhooks', icon: Webhook, shortcut: '6' },
  { href: '/dashboard/billing', label: 'Billing', icon: CreditCard, shortcut: '7' },
  { href: '/dashboard/exports', label: 'Exports', icon: Download, shortcut: '8' },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, shortcut: '9' },
]

const orgs = ['Personal', 'Team Alpha', 'Enterprise']

export default function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed?: boolean
  onToggle?: () => void
}) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [orgOpen, setOrgOpen] = useState(false)
  const [activeOrg, setActiveOrg] = useState(orgs[0])
  const [tooltipOpen, setTooltipOpen] = useState<string | null>(null)
  const userRef = useRef<HTMLDivElement>(null)
  const orgRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLElement>(null)
  const touchStartX = useRef<number>(0)

  useEffect(() => {
    setLoggedIn(isLoggedIn())
  }, [pathname])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserOpen(false)
      }
      if (orgRef.current && !orgRef.current.contains(e.target as Node)) {
        setOrgOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    function handleTouchStart(e: TouchEvent) {
      touchStartX.current = e.touches[0].clientX
    }

    function handleTouchEnd(e: TouchEvent) {
      const touchEndX = e.changedTouches[0].clientX
      const diff = touchEndX - touchStartX.current
      const threshold = 80
      const screenWidth = window.innerWidth

      if (diff > threshold && touchStartX.current < 40 && !mobileOpen && screenWidth < 1024) {
        setMobileOpen(true)
      }
      if (diff < -threshold && mobileOpen && screenWidth < 1024) {
        setMobileOpen(false)
      }
    }

    document.addEventListener('touchstart', handleTouchStart)
    document.addEventListener('touchend', handleTouchEnd)
    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [mobileOpen])

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  function handleLogout() {
    clearToken()
    window.location.href = '/login'
  }

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 glass-panel rounded-passport text-passport-muted hover:text-passport-text transition-colors min-touch-target flex items-center justify-center"
        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={mobileOpen}
        aria-controls="sidebar-nav"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30 animate-fadeIn"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        id="sidebar-nav"
        className={`fixed top-0 left-0 h-full z-40 border-r border-passport-border bg-passport-surface/95 backdrop-blur-xl flex flex-col transition-all duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'w-16' : 'w-60'}`}
        aria-label="Main navigation"
      >
        {/* Brand */}
        <div className="p-4 border-b border-passport-border flex items-center justify-between">
          <Link href="/" className={`flex items-center gap-3 group ${collapsed ? 'justify-center w-full' : ''}`} prefetch={false}>
            <Shield size={22} className="text-passport-green group-hover:drop-shadow-[0_0_6px_rgba(46,160,67,0.4)] group-hover:scale-110 transition-all shrink-0" />
            {!collapsed && (
              <div className="overflow-hidden">
                <div className="font-mono text-sm font-bold text-passport-green tracking-wider uppercase">
                  Passport
                </div>
                <div className="font-mono text-[10px] text-passport-dim tracking-widest uppercase">
                  Agent Control
                </div>
              </div>
            )}
          </Link>
          {!collapsed && onToggle && (
            <button
              onClick={onToggle}
              className="hidden lg:flex text-passport-dim hover:text-passport-text transition-colors p-1 rounded-passport hover:bg-passport-surface-2"
              aria-label="Collapse sidebar"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          {collapsed && onToggle && (
            <button
              onClick={onToggle}
              className="hidden lg:flex text-passport-dim hover:text-passport-text transition-colors absolute right-[-10px] top-5 bg-passport-surface border border-passport-border rounded-full p-1"
              aria-label="Expand sidebar"
            >
              <ChevronRight size={14} />
            </button>
          )}
        </div>

        {/* Org name */}
        {!collapsed && (
          <div className="px-4 py-2 border-b border-passport-border">
            <div className="flex items-center gap-2 text-passport-dim">
              <Building2 size={12} />
              <span className="font-mono text-[10px] uppercase tracking-wider truncate">
                {activeOrg}
              </span>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5" aria-label="Dashboard navigation">
          {navItems.map((item, idx) => {
            const active = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                onClick={() => setMobileOpen(false)}
                onMouseEnter={() => collapsed && setTooltipOpen(item.label)}
                onMouseLeave={() => collapsed && setTooltipOpen(null)}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-passport text-sm font-medium transition-all duration-150 min-touch-target active:scale-[0.97] ${
                  active
                    ? 'bg-passport-green/10 text-passport-green border border-passport-green/20 border-l-[3px] border-l-passport-green rounded-l-none'
                    : 'text-passport-muted hover:text-passport-text hover:bg-passport-surface-2'
                } ${collapsed ? 'justify-center' : ''}`}
                aria-label={collapsed ? item.label : undefined}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={18} aria-hidden="true" className={active ? 'text-passport-green' : ''} />
                {!collapsed && (
                  <>
                    <span>{item.label}</span>
                    {active && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-passport-green animate-pulse-soft" aria-hidden="true" />
                    )}
                    <span className="ml-auto">
                      <kbd className="kbd text-[9px]">{'\u2318'}{item.shortcut}</kbd>
                    </span>
                  </>
                )}
                {/* Tooltip in collapsed state */}
                {collapsed && tooltipOpen === item.label && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 rounded-passport bg-passport-surface-2 border border-passport-border text-xs text-passport-text whitespace-nowrap z-50 pointer-events-none shadow-lg">
                    {item.label}
                  </div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-passport-border">
          {/* Org Switcher */}
          {!collapsed && (
            <div className="relative px-2 pt-2" ref={orgRef}>
              <button
                onClick={() => setOrgOpen(!orgOpen)}
                className="flex items-center gap-2 px-3 py-2 w-full rounded-passport text-xs text-passport-muted hover:text-passport-text hover:bg-passport-surface-2 transition-all duration-150"
                aria-expanded={orgOpen}
                aria-haspopup="listbox"
              >
                <Building2 size={12} className="shrink-0" />
                <span className="flex-1 text-left truncate">{activeOrg}</span>
                <ChevronDown size={12} className={`transition-transform duration-150 ${orgOpen ? 'rotate-180' : ''}`} />
              </button>
              {orgOpen && (
                <div className="absolute bottom-full left-2 right-2 mb-1 glass-panel border-passport-border overflow-hidden" role="listbox">
                  {orgs.filter((o) => o !== activeOrg).map((org) => (
                    <button
                      key={org}
                      onClick={() => { setActiveOrg(org); setOrgOpen(false) }}
                      className="flex items-center gap-2 px-3 py-2 w-full text-xs text-passport-muted hover:text-passport-text hover:bg-passport-surface-2 transition-all"
                      role="option" aria-selected="false"
                    >
                      <Building2 size={12} />
                      <span>{org}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* User / Logout */}
          <div className="p-2 pt-1.5 space-y-1">
            {loggedIn && (
              <div className="relative" ref={userRef}>
                <button
                  onClick={() => setUserOpen(!userOpen)}
                  className={`flex items-center gap-3 px-3 py-2.5 w-full rounded-passport text-sm text-passport-muted hover:text-passport-text hover:bg-passport-surface-2 transition-all duration-150 min-touch-target ${
                    collapsed ? 'justify-center' : ''
                  }`}
                  aria-expanded={userOpen}
                  aria-haspopup="menu"
                  aria-label="Account menu"
                >
                  <div className="w-6 h-6 rounded-full bg-passport-green/20 flex items-center justify-center shrink-0">
                    <User size={14} className="text-passport-green" aria-hidden="true" />
                  </div>
                  {!collapsed && <span className="truncate">Account</span>}
                </button>
                {userOpen && (
                  <div className="absolute bottom-full left-0 w-48 mb-1 glass-panel border-passport-border overflow-hidden" role="menu">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-3 py-2.5 w-full text-sm text-passport-muted hover:text-passport-coral hover:bg-passport-red/5 transition-all min-touch-target"
                      role="menuitem"
                    >
                      <LogOut size={16} aria-hidden="true" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
            {!loggedIn && !collapsed && (
              <Link
                href="/login"
                className="flex items-center gap-3 px-3 py-2.5 rounded-passport text-sm text-passport-muted hover:text-passport-text hover:bg-passport-surface-2 transition-all duration-150 min-touch-target"
              >
                <LogOut size={16} aria-hidden="true" />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
