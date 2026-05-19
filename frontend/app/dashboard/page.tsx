'use client'

import { useEffect, useState } from 'react'
import GlassCard from '@/components/glass-card'
import { SkeletonCard } from '@/components/loading'
import { useToast } from '@/components/toast'
import { getMetrics, getDiagnostics, getReport } from '@/lib/api'
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle,
  Clock,
  FileText,
  RefreshCw,
  Shield,
  XCircle,
} from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  color?: string
  delay?: number
}

function StatCard({ label, value, icon, color = 'text-passport-green', delay = 0 }: StatCardProps) {
  return (
    <GlassCard delay={delay} className="flex items-center gap-4">
      <div className={`p-2.5 rounded-passport bg-passport-surface-2 ${color}`}>
        {icon}
      </div>
      <div>
        <div className="label-text mb-0.5">{label}</div>
        <div className="font-mono text-2xl font-bold text-passport-text">{value}</div>
      </div>
    </GlassCard>
  )
}

export default function DashboardPage() {
  const { addToast } = useToast()
  const [metrics, setMetrics] = useState<any>(null)
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [m, d, r] = await Promise.all([
        getMetrics().catch(() => null),
        getDiagnostics().catch(() => null),
        getReport().catch(() => null),
      ])
      setMetrics(m)
      setDiagnostics(d)
      setReport(r)
      setLastUpdated(new Date())
    } catch (err: any) {
      setError(err.message)
      addToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 10000)
    return () => clearInterval(interval)
  }, [])

  const healthy = diagnostics?.overall === 'healthy'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-passport-text">Dashboard</h1>
          <p className="text-sm text-passport-muted mt-0.5">
            System overview and operational metrics
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* Live indicator */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-passport border border-passport-green/20 bg-passport-green/5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-live-pulse absolute inline-flex h-full w-full rounded-full bg-passport-green opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-passport-green" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-passport-green">
              Live
            </span>
          </div>
          {lastUpdated && (
            <span className="font-mono text-[10px] text-passport-dim flex items-center gap-1">
              <Clock size={10} />
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={loadData}
            disabled={loading}
            className="btn-secondary"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-passport border border-passport-red/30 bg-passport-red/5 flex items-center gap-2">
          <AlertTriangle size={16} className="text-passport-red" />
          <span className="text-sm text-passport-red flex-1">{error}</span>
          <button onClick={loadData} className="text-xs text-passport-red underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {loading && !metrics ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard
              label="Total Tasks"
              value={metrics?.tasks?.total ?? '—'}
              icon={<FileText size={18} />}
              delay={0.05}
            />
            <StatCard
              label="Active Runs"
              value={metrics?.runs?.active ?? '—'}
              icon={<Activity size={18} />}
              color="text-passport-azure"
              delay={0.1}
            />
            <StatCard
              label="Active Agents"
              value={metrics?.agents?.active ?? '—'}
              icon={<Bot size={18} />}
              color="text-passport-coral"
              delay={0.15}
            />
            <StatCard
              label="System Health"
              value={healthy ? 'Healthy' : diagnostics?.overall ?? 'Unknown'}
              icon={healthy ? <CheckCircle size={18} /> : <XCircle size={18} />}
              color={healthy ? 'text-passport-green' : 'text-passport-red'}
              delay={0.2}
            />
          </>
        )}
      </div>

      {/* Diagnostics */}
      {loading && !diagnostics ? (
        <GlassCard>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-passport bg-passport-bg border border-passport-border animate-pulse">
                <div className="w-4 h-4 rounded-full bg-passport-surface-2" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 rounded bg-passport-surface-2" />
                  <div className="h-2 w-48 rounded bg-passport-surface-2" />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      ) : diagnostics ? (
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Shield size={18} className="text-passport-green" />
            <h2 className="text-lg font-semibold text-passport-text">Diagnostics</h2>
          </div>

          <div className="space-y-3">
            {diagnostics.checks?.map((check: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-passport bg-passport-bg border border-passport-border"
              >
                <div className="flex items-center gap-3">
                  {check.status === 'healthy' ? (
                    <CheckCircle size={16} className="text-passport-green" />
                  ) : check.status === 'warning' ? (
                    <AlertTriangle size={16} className="text-passport-amber" />
                  ) : (
                    <XCircle size={16} className="text-passport-red" />
                  )}
                  <div>
                    <div className="text-sm text-passport-text font-medium">{check.name}</div>
                    <div className="text-xs text-passport-muted">{check.message}</div>
                  </div>
                </div>
                <span
                  className={`font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded ${
                    check.status === 'healthy'
                      ? 'bg-passport-green/10 text-passport-green'
                      : check.status === 'warning'
                      ? 'bg-passport-amber/10 text-passport-amber'
                      : 'bg-passport-red/10 text-passport-red'
                  }`}
                >
                  {check.status}
                </span>
              </div>
            ))}
          </div>

          {diagnostics.timestamp && (
            <div className="mt-4 pt-3 border-t border-passport-border flex items-center gap-2">
              <Clock size={12} className="text-passport-dim" />
              <span className="font-mono text-[10px] text-passport-dim">
                Last checked: {new Date(diagnostics.timestamp).toLocaleString()}
              </span>
            </div>
          )}
        </GlassCard>
      ) : null}

      {/* Report */}
      {loading && !report ? (
        <GlassCard delay={0.1}>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-3 rounded-passport bg-passport-bg border border-passport-border animate-pulse space-y-2">
                <div className="h-2 w-16 rounded bg-passport-surface-2" />
                <div className="h-3 w-full rounded bg-passport-surface-2" />
              </div>
            ))}
          </div>
        </GlassCard>
      ) : report ? (
        <GlassCard delay={0.1}>
          <div className="flex items-center gap-2 mb-4">
            <FileText size={18} className="text-passport-azure" />
            <h2 className="text-lg font-semibold text-passport-text">Operational Report</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(report).map(([key, value]: [string, any], i) => (
              <div
                key={key}
                className="p-3 rounded-passport bg-passport-bg border border-passport-border"
              >
                <div className="label-text mb-1">{key.replace(/_/g, ' ')}</div>
                <div className="font-mono text-sm text-passport-text">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      ) : null}
    </div>
  )
}
