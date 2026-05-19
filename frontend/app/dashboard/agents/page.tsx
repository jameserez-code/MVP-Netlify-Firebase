'use client'

import { useEffect, useState } from 'react'
import { listAgents, registerAgent, revokeAgent, suspendAgent } from '@/lib/api'
import GlassCard from '@/components/glass-card'
import QRCodeDisplay from '@/components/qrcode-display'
import EmptyState from '@/components/empty-state'
import { SkeletonRow, PageLoader } from '@/components/loading'
import { useToast } from '@/components/toast'
import {
  AlertTriangle,
  Bot,
  CheckCircle,
  Copy,
  Eye,
  EyeOff,
  Key,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
  Pause,
  QrCode,
} from 'lucide-react'

interface Agent {
  id: string
  name: string
  model?: string
  provider?: string
  status?: 'active' | 'suspended' | 'revoked'
  createdAt?: string
  secretKey?: string
}

const PROVIDERS = ['OpenAI', 'Anthropic', 'Google', 'Cohere', 'Mistral', 'Local']

export default function AgentsPage() {
  const { addToast } = useToast()
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
  const [search, setSearch] = useState('')
  const [showSecret, setShowSecret] = useState(false)

  useEffect(() => {
    if (newAgent) {
      setShowSecret(false)
      setCopied(false)
    }
  }, [newAgent?.id])

  async function loadAgents() {
    setLoading(true)
    setError('')
    try {
      const data = await listAgents()
      const list = Array.isArray(data) ? data : data.data || []
      setAgents(list)
    } catch (err: any) {
      setError(err.message)
      addToast(err.message, 'error')
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
      addToast('Agent registered successfully', 'success')
      loadAgents()
    } catch (err: any) {
      setError(err.message)
      addToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm('Are you sure you want to revoke this agent? This cannot be undone.')) return
    try {
      await revokeAgent(id)
      addToast('Agent revoked', 'success')
      loadAgents()
    } catch (err: any) {
      addToast(err.message, 'error')
    }
  }

  async function handleSuspend(id: string) {
    if (!confirm('Suspend this agent? It can be reactivated later.')) return
    try {
      await suspendAgent(id)
      addToast('Agent suspended', 'warning')
      loadAgents()
    } catch (err: any) {
      addToast(err.message, 'error')
    }
  }

  function copySecret() {
    if (newAgent?.secretKey) {
      navigator.clipboard.writeText(newAgent.secretKey)
      setCopied(true)
      addToast('Secret copied to clipboard', 'success')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const filtered = agents.filter((a) =>
    a.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.id?.toLowerCase().includes(search.toLowerCase())
  )

  const statusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return 'bg-passport-green/10 text-passport-green'
      case 'suspended':
        return 'bg-passport-amber/10 text-passport-amber'
      case 'revoked':
        return 'bg-passport-red/10 text-passport-red'
      default:
        return 'bg-passport-green/10 text-passport-green'
    }
  }

  const statusIcon = (status?: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle size={12} className="inline mr-1" />
      case 'suspended':
        return <Pause size={12} className="inline mr-1" />
      case 'revoked':
        return <X size={12} className="inline mr-1" />
      default:
        return <CheckCircle size={12} className="inline mr-1" />
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
          <button onClick={loadAgents} className="btn-secondary" disabled={loading}>
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
          <span className="text-sm text-passport-red flex-1">{error}</span>
          <button onClick={loadAgents} className="text-xs text-passport-red underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {/* Registration success modal */}
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

          <div className="mt-4 grid sm:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="p-3 rounded-passport bg-passport-bg border border-passport-border">
                <div className="label-text mb-1">Agent ID</div>
                <code className="font-mono text-sm text-passport-text break-all">{newAgent.id}</code>
              </div>
              <div className="p-3 rounded-passport bg-passport-bg border border-passport-border">
                <div className="label-text mb-1 flex items-center justify-between">
                  <span>Secret Key</span>
                  <span className="text-passport-amber text-[10px] uppercase tracking-wider">Shown once</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-sm text-passport-green break-all">
                    {showSecret ? newAgent.secretKey : '•'.repeat(Math.min(newAgent.secretKey?.length || 32, 32))}
                  </code>
                  <button
                    onClick={() => setShowSecret(!showSecret)}
                    className="p-1.5 rounded-passport hover:bg-passport-surface-2 text-passport-muted hover:text-passport-text transition-colors shrink-0"
                    title={showSecret ? 'Hide' : 'Show'}
                  >
                    {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button
                    onClick={copySecret}
                    className="p-1.5 rounded-passport hover:bg-passport-surface-2 text-passport-muted hover:text-passport-text transition-colors shrink-0"
                    title="Copy"
                  >
                    {copied ? <CheckCircle size={14} className="text-passport-green" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center p-3 rounded-passport bg-passport-bg border border-passport-border">
              <QRCodeDisplay value={`${newAgent.id}:${newAgent.secretKey}`} size={140} />
              <span className="font-mono text-[10px] text-passport-dim mt-2 flex items-center gap-1">
                <QrCode size={10} />
                Scan to configure
              </span>
            </div>
          </div>

          <div className="mt-3 p-2 rounded-passport bg-passport-amber/5 border border-passport-amber/20 flex items-center gap-2">
            <AlertTriangle size={14} className="text-passport-amber shrink-0" />
            <span className="text-xs text-passport-amber">
              This secret will only be shown once. Store it securely.
            </span>
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
              <select
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                className="input-field font-mono text-xs"
                required
              >
                <option value="">Select provider...</option>
                {PROVIDERS.map((p) => (
                  <option key={p} value={p.toLowerCase()}>{p}</option>
                ))}
              </select>
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

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-passport-dim" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search agents by name or ID..."
          className="input-field pl-9"
        />
      </div>

      {/* Agents list */}
      {loading && agents.length === 0 ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Bot}
          title={search ? 'No agents match your search' : 'No agents registered yet'}
          description={search ? 'Try a different search term' : 'Register your first agent to get started'}
          action={
            !search && (
              <button onClick={() => setShowForm(true)} className="btn-primary">
                <Plus size={14} />
                Register your first agent
              </button>
            )
          }
        />
      ) : (
        <div className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-passport-border">
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-passport-muted font-semibold">
                    Agent
                  </th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-passport-muted font-semibold">
                    Model
                  </th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-passport-muted font-semibold hidden sm:table-cell">
                    Status
                  </th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-passport-muted font-semibold hidden md:table-cell">
                    Created
                  </th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-passport-muted font-semibold text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((agent) => (
                  <tr
                    key={agent.id}
                    className="border-b border-passport-border/50 hover:bg-passport-surface/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-passport bg-passport-surface-2">
                          <Bot size={16} className={agent.status === 'revoked' ? 'text-passport-red' : 'text-passport-green'} />
                        </div>
                        <div>
                          <div className="font-medium text-passport-text text-sm">{agent.name || 'Unnamed'}</div>
                          <div className="font-mono text-[10px] text-passport-dim">{agent.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-passport-muted">{agent.model || '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`inline-flex items-center font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${statusBadge(agent.status)}`}>
                        {statusIcon(agent.status)}
                        {agent.status || 'active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="font-mono text-[10px] text-passport-dim">
                        {agent.createdAt ? new Date(agent.createdAt).toLocaleDateString() : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {agent.status === 'active' && (
                          <button
                            onClick={() => handleSuspend(agent.id)}
                            className="p-1.5 rounded-passport text-passport-dim hover:text-passport-amber hover:bg-passport-amber/5 transition-all"
                            title="Suspend"
                          >
                            <Pause size={14} />
                          </button>
                        )}
                        {agent.status !== 'revoked' && (
                          <button
                            onClick={() => handleRevoke(agent.id)}
                            className="p-1.5 rounded-passport text-passport-dim hover:text-passport-red hover:bg-passport-red/5 transition-all"
                            title="Revoke"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
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
