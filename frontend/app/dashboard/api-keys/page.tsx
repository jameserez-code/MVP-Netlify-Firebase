'use client'

import { useEffect, useState } from 'react'
import { listApiKeys, createApiKey, deleteApiKey, rotateApiKey } from '@/lib/api'
import GlassCard from '@/components/glass-card'
import EmptyState from '@/components/empty-state'
import { SkeletonRow, PageLoader } from '@/components/loading'
import { useToast } from '@/components/toast'
import {
  AlertTriangle,
  CheckCircle,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  RefreshCw,
  Trash2,
  X,
  Shield,
  Clock,
  BarChart3,
  AlertOctagon,
} from 'lucide-react'

interface ApiKey {
  id: string
  name: string
  maskedKey: string
  createdAt?: string
  lastUsedAt?: string | null
  requestCount?: number
  scopes?: string[]
  status?: 'active' | 'revoked'
}

const SCOPES = [
  { value: 'read', label: 'Read' },
  { value: 'write', label: 'Write' },
  { value: 'admin', label: 'Admin' },
]

export default function ApiKeysPage() {
  const { addToast } = useToast()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', scopes: ['read', 'write'] })
  const [submitting, setSubmitting] = useState(false)
  const [newKey, setNewKey] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null)

  useEffect(() => {
    if (newKey) {
      setShowSecret(false)
      setCopied(false)
    }
  }, [newKey?.id])

  async function loadKeys() {
    setLoading(true)
    setError('')
    try {
      const data = await listApiKeys()
      const list = Array.isArray(data) ? data : data.data || []
      setKeys(list)
    } catch (err: any) {
      setError(err.message)
      addToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadKeys()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const data = await createApiKey({
        name: formData.name,
        scopes: formData.scopes,
      })
      setNewKey(data)
      setShowForm(false)
      setFormData({ name: '', scopes: ['read', 'write'] })
      addToast('API key created successfully', 'success')
      loadKeys()
    } catch (err: any) {
      setError(err.message)
      addToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  function copySecret() {
    if (newKey?.key) {
      navigator.clipboard.writeText(newKey.key)
      setCopied(true)
      addToast('Key copied to clipboard', 'success')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handleRevoke(id: string) {
    setRevokeConfirmId(null)
    try {
      await deleteApiKey(id)
      addToast('API key revoked', 'success')
      loadKeys()
    } catch (err: any) {
      addToast(err.message, 'error')
    }
  }

  async function handleRotate(id: string) {
    if (!confirm('Rotate this key? The old key will be revoked immediately.')) return
    try {
      const data = await rotateApiKey(id)
      setNewKey(data)
      addToast('API key rotated', 'success')
      loadKeys()
    } catch (err: any) {
      addToast(err.message, 'error')
    }
  }

  function toggleScope(scope: string) {
    setFormData((prev) => {
      const has = prev.scopes.includes(scope)
      return {
        ...prev,
        scopes: has ? prev.scopes.filter((s) => s !== scope) : [...prev.scopes, scope],
      }
    })
  }

  const statusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return 'bg-passport-green/10 text-passport-green'
      case 'revoked':
        return 'bg-passport-red/10 text-passport-red'
      default:
        return 'bg-passport-green/10 text-passport-green'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-passport-text">API Keys</h1>
          <p className="text-sm text-passport-muted mt-0.5">
            Manage API keys for SDK and integrations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadKeys} className="btn-secondary" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus size={14} />
            Create New Key
          </button>
        </div>
      </div>

      {/* Warning */}
      <div className="p-3 rounded-passport border border-passport-amber/30 bg-passport-amber/5 flex items-center gap-2">
        <AlertOctagon size={16} className="text-passport-amber shrink-0" />
        <span className="text-sm text-passport-amber">
          Never share your API keys. Store them securely.
        </span>
      </div>

      {error && (
        <div className="p-3 rounded-passport border border-passport-red/30 bg-passport-red/5 flex items-center gap-2">
          <AlertTriangle size={16} className="text-passport-red" />
          <span className="text-sm text-passport-red flex-1">{error}</span>
          <button onClick={loadKeys} className="text-xs text-passport-red underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {/* New key display */}
      {newKey && (
        <GlassCard className="border-passport-green/30 bg-passport-green/5" hover={false}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-passport-green" />
              <span className="font-semibold text-passport-text">
                {newKey.previousKeyId ? 'Key Rotated' : 'Key Created'}
              </span>
            </div>
            <button
              onClick={() => setNewKey(null)}
              className="text-passport-dim hover:text-passport-text transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <div className="p-3 rounded-passport bg-passport-bg border border-passport-border">
              <div className="label-text mb-1">Name</div>
              <code className="font-mono text-sm text-passport-text">{newKey.name}</code>
            </div>
            <div className="p-3 rounded-passport bg-passport-bg border border-passport-border">
              <div className="label-text mb-1 flex items-center justify-between">
                <span>API Key</span>
                <span className="text-passport-amber text-[10px] uppercase tracking-wider">Shown once</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-sm text-passport-green break-all">
                  {showSecret ? newKey.key : '•'.repeat(Math.min(newKey.key?.length || 40, 40))}
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
                  title="Copy to clipboard"
                >
                  {copied ? <CheckCircle size={14} className="text-passport-green" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {(newKey.scopes || []).map((s: string) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-passport-surface-2 text-passport-muted"
                >
                  <Shield size={10} />
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-3 p-2 rounded-passport bg-passport-amber/5 border border-passport-amber/20 flex items-center gap-2">
            <AlertTriangle size={14} className="text-passport-amber shrink-0" />
            <span className="text-xs text-passport-amber">
              This key will only be shown once. Store it in a secure location.
            </span>
          </div>
        </GlassCard>
      )}

      {/* Create form */}
      {showForm && (
        <GlassCard hover={false}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-passport-text">Create New API Key</h2>
            <button
              onClick={() => setShowForm(false)}
              className="text-passport-dim hover:text-passport-text transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-text">Key Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                placeholder="e.g. Production SDK"
                required
              />
            </div>

            <div>
              <label className="label-text">Scopes</label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {SCOPES.map((scope) => {
                  const active = formData.scopes.includes(scope.value)
                  return (
                    <button
                      key={scope.value}
                      type="button"
                      onClick={() => toggleScope(scope.value)}
                      className={`px-2.5 py-1 rounded-passport text-xs font-mono transition-all border ${
                        active
                          ? 'bg-passport-green/10 text-passport-green border-passport-green/30'
                          : 'bg-passport-bg text-passport-muted border-passport-border hover:border-passport-border-2'
                      }`}
                    >
                      {active && <CheckCircle size={10} className="inline mr-1" />}
                      {scope.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
                {submitting ? (
                  <span className="w-4 h-4 border-2 border-passport-green/30 border-t-passport-green rounded-full animate-spin" />
                ) : (
                  <KeyRound size={14} />
                )}
                Create Key
              </button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* Keys list */}
      {loading && keys.length === 0 ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : keys.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No API keys yet"
          description="Create one to get started with SDK access"
          action={
            <button onClick={() => setShowForm(true)} className="btn-primary">
              <Plus size={14} />
              Create your first key
            </button>
          }
        />
      ) : (
        <div className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-passport-border">
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-passport-muted font-semibold">
                    Key
                  </th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-passport-muted font-semibold hidden sm:table-cell">
                    Masked Key
                  </th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-passport-muted font-semibold hidden md:table-cell">
                    Created
                  </th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-passport-muted font-semibold hidden md:table-cell">
                    Last Used
                  </th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-passport-muted font-semibold hidden lg:table-cell">
                    Requests
                  </th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-passport-muted font-semibold hidden sm:table-cell">
                    Status
                  </th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-passport-muted font-semibold text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr
                    key={key.id}
                    className="border-b border-passport-border/50 hover:bg-passport-surface/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-passport bg-passport-surface-2">
                          <KeyRound size={16} className={key.status === 'revoked' ? 'text-passport-red' : 'text-passport-green'} />
                        </div>
                        <div>
                          <div className="font-medium text-passport-text text-sm">{key.name || 'Unnamed'}</div>
                          <div className="font-mono text-[10px] text-passport-dim">{key.id}</div>
                          <div className="flex flex-wrap gap-1 mt-1 sm:hidden">
                            {(key.scopes || []).map((s) => (
                              <span key={s} className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-passport-surface-2 text-passport-dim">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <code className="font-mono text-xs text-passport-muted">{key.maskedKey}</code>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="font-mono text-[10px] text-passport-dim">
                        {key.createdAt ? new Date(key.createdAt).toLocaleDateString() : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="font-mono text-[10px] text-passport-dim flex items-center gap-1">
                        <Clock size={10} />
                        {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="font-mono text-xs text-passport-muted flex items-center gap-1">
                        <BarChart3 size={10} />
                        {key.requestCount ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`inline-flex items-center font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${statusBadge(key.status)}`}>
                        {key.status || 'active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {key.status !== 'revoked' && (
                          <>
                            <button
                              onClick={() => handleRotate(key.id)}
                              className="p-1.5 rounded-passport text-passport-dim hover:text-passport-azure hover:bg-passport-azure/5 transition-all"
                              title="Rotate"
                            >
                              <RefreshCw size={14} />
                            </button>
                            <button
                              onClick={() => setRevokeConfirmId(key.id)}
                              className="p-1.5 rounded-passport text-passport-dim hover:text-passport-red hover:bg-passport-red/5 transition-all"
                              title="Revoke"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
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

      {/* Revoke confirmation dialog */}
      {revokeConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <GlassCard className="max-w-sm w-full" hover={false}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={18} className="text-passport-red" />
              <h3 className="text-lg font-semibold text-passport-text">Revoke Key</h3>
            </div>
            <p className="text-sm text-passport-muted mb-4">
              Are you sure you want to revoke this API key? Any integrations using it will stop working immediately.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setRevokeConfirmId(null)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={() => handleRevoke(revokeConfirmId)}
                className="btn-primary bg-passport-red hover:bg-passport-red/80 border-passport-red"
              >
                <Trash2 size={14} />
                Revoke
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  )
}
