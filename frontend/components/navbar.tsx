'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Shield, Terminal, BookOpen, Play, Building2, CreditCard, Newspaper } from 'lucide-react'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isLanding = pathname === '/'
  const pricingHref = isLanding ? '#pricing' : '/#pricing'
  const featuresHref = isLanding ? '#features' : '/#features'

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? 'bg-passport-bg/95 border-passport-border shadow-[0_1px_12px_rgba(0,0,0,0.3)]'
          : 'bg-passport-bg/70 border-transparent'
      } backdrop-blur-xl`}
    >
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
        <Link href="/" className="flex items-center gap-2.5 group shrink-0" prefetch>
          <Shield
            size={20}
            className="text-passport-green group-hover:drop-shadow-[0_0_8px_rgba(46,160,67,0.4)] group-hover:scale-110 transition-all duration-200"
            aria-hidden="true"
          />
          <span className="font-mono text-sm font-bold text-passport-green tracking-wider uppercase group-hover:text-[#3fb950] transition-colors duration-200">
            Passport Agent
          </span>
        </Link>

        <nav className="hidden sm:flex items-center gap-1" aria-label="Main navigation">
          <Link
            href="/demo"
            className="nav-link-underline px-3 py-1.5 text-sm text-passport-muted hover:text-passport-text rounded-passport hover:bg-passport-surface transition-colors duration-150 min-touch-target"
            prefetch
          >
            Demo
          </Link>
          <Link
            href="/docs"
            className="nav-link-underline px-3 py-1.5 text-sm text-passport-muted hover:text-passport-text rounded-passport hover:bg-passport-surface transition-colors duration-150 min-touch-target"
            prefetch
          >
            Docs
          </Link>
          <Link
            href="/enterprise"
            className="nav-link-underline px-3 py-1.5 text-sm text-passport-muted hover:text-passport-text rounded-passport hover:bg-passport-surface transition-colors duration-150 min-touch-target"
            prefetch
          >
            Enterprise
          </Link>
          <Link
            href={pricingHref}
            className="nav-link-underline px-3 py-1.5 text-sm text-passport-muted hover:text-passport-text rounded-passport hover:bg-passport-surface transition-colors duration-150 min-touch-target"
            prefetch={isLanding}
          >
            Pricing
          </Link>
          <Link
            href="/blog"
            className="nav-link-underline px-3 py-1.5 text-sm text-passport-muted hover:text-passport-text rounded-passport hover:bg-passport-surface transition-colors duration-150 min-touch-target"
            prefetch
          >
            Blog
          </Link>
          <Link href="/register" className="btn-primary ml-2 min-touch-target glow-on-hover" prefetch>
            <Terminal size={14} aria-hidden="true" />
            Get Started
          </Link>
        </nav>
      </div>
    </header>
  )
}
