'use client'

import { useEffect, useState } from 'react'
import { getAudit, getAuditTimeline } from '@/lib/api'
import GlassCard from '@/components/glass-card'
import {
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  Clock,
  Filter,
  RefreshCw,
  Shield,
  XCircle,
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

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [timeline, setTimeline] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [decisionFilter, setDecisionFilter] = useState('')

  async function loadAudit() {
    setLoading(true)
    setError('')
    try {
      const [auditData, timelineData] = await Promise.all([
        getAudit({ decision: decisionFilter || undefined, limit: 50 }),
        getAuditTimeline().catch(() => null),
      ])
      const list = Array.isArray(auditData) ? auditData : auditData.data || []
      setEntries(list)
      if (timelineData?.data) {
        setTimeline(timelineData.data.slice(0, 20))
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAudit()
  }, [decisionFilter])

  const filtered = entries.filter((e) => {
    if (!filter) return true
    const f = filter.toLowerCase()
    return (
      e.id?.toLowerCase().includes(f) ||
      e.agentId?.toLowerCase().includes(f) ||
      e.tool?.toLowerCase().includes(f) ||
      e.reason?.toLowerCase().includes(f)
    )
  })

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
        <button onClick={loadAudit} className="btn-secondary self-start sm:self-auto">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-passport border border-passport-red/30 bg-passport-red/5 flex items-center gap-2">
          <AlertTriangle size={16} className="text-passport-red" />
          <span className="text-sm text-passport-red">{error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-passport-dim" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search by ID, agent, tool, or reason..."
            className="input-field pl-9"
          />
        </div>
        <select
          value={decisionFilter}
          onChange={(e) => setDecisionFilter(e.target.value)}
          className="input-field w-full sm:w-40 font-mono text-xs"
        >
          <option value="">All decisions</option>
          <option value="allow">Allow</option>
          <option value="deny">Deny</option>
          <option value="modify">Modify</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <GlassCard className="text-center py-4" hover={false}>
          <CheckCircle size={18} className="text-passport-green mx-auto mb-1" />
          <div className="font-mono text-xl font-bold text-passport-text">
            {entries.filter((e) => e.decision === 'allow').length}
          </div>
          <div className="label-text mt-1">Allowed</div>
        </GlassCard>
        <GlassCard className="text-center py-4" hover={false}>
          <XCircle size={18} className="text-passport-red mx-auto mb-1" />
          <div className="font-mono text-xl font-bold text-passport-text">
            {entries.filter((e) => e.decision === 'deny').length}
          </div>
          <div className="label-text mt-1">Denied</div>
        </GlassCard>
        <GlassCard className="text-center py-4" hover={false}>
          <ClipboardList size={18} className="text-passport-azure mx-auto mb-1" />
          <div className="font-mono text-xl font-bold text-passport-text">
            {entries.length}
          </div>
          <div className="label-text mt-1">Total</div>
        </GlassCard>
      </div>

      {/* Table */}
      {loading && entries.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <span className="w-6 h-6 border-2 border-passport-green/30 border-t-passport-green rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard className="text-center py-14" hover={false}>
          <ClipboardList size={32} className="text-passport-dim mx-auto mb-3" />
          <p className="text-passport-muted">No audit entries found.</p>
        </GlassCard>
      ) : (
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
                {filtered.map((entry, i) => (
                  <tr
                    key={entry.id}
                    className="border-b border-passport-border/50 hover:bg-passport-surface/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                          entry.decision === 'allow'
                            ? 'bg-passport-green/10 text-passport-green'
                            : entry.decision === 'deny'
                            ? 'bg-passport-red/10 text-passport-red'
                            : 'bg-passport-amber/10 text-passport-amber'
                        }`}
                      >
                        {entry.decision === 'allow' ? (
                          <CheckCircle size={10} />
                        ) : entry.decision === 'deny' ? (
                          <XCircle size={10} />
                        ) : (
                          <Shield size={10} />
                        )}
                        {entry.decision}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-passport-text truncate max-w-[120px] block">
                        {entry.agentId || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-passport-text">
                        {entry.tool || '—'}
                      </span>
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
      )}
    </div>
  )
}
