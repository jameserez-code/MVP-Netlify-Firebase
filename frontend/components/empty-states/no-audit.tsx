import { ClipboardList, Play } from 'lucide-react'

interface NoAuditProps {
  onRun?: () => void
}

export function NoAudit({ onRun }: NoAuditProps) {
  return (
    <div className="glass-panel p-10 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-passport-amber/10 text-passport-amber mb-4">
        <ClipboardList size={32} />
      </div>
      <h3 className="text-lg font-bold text-passport-text mb-1">No audit events yet</h3>
      <p className="text-sm text-passport-muted mb-5 max-w-sm mx-auto">
        Run some enforcements to generate audit events. All agent decisions will be logged here.
      </p>
      {onRun && (
        <button onClick={onRun} className="btn-primary">
          <Play size={14} />
          Run enforcement
        </button>
      )}
    </div>
  )
}
