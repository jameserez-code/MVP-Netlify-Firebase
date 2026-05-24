'use client'

import { useEffect, useState, useMemo } from 'react'
import useSWR from 'swr'
import { swrDashboardConfig } from '@/lib/swr-config'
import { listPolicies, createPolicy, deletePolicy, exportPoliciesJson, recordExport } from '@/lib/api'
import { unwrapApiResponse } from '@/lib/data-utils'
import GlassCard from '@/components/glass-card'
import EmptyState from '@/components/empty-state'
import ConfirmDialog from '@/components/confirm-dialog'
import { NoPolicies } from '@/components/empty-states/no-policies'
import { SuccessAnimation } from '@/components/success-animation'
import { SkeletonRow, PageLoader } from '@/components/loading'
import { useToast } from '@/components/toast'
import Link from 'next/link'
import {
  AlertTriangle,
  CheckCircle,
  FileText,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  X,
  XCircle,
  DollarSign,
  Globe,
  Lock,
  Unlock,
  Eye,
  ShieldCheck,
  LayoutGrid,
  Download,
  ChevronRight,
} from 'lucide-react'

interface Policy {
  id: string
  name: string
  rules?: Record<string, any>
  createdAt?: string
  updatedAt?: string
}

const TOOL_OPTIONS = [
  'read',
  'search',
  'write',
  'delete',
  'admin',
  'execute',
  'file_access',
  'network',
  'database',
]

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY']

interface FormState {
  name: string
  allowedTools: string[]
  deniedTools: string[]
  allowedDomains: string
  deniedDomains: string
  maxCost: string
  costCurrency: string
  piiDetection: boolean
  requireApproval: boolean
}

const DEFAULT_FORM: FormState = {
  name: '',
  allowedTools: [],
  deniedTools: [],
  allowedDomains: '',
  deniedDomains: '',
  maxCost: '',
  costCurrency: 'USD',
  piiDetection: false,
  requireApproval: false,
}

function highlightJson(json: string): React.ReactNode {
  const tokenPattern = /("(?:[^"\\]|\\.)*"\s*(?=:))|("(?:[^"\\]|\\.)*")|(\btrue\b|\bfalse\b)|(\bnull\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}[\]])|(:)/g
  const tokens: { text: string; className: string }[] = []
  let m
  let lastIdx = 0

  while ((m = tokenPattern.exec(json)) !== null) {
    if (m.index > lastIdx) {
      tokens.push({ text: json.slice(lastIdx, m.index), className: '' })
    }
    if (m[1]) tokens.push({ text: m[1], className: 'json-key' })
    else if (m[2]) tokens.push({ text: m[2], className: 'json-string' })
    else if (m[3]) tokens.push({ text: m[3], className: 'json-boolean' })
    else if (m[4]) tokens.push({ text: m[4], className: 'json-null' })
    else if (m[5]) tokens.push({ text: m[5], className: 'json-number' })
    else if (m[6]) tokens.push({ text: m[6], className: 'json-brace' })
    else if (m[7]) tokens.push({ text: m[7], className: 'text-passport-muted' })
    lastIdx = tokenPattern.lastIndex
  }
  if (lastIdx < json.length) {
    tokens.push({ text: json.slice(lastIdx), className: '' })
  }
  return (
    <>
      {tokens.map((t, i) => (
        <span key={i} className={t.className}>{t.text}</span>
      ))}
    </>
  )
}

function buildRules(form: FormState): Record<string, any> {
  const rules: Record<string, any> = {}
  if (form.allowedTools.length || form.deniedTools.length) {
    rules.tools = {}
    if (form.allowedTools.length) rules.tools.allow = form.allowedTools
    if (form.deniedTools.length) rules.tools.deny = form.deniedTools
  }
  const allowedDomains = form.allowedDomains.split('\n').map((d) => d.trim()).filter(Boolean)
  const deniedDomains = form.deniedDomains.split('\n').map((d) => d.trim()).filter(Boolean)
  if (allowedDomains.length || deniedDomains.length) {
    rules.domains = {}
    if (allowedDomains.length) rules.domains.allow = allowedDomains
    if (deniedDomains.length) rules.domains.deny = deniedDomains
  }
  if (form.maxCost) {
    rules.maxCost = parseFloat(form.maxCost)
    rules.costCurrency = form.costCurrency
  }
  if (form.piiDetection) rules.piiDetection = true
  if (form.requireApproval) rules.requireApproval = true
  return rules
}

