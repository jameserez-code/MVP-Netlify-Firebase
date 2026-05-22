'use client'

import { useEffect, useRef } from 'react'
import {
  X,
  CheckCircle,
  Lock,
  Globe,
  Eye,
  DollarSign,
  Shield,
  ArrowRight,
  FileEdit,
} from 'lucide-react'
import { useFocusTrap } from '@/lib/use-focus-trap'

export interface TemplatePolicy {
  name: string
  allowedTools: string[]
  deniedTools: string[]
  allowedDomains?: string[]
  deniedDomains?: string[]
  piiDetection: boolean
  maxCost: number
}

export interface PolicyTemplate {
  id: string
  name: string
  description: string
  category: string
  policies: TemplatePolicy[]
}

interface PolicyTemplatePreviewProps {
  template: PolicyTemplate | null
  onClose: () => void
  onImport: (template: PolicyTemplate) => void
  onCustomize: (template: PolicyTemplate) => void
}

export default function PolicyTemplatePreview({
  template,
  onClose,
  onImport,
  onCustomize,
}: PolicyTemplatePreviewProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useFocusTrap(!!template)

  useEffect(() => {
    if (!template) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [template, onClose])

  if (!template) return null

  const policy = template.policies[0] || {
    allowedTools: [],
    deniedTools: [],
    allowedDomains: [],
    deniedDomains: [],
    piiDetection: false,
    maxCost: 0,
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${template.name}`}
    >
      <div
        ref={contentRef}
        className="glass-panel w-full max-w-lg max-h-[85vh] overflow-y-auto animate-slide-up"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-passport-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-passport-azure/10 text-passport-azure border border-passport-azure/20">
                {template.category.replace(/-/g, ' ')}
              </span>
            </div>
            <h2 className="text-lg font-semibold text-passport-text">{template.name}</h2>
            <p className="text-sm text-passport-muted mt-1">{template.description}</p>
          </div>
          <button
            onClick={onClose}
            className="text-passport-dim hover:text-passport-text transition-colors p-1 rounded-passport hover:bg-passport-surface-2 shrink-0"
            aria-label="Close preview"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Policy name */}
          <div>
            <label className="label-text">Policy Name</label>
            <div className="text-sm text-passport-text font-medium">{policy.name}</div>
          </div>

          {/* Allowed Tools */}
          <div>
            <label className="label-text flex items-center gap-1.5">
              <CheckCircle size={12} className="text-passport-green" />
              Allowed Tools
            </label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {policy.allowedTools.map((tool) => (
                <span
                  key={tool}
                  className="px-2.5 py-1 rounded-passport text-xs font-mono bg-passport-green/10 text-passport-green border border-passport-green/30"
                >
                  {tool}
                </span>
              ))}
              {policy.allowedTools.length === 0 && (
                <span className="text-xs text-passport-dim">None</span>
              )}
            </div>
          </div>

          {/* Denied Tools */}
          <div>
            <label className="label-text flex items-center gap-1.5">
              <Lock size={12} className="text-passport-coral" />
              Denied Tools
            </label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {policy.deniedTools.map((tool) => (
                <span
                  key={tool}
                  className="px-2.5 py-1 rounded-passport text-xs font-mono bg-passport-coral/10 text-passport-coral border border-passport-coral/30"
                >
                  {tool}
                </span>
              ))}
              {policy.deniedTools.length === 0 && (
                <span className="text-xs text-passport-dim">None</span>
              )}
            </div>
          </div>

          {/* Domains */}
          {(policy.allowedDomains?.length || policy.deniedDomains?.length) ? (
            <div>
              <label className="label-text flex items-center gap-1.5">
                <Globe size={12} className="text-passport-azure" />
                Domain Restrictions
              </label>
              <div className="mt-1.5 space-y-2">
                {policy.allowedDomains && policy.allowedDomains.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-passport-muted">Allowed:</span>
                    {policy.allowedDomains.map((d) => (
                      <span key={d} className="px-2 py-0.5 rounded text-[10px] font-mono bg-passport-green/5 text-passport-green border border-passport-green/20">
                        {d}
                      </span>
                    ))}
                  </div>
                )}
                {policy.deniedDomains && policy.deniedDomains.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-passport-muted">Denied:</span>
                    {policy.deniedDomains.map((d) => (
                      <span key={d} className="px-2 py-0.5 rounded text-[10px] font-mono bg-passport-coral/5 text-passport-coral border border-passport-coral/20">
                        {d}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* PII + Cost */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-panel p-3 border-passport-border/60">
              <div className="flex items-center gap-2 mb-1">
                <Eye size={12} className={policy.piiDetection ? 'text-passport-green' : 'text-passport-dim'} />
                <span className="label-text m-0">PII Detection</span>
              </div>
              <span className={`text-sm font-medium ${policy.piiDetection ? 'text-passport-green' : 'text-passport-dim'}`}>
                {policy.piiDetection ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="glass-panel p-3 border-passport-border/60">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign size={12} className="text-passport-amber" />
                <span className="label-text m-0">Cost Limit</span>
              </div>
              <span className="text-sm font-medium text-passport-text">
                ${policy.maxCost} / session
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-5 border-t border-passport-border">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={() => onCustomize(template)}
            className="btn-secondary"
          >
            <FileEdit size={14} />
            Customize &amp; Import
          </button>
          <button
            onClick={() => onImport(template)}
            className="btn-primary"
          >
            <Shield size={14} />
            Import Template
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
