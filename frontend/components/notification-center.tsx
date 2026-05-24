'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getAudit } from '@/lib/api'
import {
  Bell,
  X,
  CheckCheck,
  Bot,
  Shield,
  Clock,
  AlertTriangle,
  Info,
  BotOff,
  ExternalLink,
  Check,
} from 'lucide-react'

type NotificationType =
  | 'policy_violation'
  | 'agent_registered'
  | 'agent_revoked'
  | 'run_failed'
  | 'system_alert'

interface Notification {
  id: string
  type: NotificationType
  title: string
  description: string
  timestamp: string
  link?: { label: string; href: string }
}

const READ_IDS_KEY = 'passport_notification_read_ids'

function loadReadIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(READ_IDS_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function saveReadIds(ids: Set<string>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(READ_IDS_KEY, JSON.stringify([...ids]))
  } catch {}
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
  if (diffMin === 1) return '1 min ago'
  if (diffMin < 60) return `${diffMin} mins ago`
  if (diffHour === 1) return '1 hour ago'
  if (diffHour < 24) return `${diffHour} hours ago`
  if (diffDay === 1) return 'yesterday'
  if (diffDay < 7) return `${diffDay} days ago`
  return date.toLocaleDateString()
}

function inferNotificationType(entry: any): NotificationType {
  if (entry.type === 'system_alert') return 'system_alert'
  if (entry.type === 'agent_revoked') return 'agent_revoked'
  if (entry.type === 'run_failed') return 'run_failed'
  if (entry.tool && entry.decision === 'deny') return 'policy_violation'
  if (entry.tool && entry.decision === 'allow') return 'policy_violation'
  if (entry.decision === 'revoke' || entry.status === 'revoked') return 'agent_revoked'
  if (entry.error || entry.status === 'failed') return 'run_failed'
  if (entry.agentId && !entry.tool && !entry.decision) return 'agent_registered'
  return 'system_alert'
}

function buildNotification(entry: any): Notification {
  const type = inferNotificationType(entry)
  const id = entry.id || entry.intentId || Math.random().toString(36).slice(2)
  const agentId = entry.agentId || ''
  const tool = entry.tool || ''

  switch (type) {
    case 'policy_violation': {
      const verb = entry.decision === 'deny' ? 'Blocked' : 'Modified'
      return {
        id,
        type,
        title: `${verb}: ${tool || 'unknown tool'}`,
        description: entry.reason || `Policy enforcement for agent ${agentId.slice(0, 8) || 'unknown'}`,
        timestamp: entry.timestamp || entry.createdAt || new Date().toISOString(),
        link: { label: 'View Audit', href: '/dashboard/audit' },
      }
    }
    case 'agent_registered':
      return {
        id,
        type,
        title: 'Agent Registered',
        description: entry.name
          ? `Agent "${entry.name}" has been registered`
          : `Agent ${agentId.slice(0, 8) || 'unknown'} has been registered`,
        timestamp: entry.timestamp || entry.createdAt || new Date().toISOString(),
        link: { label: 'View Agent', href: `/dashboard/agents` },
      }
    case 'agent_revoked':
      return {
        id,
        type,
        title: 'Agent Revoked',
        description: entry.name
          ? `Agent "${entry.name}" has been revoked`
          : `Agent ${agentId.slice(0, 8) || 'unknown'} has been revoked`,
        timestamp: entry.timestamp || entry.createdAt || new Date().toISOString(),
        link: { label: 'View Agents', href: '/dashboard/agents' },
      }
    case 'run_failed':
      return {
        id,
        type,
        title: 'Run Failed',
        description: entry.error || entry.reason || `Run for agent ${agentId.slice(0, 8) || 'unknown'} has failed`,
        timestamp: entry.timestamp || entry.createdAt || new Date().toISOString(),
        link: { label: 'View Audit', href: '/dashboard/audit' },
      }
    case 'system_alert':
      return {
        id,
        type,
        title: 'System Alert',
        description: entry.reason || entry.description || 'System notification received',
        timestamp: entry.timestamp || entry.createdAt || new Date().toISOString(),
      }
  }
}

const DOT_COLORS: Record<NotificationType, string> = {
  policy_violation: 'bg-passport-coral',
  agent_registered: 'bg-passport-green',
  agent_revoked: 'bg-passport-red',
  run_failed: 'bg-passport-amber',
  system_alert: 'bg-passport-azure',
}

const TYPE_ICONS: Record<NotificationType, React.ReactNode> = {
  policy_violation: <Shield size={14} className="text-passport-coral shrink-0" />,
  agent_registered: <Bot size={14} className="text-passport-green shrink-0" />,
  agent_revoked: <BotOff size={14} className="text-passport-red shrink-0" />,
  run_failed: <AlertTriangle size={14} className="text-passport-amber shrink-0" />,
  system_alert: <Info size={14} className="text-passport-azure shrink-0" />,
}

