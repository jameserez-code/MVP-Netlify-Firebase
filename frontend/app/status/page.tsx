'use client'

import { useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/navbar'
import {
  ArrowLeft,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Server,
  Globe,
  Webhook,
  Mail,
  Key,
  Database,
  Zap,
  ChevronDown,
  ChevronRight,
  Radio,
  Shield,
  Bell,
  ArrowUpRight,
} from 'lucide-react'

interface ServiceStatus {
  name: string
  description: string
  status: 'operational' | 'degraded' | 'outage'
  responseTime: string
  icon: React.ReactNode
}

const services: ServiceStatus[] = [
  { name: 'API', description: 'Enforcement engine', status: 'operational', responseTime: '12ms', icon: <Zap size={18} /> },
  { name: 'Dashboard', description: 'Frontend', status: 'operational', responseTime: '89ms', icon: <Globe size={18} /> },
  { name: 'Webhook Delivery', description: 'Event notifications', status: 'operational', responseTime: '340ms', icon: <Webhook size={18} /> },
  { name: 'Email Delivery', description: 'Transactional emails', status: 'operational', responseTime: '1.2s', icon: <Mail size={18} /> },
  { name: 'Authentication', description: 'Login & token issuance', status: 'operational', responseTime: '45ms', icon: <Key size={18} /> },
  { name: 'Database', description: 'Firestore', status: 'operational', responseTime: '23ms', icon: <Database size={18} /> },
]

interface Incident {
  date: string
  title: string
  duration: string
  status: string
  description: string
  rootCause: string
  fix: string
}

const incidents: Incident[] = [
  {
    date: 'May 22, 2026',
    title: 'API Latency Degraded',
    duration: '23 minutes',
    status: 'Resolved',
    description: 'Between 14:32-14:55 UTC, API response times increased to 2-5 seconds.',
    rootCause: 'Database connection pool exhaustion during traffic spike.',
    fix: 'Fixed by increasing connection pool size and adding query caching.',
  },
  {
    date: 'May 15, 2026',
    title: 'Webhook Delivery Delayed',
    duration: '45 minutes',
    status: 'Resolved',
    description: 'Webhook deliveries were delayed by up to 10 minutes.',
    rootCause: 'Queue worker restart during deployment.',
    fix: 'Fixed by adding graceful shutdown and health checks before draining.',
  },
  {
    date: 'May 8, 2026',
    title: 'Email Delivery Interruption',
    duration: '2 hours',
    status: 'Resolved',
    description: 'Verification emails were not being delivered.',
    rootCause: 'Resend API key rotation not propagated to all instances.',
    fix: 'Fixed by implementing centralized secret management.',
  },
]

function StatusDot({ status }: { status: ServiceStatus['status'] }) {
  const config = {
    operational: { bg: 'bg-passport-green', ring: 'ring-passport-green/20', label: 'Operational' },
    degraded: { bg: 'bg-passport-amber', ring: 'ring-passport-amber/20', label: 'Degraded' },
    outage: { bg: 'bg-passport-red', ring: 'ring-passport-red/20', label: 'Outage' },
  }
  const c = config[status]
  return (
    <span className="relative flex h-3 w-3">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${c.bg} opacity-30`} />
      <span className={`relative inline-flex rounded-full h-3 w-3 ${c.bg} ring-2 ${c.ring}`} />
    </span>
  )
}

function StatusIcon({ status }: { status: ServiceStatus['status'] }) {
  if (status === 'operational') return <CheckCircle2 size={16} className="text-passport-green" />
  if (status === 'degraded') return <AlertTriangle size={16} className="text-passport-amber" />
  return <XCircle size={16} className="text-passport-red" />
}

function StatusLabel({ status }: { status: ServiceStatus['status'] }) {
  const config = {
    operational: 'text-passport-green',
    degraded: 'text-passport-amber',
    outage: 'text-passport-red',
  }
  return <span className={`text-xs font-mono font-semibold ${config[status]}`}>{status}</span>
}

function ExpandableIncident({ incident }: { incident: Incident }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-passport-border rounded-md overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-passport-surface/50 transition-colors"
      >
        <span className="text-passport-coral shrink-0"><AlertTriangle size={16} /></span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-passport-text">{incident.title}</div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5 text-xs text-passport-dim">
            <span>{incident.date}</span>
            <span>Duration: {incident.duration}</span>
          </div>
        </div>
        <span className="text-xs font-mono text-passport-green shrink-0">{incident.status}</span>
        <span className="text-passport-muted ml-1">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-passport-border bg-passport-surface/10 animate-fade-in">
          <div className="pt-3 space-y-2 text-sm text-passport-muted">
            <p>{incident.description}</p>
            <p>
              <span className="font-semibold text-passport-text">Root cause: </span>
              {incident.rootCause}
            </p>
            <p>
              <span className="font-semibold text-passport-text">Fix: </span>
              {incident.fix}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function StatusPage() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const overallStatus: ServiceStatus['status'] = services.every((s) => s.status === 'operational')
    ? 'operational'
    : services.some((s) => s.status === 'outage')
    ? 'outage'
    : 'degraded'

  const statusBanner = {
    operational: {
      bg: 'bg-passport-green/5 border-passport-green/20',
      icon: <CheckCircle2 size={20} className="text-passport-green" />,
      text: 'All Systems Operational',
      subtext: 'All services are running normally.',
    },
    degraded: {
      bg: 'bg-passport-amber/5 border-passport-amber/20',
      icon: <AlertTriangle size={20} className="text-passport-amber" />,
      text: 'Degraded Performance',
      subtext: 'Some services are experiencing degraded performance.',
    },
    outage: {
      bg: 'bg-passport-red/5 border-passport-red/20',
      icon: <XCircle size={20} className="text-passport-red" />,
      text: 'Major Outage',
      subtext: 'One or more critical services are experiencing an outage.',
    },
  }

  const banner = statusBanner[overallStatus]

  function handleSubscribe(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSubscribed(true)
  }

  return (
    <div className="min-h-screen bg-passport-bg">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-28">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-passport-muted hover:text-passport-text transition-colors mb-8"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border border-passport-green/30 bg-passport-green/5 mb-6">
            <Activity size={32} className="text-passport-green" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-passport-text tracking-tight mb-2">
            System Status
          </h1>
          <p className="text-passport-muted">
            Current status and incident history for Passport Agent services
          </p>
        </div>

        {/* Overall Status Banner */}
        <div className={`flex items-center gap-4 p-5 rounded-md border ${banner.bg} mb-10`}>
          <div className="shrink-0">{banner.icon}</div>
          <div>
            <div className="font-semibold text-passport-text text-lg">{banner.text}</div>
            <div className="text-sm text-passport-muted mt-0.5">{banner.subtext}</div>
          </div>
          <div className="ml-auto shrink-0">
            <Link
              href="#subscribe"
              className="inline-flex items-center gap-1.5 text-xs font-mono text-passport-azure hover:text-passport-text transition-colors"
            >
              <Bell size={12} />
              Get Notified
            </Link>
          </div>
        </div>

        {/* Service Grid */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-5">
            <Server size={18} className="text-passport-muted" />
            <h2 className="text-lg font-bold text-passport-text">Current Status</h2>
          </div>
          <div className="space-y-3">
            {services.map((service) => (
              <div
                key={service.name}
                className="glass-panel p-4 flex items-center gap-4 hover:border-passport-border-2 transition-all duration-200"
              >
                <div className="shrink-0 text-passport-muted">{service.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-passport-text">{service.name}</span>
                    <StatusLabel status={service.status} />
                  </div>
                  <div className="text-xs text-passport-muted mt-0.5">{service.description}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-mono text-passport-dim">{service.responseTime}</span>
                  <StatusDot status={service.status} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Uptime */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-5">
            <Clock size={18} className="text-passport-muted" />
            <h2 className="text-lg font-bold text-passport-text">Uptime</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="glass-panel p-5 text-center">
              <div className="font-mono text-3xl font-bold text-passport-green">99.9%</div>
              <div className="text-xs text-passport-muted mt-1">uptime — last 30 days</div>
            </div>
            <div className="glass-panel p-5 text-center">
              <div className="font-mono text-3xl font-bold text-passport-green">99.95%</div>
              <div className="text-xs text-passport-muted mt-1">uptime — last 90 days</div>
            </div>
          </div>
        </section>

        {/* Incident History */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-5">
            <Radio size={18} className="text-passport-muted" />
            <h2 className="text-lg font-bold text-passport-text">Incident History</h2>
          </div>
          <div className="space-y-3">
            {incidents.map((incident) => (
              <ExpandableIncident key={incident.date} incident={incident} />
            ))}
          </div>
        </section>

        {/* Subscribe */}
        <section id="subscribe" className="mb-10">
          <div className="section-divider mb-10" />
          <div className="glass-panel p-6 sm:p-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-passport-azure/20 bg-passport-azure/5 text-passport-azure text-xs font-mono mb-4">
              <Bell size={12} />
              Notifications
            </div>
            <h2 className="text-xl font-bold text-passport-text mb-2">Subscribe to Updates</h2>
            <p className="text-sm text-passport-muted mb-6 max-w-md mx-auto">
              We&apos;ll notify you of any incidents or maintenance.
            </p>

            {subscribed ? (
              <div className="flex items-center justify-center gap-2 text-passport-green">
                <CheckCircle2 size={18} />
                <span className="font-mono text-sm">Subscribed! We&apos;ll keep you updated.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="input-field flex-1"
                  required
                />
                <button type="submit" className="btn-primary whitespace-nowrap">
                  <Bell size={14} />
                  Subscribe
                </button>
              </form>
            )}

            <p className="text-[10px] text-passport-dim mt-4 font-mono">
              No spam. Unsubscribe anytime.
            </p>
          </div>
        </section>

        {/* Footer link */}
        <div className="text-center pt-8 border-t border-passport-border">
          <Link
            href="/security"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-passport-muted hover:text-passport-text transition-colors"
          >
            <Shield size={12} />
            Security Page
            <ArrowUpRight size={10} />
          </Link>
        </div>
      </div>
    </div>
  )
}
