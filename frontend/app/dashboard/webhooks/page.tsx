'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { swrDashboardConfig } from '@/lib/swr-config'
import { listWebhooks, createWebhook, deleteWebhook, testWebhook, rotateWebhook, getWebhook } from '@/lib/api'
import GlassCard from '@/components/glass-card'
import EmptyState from '@/components/empty-state'
import ConfirmDialog from '@/components/confirm-dialog'
import { useToast } from '@/components/toast'
import {
  Webhook,
  Plus,
  RefreshCw,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  AlertTriangle,
  X,
  Clock,
  ChevronDown,
  ChevronRight,
  Check,
  RotateCw,
  Shield,
} from 'lucide-react'

const EVENT_TYPES = [
  { value: 'policy.violation', label: 'Policy Violation' },
  { value: 'agent.registered', label: 'Agent Registered' },
  { value: 'agent.revoked', label: 'Agent Revoked' },
  { value: 'run.failed', label: 'Run Failed' },
  { value: 'system.alert', label: 'System Alert' },
]

interface WebhookItem {
  id: string
  name: string
  url: string
  events: string[]
  active: boolean
  secret?: string
  createdAt?: string
  lastDeliveryAt?: string | null
  deliveries?: Delivery[]
}

interface Delivery {
  id: string
  status: 'success' | 'failed' | 'pending'
  timestamp: string
  responseCode?: number
  event?: string
}

function maskUrl(url: string): string {
  try {
    const u = new URL(url)
    return `${u.protocol}//${u.hostname}/***`
  } catch {
    if (url.length > 30) return url.slice(0, 30) + '...'
    return url
  }
}