const TYPE_BG: Record<NotificationType, string> = {
  policy_violation: 'bg-passport-coral/10 border-passport-coral/20',
  agent_registered: 'bg-passport-green/10 border-passport-green/20',
  agent_revoked: 'bg-passport-red/10 border-passport-red/20',
  run_failed: 'bg-passport-amber/10 border-passport-amber/20',
  system_alert: 'bg-passport-azure/10 border-passport-azure/20',
}

export default function NotificationCenter() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [readIds, setReadIds] = useState<Set<string>>(loadReadIds)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval>>()

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await getAudit({ limit: 20 })
      const entries = Array.isArray(res) ? res : res?.data || []
      const built = entries.map(buildNotification)
      setNotifications(built.slice(0, 50))
      setError(null)
    } catch (e: any) {
      if (!notifications.length) setError(e.message || 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    pollRef.current = setInterval(fetchNotifications, 30000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [fetchNotifications])

  const unreadNotifications = notifications.filter((n) => !readIds.has(n.id))
  const unreadCount = unreadNotifications.length

  useEffect(() => {
    saveReadIds(readIds)
  }, [readIds])

  const markAsRead = useCallback((id: string) => {
    setReadIds((prev) => new Set([...prev, id]))
  }, [])

  const markAllAsRead = useCallback(() => {
    setReadIds(new Set(notifications.map((n) => n.id)))
  }, [notifications])

  const handleAction = useCallback((href: string) => {
    setIsOpen(false)
    router.push(href)
  }, [router])

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
    if (isOpen && unreadNotifications.length > 0) {
      const timer = setTimeout(() => {
        setReadIds((prev) => {
          const next = new Set(prev)
          unreadNotifications.forEach((n) => next.add(n.id))
          return next
        })
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isOpen, unreadNotifications])

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-passport glass-panel text-passport-muted hover:text-passport-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-passport-azure focus-visible:ring-offset-2 focus-visible:ring-offset-passport-bg min-touch-target flex items-center justify-center"
        aria-label={isOpen ? 'Close notifications' : `Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
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
        <div className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] glass-panel border border-passport-border overflow-hidden z-50 animate-scaleIn">
          <div className="flex items-center justify-between px-4 py-3 border-b border-passport-border">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-passport-azure" />
              <h3 className="text-sm font-semibold text-passport-text">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-passport-red/10 text-passport-red text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {notifications.length > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-passport-muted hover:text-passport-text transition-colors px-2 py-1 rounded hover:bg-passport-surface-2 flex items-center gap-1"
                >
                  <CheckCheck size={12} />
                  <span className="hidden sm:inline">Mark all read</span>
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
            {loading ? (
              <div className="py-10 text-center">
                <div className="w-5 h-5 border-2 border-passport-border border-t-passport-azure rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-passport-muted">Loading notifications...</p>
              </div>
            ) : error ? (
              <div className="py-10 text-center">
                <Bell size={24} className="text-passport-dim mx-auto mb-2" />
                <p className="text-sm text-passport-muted">{error}</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={24} className="text-passport-dim mx-auto mb-2" />
                <p className="text-sm text-passport-muted">No new notifications</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isUnread = !readIds.has(notif.id)
                return (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-passport-border/50 transition-all ${
                      isUnread ? TYPE_BG[notif.type] : 'hover:bg-passport-surface-2/50'
                    }`}
                  >
                    <div className="relative mt-0.5 shrink-0">
                      {TYPE_ICONS[notif.type]}
                      <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-passport-surface ${DOT_COLORS[notif.type]}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs ${isUnread ? 'text-passport-text font-medium' : 'text-passport-muted'}`}>
                        {notif.title}
                      </p>
                      <p className="text-[10px] text-passport-dim mt-0.5 line-clamp-2">
                        {notif.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-passport-dim flex items-center gap-1">
                          <Clock size={10} />
                          {formatRelativeTime(notif.timestamp)}
                        </span>
                        {notif.link && (
                          <button
                            onClick={() => handleAction(notif.link!.href)}
                            className="text-[10px] text-passport-azure hover:text-passport-azure/80 transition-colors flex items-center gap-0.5 ml-auto"
                          >
                            {notif.link.label}
                            <ExternalLink size={10} />
                          </button>
                        )}
                      </div>
                      {isUnread && (
                        <button
                          onClick={(e) => { e.stopPropagation(); markAsRead(notif.id) }}
                          className="absolute bottom-3 right-3 p-1 rounded text-passport-dim hover:text-passport-text transition-colors"
                          aria-label="Mark as read"
                        >
                          <Check size={12} />
                        </button>
                      )}
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
              Auto-refreshes every 30 seconds
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
