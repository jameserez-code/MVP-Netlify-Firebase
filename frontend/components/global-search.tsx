'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { listAgents, listPolicies, getAudit } from '@/lib/api'
import {
  Search,
  Bot,
  FileText,
  ClipboardList,
  Loader2,
  CornerDownLeft,
} from 'lucide-react'

interface SearchResult {
  id: string
  category: 'Agent' | 'Policy' | 'Audit'
  name: string
  snippet: string
  href: string
}

function matchScore(query: string, text: string): number {
  if (!query) return 0
  const lowerQuery = query.toLowerCase()
  const lowerText = text.toLowerCase()
  if (lowerText === lowerQuery) return 100
  if (lowerText.startsWith(lowerQuery)) return 80
  if (lowerText.includes(lowerQuery)) return 50
  return 0
}

function getSnippet(text: string, query: string, maxLen = 60): string {
  if (!query) return text.slice(0, maxLen)
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const idx = lowerText.indexOf(lowerQuery)
  if (idx === -1) return text.slice(0, maxLen)
  const start = Math.max(0, idx - 20)
  const end = Math.min(text.length, idx + query.length + 37)
  let snippet = text.slice(start, end)
  if (start > 0) snippet = '...' + snippet
  if (end < text.length) snippet = snippet + '...'
  return snippet
}

const CATEGORY_ICONS: Record<SearchResult['category'], React.ReactNode> = {
  Agent: <Bot size={14} className="text-passport-azure shrink-0" />,
  Policy: <FileText size={14} className="text-passport-amber shrink-0" />,
  Audit: <ClipboardList size={14} className="text-passport-green shrink-0" />,
}

const CATEGORY_BADGE_COLORS: Record<SearchResult['category'], string> = {
  Agent: 'bg-passport-azure/10 text-passport-azure border-passport-azure/20',
  Policy: 'bg-passport-amber/10 text-passport-amber border-passport-amber/20',
  Audit: 'bg-passport-green/10 text-passport-green border-passport-green/20',
}

