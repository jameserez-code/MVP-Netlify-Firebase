import { Bot, Plus } from 'lucide-react'

interface NoAgentsProps {
  onCreate?: () => void
}

export function NoAgents({ onCreate }: NoAgentsProps) {
  return (
    <div className="glass-panel p-10 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-passport-green/10 text-passport-green mb-4">
        <Bot size={32} />
      </div>
      <h3 className="text-lg font-bold text-passport-text mb-1">No agents yet</h3>
      <p className="text-sm text-passport-muted mb-5 max-w-sm mx-auto">
        Register your first agent to start monitoring and enforcing policies on your AI fleet.
      </p>
      {onCreate && (
        <button onClick={onCreate} className="btn-primary">
          <Plus size={14} />
          Register your first agent
        </button>
      )}
    </div>
  )
}
