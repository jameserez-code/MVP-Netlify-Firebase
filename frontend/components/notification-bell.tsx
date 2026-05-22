'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import useSWR from 'swr'
import { getAudit } from '@/lib/api'
import { swrActivityConfig } from '@/lib/swr-config'
import { useRealtime } from '@/lib/websocket'
import {
  Bell,
  X,
  CheckCheck,
  Bot,
  Shield,
  ShieldAlert,
  CheckCircle,
  Clock,
  Activity,
} from 'lucide-react'

interface NotificationEvent {
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

  if (diffSec < 10) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString()
}

function getEventIcon(type: NotificationEvent['type']) {
  const cls = 'shrink-0'
  switch (type) {
    case 'agent_register':
      return <Bot size={14} className={`${cls} text-passport-azure`} />
    case 'enforcement':
      return <Shield size={14} className={`${cls} text-passport-green`} />
    case 'violation':
      return <ShieldAlert size={14} className={`${cls} text-passport-red`} />
    case 'run_complete':
      return <CheckCircle size={14} className={`${cls} text-passport-green`} />
    case 'policy_create':
      return <Shield size={14} className={`${cls} text-passport-amber`} />
    case 'api_key_create':
      return <Activity size={14} className={`${cls} text-passport-coral`} />
    default:
      return <Clock size={14} className={`${cls} text-passport-dim`} />
  }
}

function getEventColor(type: NotificationEvent['type']) {
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

function inferEventType(entry: any): NotificationEvent['type'] {
  if (entry.tool && entry.decision === 'deny') return 'violation'
  if (entry.tool && entry.decision === 'allow') return 'enforcement'
  if (entry.agentId && !entry.tool) return 'agent_register'
  return 'enforcement'
}

function inferDescription(entry: any): string {
  if (entry.tool) {
    const verb = entry.decision === 'deny' ? 'Blocked' : 'Allowed'
    return `${verb} ${entry.tool} for ${entry.agentId?.slice(0, 8) || 'unknown'}`
  }
  if (entry.agentId) {
    return `Agent ${entry.agentId.slice(0, 8)} action recorded`
  }
  return 'System activity recorded'
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const panelRef = useRef<HTMLDivElement>(null)

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

  const events: NotificationEvent[] = entries.map((entry: any) => ({
    id: entry.id || entry.intentId || Math.random().toString(36).slice(2),
    type: inferEventType(entry),
    description: entry.reason || inferDescription(entry),
    timestamp: entry.timestamp || entry.createdAt || new Date().toISOString(),
  }))

  const unreadCount = events.filter((e) => !readIds.has(e.id)).length

  const markAllRead = useCallback(() => {
    setReadIds(new Set(events.map((e) => e.id)))
  }, [events])

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

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-passport glass-panel text-passport-muted hover:text-passport-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-passport-azure focus-visible:ring-offset-2 focus-visible:ring-offset-passport-bg min-touch-target flex items-center justify-center"
        aria-label={isOpen ? 'Close notifications' : `Open notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-passport-red text-white text-[10px] font-bold flex items-center justify-center animate-scaleIn">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] glass-panel border border-passport-border overflow-hidden z-50 animate-scaleIn">
          <div className="flex items-center justify-between px-4 py-3 border-b border-passport-border">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-passport-azure" />
              <h3 className="text-sm font-semibold text-passport-text">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-passport-red/10 text-passport-red text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {events.length > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-passport-muted hover:text-passport-text transition-colors px-2 py-1 rounded hover:bg-passport-surface-2 flex items-center gap-1"
                >
                  <CheckCheck size={12} />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-passport-surface-2 text-passport-dim hover:text-passport-text transition-colors"
                aria-label="Close notifications"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {events.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={24} className="text-passport-dim mx-auto mb-2" />
                <p className="text-sm text-passport-muted">No new notifications</p>
              </div>
            ) : (
              events.map((event) => {
                const isUnread = !readIds.has(event.id)
                return (
                  <div
                    key={event.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-passport-border/50 transition-all ${
                      isUnread ? getEventColor(event.type) : 'hover:bg-passport-surface-2/50'
                    }`}
                  >
                    <div className="mt-0.5">{getEventIcon(event.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs ${isUnread ? 'text-passport-text font-medium' : 'text-passport-muted'}`}>
                        {event.description}
                      </p>
                      <span className="text-[10px] text-passport-dim flex items-center gap-1 mt-1">
                        <Clock size={10} />
                        {formatRelativeTime(event.timestamp)}
                      </span>
                    </div>
                    {isUnread && (
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-passport-azure shrink-0" aria-hidden="true" />
                    )}
                  </div>
                )
              })
            )}
          </div>

          <div className="px-4 py-2 border-t border-passport-border text-center">
            <span className="text-[10px] text-passport-dim font-mono">
              {wsConnected ? 'Real-time updates' : 'Refreshes every 5 seconds'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
