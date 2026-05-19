import { Spinner } from '@/components/loading'
import { Shield } from 'lucide-react'

export default function Loading() {
  return (
    <div className="min-h-screen bg-passport-bg flex flex-col items-center justify-center gap-4">
      <Shield size={48} className="text-passport-green animate-pulse" />
      <div className="flex items-center gap-2">
        <Spinner size={20} className="text-passport-green" />
        <span className="font-mono text-sm text-passport-muted">Loading...</span>
      </div>
    </div>
  )
}
