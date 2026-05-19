'use client'

import { useEffect, useState } from 'react'
import { listPolicies, createPolicy } from '@/lib/api'
import GlassCard from '@/components/glass-card'
import {
  AlertTriangle,
  CheckCircle,
  FileText,
  Plus,
  RefreshCw,
  Shield,
  X,
} from 'lucide-react'

interface Policy {
  id: string
  name: string
  rules?: Record<string, any>
  createdAt?: string
}

const DEFAULT_RULES = `{
  "tools": {
    "allow": ["read", "search"],
    "deny": ["delete", "admin"]
  },
  "rateLimit": 100,
  "maxCost": 5.00
}`

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [rulesText, setRulesText] = useState(DEFAULT_RULES)
  const [submitting, setSubmitting] = useState(false)

  async function loadPolicies() {
    setLoading(true)
    setError('')
    try {
      const data = await listPolicies()
      const list = Array.isArray(data) ? data : data.data || []
      setPolicies(list)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPolicies()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      let rules: Record<string, any>
      try {
        rules = JSON.parse(rulesText)
      } catch {
        setError('Invalid JSON in rules field')
        setSubmitting(false)
        return
      }
      await createPolicy({ name, rules })
      setShowForm(false)
      setName('')
      setRulesText(DEFAULT_RULES)
      loadPolicies()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-passport-text">Policies</h1>
          <p className="text-sm text-passport-muted mt-0.5">
            Define permission scopes and enforcement rules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadPolicies} className="btn-secondary">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus size={14} />
            New Policy
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-passport border border-passport-red/30 bg-passport-red/5 flex items-center gap-2">
          <AlertTriangle size={16} className="text-passport-red" />
          <span className="text-sm text-passport-red">{error}</span>
        </div>
      )}

      {/* New policy form */}
      {showForm && (
        <GlassCard hover={false}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-passport-text">Create Policy</h2>
            <button
              onClick={() => setShowForm(false)}
              className="text-passport-dim hover:text-passport-text transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-text">Policy Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                placeholder="e.g. Standard Agent"
                required
              />
            </div>
            <div>
              <label className="label-text">Rules (JSON)</label>
              <textarea
                value={rulesText}
                onChange={(e) => setRulesText(e.target.value)}
                className="input-field min-h-[180px] resize-y font-mono text-xs"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary disabled:opacity-50"
              >
                {submitting ? (
                  <span className="w-4 h-4 border-2 border-passport-green/30 border-t-passport-green rounded-full animate-spin" />
                ) : (
                  <Shield size={14} />
                )}
                Create Policy
              </button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* Policies list */}
      {loading && policies.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <span className="w-6 h-6 border-2 border-passport-green/30 border-t-passport-green rounded-full animate-spin" />
        </div>
      ) : policies.length === 0 ? (
        <GlassCard className="text-center py-14" hover={false}>
          <Shield size={32} className="text-passport-dim mx-auto mb-3" />
          <p className="text-passport-muted">No policies defined yet.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4">
            <Plus size={14} />
            Create your first policy
          </button>
        </GlassCard>
      ) : (
        <div className="grid gap-3">
          {policies.map((policy, i) => (
            <GlassCard key={policy.id} delay={i * 0.05}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-passport bg-passport-surface-2">
                    <FileText size={18} className="text-passport-azure" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-passport-text">{policy.name}</div>
                    <div className="font-mono text-[10px] text-passport-dim mt-0.5">
                      ID: {policy.id}
                    </div>
                    {policy.rules && (
                      <pre className="mt-2 p-3 rounded-passport bg-passport-bg border border-passport-border font-mono text-[11px] text-passport-muted overflow-x-auto">
                        {JSON.stringify(policy.rules, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
                <span className="shrink-0 mt-1">
                  <CheckCircle size={16} className="text-passport-green" />
                </span>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
