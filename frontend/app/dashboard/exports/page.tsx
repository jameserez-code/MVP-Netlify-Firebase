'use client'

import { useEffect, useState } from 'react'
import GlassCard from '@/components/glass-card'
import EmptyState from '@/components/empty-state'
import { useToast } from '@/components/toast'
import {
  Download,
  FileText,
  Shield,
  Database,
  FileBarChart,
  Clock,
  Trash2,
  CheckCircle,
  XCircle,
} from 'lucide-react'

interface ExportEntry {
  type: string
  format: string
  status: string
  date: string
  expiresAt: string
  url?: string
}

const TYPE_ICONS: Record<string, any> = {
  audit: FileText,
  policies: Shield,
  agents: Database,
  gdpr: Database,
  report: FileBarChart,
}

const TYPE_LABELS: Record<string, string> = {
  audit: 'Audit Log CSV',
  policies: 'Policies JSON',
  agents: 'Agents JSON',
  gdpr: 'GDPR Data Export',
  report: 'Security Report',
}

export default function ExportsPage() {
  const { addToast } = useToast()
  const [history, setHistory] = useState<ExportEntry[]>([])

  useEffect(() => {
    loadHistory()
  }, [])

  function loadHistory() {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem('passport_export_history')
      if (raw) {
        const data = JSON.parse(raw) as ExportEntry[]
        const now = new Date()
        const valid = data.filter((e) => new Date(e.expiresAt) > now)
        setHistory(valid)
      }
    } catch {}
  }

  function clearHistory() {
    localStorage.removeItem('passport_export_history')
    setHistory([])
    addToast('Export history cleared', 'success')
  }

  function isExpired(entry: ExportEntry): boolean {
    return new Date(entry.expiresAt) <= new Date()
  }

  const IconComponent = (type: string) => {
    const Icon = TYPE_ICONS[type] || FileText
    return <Icon size={18} />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-passport-text">Exports</h1>
          <p className="text-sm text-passport-muted mt-0.5">
            Download history and data export management
          </p>
        </div>
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="btn-secondary"
          >
            <Trash2 size={14} />
            Clear History
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <EmptyState
          icon={Download}
          title="No exports yet"
          description="Export data from Audit, Policies, or Settings pages to see them here."
        />
      ) : (
        <div className="grid gap-3">
          {history.map((entry, i) => {
            const expired = isExpired(entry)
            return (
              <GlassCard key={i} delay={i * 0.05}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`p-2 rounded-passport shrink-0 ${expired ? 'bg-passport-surface-2 opacity-50' : 'bg-passport-surface-2'}`}>
                      {expired ? (
                        <XCircle size={18} className="text-passport-dim" />
                      ) : (
                        IconComponent(entry.type)
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-passport-text">
                        {TYPE_LABELS[entry.type] || entry.type}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-passport-surface-2 text-passport-muted">
                          {entry.format.toUpperCase()}
                        </span>
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-passport-green/10 text-passport-green">
                          <CheckCircle size={10} />
                          {entry.status}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] text-passport-dim">
                          <Clock size={10} />
                          {new Date(entry.date).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-[10px] text-passport-dim mt-1">
                        {expired ? (
                          <span className="text-passport-red">Expired</span>
                        ) : (
                          <span>Expires: {new Date(entry.expiresAt).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {!expired && (
                    <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-passport-green/10 text-passport-green shrink-0">
                      Available
                    </span>
                  )}
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}

      <GlassCard hover={false}>
        <div className="flex items-center gap-2 mb-4">
          <Download size={18} className="text-passport-azure" />
          <h2 className="text-lg font-semibold text-passport-text">Available Exports</h2>
        </div>
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-passport border border-passport-border bg-passport-surface/50">
            <div>
              <div className="text-sm font-medium text-passport-text">Audit Log CSV</div>
              <div className="text-xs text-passport-muted">Export audit log as CSV for compliance and analysis.</div>
            </div>
            <a href="/dashboard/audit" className="btn-secondary shrink-0">
              <FileText size={14} />
              Go to Audit
            </a>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-passport border border-passport-border bg-passport-surface/50">
            <div>
              <div className="text-sm font-medium text-passport-text">Policies JSON</div>
              <div className="text-xs text-passport-muted">Export all policies as JSON for backup or migration.</div>
            </div>
            <a href="/dashboard/policies" className="btn-secondary shrink-0">
              <Shield size={14} />
              Go to Policies
            </a>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-passport border border-passport-border bg-passport-surface/50">
            <div>
              <div className="text-sm font-medium text-passport-text">Agents JSON</div>
              <div className="text-xs text-passport-muted">Export all agents with masked secrets for auditing.</div>
            </div>
            <a href="/dashboard/agents" className="btn-secondary shrink-0">
              <Database size={14} />
              Go to Agents
            </a>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-passport border border-passport-border bg-passport-surface/50">
            <div>
              <div className="text-sm font-medium text-passport-text">GDPR Data &amp; Report</div>
              <div className="text-xs text-passport-muted">Export all your data or generate a security report.</div>
            </div>
            <a href="/dashboard/settings" className="btn-secondary shrink-0">
              <Download size={14} />
              Go to Settings
            </a>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
