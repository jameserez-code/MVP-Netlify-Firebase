'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { swrDashboardConfig } from '@/lib/swr-config'
import dynamic from 'next/dynamic'
import GlassCard from '@/components/glass-card'
import { SkeletonCard } from '@/components/loading'
import { useToast } from '@/components/toast'
import {
  getAnalyticsOverview,
  getAnalyticsTrends,
  getAnalyticsAgents,
  getAnalyticsPolicies,
} from '@/lib/api'
import {
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle,
  Clock,
  RefreshCw,
  Shield,
  TrendingDown,
  TrendingUp,
  XCircle,
} from 'lucide-react'

const GenericLineChart = dynamic(() => import('@/components/charts/line-chart'), { ssr: false })
const GenericBarChart = dynamic(() => import('@/components/charts/bar-chart'), { ssr: false })
const GenericPieChart = dynamic(() => import('@/components/charts/pie-chart'), { ssr: false })
const ChartCard = dynamic(() => import('@/components/charts/chart-card'), { ssr: false })

type Period = '7d' | '30d' | '90d'
type Tab = 'overview' | 'trends' | 'agents' | 'policies'

const PERIOD_LABELS: Record<Period, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
}

function TrendBadge({ value, inverse = false }: { value: number; inverse?: boolean }) {
  const isPositive = inverse ? value < 0 : value > 0
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-mono ${
        isPositive ? 'text-passport-green' : 'text-passport-coral'
      }`}
    >
      {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {Math.abs(value)}%
    </span>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  color?: string
  delay?: number
  trend?: number
  trendInverse?: boolean
}

function StatCard({ label, value, icon, color = 'text-passport-green', delay = 0, trend, trendInverse }: StatCardProps) {
  return (
    <GlassCard delay={delay} className="flex items-center gap-4">
      <div className={`p-2.5 rounded-passport bg-passport-surface-2 ${color}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="label-text mb-0.5">{label}</div>
        <div className="flex items-center gap-2">
          <div className="font-mono text-2xl font-bold text-passport-text">{value}</div>
          {trend !== undefined && <TrendBadge value={trend} inverse={trendInverse} />}
        </div>
      </div>
    </GlassCard>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className={`px-4 py-2 text-sm font-medium rounded-passport transition-all duration-150 ${
        active
          ? 'bg-passport-green/10 text-passport-green border border-passport-green/20'
          : 'text-passport-muted hover:text-passport-text hover:bg-passport-surface-2 border border-transparent'
      }`}
    >
      {children}
    </button>
  )
}

