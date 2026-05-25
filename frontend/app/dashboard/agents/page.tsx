'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { swrDashboardConfig } from '@/lib/swr-config'
import { useDebounce } from '@/lib/use-debounce'
import dynamic from 'next/dynamic'
import { listAgents, registerAgent, revokeAgent, suspendAgent } from '@/lib/api'
import { unwrapApiResponse } from '@/lib/data-utils'
import GlassCard from '@/components/glass-card'
import EmptyState from '@/components/empty-state'
import ConfirmDialog from '@/components/confirm-dialog'
import { NoAgents } from '@/components/empty-states/no-agents'
import { SuccessAnimation } from '@/components/success-animation'
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
  Circle,
} from 'lucide-react'

const QRCodeDisplay = dynamic(() => import('@/components/qrcode-display'), {
  ssr: false,
  loading: () => <div className="w-[140px] h-[140px] rounded-passport bg-passport-surface-2 animate-pulse" />,
})

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
  const { data, error, isLoading, mutate } = useSWR('/agents', listAgents, swrDashboardConfig)
  const agents: Agent[] = unwrapApiResponse<Agent>(data)
  const loading = isLoading

  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    provider: '',
    systemPrompt: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [newAgent, setNewAgent] = useState<any>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [copied, setCopied] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const searchQuery = useDebounce(searchInput, 150)
  const [showSecret, setShowSecret] = useState(false)
  const [formStep, setFormStep] = useState(0)
  const [revokeTarget, setRevokeTarget] = useState<Agent | null>(null)
  const [suspendTarget, setSuspendTarget] = useState<Agent | null>(null)

  useEffect(() => {
    if (newAgent) {
      setShowSecret(false)
      setCopied(false)
    }
  }, [newAgent?.id])

  function loadAgents() {
    mutate()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFormError('')
    try {
      const data = await registerAgent({
        name: formData.name,
        model: formData.model,
        provider: formData.provider,
        systemPrompt: formData.systemPrompt || undefined,
      })
      setNewAgent(data)
      setShowForm(false)
      setShowSuccess(true)
      setFormData({ name: '', model: '', provider: '', systemPrompt: '' })
      addToast('Agent registered successfully', 'success')
      loadAgents()
    } catch (err: any) {
      setFormError(err.message)
      addToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRevoke() {
    if (!revokeTarget) return
    const id = revokeTarget.id
    setRevokeTarget(null)
    try {
      await revokeAgent(id)
      addToast('Agent revoked', 'success')
      loadAgents()
    } catch (err: any) {
      addToast(err.message, 'error')
    }
  }

  async function handleSuspend() {
    if (!suspendTarget) return
    const id = suspendTarget.id
    setSuspendTarget(null)
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
    a.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.id?.toLowerCase().includes(searchQuery.toLowerCase())
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

  const statusDot = (status?: string) => {
    switch (status) {
      case 'active': return 'bg-passport-green'
      case 'suspended': return 'bg-passport-amber'
      case 'revoked': return 'bg-passport-red'
      default: return 'bg-passport-dim'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-passport-text">Agents</h1>
          <p className="text-sm text-passport-muted mt-0.5">
            {agents.length > 0 ? `${agents.length} Agent${agents.length !== 1 ? 's' : ''}` : 'Manage and monitor your agent fleet'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
              className="text-passport-dim hover:text-passport-text transition-colors p-1 rounded-passport hover:bg-passport-surface-2"
              aria-label="Dismiss agent registration"
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
                    className="p-1.5 rounded-passport hover:bg-passport-surface-2 text-passport-muted hover:text-passport-text transition-colors shrink-0 min-touch-target"
                    aria-label={showSecret ? 'Hide secret key' : 'Show secret key'}
                  >
                    {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button
                    onClick={copySecret}
                    className="p-1.5 rounded-passport hover:bg-passport-surface-2 text-passport-muted hover:text-passport-text transition-colors shrink-0 min-touch-target"
                    aria-label="Copy secret key to clipboard"
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
              <div>
                <h2 className="text-lg font-semibold text-passport-text">Register New Agent</h2>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`flex items-center gap-1.5 text-xs font-mono transition-colors ${formStep === 0 ? 'text-passport-green' : 'text-passport-dim'}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border ${formStep === 0 ? 'border-passport-green bg-passport-green/10 text-passport-green' : 'border-passport-border text-passport-dim'}`}>1</span>
                    Details
                  </span>
                  <span className="w-8 h-px bg-passport-border" />
                  <span className={`flex items-center gap-1.5 text-xs font-mono transition-colors ${formStep === 1 ? 'text-passport-green' : 'text-passport-dim'}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border ${formStep === 1 ? 'border-passport-green bg-passport-green/10 text-passport-green' : 'border-passport-border text-passport-dim'}`}>2</span>
                    Key
                  </span>
                </div>
              </div>
            <button
              onClick={() => setShowForm(false)}
              className="text-passport-dim hover:text-passport-text transition-colors p-1 rounded-passport hover:bg-passport-surface-2"
              aria-label="Close registration form"
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
                autoComplete="off"
                autoCapitalize="words"
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
            {formError && (
              <div className="sm:col-span-2 p-3 rounded-passport border border-passport-red/30 bg-passport-red/5 flex items-center gap-2">
                <AlertTriangle size={14} className="text-passport-red shrink-0" />
                <span className="text-xs text-passport-red">{formError}</span>
              </div>
            )}
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
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
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
        searchQuery ? (
          <EmptyState
            icon={Bot}
            title="No agents match your search"
            description="Try a different search term"
          />
        ) : (
          <NoAgents onCreate={() => setShowForm(true)} />
        )
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
                      <span className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${statusBadge(agent.status)}`}>
                        <span className={`w-2 h-2 rounded-full ${statusDot(agent.status)} ${agent.status === 'active' ? 'animate-pulse-soft' : ''}`} />
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
                            onClick={() => setSuspendTarget(agent)}
                            className="p-1.5 rounded-passport text-passport-dim hover:text-passport-amber hover:bg-passport-amber/5 transition-all min-touch-target"
                            aria-label={`Suspend agent ${agent.name}`}
                          >
                            <Pause size={14} />
                          </button>
                        )}
                        {agent.status !== 'revoked' && (
                          <button
                            onClick={() => setRevokeTarget(agent)}
                            className="p-1.5 rounded-passport text-passport-dim hover:text-passport-red hover:bg-passport-red/5 transition-all min-touch-target"
                            aria-label={`Revoke agent ${agent.name}`}
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

      <ConfirmDialog
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
        title="Revoke Agent"
        description="This agent will no longer be able to make any tool calls. This action cannot be undone."
        confirmLabel="Revoke"
      />

      <ConfirmDialog
        open={!!suspendTarget}
        onClose={() => setSuspendTarget(null)}
        onConfirm={handleSuspend}
        title="Suspend Agent"
        description="This agent will be temporarily suspended. It can be reactivated later."
        confirmLabel="Suspend"
        variant="primary"
      />

      {showSuccess && (
        <SuccessAnimation
          message="Agent registered successfully"
          onDismiss={() => setShowSuccess(false)}
        />
      )}
    </div>
  )
}
