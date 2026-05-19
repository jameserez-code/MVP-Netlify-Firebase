import { Shield, Plus } from 'lucide-react'

interface NoPoliciesProps {
  onCreate?: () => void
}

export function NoPolicies({ onCreate }: NoPoliciesProps) {
  return (
    <div className="glass-panel p-10 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-passport-azure/10 text-passport-azure mb-4">
        <Shield size={32} />
      </div>
      <h3 className="text-lg font-bold text-passport-text mb-1">No policies yet</h3>
      <p className="text-sm text-passport-muted mb-5 max-w-sm mx-auto">
        Create your first policy to define what your agents can and cannot do.
      </p>
      {onCreate && (
        <button onClick={onCreate} className="btn-primary">
          <Plus size={14} />
          Create your first policy
        </button>
      )}
    </div>
  )
}