function ActivityHeatmap({ daily }: { daily: { date: string; allowed: number; denied: number; modified: number }[] }) {
  const maxTotal = useMemo(
    () => Math.max(...daily.map((d) => d.allowed + d.denied + d.modified), 1),
    [daily]
  )

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-1.5">
        {daily.map((day) => {
          const total = day.allowed + day.denied + day.modified
          const intensity = total / maxTotal
          const alpha = 0.15 + intensity * 0.85
          return (
            <div
              key={day.date}
              className="aspect-square rounded-passport flex items-center justify-center relative group"
              style={{ backgroundColor: `rgba(46, 160, 67, ${alpha})` }}
            >
              <span className="text-[10px] font-mono text-passport-dim">
                {new Date(day.date).getDate()}
              </span>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                <div className="glass-panel px-2 py-1 text-xs whitespace-nowrap">
                  <div className="text-passport-muted">{day.date}</div>
                  <div className="text-passport-text">Total: {total}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex items-center justify-between text-[10px] font-mono text-passport-dim">
        <span>Low</span>
        <div className="flex gap-1">
          {[0.2, 0.4, 0.6, 0.8, 1].map((a) => (
            <div
              key={a}
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: `rgba(46, 160, 67, ${0.15 + a * 0.85})` }}
            />
          ))}
        </div>
        <span>High</span>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const { addToast } = useToast()
  const [period, setPeriod] = useState<Period>('7d')
  const [tab, setTab] = useState<Tab>('overview')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const { data: overview, error: overviewError, isLoading: overviewLoading, mutate: mutateOverview } = useSWR(
    ['/analytics/overview', period],
    () => getAnalyticsOverview(period),
    swrDashboardConfig
  )
  const { data: trends, error: trendsError, isLoading: trendsLoading, mutate: mutateTrends } = useSWR(
    ['/analytics/trends', period],
    () => getAnalyticsTrends(period),
    swrDashboardConfig
  )
  const { data: agents, error: agentsError, isLoading: agentsLoading, mutate: mutateAgents } = useSWR(
    ['/analytics/agents', period],
    () => getAnalyticsAgents(period),
    swrDashboardConfig
  )
  const { data: policies, error: policiesError, isLoading: policiesLoading, mutate: mutatePolicies } = useSWR(
    ['/analytics/policies', period],
    () => getAnalyticsPolicies(period),
    swrDashboardConfig
  )

  const loading = overviewLoading || trendsLoading || agentsLoading || policiesLoading
  const error = overviewError?.message || trendsError?.message || agentsError?.message || policiesError?.message || ''

  function loadData() {
    mutateOverview()
    mutateTrends()
    mutateAgents()
    mutatePolicies()
    setLastUpdated(new Date())
  }

  const allowedRate = overview
    ? Math.round((overview.allowed / Math.max(overview.totalEnforcements, 1)) * 100)
    : 0

  const denialRateData = useMemo(() => {
    if (!trends?.daily) return []
    return trends.daily.map((d: any) => ({
      ...d,
      rate: Math.round((d.denied / Math.max(d.allowed + d.denied + d.modified, 1)) * 1000) / 10,
    }))
  }, [trends])

  const agentCellColors = useMemo(() => {
    if (!agents?.agents) return []
    return agents.agents.map((a: any) => {
      if (a.denyRate < 0.02) return '#2ea043'
      if (a.denyRate < 0.05) return '#d2991d'
      return '#f78166'
    })
  }, [agents])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-passport-text">Analytics</h1>
          <p className="text-sm text-passport-muted mt-0.5">
            AI Agent enforcement insights and trends
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="flex items-center bg-passport-surface border border-passport-border rounded-passport overflow-hidden">
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                aria-pressed={period === p}
                className={`px-3 py-1.5 text-xs font-mono font-medium transition-all ${
                  period === p
                    ? 'bg-passport-green/10 text-passport-green'
                    : 'text-passport-muted hover:text-passport-text'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          {lastUpdated && (
            <span className="font-mono text-[10px] text-passport-dim flex items-center gap-1">
              <Clock size={10} />
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button onClick={loadData} disabled={loading} className="btn-secondary">
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

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>
          Overview
        </TabButton>
        <TabButton active={tab === 'trends'} onClick={() => setTab('trends')}>
          Trends
        </TabButton>
        <TabButton active={tab === 'agents'} onClick={() => setTab('agents')}>
          Agents
        </TabButton>
        <TabButton active={tab === 'policies'} onClick={() => setTab('policies')}>
          Policies
        </TabButton>
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {loading && !overview ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              <>
                <StatCard
                  label="Total Enforcements"
                  value={overview?.totalEnforcements ?? '—'}
                  icon={<BarChart3 size={18} />}
                  delay={0.05}
                />
                <StatCard
                  label="Allowed Rate"
                  value={`${allowedRate}%`}
                  icon={<CheckCircle size={18} />}
                  color="text-passport-green"
                  delay={0.1}
                />
                <StatCard
                  label="Denied Count"
                  value={overview?.denied ?? '—'}
                  icon={<XCircle size={18} />}
                  color="text-passport-coral"
                  delay={0.15}
                />
                <StatCard
                  label="Avg Response Time"
                  value={`${overview?.avgResponseTime ?? '—'}ms`}
                  icon={<Clock size={18} />}
                  color="text-passport-azure"
                  delay={0.2}
                />
              </>
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {/* Top Violations */}
            <ChartCard title="Top Violations" delay={0.1}>
              {loading && !overview ? (
                <div className="h-64 animate-pulse bg-passport-surface-2 rounded-passport" />
              ) : (
                <GenericBarChart
                  data={overview?.topViolations || []}
                  bars={[{ key: 'count', name: 'Count', color: '#f78166' }]}
                  xKey="rule"
                  layout="vertical"
                  height={280}
                  showLegend={false}
                />
              )}
            </ChartCard>

            {/* Activity Heatmap */}
            <ChartCard title="Activity Heatmap" delay={0.15}>
              {loading && !trends ? (
                <div className="h-64 animate-pulse bg-passport-surface-2 rounded-passport" />
              ) : (
                <ActivityHeatmap daily={trends?.daily || []} />
              )}
            </ChartCard>
          </div>
        </div>
      )}

      {/* Trends Tab */}
      {tab === 'trends' && (
        <div className="space-y-6">
          <ChartCard title="Daily Volume" delay={0.05}>
            {loading && !trends ? (
              <div className="h-72 animate-pulse bg-passport-surface-2 rounded-passport" />
            ) : (
              <GenericLineChart
                data={trends?.daily || []}
                lines={[
                  { key: 'allowed', name: 'Allowed', color: '#2ea043' },
                  { key: 'denied', name: 'Denied', color: '#f78166' },
                  { key: 'modified', name: 'Modified', color: '#58a6ff' },
                ]}
                height={320}
              />
            )}
          </ChartCard>

          <ChartCard title="Denial Rate Trend" delay={0.1}>
            {loading && !trends ? (
              <div className="h-72 animate-pulse bg-passport-surface-2 rounded-passport" />
            ) : (
              <GenericLineChart
                data={denialRateData}
                lines={[
                  { key: 'rate', name: 'Denial Rate %', color: '#f78166' },
                ]}
                height={320}
                referenceLines={[
                  { y: 10, color: '#d2991d', label: 'Warning 10%', strokeDasharray: '5 5' },
                ]}
                showLegend={false}
              />
            )}
          </ChartCard>
        </div>
      )}

      {/* Agents Tab */}
      {tab === 'agents' && (
        <div className="space-y-6">
          <ChartCard title="Agent Performance" delay={0.05}>
            {loading && !agents ? (
              <div className="h-72 animate-pulse bg-passport-surface-2 rounded-passport" />
            ) : (
              <GenericBarChart
                data={agents?.agents || []}
                bars={[{ key: 'enforcements', name: 'Enforcements', color: '#2ea043' }]}
                xKey="name"
                height={320}
                showLegend={false}
                cellColors={agentCellColors}
              />
            )}
          </ChartCard>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {loading && !agents
              ? [1, 2, 3].map((i) => <SkeletonCard key={i} />)
              : agents?.agents?.map((agent: any, i: number) => (
                  <GlassCard key={agent.name} delay={0.05 * i}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Bot size={16} className="text-passport-azure" />
                        <span className="text-sm font-medium text-passport-text truncate">
                          {agent.name}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded ${
                          agent.denyRate < 0.02
                            ? 'bg-passport-green/10 text-passport-green'
                            : agent.denyRate < 0.05
                            ? 'bg-passport-amber/10 text-passport-amber'
                            : 'bg-passport-red/10 text-passport-red'
                        }`}
                      >
                        {(agent.denyRate * 100).toFixed(1)}% denied
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="label-text">Enforcements</div>
                        <div className="font-mono text-lg font-bold text-passport-text">
                          {agent.enforcements}
                        </div>
                      </div>
                      <div>
                        <div className="label-text">Denied</div>
                        <div className="font-mono text-lg font-bold text-passport-coral">
                          {agent.denied}
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                ))}
          </div>
        </div>
      )}

      {/* Policies Tab */}
      {tab === 'policies' && (
        <div className="space-y-6">
          <ChartCard title="Policy Effectiveness" delay={0.05}>
            {loading && !policies ? (
              <div className="h-72 animate-pulse bg-passport-surface-2 rounded-passport" />
            ) : (
              <GenericBarChart
                data={policies?.policies || []}
                bars={[
                  { key: 'triggered', name: 'Triggered', color: '#d2991d' },
                  { key: 'prevented', name: 'Prevented', color: '#2ea043' },
                ]}
                xKey="name"
                height={320}
              />
            )
            }
          </ChartCard>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {loading && !policies
              ? [1, 2, 3].map((i) => <SkeletonCard key={i} />)
              : policies?.policies?.map((policy: any, i: number) => {
                  const effectiveness =
                    policy.triggered > 0
                      ? Math.round((policy.prevented / policy.triggered) * 100)
                      : 0
                  return (
                    <GlassCard key={policy.name} delay={0.05 * i}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Shield size={16} className="text-passport-green" />
                          <span className="text-sm font-medium text-passport-text truncate">
                            {policy.name}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded ${
                            effectiveness >= 90
                              ? 'bg-passport-green/10 text-passport-green'
                              : effectiveness >= 70
                              ? 'bg-passport-amber/10 text-passport-amber'
                              : 'bg-passport-red/10 text-passport-red'
                          }`}
                        >
                          {effectiveness}% effective
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="label-text">Triggered</div>
                          <div className="font-mono text-lg font-bold text-passport-text">
                            {policy.triggered}
                          </div>
                        </div>
                        <div>
                          <div className="label-text">Prevented</div>
                          <div className="font-mono text-lg font-bold text-passport-green">
                            {policy.prevented}
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  )
                })}
          </div>
        </div>
      )}
    </div>
  )
}
