'use client'
import { useEffect, useState } from 'react'
import { CheckCircle } from 'lucide-react'

function SuccessAnimation({ show = true, onComplete, message, onDismiss }: { 
  show?: boolean
  onComplete?: () => void
  message?: string
  onDismiss?: () => void
}) {
  const [visible, setVisible] = useState(show)

  useEffect(() => {
    if (show) {
      setVisible(true)
      const t = setTimeout(() => {
        setVisible(false)
        onComplete?.()
        onDismiss?.()
      }, 2000)
      return () => clearTimeout(t)
    }
  }, [show, onComplete, onDismiss])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onDismiss}>
      <div className="glass-panel p-8 text-center animate-scale-in">
        <CheckCircle size={48} className="text-passport-green mx-auto mb-4" />
        <h3 className="text-lg font-bold text-passport-text">Success!</h3>
        {message && <p className="text-sm text-passport-muted mt-2">{message}</p>}
      </div>
    </div>
  )
}

export default SuccessAnimation
export { SuccessAnimation }
