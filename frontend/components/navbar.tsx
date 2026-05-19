'use client'

import Link from 'next/link'
import { Shield, Github, Terminal } from 'lucide-react'

export default function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-passport-border bg-passport-bg/92 backdrop-blur-xl">
      {/* Shimmer bar */}
      <div
        className="absolute top-0 left-0 w-full h-[2px]"
        style={{
          background: 'linear-gradient(90deg, transparent, #2ea043, transparent)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 3s infinite linear',
        }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group" prefetch>
          <Shield size={20} className="text-passport-green group-hover:drop-shadow-[0_0_8px_rgba(46,160,67,0.4)] transition-all" aria-hidden="true" />
          <span className="font-mono text-sm font-bold text-passport-green tracking-wider uppercase">
            Passport Agent
          </span>
        </Link>

        <nav className="hidden sm:flex items-center gap-1" aria-label="Main navigation">
          <Link href="/" className="px-3 py-1.5 text-sm text-passport-muted hover:text-passport-text rounded-passport hover:bg-passport-surface transition-colors duration-150 min-touch-target" prefetch>
            Home
          </Link>
          <Link href="/login" className="px-3 py-1.5 text-sm text-passport-muted hover:text-passport-text rounded-passport hover:bg-passport-surface transition-colors duration-150 min-touch-target" prefetch>
            Sign In
          </Link>
          <Link href="/register" className="btn-primary ml-2 min-touch-target" prefetch>
            <Terminal size={14} aria-hidden="true" />
            Get Started
          </Link>
        </nav>
      </div>
    </header>
  )
}
