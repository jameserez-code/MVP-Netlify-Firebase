'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { swrDashboardConfig } from '@/lib/swr-config'
import { listApiKeys, createApiKey, deleteApiKey, rotateApiKey } from '@/lib/api'
import { unwrapApiResponse } from '@/lib/data-utils'
import GlassCard from '@/components/glass-card'
import EmptyState from '@/components/empty-state'
import ConfirmDialog from '@/components/confirm-dialog'
import CopyButton from '@/components/copy-button'
import { useToast } from '@/components/toast'
import {
  KeyRound,
  Plus,
  RefreshCw,
  Trash2,
  Clock,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Copy,
  Check,
  X,
  Eye,
  EyeOff,
  AlertOctagon,
} from 'lucide-react'

const SCOPES = [
  { value: 'read', label: 'Read' },
  { value: 'write', label: 'Write' },
  { value: 'enforce', label: 'Enforce' },
]

interface ApiKey {
  id: string
  name: string
  maskedKey: string
  key?: string
  createdAt?: string
  lastUsedAt?: string | null
  requestCount?: number
  scopes?: string[]
  status?: 'active' | 'revoked'
}

function formatDate(d?: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function ApiKeysPage() {
  const { addToast } = useToast()
  const {
    data: keysData,
    error: keysError,
    isLoading: keysLoading,
    mutate: mutateKeys,
  } = useSWR('/api-keys', listApiKeys, swrDashboardConfig)

  const keys: ApiKey[] = unwrapApiResponse<ApiKey>(keysData)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [keyForm, setKeyForm] = useState({ name: '', scopes: ['read', 'write'] as string[] })
  const [keySubmitting, setKeySubmitting] = useState(false)
  const [newKey, setNewKey] = useState<any>(null)
  const [showSecret, setShowSecret] = useState(false)
  const [copiedNewKey, setCopiedNewKey] = useState(false)

  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null)
  const [revoking, setRevoking] = useState(false)
  const [rotating, setRotating] = useState<string | null>(null)

  const toggleScope = useCallback((scope: string) => {
    setKeyForm((prev) => {
      const has = prev.scopes.includes(scope)
      return {
        ...prev,
        scopes: has ? prev.scopes.filter((s) => s !== scope) : [...prev.scopes, scope],
      }
    })
  }, [])

  async function handleCreateKey(e: React.FormEvent) {
    e.preventDefault()
    if (!keyForm.name.trim()) {
      addToast('Key name is required', 'error')
      return
    }
    if (keyForm.scopes.length === 0) {
      addToast('Select at least one scope', 'error')
      return
    }
    setKeySubmitting(true)
    try {
      const data = await createApiKey({ name: keyForm.name, scopes: keyForm.scopes })
      setNewKey(data)
      setShowCreateModal(false)
      setKeyForm({ name: '', scopes: ['read', 'write'] })
      addToast('API key created successfully', 'success')
      mutateKeys()
    } catch (err: any) {
      addToast(err.message || 'Failed to create key', 'error')
    } finally {
      setKeySubmitting(false)
    }
  }

  async function handleRevokeKey() {
    if (!revokeTarget) return
    setRevoking(true)
    try {
      await deleteApiKey(revokeTarget.id)
      addToast('API key revoked', 'success')
      setRevokeTarget(null)
      mutateKeys()
    } catch (err: any) {
      addToast(err.message || 'Failed to revoke key', 'error')
    } finally {
      setRevoking(false)
    }
  }

  async function handleRotateKey(id: string) {
    setRotating(id)
    try {
      const data = await rotateApiKey(id)
      setNewKey(data)
      addToast('API key rotated successfully', 'success')
      mutateKeys()
    } catch (err: any) {
      addToast(err.message || 'Failed to rotate key', 'error')
    } finally {
      setRotating(null)
    }
  }

  function copyNewSecret() {
    if (newKey?.key) {
      navigator.clipboard.writeText(newKey.key)
      setCopiedNewKey(true)
      addToast('Key copied to clipboard', 'success')
      setTimeout(() => setCopiedNewKey(false), 2000)
    }
  }

  function statusBadge(status?: string) {
    switch (status) {
      case 'active':
        return 'bg-passport-green/10 text-passport-green'
      case 'revoked':
        return 'bg-passport-red/10 text-passport-red'
      default:
        return 'bg-passport-green/10 text-passport-green'
    }
  }

  const activeKeys = keys.filter((k) => k.status !== 'revoked')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-passport-text">API Keys</h1>
          <p className="text-sm text-passport-muted mt-0.5">
            Manage API keys for SDK and service integrations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => mutateKeys()} className="btn-secondary" disabled={keysLoading}>
            <RefreshCw size={14} className={keysLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <Plus size={14} />
            Create New Key
          </button>
        </div>
      </div>

      <div className="p-3 rounded-passport border border-passport-amber/30 bg-passport-amber/5 flex items-center gap-2">
        <AlertOctagon size={16} className="text-passport-amber shrink-0" />
        <span className="text-sm text-passport-amber">Never share your API keys. Store them securely.</span>
      </div>

      {keysError && (
        <div className="p-3 rounded-passport border border-passport-red/30 bg-passport-red/5 flex items-center gap-2">
          <AlertTriangle size={16} className="text-passport-red" />
          <span className="text-sm text-passport-red flex-1">{(keysError as any)?.message || 'Failed to load keys'}</span>
          <button onClick={() => mutateKeys()} className="text-xs text-passport-red underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {newKey && (
        <div className="p-4 rounded-passport border border-passport-green/30 bg-passport-green/5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-passport-green" />
              <span className="font-semibold text-passport-text">
                {newKey.previousKeyId ? 'Key Rotated' : 'Key Created'}
              </span>
            </div>
            <button
              onClick={() => { setNewKey(null); setShowSecret(false) }}
              className="text-passport-dim hover:text-passport-text transition-colors p-1 rounded-passport hover:bg-passport-surface-2 min-touch-target"
              aria-label="Dismiss key display"
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
                  className="p-1.5 rounded-passport hover:bg-passport-surface-2 text-passport-muted hover:text-passport-text transition-colors shrink-0 min-touch-target"
                >
                  {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button
                  onClick={copyNewSecret}
                  className="p-1.5 rounded-passport hover:bg-passport-surface-2 text-passport-muted hover:text-passport-text transition-colors shrink-0 min-touch-target"
                >
                  {copiedNewKey ? <CheckCircle size={14} className="text-passport-green" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>
          <div className="mt-3 p-2 rounded-passport bg-passport-red/5 border border-passport-red/20 flex items-center gap-2">
            <AlertTriangle size={14} className="text-passport-red shrink-0" />
            <span className="text-xs text-passport-red font-medium">Store this securely. You won&apos;t see it again.</span>
          </div>
        </div>
      )}

      {keysLoading && keys.length === 0 ? (
        <GlassCard hover={false}>
          <div className="grid gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3 animate-pulse">
                <div className="w-8 h-8 rounded bg-passport-surface-2" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 rounded bg-passport-surface-2" />
                  <div className="h-2 w-48 rounded bg-passport-surface-2" />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      ) : keys.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No API keys yet"
          description="Create one to integrate with the SDK."
          action={
            <button onClick={() => setShowCreateModal(true)} className="btn-primary">
              <Plus size={14} />
              Create your first key
            </button>
          }
        />
      ) : (
        <GlassCard hover={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-passport-border">
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-passport-muted font-semibold">Name</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-passport-muted font-semibold">Masked Key</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-passport-muted font-semibold hidden md:table-cell">Created</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-passport-muted font-semibold hidden md:table-cell">Last Used</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-passport-muted font-semibold hidden lg:table-cell">Requests</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-passport-muted font-semibold">Status</th>
                  <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-passport-muted font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key.id} className="border-b border-passport-border/50 hover:bg-passport-surface/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-passport bg-passport-surface-2">
                          <KeyRound size={16} className={key.status === 'revoked' ? 'text-passport-red' : 'text-passport-green'} />
                        </div>
                        <div>
                          <div className="font-medium text-passport-text text-sm">{key.name || 'Unnamed'}</div>
                          <div className="font-mono text-[10px] text-passport-dim">{key.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-xs text-passport-muted">{key.maskedKey}</code>
                        {key.maskedKey && (
                          <div className="shrink-0">
                            <CopyButton text={key.maskedKey} label="Copy" size="sm" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="font-mono text-[10px] text-passport-dim">
                        {formatDate(key.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="font-mono text-[10px] text-passport-dim flex items-center gap-1">
                        <Clock size={10} />
                        {key.lastUsedAt ? formatDate(key.lastUsedAt) : 'Never'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="font-mono text-xs text-passport-muted flex items-center gap-1">
                        <BarChart3 size={10} />
                        {key.requestCount ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${statusBadge(key.status)}`}>
                        {key.status || 'active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {key.status !== 'revoked' && (
                          <>
                            <button
                              onClick={() => handleRotateKey(key.id)}
                              disabled={rotating === key.id}
                              className="p-1.5 rounded-passport text-passport-dim hover:text-passport-azure hover:bg-passport-azure/5 transition-all min-touch-target"
                              aria-label={`Rotate API key ${key.name}`}
                            >
                              <RefreshCw size={14} className={rotating === key.id ? 'animate-spin' : ''} />
                            </button>
                            <button
                              onClick={() => setRevokeTarget(key)}
                              className="p-1.5 rounded-passport text-passport-dim hover:text-passport-red hover:bg-passport-red/5 transition-all min-touch-target"
                              aria-label={`Revoke API key ${key.name}`}
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
        </GlassCard>
      )}

      {/* Create Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Create API Key">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} aria-hidden="true" />
          <div className="relative w-full max-w-md glass-panel p-6 border border-passport-border">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-passport-text">Create New API Key</h2>
                <p className="text-sm text-passport-muted mt-1">Generate a key for SDK or service integration</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-passport hover:bg-passport-surface-2 text-passport-dim hover:text-passport-text transition-colors -mr-1 -mt-1 shrink-0 ml-4 min-touch-target"
                aria-label="Close dialog"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateKey} className="space-y-4">
              <div>
                <label className="label-text">Key Name</label>
                <input
                  type="text"
                  value={keyForm.name}
                  onChange={(e) => setKeyForm({ ...keyForm, name: e.target.value })}
                  className="input-field"
                  placeholder="e.g. Production SDK"
                  autoComplete="off"
                  autoFocus
                />
              </div>

              <div>
                <label className="label-text">Scopes</label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {SCOPES.map((scope) => {
                    const active = keyForm.scopes.includes(scope.value)
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
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={keySubmitting} className="btn-primary disabled:opacity-50">
                  {keySubmitting ? (
                    <span className="w-4 h-4 border-2 border-passport-green/30 border-t-passport-green rounded-full animate-spin" />
                  ) : (
                    <KeyRound size={14} />
                  )}
                  Create Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revoke Confirmation */}
      <ConfirmDialog
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevokeKey}
        title="Revoke API Key"
        description={
          revokeTarget
            ? `Are you sure you want to revoke "${revokeTarget.name}"? Any integrations using this key will stop working immediately.`
            : ''
        }
        confirmLabel="Revoke"
        variant="danger"
        loading={revoking}
      />
    </div>
  )
}
