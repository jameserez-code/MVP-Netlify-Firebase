'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import useSWR from 'swr'
import { swrActivityConfig } from '@/lib/swr-config'
import { useRealtime } from '@/lib/websocket'
import { getAudit } from '@/lib/api'
import {
  Bot,
  Shield,
  ShieldAlert,
  CheckCircle,
  XCircle,
  Clock,
  Bell,
  CheckCheck,
  Activity,
  X,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react'

interface ActivityEvent {
  id: string
  type: 'agent_register' | 'enforcement' | 'violation' | 'run_complete' | 'policy_create' | 'api_key_create'
  description: string
  timestamp: string
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 5) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString()
}

function ActivityTimestamp({ timestamp }: { timestamp: string }) {
  const [display, setDisplay] = useState(formatRelativeTime(timestamp))

  useEffect(() => {
    const date = new Date(timestamp)
    const update = () => setDisplay(formatRelativeTime(timestamp))
    const diffMs = Date.now() - date.getTime()
    const interval = diffMs < 60000 ? 5000 : diffMs < 3600000 ? 30000 : 60000
    const timer = setInterval(update, interval)
    return () => clearInterval(timer)
  }, [timestamp])

  return (
    <span className="text-[10px] text-passport-dim flex items-center gap-1 mt-1">
      <Clock size={10} />
      {display}
    </span>
  )
}

function getEventIcon(type: ActivityEvent['type']) {
  switch (type) {
    case 'agent_register':
      return <Bot size={14} className="text-passport-azure" />
    case 'enforcement':
      return <Shield size={14} className="text-passport-green" />
    case 'violation':
      return <ShieldAlert size={14} className="text-passport-red" />
    case 'run_complete':
      return <CheckCircle size={14} className="text-passport-green" />
    case 'policy_create':
      return <Shield size={14} className="text-passport-amber" />
    case 'api_key_create':
      return <Activity size={14} className="text-passport-coral" />
    default:
      return <Clock size={14} className="text-passport-dim" />
  }
}

function getEventColor(type: ActivityEvent['type']) {
  switch (type) {
    case 'agent_register':
      return 'bg-passport-azure/10 border-passport-azure/20'
    case 'enforcement':
      return 'bg-passport-green/10 border-passport-green/20'
    case 'violation':
      return 'bg-passport-red/10 border-passport-red/20'
    case 'run_complete':
      return 'bg-passport-green/10 border-passport-green/20'
    case 'policy_create':
      return 'bg-passport-amber/10 border-passport-amber/20'
    case 'api_key_create':
      return 'bg-passport-coral/10 border-passport-coral/20'
    default:
      return 'bg-passport-surface-2 border-passport-border'
  }
}

function inferEventType(entry: any): ActivityEvent['type'] {
  if (entry.tool && entry.decision === 'deny') return 'violation'
  if (entry.tool && entry.decision === 'allow') return 'enforcement'
  if (entry.agentId && !entry.tool) return 'agent_register'
  return 'enforcement'
}

function inferDescription(entry: any): string {
  if (entry.tool) {
    return `${entry.decision === 'deny' ? 'Blocked' : 'Allowed'} ${entry.tool} for ${entry.agentId?.slice(0, 8) || 'unknown'}`
  }
  if (entry.agentId) {
    return `Agent ${entry.agentId.slice(0, 8)} action recorded`
  }
  return 'System activity recorded'
}

