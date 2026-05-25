'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown, X, Send, CheckCircle } from 'lucide-react'

type State = 'idle' | 'rating' | 'form' | 'thanks'

export default function FeedbackWidget() {
  const [state, setState] = useState<State>('idle')
  const [rating, setRating] = useState<'up' | 'down' | null>(null)
  const [feedback, setFeedback] = useState('')
  const [email, setEmail] = useState('')

  function handleRate(value: 'up' | 'down') {
    setRating(value)
    setState('form')
  }

  async function handleSubmit() {
    try {
      await fetch('/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, feedback, email, path: window.location.pathname }),
      })
    } catch { /* silently fail — feedback is best-effort */ }
    setState('thanks')
    setTimeout(() => {
      setState('idle')
      setRating(null)
      setFeedback('')
      setEmail('')
    }, 3000)
  }

  if (state === 'idle') {
    return (
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setState('rating')}
          className="glass-panel px-3 py-2 text-xs text-passport-muted hover:text-passport-text hover:border-passport-green/30 transition-all flex items-center gap-2 cursor-pointer"
          aria-label="Give feedback"
        >
          <ThumbsUp size={14} />
          <span className="hidden sm:inline">Was this helpful?</span>
        </button>
      </div>
    )
  }

  if (state === 'rating') {
    return (
      <div className="fixed bottom-6 right-6 z-40">
        <div className="glass-panel p-4 w-64 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-passport-text">Was this helpful?</span>
            <button onClick={() => setState('idle')} className="text-passport-dim hover:text-passport-text" aria-label="Close">
              <X size={14} />
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleRate('up')} className="flex-1 py-2 rounded-passport border border-passport-border hover:border-passport-green/40 hover:bg-passport-green/5 transition-all flex items-center justify-center gap-2 cursor-pointer">
              <ThumbsUp size={16} className="text-passport-green" />
              <span className="text-xs text-passport-text">Yes</span>
            </button>
            <button onClick={() => handleRate('down')} className="flex-1 py-2 rounded-passport border border-passport-border hover:border-passport-coral/40 hover:bg-passport-coral/5 transition-all flex items-center justify-center gap-2 cursor-pointer">
              <ThumbsDown size={16} className="text-passport-coral" />
              <span className="text-xs text-passport-text">No</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (state === 'form') {
    return (
      <div className="fixed bottom-6 right-6 z-40">
        <div className="glass-panel p-4 w-72 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-passport-text">
              {rating === 'up' ? 'Great! What worked?' : 'What can we improve?'}
            </span>
            <button onClick={() => setState('idle')} className="text-passport-dim hover:text-passport-text" aria-label="Close">
              <X size={14} />
            </button>
          </div>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Your feedback..."
            className="w-full bg-passport-bg border border-passport-border rounded-passport p-2 text-sm text-passport-text placeholder-passport-dim focus:outline-none focus:border-passport-azure resize-none mb-2"
            rows={3}
            autoFocus
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email (optional)"
            className="w-full bg-passport-bg border border-passport-border rounded-passport p-2 text-sm text-passport-text placeholder-passport-dim focus:outline-none focus:border-passport-azure mb-3"
          />
          <button
            onClick={handleSubmit}
            className="w-full btn-primary text-xs py-2 cursor-pointer"
          >
            <Send size={12} />
            Send Feedback
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <div className="glass-panel px-4 py-3 flex items-center gap-2 animate-fade-in text-sm text-passport-green">
        <CheckCircle size={16} />
        Thanks for your feedback!
      </div>
    </div>
  )
}
