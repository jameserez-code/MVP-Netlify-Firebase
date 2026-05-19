'use client'

import { Shield, Search, Terminal, Home, LayoutDashboard, FileText, Mail } from 'lucide-react'
import { useState } from 'react'

export default function NotFound() {
  const [search, setSearch] = useState('')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (search.trim()) {
      window.location.href = `/dashboard?search=${encodeURIComponent(search)}`
    }
  }

  return (
    <div className="min-h-screen bg-passport-bg flex items-center justify-center p-4">
      <div className="glass-panel p-8 max-w-lg w-full">
        <div className="text-center mb-6">
          <Shield size={48} className="text-passport-green mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-passport-text mb-2">Page Not Found</h1>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-passport bg-passport-surface border border-passport-border">
            <Terminal size={14} className="text-passport-red" />
            <span className="font-mono text-sm text-passport-red">
              404 — Route not found in policy engine
            </span>
          </div>
          <p className="text-passport-muted mt-3">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="relative mb-6">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-passport-dim" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for a page..."
            className="input-field pl-9"
          />
        </form>

        {/* Quick links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          <a
            href="/"
            className="flex flex-col items-center gap-2 p-3 rounded-passport border border-passport-border bg-passport-surface/50 hover:border-passport-green/30 hover:bg-passport-green/5 transition-all text-center"
          >
            <Home size={18} className="text-passport-green" />
            <span className="text-xs text-passport-text">Home</span>
          </a>
          <a
            href="/dashboard"
            className="flex flex-col items-center gap-2 p-3 rounded-passport border border-passport-border bg-passport-surface/50 hover:border-passport-green/30 hover:bg-passport-green/5 transition-all text-center"
          >
            <LayoutDashboard size={18} className="text-passport-azure" />
            <span className="text-xs text-passport-text">Dashboard</span>
          </a>
          <a
            href="/docs"
            className="flex flex-col items-center gap-2 p-3 rounded-passport border border-passport-border bg-passport-surface/50 hover:border-passport-green/30 hover:bg-passport-green/5 transition-all text-center"
          >
            <FileText size={18} className="text-passport-coral" />
            <span className="text-xs text-passport-text">Docs</span>
          </a>
          <a
            href="mailto:support@agentpassport.dev"
            className="flex flex-col items-center gap-2 p-3 rounded-passport border border-passport-border bg-passport-surface/50 hover:border-passport-green/30 hover:bg-passport-green/5 transition-all text-center"
          >
            <Mail size={18} className="text-passport-amber" />
            <span className="text-xs text-passport-text">Support</span>
          </a>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="/dashboard" className="btn-primary">
            <LayoutDashboard size={14} />
            Back to Dashboard
          </a>
          <a href="/" className="btn-secondary">
            <Home size={14} />
            Go Home
          </a>
        </div>
      </div>
    </div>
  )
}
