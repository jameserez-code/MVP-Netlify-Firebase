'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ArrowRight, ArrowUp, CornerDownLeft, X, ExternalLink, Mail } from 'lucide-react'

interface Command {
  id: string
  label: string
  category: 'Navigation' | 'Actions' | 'Links'
  keywords?: string[]
  shortcut?: string
  action: () => void
}

const RECENT_KEY = 'passport_recent_commands'
const MAX_RECENT = 5
const VISIBLE_RECENT = 3

function getRecent(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function addRecent(id: string) {
  const recent = getRecent().filter((r) => r !== id)
  recent.unshift(id)
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
}

const CATEGORY_ORDER: Command['category'][] = ['Navigation', 'Actions', 'Links']

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const commands: Command[] = useMemo(
    () => [
      {
        id: 'nav-dashboard',
        label: 'Go to Dashboard',
        category: 'Navigation',
        keywords: ['home', 'main'],
        shortcut: '\u23181',
        action: () => router.push('/dashboard'),
      },
      {
        id: 'nav-agents',
        label: 'Go to Agents',
        category: 'Navigation',
        keywords: ['ai', 'bots'],
        shortcut: '\u23182',
        action: () => router.push('/dashboard/agents'),
      },
      {
        id: 'nav-policies',
        label: 'Go to Policies',
        category: 'Navigation',
        keywords: ['rules', 'enforcement'],
        shortcut: '\u23183',
        action: () => router.push('/dashboard/policies'),
      },
      {
        id: 'nav-audit',
        label: 'Go to Audit',
        category: 'Navigation',
        keywords: ['logs', 'history'],
        shortcut: '\u23184',
        action: () => router.push('/dashboard/audit'),
      },
      {
        id: 'nav-api-keys',
        label: 'Go to API Keys',
        category: 'Navigation',
        keywords: ['tokens', 'secrets'],
        action: () => router.push('/dashboard/api-keys'),
      },
      {
        id: 'nav-webhooks',
        label: 'Go to Webhooks',
        category: 'Navigation',
        keywords: ['hooks', 'events'],
        action: () => router.push('/dashboard/webhooks'),
      },
      {
        id: 'nav-billing',
        label: 'Go to Billing',
        category: 'Navigation',
        keywords: ['payments', 'subscription'],
        action: () => router.push('/dashboard/billing'),
      },
      {
        id: 'nav-analytics',
        label: 'Go to Analytics',
        category: 'Navigation',
        keywords: ['stats', 'metrics'],
        action: () => router.push('/dashboard/analytics'),
      },
      {
        id: 'nav-settings',
        label: 'Go to Settings',
        category: 'Navigation',
        keywords: ['config', 'preferences'],
        action: () => router.push('/dashboard/settings'),
      },
      {
        id: 'nav-docs',
        label: 'Go to Docs',
        category: 'Navigation',
        keywords: ['documentation', 'help'],
        action: () => router.push('/docs'),
      },
      {
        id: 'nav-demo',
        label: 'Go to Demo',
        category: 'Navigation',
        keywords: ['try', 'playground'],
        action: () => router.push('/demo'),
      },
      {
        id: 'action-create-agent',
        label: 'Create Agent',
        category: 'Actions',
        keywords: ['new', 'register', 'bot'],
        action: () => {
          window.dispatchEvent(new CustomEvent('passport:open-register-agent'))
          router.push('/dashboard/agents')
        },
      },
      {
        id: 'action-create-policy',
        label: 'Create Policy',
        category: 'Actions',
        keywords: ['new', 'rule', 'enforcement'],
        action: () => router.push('/dashboard/policies'),
      },
      {
        id: 'action-create-api-key',
        label: 'Create API Key',
        category: 'Actions',
        keywords: ['new', 'token', 'secret'],
        action: () => router.push('/dashboard/api-keys'),
      },
      {
        id: 'link-github',
        label: 'View on GitHub',
        category: 'Links',
        keywords: ['source', 'code', 'repo'],
        action: () => window.open('https://github.com/jameserez-code/MVP-Netlify-Firebase', '_blank'),
      },
      {
        id: 'link-api-ref',
        label: 'API Reference',
        category: 'Links',
        keywords: ['docs', 'endpoints'],
        action: () => router.push('/docs'),
      },
      {
        id: 'link-support',
        label: 'Support',
        category: 'Links',
        keywords: ['help', 'contact', 'email'],
        action: () => {
          window.location.href = 'mailto:support@passportagent.dev'
        },
      },
    ],
    [router],
  )

  const filtered = useMemo(() => {
    if (!query.trim()) return commands
    const q = query.toLowerCase()
    return commands.filter((cmd) => {
      if (cmd.label.toLowerCase().includes(q)) return true
      if (cmd.keywords?.some((k) => k.toLowerCase().includes(q))) return true
      return false
    })
  }, [commands, query])

  const [recentIds, setRecentIds] = useState<string[]>([])
  useEffect(() => {
    if (open) setRecentIds(getRecent())
  }, [open])

  const recentCommands = useMemo(() => {
    return recentIds.map((id) => commands.find((c) => c.id === id)).filter(Boolean) as Command[]
  }, [recentIds, commands])

  const visibleRecent = useMemo(() => recentCommands.slice(0, VISIBLE_RECENT), [recentCommands])

  const grouped = useMemo(() => {
    const groups: Record<string, Command[]> = {}
    filtered.forEach((cmd) => {
      if (!groups[cmd.category]) groups[cmd.category] = []
      groups[cmd.category].push(cmd)
    })
    return groups
  }, [filtered])

  const flatResults = useMemo(() => {
    const showRecent = !query.trim() && visibleRecent.length > 0
    const results: Command[] = []

    if (showRecent) {
      results.push(...visibleRecent)
    }

    CATEGORY_ORDER.forEach((cat) => {
      const cmds = grouped[cat] || []
      const displayCmds = showRecent ? cmds.filter((c) => !visibleRecent.some((r) => r.id === c.id)) : cmds
      results.push(...displayCmds)
    })

    return results
  }, [grouped, visibleRecent, query])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    if (!listRef.current) return
    const selected = listRef.current.querySelector('[data-selected="true"]')
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  useEffect(() => {
    if (open) {
      setMounted(true)
      document.body.style.overflow = 'hidden'
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimating(true)
          inputRef.current?.focus()
        })
      })
    } else {
      setAnimating(false)
      document.body.style.overflow = ''
      const timer = setTimeout(() => {
        setMounted(false)
        setQuery('')
        setSelectedIndex(0)
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [open])

  useEffect(() => {
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const executeCommand = useCallback(
    (cmd: Command) => {
      addRecent(cmd.id)
      cmd.action()
      onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (!open || !animating) return
    function handleKey(e: KeyboardEvent) {
      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          onClose()
          break
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((i) => Math.min(i + 1, flatResults.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((i) => Math.max(i - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (flatResults[selectedIndex]) {
            executeCommand(flatResults[selectedIndex])
          }
          break
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, animating, flatResults, selectedIndex, onClose, executeCommand])

  function getCommandIcon(cmd: Command) {
    if (cmd.id === 'link-github') return <ExternalLink size={16} />
    if (cmd.id === 'link-support') return <Mail size={16} />
    if (cmd.category === 'Links') return <ExternalLink size={16} />
    return <ArrowRight size={16} />
  }

  if (!mounted) return null

  const showRecent = !query.trim() && visibleRecent.length > 0

  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center pt-[15vh] px-4">
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
          animating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`relative w-full max-w-xl bg-[#161b22]/95 backdrop-blur-xl border border-[#30363d] rounded-passport-lg shadow-2xl overflow-hidden transition-all duration-200 ${
          animating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#30363d]">
          <Search size={16} className="text-passport-dim shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-passport-text placeholder-passport-dim font-sans"
            aria-label="Search commands"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-passport-dim hover:text-passport-text transition-colors min-touch-target flex items-center justify-center shrink-0"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div ref={listRef} className="max-h-[360px] overflow-y-auto p-2" role="listbox">
          {showRecent && (
            <>
              <div className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-passport-dim">
                Recent
              </div>
              {visibleRecent.map((cmd) => {
                const idx = flatResults.indexOf(cmd)
                const isSelected = selectedIndex === idx
                return (
                  <button
                    key={cmd.id}
                    data-selected={isSelected}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => executeCommand(cmd)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-passport text-left text-sm transition-colors ${
                      isSelected
                        ? 'bg-passport-green/10 text-passport-text'
                        : 'text-passport-muted hover:bg-passport-surface'
                    }`}
                  >
                    <span className="text-passport-dim shrink-0">{getCommandIcon(cmd)}</span>
                    <span className="flex-1 font-medium">{cmd.label}</span>
                    {cmd.shortcut && <kbd className="kbd text-[10px]">{cmd.shortcut}</kbd>}
                  </button>
                )
              })}
              <div className="mx-3 my-1 border-t border-[#30363d]/50" />
            </>
          )}

          {CATEGORY_ORDER.map((cat) => {
            const cmds = grouped[cat] || []
            const displayCmds = showRecent ? cmds.filter((c) => !visibleRecent.some((r) => r.id === c.id)) : cmds
            if (displayCmds.length === 0) return null
            return (
              <div key={cat}>
                <div className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-passport-dim">
                  {cat}
                </div>
                {displayCmds.map((cmd) => {
                  const idx = flatResults.indexOf(cmd)
                  const isSelected = selectedIndex === idx
                  return (
                    <button
                      key={cmd.id}
                      data-selected={isSelected}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => executeCommand(cmd)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-passport text-left text-sm transition-colors ${
                        isSelected
                          ? 'bg-passport-green/10 text-passport-text'
                          : 'text-passport-muted hover:bg-passport-surface'
                      }`}
                    >
                      <span className="text-passport-dim shrink-0">{getCommandIcon(cmd)}</span>
                      <span className="flex-1 font-medium">{cmd.label}</span>
                      {cmd.shortcut && <kbd className="kbd text-[10px]">{cmd.shortcut}</kbd>}
                    </button>
                  )
                })}
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="px-4 py-10 text-center text-passport-dim text-sm">
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-[#30363d] text-[10px] text-passport-dim font-mono">
          <span className="flex items-center gap-1">
            <ArrowUp size={10} />
            <CornerDownLeft size={10} />
            <span>navigate</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-[3px] bg-passport-surface-2 border border-passport-border text-[9px]">
              &#8629;
            </span>
            <span>select</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-[3px] bg-passport-surface-2 border border-passport-border text-[9px]">
              esc
            </span>
            <span>close</span>
          </span>
        </div>
      </div>
    </div>
  )
}