function formatDate(d?: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateTime(d?: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function deliveryStatusIcon(status: string) {
  switch (status) {
    case 'success':
      return <CheckCircle size={14} className="text-passport-green" />
    case 'failed':
      return <XCircle size={14} className="text-passport-red" />
    default:
      return <Clock size={14} className="text-passport-amber" />
  }
}

export default function WebhooksPage() {
  const { addToast } = useToast()
  const {
    data: webhooksData,
    error: webhooksError,
    isLoading: webhooksLoading,
    mutate: mutateWebhooks,
  } = useSWR('/webhooks', listWebhooks, swrDashboardConfig)

  const webhooks: WebhookItem[] = Array.isArray(webhooksData)
    ? webhooksData
    : webhooksData?.data || []

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [form, setForm] = useState({
    name: '',
    url: '',
    events: ['policy.violation'] as string[],
    secret: '',
    active: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const [deleteTarget, setDeleteTarget] = useState<WebhookItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [rotating, setRotating] = useState<string | null>(null)
  const [newSecret, setNewSecret] = useState<{ id: string; secret: string } | null>(null)

  const [expandedDeliveries, setExpandedDeliveries] = useState<Record<string, boolean>>({})
  const [loadingDeliveries, setLoadingDeliveries] = useState<Record<string, boolean>>({})

  const toggleEvent = useCallback((event: string) => {
    setForm((prev) => {
      const has = prev.events.includes(event)
      return {
        ...prev,
        events: has ? prev.events.filter((e) => e !== event) : [...prev.events, event],
      }
    })
  }, [])

  function generateSecret() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = 'whsec_'
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setForm((prev) => ({ ...prev, secret: result }))
  }

  function validateForm() {
    const errors: Record<string, string> = {}
    if (!form.name.trim()) errors.name = 'Name is required'
    if (!form.url.trim()) errors.url = 'URL is required'
    else if (!/^https:\/\/.+/.test(form.url)) errors.url = 'URL must start with https://'
    if (form.events.length === 0) errors.events = 'Select at least one event'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!validateForm()) return
    setSubmitting(true)
    try {
      const data = await createWebhook({
        name: form.name,
        url: form.url,
        events: form.events,
        secret: form.secret || undefined,
        active: form.active,
      })
      if (data.secret) {
        setNewSecret({ id: data.id || data.webhookId, secret: data.secret })
      }
      setShowCreateModal(false)
      setForm({ name: '', url: '', events: ['policy.violation'], secret: '', active: true })
      addToast('Webhook created successfully', 'success')
      mutateWebhooks()
    } catch (err: any) {
      addToast(err.message || 'Failed to create webhook', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteWebhook(deleteTarget.id)
      addToast('Webhook deleted', 'success')
      setDeleteTarget(null)
      mutateWebhooks()
    } catch (err: any) {
      addToast(err.message || 'Failed to delete webhook', 'error')
    } finally {
      setDeleting(false)
    }
  }

  async function handleTest(id: string) {
    setTesting(id)
    try {
      await testWebhook(id)
      addToast('Test ping sent successfully', 'success')
    } catch (err: any) {
      addToast(err.message || 'Test failed', 'error')
    } finally {
      setTesting(null)
    }
  }

  async function handleRotate(id: string) {
    setRotating(id)
    try {
      const data = await rotateWebhook(id)
      if (data.newSecret || data.secret) {
        setNewSecret({ id, secret: data.newSecret || data.secret })
      }
      addToast('Webhook secret rotated', 'success')
      mutateWebhooks()
    } catch (err: any) {
      addToast(err.message || 'Failed to rotate secret', 'error')
    } finally {
      setRotating(null)
    }
  }

  async function toggleDeliveries(id: string) {
    const currently = !!expandedDeliveries[id]
    if (!currently) {
      setExpandedDeliveries((prev) => ({ ...prev, [id]: true }))
      setLoadingDeliveries((prev) => ({ ...prev, [id]: true }))
      try {
        await getWebhook(id)
        mutateWebhooks()
      } catch {}
      setLoadingDeliveries((prev) => ({ ...prev, [id]: false }))
    } else {
      setExpandedDeliveries((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    }
  }

  function getWebhookById(id: string): WebhookItem | undefined {
    return webhooks.find((w) => w.id === id)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-passport-text">Webhooks</h1>
          <p className="text-sm text-passport-muted mt-0.5">
            Receive real-time notifications for agent and policy events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => mutateWebhooks()} className="btn-secondary" disabled={webhooksLoading}>
            <RefreshCw size={14} className={webhooksLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <Plus size={14} />
            Create Webhook
          </button>
        </div>
      </div>

      {webhooksError && (
        <div className="p-3 rounded-passport border border-passport-red/30 bg-passport-red/5 flex items-center gap-2">
          <AlertTriangle size={16} className="text-passport-red" />
          <span className="text-sm text-passport-red flex-1">{(webhooksError as any)?.message || 'Failed to load webhooks'}</span>
          <button onClick={() => mutateWebhooks()} className="text-xs text-passport-red underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {newSecret && (
        <div className="p-4 rounded-passport border border-passport-green/30 bg-passport-green/5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-passport-green" />
              <span className="font-semibold text-passport-text">New Webhook Secret</span>
            </div>
            <button
              onClick={() => setNewSecret(null)}
              className="text-passport-dim hover:text-passport-text transition-colors p-1 rounded-passport hover:bg-passport-surface-2 min-touch-target"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
          <div className="mt-3 p-3 rounded-passport bg-passport-bg border border-passport-border">
            <div className="label-text mb-1 flex items-center justify-between">
              <span>Signing Secret</span>
              <span className="text-passport-amber text-[10px] uppercase tracking-wider">Save this</span>
            </div>
            <code className="font-mono text-sm text-passport-green break-all">{newSecret.secret}</code>
          </div>
          <div className="mt-3 p-2 rounded-passport bg-passport-amber/5 border border-passport-amber/20 flex items-center gap-2">
            <AlertTriangle size={14} className="text-passport-amber shrink-0" />
            <span className="text-xs text-passport-amber">Store this secret. You won&apos;t be able to see it again.</span>
          </div>
        </div>
      )}

      {webhooksLoading && webhooks.length === 0 ? (
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
      ) : webhooks.length === 0 ? (
        <EmptyState
          icon={Webhook}
          title="No webhooks yet"
          description="Create one to receive real-time notifications."
          action={
            <button onClick={() => setShowCreateModal(true)} className="btn-primary">
              <Plus size={14} />
              Create your first webhook
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {webhooks.map((webhook) => {
            const isExpanded = !!expandedDeliveries[webhook.id]
            return (
              <GlassCard key={webhook.id} hover={false}>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-passport ${webhook.active ? 'bg-passport-green/10' : 'bg-passport-surface-2'}`}>
                        <Webhook size={18} className={webhook.active ? 'text-passport-green' : 'text-passport-dim'} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-passport-text text-sm">{webhook.name}</h3>
                          <span className={`inline-flex items-center font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                            webhook.active
                              ? 'bg-passport-green/10 text-passport-green'
                              : 'bg-passport-red/10 text-passport-red'
                          }`}>
                            {webhook.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <code className="font-mono text-xs text-passport-muted block mt-0.5">
                          {maskUrl(webhook.url)}
                        </code>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 self-end sm:self-auto">
                      <button
                        onClick={() => handleTest(webhook.id)}
                        disabled={testing === webhook.id || !webhook.active}
                        className="p-1.5 rounded-passport text-passport-dim hover:text-passport-azure hover:bg-passport-azure/5 transition-all min-touch-target"
                        aria-label="Test webhook"
                      >
                        <Send size={14} className={testing === webhook.id ? 'animate-pulse' : ''} />
                      </button>
                      <button
                        onClick={() => handleRotate(webhook.id)}
                        disabled={rotating === webhook.id}
                        className="p-1.5 rounded-passport text-passport-dim hover:text-passport-amber hover:bg-passport-amber/5 transition-all min-touch-target"
                        aria-label="Rotate secret"
                      >
                        <RotateCw size={14} className={rotating === webhook.id ? 'animate-spin' : ''} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(webhook)}
                        className="p-1.5 rounded-passport text-passport-dim hover:text-passport-red hover:bg-passport-red/5 transition-all min-touch-target"
                        aria-label="Delete webhook"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {webhook.events?.map((event) => (
                      <span
                        key={event}
                        className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-passport-azure/10 text-passport-azure border border-passport-azure/20"
                      >
                        {event}
                      </span>
                    ))}
                  </div>

                  {webhook.lastDeliveryAt && (
                    <div className="flex items-center gap-1 text-[10px] font-mono text-passport-dim">
                      <Clock size={10} />
                      Last delivery: {formatDateTime(webhook.lastDeliveryAt)}
                    </div>
                  )}

                  <div className="border-t border-passport-border pt-2">
                    <button
                      onClick={() => toggleDeliveries(webhook.id)}
                      className="flex items-center gap-1.5 text-xs text-passport-muted hover:text-passport-text transition-colors"
                    >
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      Delivery Log
                      {loadingDeliveries[webhook.id] && (
                        <span className="w-3 h-3 border-2 border-passport-green/30 border-t-passport-green rounded-full animate-spin ml-1" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 space-y-1">
                        {webhook.deliveries && webhook.deliveries.length > 0 ? (
                          webhook.deliveries.map((d) => (
                            <div
                              key={d.id}
                              className="flex items-center justify-between px-3 py-2 rounded bg-passport-bg border border-passport-border/50"
                            >
                              <div className="flex items-center gap-2">
                                {deliveryStatusIcon(d.status)}
                                <span className="text-xs text-passport-muted font-mono">
                                  {d.event || 'ping'}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                {d.responseCode && (
                                  <span className={`text-[10px] font-mono ${
                                    d.responseCode < 400 ? 'text-passport-green' : 'text-passport-red'
                                  }`}>
                                    {d.responseCode}
                                  </span>
                                )}
                                <span className="text-[10px] font-mono text-passport-dim">
                                  {formatDateTime(d.timestamp)}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-passport-dim py-2 px-3">No deliveries recorded yet.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}

      {/* Create Webhook Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Create Webhook">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} aria-hidden="true" />
          <div className="relative w-full max-w-lg glass-panel p-6 border border-passport-border">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-passport-text">Create Webhook</h2>
                <p className="text-sm text-passport-muted mt-1">Configure an endpoint to receive event notifications</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-passport hover:bg-passport-surface-2 text-passport-dim hover:text-passport-text transition-colors -mr-1 -mt-1 shrink-0 ml-4 min-touch-target"
                aria-label="Close dialog"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="label-text">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => { setForm({ ...form, name: e.target.value }); setFormErrors((p) => ({ ...p, name: '' })) }}
                  className={`input-field ${formErrors.name ? 'border-passport-red' : ''}`}
                  placeholder="e.g. Slack Alerts"
                  autoComplete="off"
                  autoFocus
                />
                {formErrors.name && <p className="text-xs text-passport-red mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <label className="label-text">URL</label>
                <input
                  type="url"
                  value={form.url}
                  onChange={(e) => { setForm({ ...form, url: e.target.value }); setFormErrors((p) => ({ ...p, url: '' })) }}
                  className={`input-field ${formErrors.url ? 'border-passport-red' : ''}`}
                  placeholder="https://hooks.slack.com/services/..."
                  autoComplete="off"
                />
                {formErrors.url ? (
                  <p className="text-xs text-passport-red mt-1">{formErrors.url}</p>
                ) : (
                  <p className="text-[10px] text-passport-dim mt-1">Must use HTTPS</p>
                )}
              </div>

              <div>
                <label className="label-text">Events</label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {EVENT_TYPES.map((event) => {
                    const active = form.events.includes(event.value)
                    return (
                      <button
                        key={event.value}
                        type="button"
                        onClick={() => toggleEvent(event.value)}
                        className={`px-2.5 py-1 rounded-passport text-xs font-mono transition-all border ${
                          active
                            ? 'bg-passport-green/10 text-passport-green border-passport-green/30'
                            : 'bg-passport-bg text-passport-muted border-passport-border hover:border-passport-border-2'
                        }`}
                      >
                        {active && <CheckCircle size={10} className="inline mr-1" />}
                        {event.label}
                      </button>
                    )
                  })}
                </div>
                {formErrors.events && <p className="text-xs text-passport-red mt-1">{formErrors.events}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label-text mb-0">Signing Secret</label>
                  <button
                    type="button"
                    onClick={generateSecret}
                    className="text-[10px] font-mono text-passport-azure hover:underline"
                  >
                    Auto-generate
                  </button>
                </div>
                <input
                  type="text"
                  value={form.secret}
                  onChange={(e) => setForm({ ...form, secret: e.target.value })}
                  className="input-field font-mono text-sm"
                  placeholder="whsec_... or leave blank to auto-generate"
                  autoComplete="off"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
                  {submitting ? (
                    <span className="w-4 h-4 border-2 border-passport-green/30 border-t-passport-green rounded-full animate-spin" />
                  ) : (
                    <Webhook size={14} />
                  )}
                  Create Webhook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Webhook"
        description={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}"? It will stop receiving events.`
            : ''
        }
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}
