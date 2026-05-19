'use client'

import { useEffect, useMemo, useState } from 'react'
import { getAudit } from '@/lib/api'
import GlassCard from '@/components/glass-card'
import EmptyState from '@/components/empty-state'
import { SkeletonRow, PageLoader } from '@/components/loading'
import { useToast } from '@/components/toast'
import {
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  Clock,
  Download,
  Filter,
  RefreshCw,
  Search,
  Shield,
  XCircle,
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from 'lucide-react'

interface AuditEntry {
  id: string
  agentId?: string
  tool?: string
  decision?: 'allow' | 'deny' | 'modify'
  reason?: string
  timestamp?: string
  createdAt?: string
  parameters?: Record<string, any>
}

const PAGE_SIZE = 20

function SimpleBarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="flex items-end gap-3 h-32">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
          <div
            className="w-full rounded-t-passport transition-all duration-500"
            style={{
              height: `${(d.value / max) * 100}%`,
              backgroundColor: d.color,
              opacity: 0.8,
            }}
          />
          <span className="font-mono text-[9px] text-passport-dim uppercase">{d.label}</span>
          <span className="font-mono text-[10px] text-passport-muted">{d.value}</span>
        </div>
      ))}
    </div>
  )
}

function exportToCSV(entries: AuditEntry[]) {
  const headers = ['ID', 'Agent ID', 'Tool', 'Decision', 'Reason', 'Timestamp']
  const rows = entries.map((e) => [
    e.id,
    e.agentId || '',
    e.tool || '',
    e.decision || '',
    e.reason || '',
    e.timestamp || e.createdAt || '',
  ])
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function AuditPage() {
  const { addToast } = useToast()
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [decisionFilter, setDecisionFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(0)

  async function loadAudit() {
    setLoading(true)
    setError('')
    try {
      const data = await getAudit({ decision: decisionFilter || undefined, limit: 500 })
      const list = Array.isArray(data) ? data : data.data || []
      setEntries(list)
    } catch (err: any) {
      setError(err.message)
      addToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAudit()
  }, [decisionFilter])

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (!filter) return true
      const f = filter.toLowerCase()
      return (
        e.id?.toLowerCase().includes(f) ||
        e.agentId?.toLowerCase().includes(f) ||
        e.tool?.toLowerCase().includes(f) ||
        e.reason?.toLowerCase().includes(f)
      )
    }).filter((e) => {
      if (!dateFrom && !dateTo) return true
      const ts = e.timestamp || e.createdAt
      if (!ts) return true
      const d = new Date(ts)
      if (dateFrom && d < new Date(dateFrom)) return false
      if (dateTo) {
        const end = new Date(dateTo)
        end.setHours(23, 59, 59, 999)
        if (d > end) return false
      }
      return true
    })
  }, [entries, filter, dateFrom, dateTo])

  const paginated = useMemo(() => {
    const start = page * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const chartData = useMemo(() => {
    const days: Record<string, { allow: number; deny: number; modify: number }> = {}
    filtered.forEach((e) => {
      const ts = e.timestamp || e.createdAt
      if (!ts) return
      const day = new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      if (!days[day]) days[day] = { allow: 0, deny: 0, modify: 0 }
      if (e.decision) days[day][e.decision]++
    })
    const labels = Object.keys(days).slice(-7)
    return [
      ...labels.map((label) => ({
        label,
        value: days[label].allow,
        color: '#2ea043',
      })),
      ...labels.map((label) => ({
        label,
        value: days[label].deny,
        color: '#f85149',
      })),
      ...labels.map((label) => ({
        label,
        value: days[label].modify,
        color: '#58a6ff',
      })),
    ].filter((d) => d.value > 0)
  }, [filtered])

  const decisionCounts = useMemo(() => {
    const counts = { allow: 0, deny: 0, modify: 0 }
    filtered.forEach((e) => {
      if (e.decision && e.decision in counts) counts[e.decision]++
    })
    return counts
  }, [filtered])

  const decisionBadge = (decision?: string) => {
    switch (decision) {
      case 'allow':
        return 'bg-passport-green/10 text-passport-green'
      case 'deny':
        return 'bg-passport-red/10 text-passport-red'
      case 'modify':
        return 'bg-passport-azure/10 text-passport-azure'
      default:
        return 'bg-passport-amber/10 text-passport-amber'
    }
  }

  const decisionIcon = (decision?: string) => {
    switch (decision) {
      case 'allow':
        return <CheckCircle size={10} />
      case 'deny':
        return <XCircle size={10} />
      case 'modify':
        return <Shield size={10} />
      default:
        return <Shield size={10} />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-passport-text">Audit Log</h1>
          <p className="text-sm text-passport-muted mt-0.5">
            Query and inspect agent action intents
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToCSV(filtered)}
            className="btn-secondary"
            disabled={filtered.length === 0}
          >
            <Download size={14} />
            Export CSV
          </button>
          <button onClick={loadAudit} className="btn-secondary" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-passport border border-passport-red/30 bg-passport-red/5 flex items-center gap-2">
          <AlertTriangle size={16} className="text-passport-red" />
          <span className="text-sm text-passport-red flex-1">{error}</span>
          <button onClick={loadAudit} className="text-xs text-passport-red underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-passport-dim" />
          <input
            type="text"
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setPage(0) }}
            placeholder="Search by ID, agent, tool, or reason..."
            className="input-field pl-9"
          />
        </div>
        <select
          value={decisionFilter}
          onChange={(e) => { setDecisionFilter(e.target.value); setPage(0) }}
          className="input-field w-full sm:w-40 font-mono text-xs"
        >
          <option value="">All decisions</option>
          <option value="allow">Allow</option>
          <option value="deny">Deny</option>
          <option value="modify">Modify</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(0) }}
          className="input-field w-full sm:w-40 font-mono text-xs"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(0) }}
          className="input-field w-full sm:w-40 font-mono text-xs"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <GlassCard className="text-center py-4" hover={false}>
          <CheckCircle size={18} className="text-passport-green mx-auto mb-1" />
          <div className="font-mono text-xl font-bold text-passport-text">{decisionCounts.allow}</div>
          <div className="label-text mt-1">Allowed</div>
        </GlassCard>
        <GlassCard className="text-center py-4" hover={false}>
          <XCircle size={18} className="text-passport-red mx-auto mb-1" />
          <div className="font-mono text-xl font-bold text-passport-text">{decisionCounts.deny}</div>
          <div className="label-text mt-1">Denied</div>
        </GlassCard>
        <GlassCard className="text-center py-4" hover={false}>
          <ClipboardList size={18} className="text-passport-azure mx-auto mb-1" />
          <div className="font-mono text-xl font-bold text-passport-text">{filtered.length}</div>
          <div className="label-text mt-1">Total</div>
        </GlassCard>
      </div>

      {/* Trend chart */}
      {chartData.length > 0 && (
        <GlassCard hover={false}>
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-passport-azure" />
            <h2 className="text-sm font-semibold text-passport-text">Decision Trend</h2>
          </div>
          <SimpleBarChart data={chartData} />
        </GlassCard>
      )}

      {/* Table */}
      {loading && entries.length === 0 ? (
        <div className="grid gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : paginated.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No audit entries found"
          description="Try adjusting your filters"
        />
      ) : (
        <div className="space-y-3">
          <div className="glass-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-passport-border">
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-passport-muted font-semibold">
                      Decision
                    </th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-passport-muted font-semibold">
                      Agent
                    </th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-passport-muted font-semibold">
                      Tool
                    </th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-passport-muted font-semibold hidden md:table-cell">
                      Reason
                    </th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-passport-muted font-semibold hidden sm:table-cell">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-passport-border/50 hover:bg-passport-surface/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${decisionBadge(entry.decision)}`}
                        >
                          {decisionIcon(entry.decision)}
                          {entry.decision}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-passport-text truncate max-w-[120px] block">
                          {entry.agentId || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-passport-text">{entry.tool || '—'}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-passport-muted truncate max-w-[200px] block">
                          {entry.reason || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="font-mono text-[10px] text-passport-dim flex items-center gap-1">
                          <Clock size={10} />
                          {entry.timestamp
                            ? new Date(entry.timestamp).toLocaleTimeString()
                            : entry.createdAt
                            ? new Date(entry.createdAt).toLocaleTimeString()
                            : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-passport-dim">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="btn-secondary py-1.5 px-2 disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="font-mono text-xs text-passport-muted">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="btn-secondary py-1.5 px-2 disabled:opacity-40"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