export default function PoliciesPage() {
  const { addToast } = useToast()
  const { data, error, isLoading, mutate } = useSWR('/policies', listPolicies, swrDashboardConfig)
  const policies: Policy[] = unwrapApiResponse<Policy>(data)
  const loading = isLoading

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [showSuccess, setShowSuccess] = useState(false)
  const [wizardStep, setWizardStep] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const wizardSteps = [
    { label: 'Tools & Domains', description: 'Select allowed/denied tools and domains' },
    { label: 'Cost & Settings', description: 'Set budget limits and extra controls' },
  ]

  function loadPolicies() {
    mutate()
  }

  async function handleExportJson() {
    try {
      const blob = await exportPoliciesJson()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `policies-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      recordExport({ type: 'policies', format: 'json', status: 'completed' })
      addToast('Policies exported successfully', 'success')
    } catch (err: any) {
      addToast(err.message || 'Export failed', 'error')
    }
  }

  function validate(): boolean {
    const errors: Record<string, string> = {}
    if (!form.name.trim()) errors.name = 'Policy name is required'
    if (form.allowedTools.length === 0) errors.allowedTools = 'At least one tool must be allowed'
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const jsonPreview = useMemo(() => {
    return JSON.stringify(
      {
        name: form.name || '<name>',
        rules: buildRules(form),
      },
      null,
      2
    )
  }, [form])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      await createPolicy({ name: form.name, rules: buildRules(form) })
      addToast('Policy created successfully', 'success')
      setShowForm(false)
      setShowSuccess(true)
      setForm(DEFAULT_FORM)
      loadPolicies()
    } catch (err: any) {
      addToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const { id, name } = deleteTarget
    setDeleteTarget(null)
    setDeleting(true)
    try {
      await deletePolicy(id)
      addToast('Policy deleted', 'success')
      loadPolicies()
    } catch (err: any) {
      addToast(err.message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  function toggleTool(list: 'allowedTools' | 'deniedTools', tool: string) {
    setForm((prev) => {
      const arr = prev[list]
      const has = arr.includes(tool)
      return {
        ...prev,
        [list]: has ? arr.filter((t) => t !== tool) : [...arr, tool],
      }
    })
  }

  const toolCount = (p: Policy) => {
    const tools = p.rules?.tools
    let count = 0
    if (tools?.allow) count += Array.isArray(tools.allow) ? tools.allow.length : 1
    if (tools?.deny) count += Array.isArray(tools.deny) ? tools.deny.length : 1
    return count
  }

  const domainCount = (p: Policy) => {
    const domains = p.rules?.domains
    let count = 0
    if (domains?.allow) count += Array.isArray(domains.allow) ? domains.allow.length : 1
    if (domains?.deny) count += Array.isArray(domains.deny) ? domains.deny.length : 1
    return count
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
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/policies/templates" className="btn-secondary">
            <LayoutGrid size={14} />
            Browse Templates
          </Link>
          <button onClick={handleExportJson} className="btn-secondary">
            <Download size={14} />
            Export JSON
          </button>
          <button onClick={loadPolicies} className="btn-secondary" disabled={loading}>
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
          <span className="text-sm text-passport-red flex-1">{error}</span>
          <button onClick={loadPolicies} className="text-xs text-passport-red underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {/* Policy builder */}
      {showForm && (
        <div className="grid lg:grid-cols-2 gap-4">
          <GlassCard hover={false}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-passport-text">Create Policy</h2>
                <div className="flex items-center gap-2 mt-1.5">
                  {wizardSteps.map((step, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setWizardStep(i)}
                        className={`flex items-center gap-1.5 text-xs font-mono transition-colors ${
                          wizardStep === i ? 'text-passport-green' : 'text-passport-dim hover:text-passport-muted'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border transition-colors ${
                            wizardStep === i
                              ? 'border-passport-green bg-passport-green/10 text-passport-green'
                              : 'border-passport-border text-passport-dim'
                          }`}
                        >
                          {i + 1}
                        </span>
                        {step.label}
                      </button>
                      {i < wizardSteps.length - 1 && <span className="w-6 h-px bg-passport-border" />}
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="text-passport-dim hover:text-passport-text transition-colors p-1 rounded-passport hover:bg-passport-surface-2"
                aria-label="Close policy form"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label-text">Policy Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={`input-field ${validationErrors.name ? 'border-passport-red' : ''}`}
                  placeholder="e.g. Standard Agent"
                  autoComplete="off"
                  autoCapitalize="words"
                />
                {validationErrors.name && (
                  <p className="text-xs text-passport-red mt-1">{validationErrors.name}</p>
                )}
              </div>

                {wizardStep === 0 && (
                  <>
                    {/* Allowed Tools */}
              <div>
                <label className="label-text flex items-center gap-1.5">
                  <Unlock size={12} className="text-passport-green" />
                  Allowed Tools
                </label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {TOOL_OPTIONS.map((tool) => {
                    const active = form.allowedTools.includes(tool)
                    return (
                      <button
                        key={tool}
                        type="button"
                        onClick={() => toggleTool('allowedTools', tool)}
                        aria-pressed={active}
                        className={`px-2.5 py-1 rounded-passport text-xs font-mono transition-all border ${
                          active
                            ? 'bg-passport-green/10 text-passport-green border-passport-green/30'
                            : 'bg-passport-bg text-passport-muted border-passport-border hover:border-passport-border-2'
                        }`}
                      >
                        {active && <CheckCircle size={10} className="inline mr-1" />}
                        {tool}
                      </button>
                    )
                  })}
                </div>
                {validationErrors.allowedTools && (
                  <p className="text-xs text-passport-red mt-1">{validationErrors.allowedTools}</p>
                )}
              </div>

              {/* Denied Tools */}
              <div>
                <label className="label-text flex items-center gap-1.5">
                  <Lock size={12} className="text-passport-red" />
                  Denied Tools
                </label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {TOOL_OPTIONS.map((tool) => {
                    const active = form.deniedTools.includes(tool)
                    return (
                      <button
                        key={tool}
                        type="button"
                        onClick={() => toggleTool('deniedTools', tool)}
                        aria-pressed={active}
                        className={`px-2.5 py-1 rounded-passport text-xs font-mono transition-all border ${
                          active
                            ? 'bg-passport-red/10 text-passport-red border-passport-red/30'
                            : 'bg-passport-bg text-passport-muted border-passport-border hover:border-passport-border-2'
                        }`}
                      >
                        {active && <X size={10} className="inline mr-1" />}
                        {tool}
                      </button>
                    )
                  })}
                </div>
              </div>

                {/* Domains */}
                <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-text flex items-center gap-1.5">
                    <Globe size={12} className="text-passport-azure" />
                    Allowed Domains
                  </label>
                  <textarea
                    value={form.allowedDomains}
                    onChange={(e) => setForm({ ...form, allowedDomains: e.target.value })}
                    className="input-field min-h-[80px] resize-y text-xs"
                    placeholder="example.com\napi.example.com"
                  />
                </div>
                <div>
                  <label className="label-text flex items-center gap-1.5">
                    <Globe size={12} className="text-passport-red" />
                    Denied Domains
                  </label>
                  <textarea
                    value={form.deniedDomains}
                    onChange={(e) => setForm({ ...form, deniedDomains: e.target.value })}
                    className="input-field min-h-[80px] resize-y text-xs"
                    placeholder="evil.com\nbad.example"
                  />
                </div>
              </div>
                  </>
                )}

                {wizardStep === 1 && (
                  <>
              {/* Cost */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-text flex items-center gap-1.5">
                    <DollarSign size={12} className="text-passport-amber" />
                    Max Cost
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.maxCost}
                    onChange={(e) => setForm({ ...form, maxCost: e.target.value })}
                    className="input-field"
                    placeholder="5.00"
                  />
                </div>
                <div>
                  <label className="label-text">Currency</label>
                  <select
                    value={form.costCurrency}
                    onChange={(e) => setForm({ ...form, costCurrency: e.target.value })}
                    className="input-field font-mono text-xs"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={form.piiDetection}
                    onChange={(e) => setForm({ ...form, piiDetection: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 rounded-full bg-passport-surface-2 border border-passport-border peer-checked:bg-passport-green/20 peer-checked:border-passport-green/40 transition-all relative">
                    <div className="absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-passport-dim peer-checked:bg-passport-green transition-all peer-checked:translate-x-4" />
                  </div>
                  <span className="text-xs text-passport-muted group-hover:text-passport-text transition-colors flex items-center gap-1">
                    <Eye size={12} />
                    PII Detection
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={form.requireApproval}
                    onChange={(e) => setForm({ ...form, requireApproval: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 rounded-full bg-passport-surface-2 border border-passport-border peer-checked:bg-passport-green/20 peer-checked:border-passport-green/40 transition-all relative">
                    <div className="absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-passport-dim peer-checked:bg-passport-green transition-all peer-checked:translate-x-4" />
                  </div>
                  <span className="text-xs text-passport-muted group-hover:text-passport-text transition-colors flex items-center gap-1">
                    <ShieldCheck size={12} />
                    Require Approval
                  </span>
                </label>
              </div>
                  </>
                )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                {wizardStep > 0 && (
                  <button
                    type="button"
                    onClick={() => setWizardStep(wizardStep - 1)}
                    className="btn-secondary"
                  >
                    Back
                  </button>
                )}
                {wizardStep < wizardSteps.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep(wizardStep + 1)}
                    className="btn-primary"
                  >
                    Next
                    <ChevronRight size={14} />
                  </button>
                ) : (
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
                )}
              </div>
            </form>
          </GlassCard>

          {/* JSON Preview */}
          <GlassCard hover={false} className="flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={16} className="text-passport-azure" />
              <h2 className="text-sm font-semibold text-passport-text">JSON Preview</h2>
            </div>
            <pre className="flex-1 p-3 rounded-passport bg-passport-bg border border-passport-border font-mono text-[11px] leading-relaxed overflow-auto whitespace-pre-wrap">
              {highlightJson(jsonPreview)}
            </pre>
          </GlassCard>
        </div>
      )}

      {/* Policies list */}
      {loading && policies.length === 0 ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      ) : policies.length === 0 ? (
        <NoPolicies onCreate={() => setShowForm(true)} />
      ) : (
        <div className="grid gap-3">
          {policies.map((policy, i) => (
            <GlassCard key={policy.id} delay={i * 0.05}>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded-passport bg-passport-surface-2 shrink-0">
                    <FileText size={18} className="text-passport-azure" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-passport-text">{policy.name}</div>
                    <div className="font-mono text-[10px] text-passport-dim mt-0.5">
                      ID: {policy.id}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {toolCount(policy) > 0 && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded bg-passport-surface-2 text-passport-muted">
                          <Unlock size={10} />
                          {toolCount(policy)} tools
                        </span>
                      )}
                      {domainCount(policy) > 0 && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded bg-passport-surface-2 text-passport-muted">
                          <Globe size={10} />
                          {domainCount(policy)} domains
                        </span>
                      )}
                      {policy.rules?.maxCost != null && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded bg-passport-surface-2 text-passport-muted">
                          <DollarSign size={10} />
                          {policy.rules.maxCost} {policy.rules.costCurrency || 'USD'}
                        </span>
                      )}
                      {policy.rules?.piiDetection && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded bg-passport-amber/10 text-passport-amber">
                          <Eye size={10} />
                          PII
                        </span>
                      )}
                      {policy.rules?.requireApproval && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded bg-passport-green/10 text-passport-green">
                          <ShieldCheck size={10} />
                          Approval
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
                  {(policy.rules?.tools?.allow?.length || 0) > 0 && (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-1 rounded bg-passport-green/10 text-passport-green">
                      <CheckCircle size={10} />
                      {policy.rules?.tools?.allow?.length || 0} allow
                    </span>
                  )}
                  {(policy.rules?.tools?.deny?.length || 0) > 0 && (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-1 rounded bg-passport-red/10 text-passport-red">
                      <XCircle size={10} />
                      {policy.rules?.tools?.deny?.length || 0} deny
                    </span>
                  )}
                  <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-passport-green/10 text-passport-green">
                    Active
                  </span>
                  <button
                    onClick={() => setDeleteTarget({ id: policy.id, name: policy.name })}
                    className="p-2 rounded-passport text-passport-dim hover:text-passport-red hover:bg-passport-red/5 transition-all min-touch-target"
                    aria-label={`Delete policy ${policy.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Policy"
        description={deleteTarget ? `Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.` : ''}
        confirmLabel="Delete"
        loading={deleting}
      />

      {showSuccess && (
        <SuccessAnimation
          message="Policy created successfully"
          onDismiss={() => setShowSuccess(false)}
        />
      )}
    </div>
  )
}
