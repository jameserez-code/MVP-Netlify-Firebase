'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { swrDashboardConfig } from '@/lib/swr-config'
import { useRealtime } from '@/lib/websocket'
import GlassCard from '@/components/glass-card'
import { SkeletonCard } from '@/components/loading'
import { useToast } from '@/components/toast'
import { getMetrics, getDiagnostics, getReport, getUsage } from '@/lib/api'
import Link from 'next/link'
import { Tooltip } from '@/components/tooltip'
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
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Loader2,
} from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  color?: string
  accentColor?: string
  delay?: number
  change?: number
}

function getAccentClass(color?: string) {
  switch (color) {
    case 'text-passport-azure': return 'accent-bar-azure'
    case 'text-passport-coral': return 'accent-bar-coral'
    case 'text-passport-red': return 'accent-bar-red'
    default: return 'accent-bar-green'
  }
}

function StatCard({ label, value, icon, color = 'text-passport-green', accentColor, delay = 0, change }: StatCardProps) {
  const accent = accentColor || getAccentClass(color)
  return (
    <div
      className={`glass-panel p-5 flex items-center gap-4 ${accent}`}
      style={{
        animation: `fadeInUp 0.4s ease both`,
        animationDelay: `${delay}s`,
      }}
    >
      <div className={`p-2.5 rounded-passport bg-passport-surface-2 ${color}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="label-text mb-0.5">{label}</div>
        <div className="font-mono text-2xl font-bold text-passport-text count-up-enter">{value}</div>
        {change !== undefined && (
          <div className={`flex items-center gap-0.5 mt-0.5 text-[10px] font-mono ${change >= 0 ? 'text-passport-green' : 'text-passport-red'}`}>
            {change >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            <span>{Math.abs(change)}% from yesterday</span>
          </div>
        )}
      </div>
    </div>
  )
}

function UsageWidget() {
  const { data: usage, isLoading } = useSWR('/billing/usage', getUsage, swrDashboardConfig)

  if (isLoading) {
    return (
      <GlassCard>
        <SkeletonCard className="h-6 w-32 mb-3" />
        <SkeletonCard className="h-4 w-full mb-2" />
        <SkeletonCard className="h-2 w-full rounded-full" />
      </GlassCard>
    )
  }

  if (!usage) return null

  const dailyPercent = Math.min(100, Math.round((usage.count / usage.limit) * 100))
  const weeklyCount = usage.weeklyCount ?? Math.round(usage.count * 5.7)
  const weeklyLimit = usage.weeklyLimit ?? usage.limit * 7
  const weeklyPercent = Math.min(100, Math.round((weeklyCount / weeklyLimit) * 100))
  const nearLimit = dailyPercent > 80

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={18} className="text-passport-azure" />
        <h2 className="text-sm font-semibold text-passport-text">Usage</h2>
        <Tooltip content="Each enforcement action (allow, deny, or modify) counts toward your daily limit. Weekly limits are 7x daily limits.">
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-passport-surface-2 text-[9px] text-passport-dim cursor-help font-mono">?</span>
        </Tooltip>
      </div>

      {/* Daily bar */}
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="text-passport-muted text-xs">Daily</span>
        <span className="font-mono text-xs text-passport-text">
          {usage.count} / {usage.limit}
        </span>
      </div>
      <div className="h-2 w-full bg-passport-surface-2 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            nearLimit ? 'bg-passport-amber' : 'bg-passport-green'
          }`}
          style={{ width: `${dailyPercent}%` }}
        />
      </div>

      {/* Weekly bar */}
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="text-passport-muted text-xs">Weekly</span>
        <span className="font-mono text-xs text-passport-text">
          {weeklyCount} / {weeklyLimit}
        </span>
      </div>
      <div className="h-2 w-full bg-passport-surface-2 rounded-full overflow-hidden mb-3">
        <div
          className="h-full rounded-full bg-passport-azure transition-all duration-500"
          style={{ width: `${weeklyPercent}%` }}
        />
      </div>

      {/* Percentage labels */}
      <div className="flex items-center justify-between text-[10px] font-mono text-passport-dim mb-2">
        <span>{dailyPercent}% of daily</span>
        <span>{weeklyPercent}% of weekly</span>
      </div>

      {nearLimit && usage.plan === 'free' && (
        <div className="mt-2 p-2 rounded-passport border border-passport-amber/20 bg-passport-amber/5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-passport-amber">Approaching daily limit</span>
            <Link
              href="/dashboard/billing"
              className="btn-primary text-xs py-1 px-3 glow-on-hover"
            >
              Upgrade to Pro
            </Link>
          </div>
        </div>
      )}
    </GlassCard>
  )
}

