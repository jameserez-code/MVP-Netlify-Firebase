import { Shield } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-passport-bg flex items-center justify-center p-4">
      <div className="glass-panel p-8 max-w-md w-full text-center">
        <Shield size={48} className="text-passport-green mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-passport-text mb-2">Page Not Found</h1>
        <p className="text-passport-muted mb-6">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="/dashboard" className="btn-primary">
            Back to Dashboard
          </a>
          <a href="/" className="btn-secondary">
            Go Home
          </a>
          <a href="mailto:support@agentpassport.dev" className="btn-secondary">
            Contact Support
          </a>
        </div>
      </div>
    </div>
  )
}
