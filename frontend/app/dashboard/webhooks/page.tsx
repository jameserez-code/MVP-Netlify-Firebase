'use client'

import { useEffect, useState } from 'react'
import {
  listWebhooks,
  getWebhook,
  createWebhook,
  deleteWebhook,
  testWebhook,
  rotateWebhook,
} from '@/lib/api'
import GlassCard from '@/components/glass-card'
import EmptyState from '@/components/empty-state'
import { SkeletonRow, PageLoader, Spinner } from '@/components/loading'
import { useToast } from '@/components/toast'
import {
  AlertTriangle,
  CheckCircle,
  Copy,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Trash2,
  X,
  Webhook,
  Send,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Globe,
} from 'lucide-react'

const ALLOWED_EVENTS = [
  'policy.violation',
  'agent.revoked',
  'run.failed',
  'system.alert',
  'agent.registered',
]

interface Webhook {
  id: string
  name: string
  url: string
  events: string[]
  active: boolean
  createdAt: string
  lastDeliveredAt?: string | null
  failureCount?: number
}

interface Delivery {
  id: string
  event: string
  deliveredAt: string
  success: boolean
  responseStatus?: number | null
  attempt: number
  error?: string | null
  payload?: Record<string, unknown>
}

export default function WebhooksPage() {
  const { addToast } = useToast()
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    events: [] as string[],
    secret: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [newWebhook, setNewWebhook] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [details, setDetails] = useState<any>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [expandedPayload, setExpandedPayload] = useState<string | null>(null)

  async function loadWebhooks() {
    setLoading(true)
    setError('')
    try {
      const data = await listWebhooks()
      const list = Array.isArray(data) ? data : data.data || []
      setWebhooks(list)
    } catch (err: any) {
      setError(err.message)
      addToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWebhooks()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const data = await createWebhook({
        name: formData.name,
        url: formData.url,
        events: formData.events,
        secret: formData.secret || undefined,
      })
      setNewWebhook(data)
      setShowForm(false)
      setFormData({ name: '', url: '', events: [], secret: '' })
      addToast('Webhook created successfully', 'success')
      loadWebhooks()
    } catch (err: any) {
      setError(err.message)
      addToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  function copySecret() {
    if (newWebhook?.secret) {
      navigator.clipboard.writeText(newWebhook.secret)
      setCopied(true)
      addToast('Secret copied to clipboard', 'success')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Deactivate this webhook?')) return
    try {
      await deleteWebhook(id)
      addToast('Webhook deactivated', 'success')
      loadWebhooks()
      if (viewingId === id) setViewingId(null)
    } catch (err: any) {
      addToast(err.message, 'error')
    }
  }

  async function handleTest(id: string) {
    try {
      const res = await testWebhook(id)
      addToast(res.message || 'Test sent', 'success')
      if (viewingId === id) loadDetails(id)
    } catch (err: any) {
      addToast(err.message, 'error')
    }
  }

  async function handleRotate(id: string) {
    if (!confirm('Rotate the secret for this webhook?')) return
    try {
      const data = await rotateWebhook(id)
      setNewWebhook(data)
      addToast('Secret rotated', 'success')
      loadWebhooks()
    } catch (err: any) {
      addToast(err.message, 'error')
    }
  }

  async function loadDetails(id: string) {
    setDetailsLoading(true)
    try {
      const data = await getWebhook(id)
      setDetails(data)
    } catch (err: any) {
      addToast(err.message, 'error')
    } finally {
      setDetailsLoading(false)
    }
  }

  function toggleEvent(event: string) {
    setFormData((prev) => {
      const has = prev.events.includes(event)
      return { ...prev, events: has ? prev.events.filter((e) => e !== event) : [...prev.events, event] }
    })
  }

  function toggleView(id: string) {
    if (viewingId === id) {
      setViewingId(null)
      setDetails(null)
      return
    }
    setViewingId(id)
    loadDetails(id)
  }

  async function testUrl() {
    if (!formData.url) return
    try {
      await fetch(formData.url, { method: 'HEAD', mode: 'no-cors' })
      addToast('URL appears reachable', 'success')
    } catch {
      addToast('URL may be unreachable', 'warning')
    }
  }

  const statusBadge = (active?: boolean) =>
    active
      ? 'bg-passport-green/10 text-passport-green'
      : 'bg-passport-red/10 text-passport-red'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-passport-text">Webhooks</h1>
          <p className="text-sm text-passport-muted mt-0.5">
            Manage event notifications for your organization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadWebhooks} className="btn-secondary" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus size={14} />
            Create Webhook
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-passport border border-passport-red/30 bg-passport-red/5 flex items-center gap-2">
          <AlertTriangle size={16} className="text-passport-red" />
          <span className="text-sm text-passport-red flex-1">{error}</span>
          <button onClick={loadWebhooks} className="text-xs text-passport-red underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {/* New webhook secret display */}
      {newWebhook && (
        <GlassCard className="border-passport-green/30 bg-passport-green/5" hover={false}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-passport-green" />
              <span className="font-semibold text-passport-text">Webhook Created</span>
            </div>
            <button
              onClick={() => setNewWebhook(null)}
              className="text-passport-dim hover:text-passport-text transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <div className="mt-4 space-y-3">
            <div className="p-3 rounded-passport bg-passport-bg border border-passport-border">
              <div className="label-text mb-1">Webhook ID</div>
              <code className="font-mono text-sm text-passport-text break-all">{newWebhook.id}</code>
            </div>
            <div className="p-3 rounded-passport bg-passport-bg border border-passport-border">
              <div className="label-text mb-1 flex items-center justify-between">
                <span>Secret</span>
                <span className="text-passport-amber text-[10px] uppercase tracking-wider">Shown once</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-sm text-passport-green break-all">
                  {showSecret ? newWebhook.secret : '•'.repeat(Math.min(newWebhook.secret?.length || 32, 32))}
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
          <div className="mt-3 p-2 rounded-passport bg-passport-amber/5 border border-passport-amber/20 flex items-center gap-2">
            <AlertTriangle size={14} className="text-passport-amber shrink-0" />
            <span className="text-xs text-passport-amber">This secret will only be shown once. Store it securely.</span>
          </div>
        </GlassCard>
      )}

      {/* Create form */}
      {showForm && (
        <GlassCard hover={false}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-passport-text">Create Webhook</h2>
            <button
              onClick={() => setShowForm(false)}
              className="text-passport-dim hover:text-passport-text transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-text">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                placeholder="e.g. Slack Notifications"
                required
              />
            </div>
            <div>
              <label className="label-text">URL</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="input-field"
                  placeholder="https://hooks.slack.com/services/..."
                  required
                />
                <button type="button" onClick={testUrl} className="btn-secondary whitespace-nowrap">
                  <Globe size={14} />
                  Test URL
                </button>
              </div>
            </div>
            <div>
              <label className="label-text">Events</label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {ALLOWED_EVENTS.map((ev) => {
                  const active = formData.events.includes(ev)
                  return (
                    <button
                      key={ev}
                      type="button"
                      onClick={() => toggleEvent(ev)}
                      className={`px-2.5 py-1 rounded-passport text-xs font-mono transition-all border ${
                        active
                          ? 'bg-passport-green/10 text-passport-green border-passport-green/30'
                          : 'bg-passport-bg text-passport-muted border-passport-border hover:border-passport-border-2'
                      }`}
                    >
                      {active && <CheckCircle size={10} className="inline mr-1" />}
                      {ev}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label className="label-text">Secret (optional)</label>
              <input
                type="text"
                value={formData.secret}
                onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                className="input-field"
                placeholder="Leave empty to auto-generate"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
                {submitting ? (
                  <Spinner size={16} className="text-passport-green" />
                ) : (
                  <Webhook size={14} />
                )}
                Create Webhook
              </button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* List */}
      {loading && webhooks.length === 0 ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : webhooks.length === 0 ? (
        <EmptyState
          icon={Webhook}
          title="No webhooks configured"
          description="Create a webhook to receive real-time event notifications"
          action={
            <button onClick={() => setShowForm(true)} className="btn-primary">
              <Plus size={14} />
              Create your first webhook
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <GlassCard key={wh.id} hover={false}>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded-passport bg-passport-surface-2 shrink-0">
                    <Webhook size={18} className={wh.active ? 'text-passport-azure' : 'text-passport-dim'} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-passport-text">{wh.name}</div>
                    <div className="font-mono text-[10px] text-passport-dim mt-0.5">{wh.url}</div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {wh.events.map((ev) => (
                        <span
                          key={ev}
                          className="font-mono text-[10px] px-2 py-0.5 rounded bg-passport-surface-2 text-passport-muted"
                        >
                          {ev}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
                  <span
                    className={`inline-flex items-center font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded ${statusBadge(wh.active)}`}
                  >
                    {wh.active ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => handleTest(wh.id)}
                    className="p-2 rounded-passport text-passport-dim hover:text-passport-green hover:bg-passport-green/5 transition-all"
                    title="Test"
                  >
                    <Send size={14} />
                  </button>
                  <button
                    onClick={() => handleRotate(wh.id)}
                    className="p-2 rounded-passport text-passport-dim hover:text-passport-azure hover:bg-passport-azure/5 transition-all"
                    title="Rotate Secret"
                  >
                    <RotateCcw size={14} />
                  </button>
                  <button
                    onClick={() => toggleView(wh.id)}
                    className="p-2 rounded-passport text-passport-dim hover:text-passport-text hover:bg-passport-surface-2 transition-all"
                    title="View Logs"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(wh.id)}
                    className="p-2 rounded-passport text-passport-dim hover:text-passport-red hover:bg-passport-red/5 transition-all"
                    title="Deactivate"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Delivery log */}
              {viewingId === wh.id && (
                <div className="mt-4 border-t border-passport-border pt-4">
                  <h3 className="text-sm font-semibold text-passport-text mb-3">Delivery Log</h3>
                  {detailsLoading ? (
                    <PageLoader />
                  ) : !details?.deliveries || details.deliveries.length === 0 ? (
                    <p className="text-sm text-passport-muted">No deliveries yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-passport-border">
                            <th className="px-3 py-2 font-mono text-[10px] uppercase text-passport-muted">Event</th>
                            <th className="px-3 py-2 font-mono text-[10px] uppercase text-passport-muted">Time</th>
                            <th className="px-3 py-2 font-mono text-[10px] uppercase text-passport-muted">Status</th>
                            <th className="px-3 py-2 font-mono text-[10px] uppercase text-passport-muted">HTTP</th>
                            <th className="px-3 py-2 font-mono text-[10px] uppercase text-passport-muted">Attempts</th>
                            <th className="px-3 py-2 font-mono text-[10px] uppercase text-passport-muted"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {details.deliveries.map((d: Delivery) => (
                            <tr key={d.id} className="border-b border-passport-border/50">
                              <td className="px-3 py-2 font-mono text-xs text-passport-text">{d.event}</td>
                              <td className="px-3 py-2 font-mono text-[10px] text-passport-dim">
                                {d.deliveredAt ? new Date(d.deliveredAt).toLocaleString() : '—'}
                              </td>
                              <td className="px-3 py-2">
                                {d.success ? (
                                  <CheckCircle size={14} className="text-passport-green" />
                                ) : (
                                  <X size={14} className="text-passport-red" />
                                )}
                              </td>
                              <td className="px-3 py-2 font-mono text-xs text-passport-muted">
                                {d.responseStatus ?? '—'}
                              </td>
                              <td className="px-3 py-2 font-mono text-xs text-passport-muted">{d.attempt}</td>
                              <td className="px-3 py-2">
                                <button
                                  onClick={() =>
                                    setExpandedPayload(expandedPayload === d.id ? null : d.id)
                                  }
                                  className="text-passport-dim hover:text-passport-text"
                                >
                                  {expandedPayload === d.id ? (
                                    <ChevronUp size={14} />
                                  ) : (
                                    <ChevronDown size={14} />
                                  )}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {details.deliveries.map(
                        (d: Delivery) =>
                          expandedPayload === d.id && (
                            <div
                              key={`payload-${d.id}`}
                              className="mt-2 p-3 rounded-passport bg-passport-bg border border-passport-border"
                            >
                              <pre className="font-mono text-[11px] text-passport-muted overflow-auto">
                                {JSON.stringify(d.payload, null, 2)}
                              </pre>
                              {!d.success && (
                                <button
                                  onClick={() => handleTest(wh.id)}
                                  className="mt-2 btn-secondary text-xs"
                                >
                                  <Send size={12} />
                                  Retry
                                </button>
                              )}
                            </div>
                          ),
                      )}
                    </div>
                  )}
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  )
}
