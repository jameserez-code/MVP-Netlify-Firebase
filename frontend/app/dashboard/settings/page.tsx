'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { swrDashboardConfig } from '@/lib/swr-config'
import {
  getNotificationSettings,
  updateNotificationSettings,
  sendTestEmail,
  listApiKeys,
  createApiKey,
  deleteApiKey,
  rotateApiKey,
} from '@/lib/api'
import GlassCard from '@/components/glass-card'
import EmptyState from '@/components/empty-state'
import { SkeletonRow, PageLoader } from '@/components/loading'
import { useToast } from '@/components/toast'
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Plus,
  RefreshCw,
  Send,
  Settings as SettingsIcon,
  Shield,
  Trash2,
  X,
  AlertOctagon,
  Clock,
  BarChart3,
} from 'lucide-react'

interface NotificationSettings {
  email: {
    policyViolations: boolean
    agentRevocations: boolean
    systemAlerts: boolean
    weeklyDigest: boolean
  }
  webhookEnabled: boolean
}

const DEFAULT_SETTINGS: NotificationSettings = {
  email: {
    policyViolations: true,
    agentRevocations: true,
    systemAlerts: true,
    weeklyDigest: false,
  },
  webhookEnabled: true,
}

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

export default function SettingsPage() {
  const { addToast } = useToast()

  // Notification settings
  const {
    data: notifData,
    error: notifError,
    isLoading: notifLoading,
    mutate: mutateNotif,
  } = useSWR('/notifications/settings', getNotificationSettings, swrDashboardConfig)

  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS)
  const [savingNotif, setSavingNotif] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)

  useEffect(() => {
    if (notifData && !notifError) {
      setSettings({
        email: { ...DEFAULT_SETTINGS.email, ...(notifData.email || {}) },
        webhookEnabled: typeof notifData.webhookEnabled === 'boolean' ? notifData.webhookEnabled : DEFAULT_SETTINGS.webhookEnabled,
      })
    }
  }, [notifData, notifError])

  async function handleToggleEmail(key: keyof NotificationSettings['email']) {
    const next = {
      ...settings,
      email: { ...settings.email, [key]: !settings.email[key] },
    }
    setSettings(next)
    setSavingNotif(true)
    try {
      await updateNotificationSettings(next)
      addToast('Notification preferences saved', 'success')
      mutateNotif()
    } catch (err: any) {
      addToast(err.message, 'error')
      // Revert
      setSettings(settings)
    } finally {
      setSavingNotif(false)
    }
  }

  async function handleToggleWebhook() {
    const next = { ...settings, webhookEnabled: !settings.webhookEnabled }
    setSettings(next)
    setSavingNotif(true)
    try {
      await updateNotificationSettings(next)
      addToast('Notification preferences saved', 'success')
      mutateNotif()
    } catch (err: any) {
      addToast(err.message, 'error')
      setSettings(settings)
    } finally {
      setSavingNotif(false)
    }
  }

  async function handleTestEmail() {
    setSendingTest(true)
    try {
      await sendTestEmail()
      addToast('Test email sent. Check your inbox.', 'success')
    } catch (err: any) {
      addToast(err.message || 'Failed to send test email', 'error')
    } finally {
      setSendingTest(false)
    }
  }

  // API Keys (duplicated from /dashboard/api-keys for convenience)
  const {
    data: keysData,
    error: keysError,
    isLoading: keysLoading,
    mutate: mutateKeys,
  } = useSWR('/api-keys', listApiKeys, swrDashboardConfig)

  const keys: ApiKey[] = Array.isArray(keysData) ? keysData : keysData?.data || []

  const [showKeyForm, setShowKeyForm] = useState(false)
  const [keyForm, setKeyForm] = useState({ name: '', scopes: ['read', 'write'] as string[] })
  const [keySubmitting, setKeySubmitting] = useState(false)
  const [newKey, setNewKey] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null)

  async function handleCreateKey(e: React.FormEvent) {
    e.preventDefault()
    setKeySubmitting(true)
    try {
      const data = await createApiKey({ name: keyForm.name, scopes: keyForm.scopes })
      setNewKey(data)
      setShowKeyForm(false)
      setKeyForm({ name: '', scopes: ['read', 'write'] })
      addToast('API key created successfully', 'success')
      mutateKeys()
    } catch (err: any) {
      addToast(err.message, 'error')
    } finally {
      setKeySubmitting(false)
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

  async function handleRevokeKey(id: string) {
    setRevokeConfirmId(null)
    try {
      await deleteApiKey(id)
      addToast('API key revoked', 'success')
      mutateKeys()
    } catch (err: any) {
      addToast(err.message, 'error')
    }
  }

  async function handleRotateKey(id: string) {
    if (!confirm('Rotate this key? The old key will be revoked immediately.')) return
    try {
      const data = await rotateApiKey(id)
      setNewKey(data)
      addToast('API key rotated', 'success')
      mutateKeys()
    } catch (err: any) {
      addToast(err.message, 'error')
    }
  }

  function toggleScope(scope: string) {
    setKeyForm((prev) => {
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

  if (notifLoading && !notifData) {
    return <PageLoader />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-passport-text">Settings</h1>
          <p className="text-sm text-passport-muted mt-0.5">
            Manage notifications, API keys, and organization settings
          </p>
        </div>
      </div>

      {/* Notifications */}
      <GlassCard hover={false}>
        <div className="flex items-center gap-2 mb-4">
          <Bell size={18} className="text-passport-green" />
          <h2 className="text-lg font-semibold text-passport-text">Notifications</h2>
        </div>

        {notifError && (
          <div className="p-3 rounded-passport border border-passport-red/30 bg-passport-red/5 flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-passport-red" />
            <span className="text-sm text-passport-red flex-1">{notifError.message || 'Failed to load settings'}</span>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-3">
            <p className="text-sm font-medium text-passport-text flex items-center gap-2">
              <Mail size={14} className="text-passport-dim" />
              Email Notifications
            </p>

            {[
              { key: 'policyViolations' as const, label: 'Policy Violations', desc: 'When an agent is blocked by a policy' },
              { key: 'agentRevocations' as const, label: 'Agent Revocations', desc: 'When an agent access is revoked' },
              { key: 'systemAlerts' as const, label: 'System Alerts', desc: 'When a health check fails' },
              { key: 'weeklyDigest' as const, label: 'Weekly Digest', desc: 'Daily summary of violations and activity' },
            ].map((item) => (
              <label key={item.key} className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={settings.email[item.key]}
                  onChange={() => handleToggleEmail(item.key)}
                  className="sr-only peer"
                />
                <div className="mt-0.5 w-9 h-5 rounded-full bg-passport-surface-2 border border-passport-border peer-checked:bg-passport-green/20 peer-checked:border-passport-green/40 transition-all relative shrink-0">
                  <div className="absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-passport-dim peer-checked:bg-passport-green transition-all peer-checked:translate-x-4" />
                </div>
                <div>
                  <div className="text-sm text-passport-text group-hover:text-passport-text transition-colors">
                    {item.label}
                  </div>
                  <div className="text-xs text-passport-muted">{item.desc}</div>
                </div>
              </label>
            ))}
          </div>

          <div className="border-t border-passport-border pt-4">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={settings.webhookEnabled}
                onChange={handleToggleWebhook}
                className="sr-only peer"
              />
              <div className="mt-0.5 w-9 h-5 rounded-full bg-passport-surface-2 border border-passport-border peer-checked:bg-passport-green/20 peer-checked:border-passport-green/40 transition-all relative shrink-0">
                <div className="absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-passport-dim peer-checked:bg-passport-green transition-all peer-checked:translate-x-4" />
              </div>
              <div>
                <div className="text-sm text-passport-text group-hover:text-passport-text transition-colors">
                  Webhook Events
                </div>
                <div className="text-xs text-passport-muted">Deliver events to configured webhook URLs</div>
              </div>
            </label>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleTestEmail}
              disabled={sendingTest || savingNotif}
              className="btn-secondary disabled:opacity-50"
            >
              {sendingTest ? (
                <span className="w-4 h-4 border-2 border-passport-green/30 border-t-passport-green rounded-full animate-spin" />
              ) : (
                <Send size={14} />
              )}
              Send Test Email
            </button>
            {savingNotif && (
              <span className="text-xs text-passport-muted flex items-center gap-1">
                <RefreshCw size={12} className="animate-spin" />
                Saving...
              </span>
            )}
          </div>
        </div>
      </GlassCard>

      {/* API Keys */}
      <GlassCard hover={false}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-passport-azure" />
            <h2 className="text-lg font-semibold text-passport-text">API Keys</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => mutateKeys()} className="btn-secondary" disabled={keysLoading}>
              <RefreshCw size={14} className={keysLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button onClick={() => setShowKeyForm(true)} className="btn-primary">
              <Plus size={14} />
              Create Key
            </button>
          </div>
        </div>

        <div className="p-3 rounded-passport border border-passport-amber/30 bg-passport-amber/5 flex items-center gap-2 mb-4">
          <AlertOctagon size={16} className="text-passport-amber shrink-0" />
          <span className="text-sm text-passport-amber">Never share your API keys. Store them securely.</span>
        </div>

        {keysError && (
          <div className="p-3 rounded-passport border border-passport-red/30 bg-passport-red/5 flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-passport-red" />
            <span className="text-sm text-passport-red flex-1">{keysError.message}</span>
            <button onClick={() => mutateKeys()} className="text-xs text-passport-red underline hover:no-underline">
              Retry
            </button>
          </div>
        )}

        {/* New key display */}
        {newKey && (
          <div className="mb-4 p-4 rounded-passport border border-passport-green/30 bg-passport-green/5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-passport-green" />
                <span className="font-semibold text-passport-text">
                  {newKey.previousKeyId ? 'Key Rotated' : 'Key Created'}
                </span>
              </div>
              <button
                onClick={() => setNewKey(null)}
                className="text-passport-dim hover:text-passport-text transition-colors p-1 rounded-passport hover:bg-passport-surface-2"
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
                    onClick={copySecret}
                    className="p-1.5 rounded-passport hover:bg-passport-surface-2 text-passport-muted hover:text-passport-text transition-colors shrink-0 min-touch-target"
                  >
                    {copied ? <CheckCircle size={14} className="text-passport-green" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-3 p-2 rounded-passport bg-passport-amber/5 border border-passport-amber/20 flex items-center gap-2">
              <AlertTriangle size={14} className="text-passport-amber shrink-0" />
              <span className="text-xs text-passport-amber">This key will only be shown once. Store it securely.</span>
            </div>
          </div>
        )}

        {/* Create form */}
        {showKeyForm && (
          <form onSubmit={handleCreateKey} className="mb-4 space-y-4 p-4 rounded-passport border border-passport-border bg-passport-surface/50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-passport-text">Create New API Key</h3>
              <button
                type="button"
                onClick={() => setShowKeyForm(false)}
                className="text-passport-dim hover:text-passport-text transition-colors p-1 rounded-passport hover:bg-passport-surface-2"
              >
                <X size={16} />
              </button>
            </div>
            <div>
              <label className="label-text">Key Name</label>
              <input
                type="text"
                value={keyForm.name}
                onChange={(e) => setKeyForm({ ...keyForm, name: e.target.value })}
                className="input-field"
                placeholder="e.g. Production SDK"
                autoComplete="off"
                required
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
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowKeyForm(false)} className="btn-secondary">
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
        )}

        {/* Keys list */}
        {keysLoading && keys.length === 0 ? (
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
              <button onClick={() => setShowKeyForm(true)} className="btn-primary">
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
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-passport-muted font-semibold">Key</th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-passport-muted font-semibold hidden sm:table-cell">Masked</th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-passport-muted font-semibold hidden md:table-cell">Created</th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-passport-muted font-semibold hidden md:table-cell">Last Used</th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-passport-muted font-semibold hidden lg:table-cell">Requests</th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-passport-muted font-semibold hidden sm:table-cell">Status</th>
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
                                onClick={() => handleRotateKey(key.id)}
                                className="p-1.5 rounded-passport text-passport-dim hover:text-passport-azure hover:bg-passport-azure/5 transition-all min-touch-target"
                                aria-label={`Rotate API key ${key.name}`}
                              >
                                <RefreshCw size={14} />
                              </button>
                              <button
                                onClick={() => setRevokeConfirmId(key.id)}
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
          </div>
        )}
      </GlassCard>

      {/* Danger Zone */}
      <GlassCard hover={false} className="border-passport-red/20">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={18} className="text-passport-red" />
          <h2 className="text-lg font-semibold text-passport-text">Danger Zone</h2>
        </div>
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-passport border border-passport-border bg-passport-surface/50">
            <div>
              <div className="text-sm font-medium text-passport-text">Revoke All Agents</div>
              <div className="text-xs text-passport-muted">Immediately revoke access for all agents in this organization.</div>
            </div>
            <button
              onClick={() => {
                if (confirm('Are you sure? This will revoke ALL agents immediately.')) {
                  addToast('This action is not yet implemented.', 'warning')
                }
              }}
              className="btn-primary bg-passport-red hover:bg-passport-red/80 border-passport-red shrink-0"
            >
              <Shield size={14} />
              Revoke All
            </button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-passport border border-passport-border bg-passport-surface/50">
            <div>
              <div className="text-sm font-medium text-passport-text">Delete Organization</div>
              <div className="text-xs text-passport-muted">Permanently delete this organization and all associated data.</div>
            </div>
            <button
              onClick={() => {
                if (confirm('This will permanently delete your organization. This cannot be undone.')) {
                  addToast('This action is not yet implemented.', 'warning')
                }
              }}
              className="btn-primary bg-passport-red hover:bg-passport-red/80 border-passport-red shrink-0"
            >
              <Trash2 size={14} />
              Delete Org
            </button>
          </div>
        </div>
      </GlassCard>

      {/* Revoke confirmation dialog */}
      {revokeConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <GlassCard className="max-w-sm w-full" hover={false}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={18} className="text-passport-red" aria-hidden="true" />
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
                onClick={() => handleRevokeKey(revokeConfirmId)}
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