export default function ActivityFeed() {
  const [isOpen, setIsOpen] = useState(false)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [animIds, setAnimIds] = useState<Set<string>>(new Set())
  const panelRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number>(0)
  const prevEntriesLen = useRef(0)

  const { data: wsData, connected: wsConnected } = useRealtime(
    'audit',
    '/activity',
    () => getAudit({ limit: 10 }),
    swrActivityConfig
  )

  const [entries, setEntries] = useState<any[]>([])

  useEffect(() => {
    if (!wsConnected && wsData) {
      const list = Array.isArray(wsData) ? wsData : wsData?.data || []
      setEntries(list)
    }
  }, [wsConnected, wsData])

  useEffect(() => {
    if (wsConnected && wsData) {
      setEntries((prev) => {
        const next = [wsData, ...prev]
        return next.slice(0, 50)
      })
    }
  }, [wsConnected, wsData])

  useEffect(() => {
    if (entries.length > prevEntriesLen.current) {
      const newIds = entries.slice(0, entries.length - prevEntriesLen.current).map((e: any) =>
        e.id || e.intentId || Math.random().toString(36).slice(2)
      )
      setAnimIds(new Set(newIds))
      const timer = setTimeout(() => setAnimIds(new Set()), 300)
      prevEntriesLen.current = entries.length
      return () => clearTimeout(timer)
    }
    prevEntriesLen.current = entries.length
  }, [entries])

  const events: ActivityEvent[] = entries.map((entry: any) => ({
    id: entry.id || entry.intentId || Math.random().toString(36).slice(2),
    type: inferEventType(entry),
    description: entry.reason || inferDescription(entry),
    timestamp: entry.timestamp || entry.createdAt || new Date().toISOString(),
  }))

  const unreadCount = events.filter((e) => !readIds.has(e.id)).length

  const markAllRead = useCallback(() => {
    setReadIds(new Set(events.map((e) => e.id)))
  }, [events])

  const clearAll = useCallback(() => {
    setEntries([])
    prevEntriesLen.current = 0
  }, [])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Mark visible as read when opened
  useEffect(() => {
    if (isOpen && events.length > 0) {
      const timer = setTimeout(() => {
        setReadIds((prev) => {
          const next = new Set(prev)
          events.forEach((e) => next.add(e.id))
          return next
        })
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isOpen, events])

  // Swipe to close on mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = e.touches[0].clientX - touchStartX.current
    if (diff > 50) {
      setIsOpen(false)
    }
  }

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-passport glass-panel text-passport-muted hover:text-passport-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-passport-azure focus-visible:ring-offset-2 focus-visible:ring-offset-passport-bg"
        aria-label={isOpen ? 'Close activity feed' : 'Open activity feed'}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-passport-red text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Slide-out panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          {/* Panel */}
          <div
            ref={panelRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            className="relative w-full max-w-sm h-full bg-passport-surface/95 backdrop-blur-xl border-l border-passport-border flex flex-col animate-slide-in-right"
            role="dialog"
            aria-label="Activity feed"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-passport-border">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-passport-azure" />
                <h2 className="text-sm font-semibold text-passport-text">Activity Feed</h2>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-passport-red/10 text-passport-red text-[10px] font-bold">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="text-xs text-passport-muted hover:text-passport-text transition-colors px-2 py-1 rounded-passport hover:bg-passport-surface-2"
                  aria-label={soundEnabled ? 'Mute notifications' : 'Unmute notifications'}
                  title={soundEnabled ? 'Sound on' : 'Sound off'}
                >
                  {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                </button>
                <button
                  onClick={clearAll}
                  className="text-xs text-passport-muted hover:text-passport-red transition-colors px-2 py-1 rounded-passport hover:bg-passport-red/5"
                  aria-label="Clear all activity"
                  title="Clear all"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  onClick={markAllRead}
                  className="text-xs text-passport-muted hover:text-passport-text transition-colors px-2 py-1 rounded-passport hover:bg-passport-surface-2"
                  aria-label="Mark all as read"
                >
                  <CheckCheck size={14} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-passport hover:bg-passport-surface-2 text-passport-muted hover:text-passport-text transition-colors"
                  aria-label="Close activity feed"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Events list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {events.length === 0 ? (
                <div className="text-center py-10 text-passport-muted text-sm">
                  No recent activity
                </div>
              ) : (
                events.map((event) => {
                  const isUnread = !readIds.has(event.id)
                  const isAnimated = animIds.has(event.id)
                  return (
                    <div
                      key={event.id}
                      className={`flex items-start gap-3 p-3 rounded-passport border transition-all ${
                        isAnimated ? 'animate-slide-in-right-item' : ''
                      } ${
                        isUnread ? getEventColor(event.type) : 'bg-passport-bg border-passport-border'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">{getEventIcon(event.type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${isUnread ? 'text-passport-text font-medium' : 'text-passport-muted'}`}>
                          {event.description}
                        </p>
                        <ActivityTimestamp timestamp={event.timestamp} />
                      </div>
                      {isUnread && (
                        <span className="mt-1.5 w-2 h-2 rounded-full bg-passport-azure shrink-0" aria-hidden="true" />
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-passport-border text-center">
              <span className="text-[10px] text-passport-dim font-mono">
                {wsConnected ? 'Real-time updates' : 'Refreshes every 5 seconds'}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
