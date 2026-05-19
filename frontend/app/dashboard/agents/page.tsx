'use client'

import { useEffect, useState } from 'react'
import { listAgents, registerAgent, revokeAgent } from '@/lib/api'
import GlassCard from '@/components/glass-card'
import {
  AlertTriangle,
  Bot,
  CheckCircle,
  Copy,
  Key,
  Plus,
  RefreshCw,
  Shield,
  X,
  XCircle,
} from 'lucide-react'

interface Agent {
  id: string
  name: string
  model?: string
  provider?: string
  status?: string
  createdAt?: string
  secretKey?: string
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    provider: '',
    systemPrompt: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [newAgent, setNewAgent] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  async function loadAgents() {
    setLoading(true)
    setError('')
    try {
      const data = await listAgents()
      // Handle both array and { data: [...] } responses
      const list = Array.isArray(data) ? data : data.data || []
      setAgents(list)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAgents()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const data = await registerAgent({
        name: formData.name,
        model: formData.model,
        provider: formData.provider,
        systemPrompt: formData.systemPrompt || undefined,
      })
      setNewAgent(data)
      setShowForm(false)
      setFormData({ name: '', model: '', provider: '', systemPrompt: '' })
      loadAgents()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm('Are you sure you want to revoke this agent?')) return
    try {
      await revokeAgent(id)
      loadAgents()
    } catch (err: any) {
      setError(err.message)
    }
  }

  function copySecret() {
    if (newAgent?.secretKey) {
      navigator.clipboard.writeText(newAgent.secretKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-passport-text">Agents</h1>
          <p className="text-sm text-passport-muted mt-0.5">
            Manage and monitor your agent fleet
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadAgents} className="btn-secondary">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus size={14} />
            Register Agent
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-passport border border-passport-red/30 bg-passport-red/5 flex items-center gap-2">
          <AlertTriangle size={16} className="text-passport-red" />
          <span className="text-sm text-passport-red">{error}</span>
        </div>
      )}

      {/* New agent secret modal */}
      {newAgent && (
        <GlassCard className="border-passport-green/30 bg-passport-green/5" hover={false}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-passport-green" />
              <span className="font-semibold text-passport-text">Agent Registered</span>
            </div>
            <button
              onClick={() => setNewAgent(null)}
              className="text-passport-dim hover:text-passport-text transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <div className="mt-3 p-3 rounded-passport bg-passport-bg border border-passport-border">
            <div className="label-text mb-1">Secret Key (copy now — shown once)</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-sm text-passport-green break-all">
                {newAgent.secretKey}
              </code>
              <button
                onClick={copySecret}
                className="p-2 rounded-passport hover:bg-passport-surface-2 text-passport-muted hover:text-passport-text transition-colors shrink-0"
              >
                {copied ? <CheckCircle size={16} className="text-passport-green" /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Registration form */}
      {showForm && (
        <GlassCard hover={false}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-passport-text">Register New Agent</h2>
            <button
              onClick={() => setShowForm(false)}
              className="text-passport-dim hover:text-passport-text transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label-text">Agent Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                placeholder="My Assistant"
                required
              />
            </div>
            <div>
              <label className="label-text">Model</label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="input-field"
                placeholder="gpt-4"
                required
              />
            </div>
            <div>
              <label className="label-text">Provider</label>
              <input
                type="text"
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                className="input-field"
                placeholder="openai"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label-text">System Prompt (optional)</label>
              <textarea
                value={formData.systemPrompt}
                onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                className="input-field min-h-[80px] resize-y"
                placeholder="You are a helpful assistant..."
              />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
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
                  <Bot size={14} />
                )}
                Register
              </button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* Agents list */}
      {loading && agents.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <span className="w-6 h-6 border-2 border-passport-green/30 border-t-passport-green rounded-full animate-spin" />
        </div>
      ) : agents.length === 0 ? (
        <GlassCard className="text-center py-14" hover={false}>
          <Bot size={32} className="text-passport-dim mx-auto mb-3" />
          <p className="text-passport-muted">No agents registered yet.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4">
            <Plus size={14} />
            Register your first agent
          </button>
        </GlassCard>
      ) : (
        <div className="grid gap-3">
          {agents.map((agent, i) => (
            <GlassCard key={agent.id} delay={i * 0.05} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-passport bg-passport-surface-2">
                  {agent.status === 'revoked' ? (
                    <XCircle size={18} className="text-passport-red" />
                  ) : (
                    <Bot size={18} className="text-passport-green" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-passport-text">{agent.name || 'Unnamed'}</span>
                    <span
                      className={`font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        agent.status === 'revoked'
                          ? 'bg-passport-red/10 text-passport-red'
                          : 'bg-passport-green/10 text-passport-green'
                      }`}
                    >
                      {agent.status || 'active'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="font-mono text-xs text-passport-muted">
                      {agent.model}
                    </span>
                    <span className="text-passport-dim">|</span>
                    <span className="font-mono text-xs text-passport-muted">
                      {agent.provider}
                    </span>
                  </div>
                  <div className="font-mono text-[10px] text-passport-dim mt-1">
                    ID: {agent.id}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                {agent.status !== 'revoked' && (
                  <button
                    onClick={() => handleRevoke(agent.id)}
                    className="btn-danger text-xs py-1.5 px-3"
                  >
                    <Key size={12} />
                    Revoke
                  </button>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