export default function GlobalSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rawData, setRawData] = useState<{
    agents: any[]
    policies: any[]
    audit: any[]
  }>({ agents: [], policies: [], audit: [] })

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [agentsRes, policiesRes, auditRes] = await Promise.all([
          listAgents(),
          listPolicies(),
          getAudit({ limit: 100 }),
        ])
        if (cancelled) return
        const agents = Array.isArray(agentsRes) ? agentsRes : agentsRes?.data || []
        const policies = Array.isArray(policiesRes) ? policiesRes : policiesRes?.data || []
        const audit = Array.isArray(auditRes) ? auditRes : auditRes?.data || []
        setRawData({ agents, policies, audit })
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load search data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const results = useMemo(() => {
    if (!query.trim()) return []
    const items: Array<SearchResult & { score: number }> = []

    for (const agent of rawData.agents) {
      const name = agent.name || agent.id || ''
      const model = agent.model || ''
      const s = Math.max(matchScore(query, name), matchScore(query, model))
      if (s > 0) {
        items.push({
          id: `agent-${agent.id}`,
          category: 'Agent',
          name,
          snippet: model ? `Model: ${model}` : getSnippet(name, query),
          href: `/dashboard/agents`,
          score: s,
        })
      }
    }

    for (const policy of rawData.policies) {
      const name = policy.name || policy.id || ''
      const tools = Array.isArray(policy.tools) ? policy.tools.join(', ') : ''
      const s = Math.max(matchScore(query, name), matchScore(query, tools))
      if (s > 0) {
        items.push({
          id: `policy-${policy.id}`,
          category: 'Policy',
          name,
          snippet: tools ? `Tools: ${tools}` : getSnippet(name, query),
          href: `/dashboard/policies`,
          score: s,
        })
      }
    }

    for (const entry of rawData.audit) {
      const tool = entry.tool || ''
      const decision = entry.decision || ''
      const agentId = entry.agentId || ''
      const s = Math.max(matchScore(query, tool), matchScore(query, decision), matchScore(query, agentId))
      if (s > 0) {
        items.push({
          id: `audit-${entry.id || entry.intentId}`,
          category: 'Audit',
          name: tool ? `${tool} — ${decision}` : `Action by ${agentId.slice(0, 8) || 'unknown'}`,
          snippet: entry.reason || `${decision} for ${agentId.slice(0, 8) || 'unknown'}`,
          href: `/dashboard/audit`,
          score: s,
        })
      }
    }

    return items.sort((a, b) => b.score - a.score).map(({ score: _s, ...item }) => item)
  }, [query, rawData])

  const grouped = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {}
    for (const r of results) {
      if (!groups[r.category]) groups[r.category] = []
      groups[r.category].push(r)
    }
    return groups
  }, [results])

  const flatResults = useMemo(() => {
    const flat: SearchResult[] = []
    const order: SearchResult['category'][] = ['Agent', 'Policy', 'Audit']
    for (const cat of order) {
      if (grouped[cat]) flat.push(...grouped[cat])
    }
    return flat
  }, [grouped])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    setActiveIndex(0)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (val.trim()) {
        setIsOpen(true)
      }
    }, 300)
  }, [])

  const handleFocus = useCallback(() => {
    if (query.trim() && results.length > 0) {
      setIsOpen(true)
    }
  }, [query, results.length])

  const selectResult = useCallback((result: SearchResult) => {
    setIsOpen(false)
    setQuery('')
    setActiveIndex(0)
    router.push(result.href)
  }, [router])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || flatResults.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((prev) => (prev + 1) % flatResults.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((prev) => (prev - 1 + flatResults.length) % flatResults.length)
        break
      case 'Enter':
        e.preventDefault()
        if (flatResults[activeIndex]) {
          selectResult(flatResults[activeIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        inputRef.current?.blur()
        break
    }
  }, [isOpen, flatResults, activeIndex, selectResult])

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const el = listRef.current.children[activeIndex] as HTMLElement
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setIsOpen(true)
      }
    }
    document.addEventListener('keydown', handleGlobalKey)
    return () => document.removeEventListener('keydown', handleGlobalKey)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        {loading ? (
          <Loader2 size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-passport-dim animate-spin" />
        ) : (
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-passport-dim" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder="Search agents, policies, audit..."
          className="w-56 pl-8 pr-8 py-1.5 text-xs rounded-passport bg-passport-surface/60 border border-passport-border text-passport-text placeholder-passport-dim focus:outline-none focus:border-passport-azure/50 focus:bg-passport-surface transition-all"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="search-results"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          autoComplete="off"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setIsOpen(false); inputRef.current?.focus() }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-passport-dim hover:text-passport-text p-0.5"
            aria-label="Clear search"
          >
            <kbd className="kbd text-[9px]">esc</kbd>
          </button>
        )}
      </div>

      {isOpen && (
        <div
          id="search-results"
          className="absolute left-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] glass-panel border border-passport-border overflow-hidden z-50 animate-scaleIn"
          role="listbox"
        >
          {error ? (
            <div className="px-4 py-6 text-center text-sm text-passport-red">
              {error}
            </div>
          ) : loading ? (
            <div className="px-4 py-6 flex items-center justify-center gap-2 text-passport-muted text-sm">
              <Loader2 size={14} className="animate-spin" />
              Loading search data...
            </div>
          ) : flatResults.length === 0 && query.trim() ? (
            <div className="px-4 py-6 text-center">
              <Search size={20} className="text-passport-dim mx-auto mb-2" />
              <p className="text-sm text-passport-muted">No results found</p>
              <p className="text-[11px] text-passport-dim mt-1">Try a different search term</p>
            </div>
          ) : (
            <>
              <div className="max-h-72 overflow-y-auto">
                {(['Agent', 'Policy', 'Audit'] as const).map((cat) => {
                  const items = grouped[cat]
                  if (!items || items.length === 0) return null
                  return (
                    <div key={cat}>
                      <div className="px-3 py-1.5 bg-passport-surface-2/50 border-b border-passport-border/50">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-passport-dim">
                          {cat}s
                        </span>
                        <span className="ml-1.5 text-[10px] text-passport-muted">
                          ({items.length})
                        </span>
                      </div>
                      <ul ref={listRef} role="group" aria-label={`${cat} results`}>
                        {items.map((result) => {
                          const globalIdx = flatResults.indexOf(result)
                          const isActive = globalIdx === activeIndex
                          return (
                            <li key={result.id} role="option" aria-selected={isActive}>
                              <button
                                onClick={() => selectResult(result)}
                                onMouseEnter={() => setActiveIndex(globalIdx)}
                                className={`w-full flex items-start gap-2.5 px-3 py-2 text-left transition-colors ${
                                  isActive
                                    ? 'bg-passport-azure/10'
                                    : 'hover:bg-passport-surface-2/50'
                                }`}
                              >
                                <span className="mt-0.5">{CATEGORY_ICONS[result.category]}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-passport-text font-medium truncate">
                                      {result.name}
                                    </span>
                                    <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-mono border ${CATEGORY_BADGE_COLORS[result.category]}`}>
                                      {result.category}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-passport-dim mt-0.5 truncate">
                                    {result.snippet}
                                  </p>
                                </div>
                                {isActive && (
                                  <span className="shrink-0 mt-0.5 text-passport-dim">
                                    <CornerDownLeft size={12} />
                                  </span>
                                )}
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )
                })}
              </div>
              <div className="px-3 py-1.5 border-t border-passport-border text-center">
                <span className="text-[10px] text-passport-dim font-mono">
                  <kbd className="kbd text-[9px] mr-1">↑↓</kbd> navigate
                  <kbd className="kbd text-[9px] ml-1 mr-1">↵</kbd> select
                  <kbd className="kbd text-[9px] ml-1">esc</kbd> close
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