export default function DashboardPage() {
  const { addToast } = useToast()
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState(0)
  const [lastUpdated, setLastUpdated] = useState(() => new Date())
  const [refreshing, setRefreshing] = useState(false)

  const {
    data: metrics,
    error: metricsError,
    isLoading: metricsLoading,
    mutate: mutateMetrics,
    connected: wsConnected,
  } = useRealtime('metrics', '/metrics', getMetrics, swrDashboardConfig)
  const { data: diagnostics, error: diagnosticsError, isLoading: diagnosticsLoading, mutate: mutateDiagnostics } = useSWR(
    '/diagnostics',
    getDiagnostics,
    swrDashboardConfig
  )
  const { data: report, error: reportError, isLoading: reportLoading, mutate: mutateReport } = useSWR(
    '/report',
    getReport,
    swrDashboardConfig
  )

  const loading = metricsLoading || diagnosticsLoading || reportLoading
  const error = (metricsError as any)?.message || (diagnosticsError as any)?.message || (reportError as any)?.message || ''

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsSinceUpdate(Math.floor((Date.now() - lastUpdated.getTime()) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [lastUpdated])

  useEffect(() => {
    if (metrics) setLastUpdated(new Date())
  }, [metrics])

  function loadData() {
    setRefreshing(true)
    mutateMetrics()
    mutateDiagnostics()
    mutateReport()
    setLastUpdated(new Date())
    setTimeout(() => setRefreshing(false), 800)
  }

  function formatRelativeTime(seconds: number): string {
    if (seconds < 5) return 'just now'
    if (seconds < 60) return `Updated ${seconds}s ago`
    const mins = Math.floor(seconds / 60)
    return `Updated ${mins}m ago`
  }

  const healthy = diagnostics?.overall === 'healthy'
  const hasData = metrics || diagnostics || report

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
            <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-passport border ${wsConnected ? 'border-passport-green/20 bg-passport-green/5' : 'border-passport-dim/20 bg-passport-surface-2'}`}>
              <span className="relative flex h-2.5 w-2.5">
                {wsConnected && <span className="animate-live-pulse absolute inline-flex h-full w-full rounded-full bg-passport-green opacity-75" />}
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${wsConnected ? 'bg-passport-green' : 'bg-passport-dim'}`} />
              </span>
              <span className={`font-mono text-[10px] uppercase tracking-wider ${wsConnected ? 'text-passport-green' : 'text-passport-dim'}`}>
                {wsConnected ? 'Live' : 'Offline'}
              </span>
            </div>
            {lastUpdated && (
              <span className="font-mono text-[10px] text-passport-dim flex items-center gap-1">
                <Clock size={10} />
                {formatRelativeTime(secondsSinceUpdate)}
              </span>
            )}
            <button
              onClick={loadData}
              disabled={loading}
              className="btn-secondary"
            >
              <RefreshCw
                size={14}
                className={refreshing ? 'animate-spin' : 'transition-transform hover:rotate-180 duration-300'}
              />
              Refresh
            </button>
          </div>
      </div>

      {error && (
        <GlassCard className="border-passport-red/20 bg-passport-red/[0.03]" hover={false}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-passport-red/10">
              <AlertTriangle size={18} className="text-passport-red" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-passport-text">Connection Error</p>
              <p className="text-xs text-passport-red mt-0.5">{error}</p>
            </div>
            <button
              onClick={loadData}
              className="btn-primary text-xs py-1.5 px-3"
            >
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
              Retry
            </button>
          </div>
        </GlassCard>
      )}

      {/* Stats Grid */}
      {!loading && !hasData && !error ? (
        <GlassCard className="text-center py-10">
          <div className="relative inline-flex mb-4">
            <div className="absolute inset-0 w-16 h-16 rounded-full bg-passport-green/10 blur-lg" />
            <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-passport-green/10 text-passport-green">
              <BarChart3 size={32} />
            </div>
          </div>
          <h3 className="text-lg font-bold text-passport-text mb-1">Welcome to your Dashboard</h3>
          <p className="text-sm text-passport-muted mb-5 max-w-sm mx-auto">
            No data available yet. Register your first agent or run an enforcement to see metrics here.
          </p>
          <button onClick={loadData} className="btn-primary" disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Load Data
          </button>
        </GlassCard>
      ) : (
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
                change={12}
              />
              <StatCard
                label="Active Runs"
                value={metrics?.runs?.active ?? '—'}
                icon={<Activity size={18} />}
                color="text-passport-azure"
                delay={0.1}
                change={8}
              />
              <StatCard
                label="Active Agents"
                value={metrics?.agents?.active ?? '—'}
                icon={<Bot size={18} />}
                color="text-passport-coral"
                delay={0.15}
                change={-3}
              />
              <StatCard
                label="System Health"
                value={healthy ? 'Healthy' : diagnostics?.overall ?? '—'}
                icon={healthy ? <CheckCircle size={18} /> : <XCircle size={18} />}
                color={healthy ? 'text-passport-green' : 'text-passport-red'}
                delay={0.2}
              />
            </>
          )}
        </div>
      )}

      {hasData && (
        <>
          {/* Usage Widget */}
          <UsageWidget />

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
        </>
      )}
    </div>
  )
}
