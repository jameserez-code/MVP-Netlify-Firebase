'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Play, Save, Clock, Trash2, Copy, Check, ChevronDown, Plus, X } from 'lucide-react'

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE'

interface Header {
  key: string
  value: string
  enabled: boolean
}

interface HistoryEntry {
  id: string
  method: Method
  url: string
  headers: Header[]
  body: string
  response: { status: number; body: string; time: number } | null
  timestamp: number
}

interface SavedSnippet {
  id: string
  name: string
  method: Method
  url: string
  headers: Header[]
  body: string
  createdAt: number
}

const METHOD_COLORS: Record<Method, string> = {
  GET: 'text-passport-green',
  POST: 'text-passport-azure',
  PATCH: 'text-passport-amber',
  DELETE: 'text-passport-red',
}

const STATUS_COLORS = (code: number): string => {
  if (code >= 200 && code < 300) return 'text-passport-green'
  if (code >= 300 && code < 400) return 'text-passport-azure'
  if (code >= 400 && code < 500) return 'text-passport-amber'
  return 'text-passport-red'
}

function highlightJson(json: string): React.ReactNode[] {
  const formatted = (() => {
    try {
      return JSON.stringify(JSON.parse(json), null, 2)
    } catch {
      return json
    }
  })()

  const lines = formatted.split('\n')
  return lines.map((line, i) => {
    const keyMatch = line.match(/^(\s*)("[^"]*")\s*:/)
    if (keyMatch) {
      const [, indent, key] = keyMatch
      const rest = line.slice(keyMatch[0].length)
      return (
        <div key={i}>
          <span className="text-passport-dim">{indent}</span>
          <span className="text-passport-azure">{key}</span>
          <span className="text-passport-dim">: </span>
          <HighlightValue text={rest} />
        </div>
      )
    }
    return (
      <div key={i}>
        <HighlightValue text={line} />
      </div>
    )
  })
}

const VALUE_PATTERNS: [RegExp, string][] = [
  [/^".*?"/, 'text-passport-green'],
  [/^\d+\.?\d*/, 'text-passport-amber'],
  [/^(true|false|null)/, 'text-passport-coral'],
]

function HighlightValue({ text }: { text: string }) {
  for (const [pattern, cls] of VALUE_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      const idx = match.index!
      const prefix = text.slice(0, idx)
      const value = match[0]
      const suffix = text.slice(idx + value.length)
      return (
        <>
          {prefix ? <span>{prefix}</span> : null}
          <span className={cls}>{value}</span>
          {suffix ? <HighlightValue text={suffix} /> : null}
        </>
      )
    }
  }
  return <span>{text}</span>
}

function JSONSyntaxHighlight({ json }: { json: string }) {
  return (
    <pre className="text-xs font-mono text-passport-text whitespace-pre-wrap overflow-auto max-h-80 p-2">
      <code>{highlightJson(json)}</code>
    </pre>
  )
}

function validateJSON(str: string): string | null {
  if (!str.trim()) return null
  try {
    JSON.parse(str)
    return null
  } catch (e: any) {
    return e.message
  }
}

export default function APIPlaygroundPage() {
  const [method, setMethod] = useState<Method>('POST')
  const [url, setUrl] = useState('/enforce')
  const [headers, setHeaders] = useState<Header[]>([
    { key: 'Content-Type', value: 'application/json', enabled: true },
    { key: 'Authorization', value: 'Bearer {{token}}', enabled: true },
  ])
  const [body, setBody] = useState(
    JSON.stringify(
      {
        intent: {
          intentId: 'demo_001',
          agentId: 'agent_demo',
          tool: 'web_search',
          parameters: { query: 'example search query' },
        },
      },
      null,
      2,
    ),
  )
  const [response, setResponse] = useState<{ status: number; body: string; time: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [savedSnippets, setSavedSnippets] = useState<SavedSnippet[]>([])
  const [showSnippets, setShowSnippets] = useState(false)
  const [snippetName, setSnippetName] = useState('')
  const [saveMsg, setSaveMsg] = useState('')
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [showSavedDropdown, setShowSavedDropdown] = useState(false)

  const bodyError = validateJSON(body)

  // Load saved history and snippets from localStorage
  useEffect(() => {
    try {
      const h = localStorage.getItem('playground_history')
      if (h) setHistory(JSON.parse(h).slice(0, 10))
      const s = localStorage.getItem('playground_snippets')
      if (s) setSavedSnippets(JSON.parse(s))
    } catch {}
  }, [])

  const persistHistory = (entries: HistoryEntry[]) => {
    const trimmed = entries.slice(0, 10)
    localStorage.setItem('playground_history', JSON.stringify(trimmed))
  }

  const persistSnippets = (entries: SavedSnippet[]) => {
    localStorage.setItem('playground_snippets', JSON.stringify(entries))
  }

  const sendRequest = useCallback(async () => {
    if (bodyError) return
    setLoading(true)
    setResponse(null)

    const start = performance.now()
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    const fullUrl = url.startsWith('http') ? url : `${apiBase}${url}`

    try {
      const reqHeaders: Record<string, string> = {}
      for (const h of headers) {
        if (h.enabled && h.key) {
          reqHeaders[h.key] = h.value.replace('{{token}}', 'demo-token')
        }
      }

      const fetchOptions: RequestInit = {
        method,
        headers: reqHeaders,
      }

      if (method !== 'GET' && body.trim()) {
        fetchOptions.body = body
      }

      const res = await fetch(fullUrl, fetchOptions)
      const text = await res.text()
      const elapsed = Math.round(performance.now() - start)

      const respObj = { status: res.status, body: text, time: elapsed }
      setResponse(respObj)

      const entry: HistoryEntry = {
        id: `h_${Date.now()}`,
        method,
        url,
        headers: [...headers],
        body,
        response: respObj,
        timestamp: Date.now(),
      }

      const newHistory = [entry, ...history]
      setHistory(newHistory)
      setSelectedHistoryId(entry.id)
      persistHistory(newHistory)
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - start)
      const respObj = { status: 0, body: `Network Error: ${err.message}`, time: elapsed }
      setResponse(respObj)

      const entry: HistoryEntry = {
        id: `h_${Date.now()}`,
        method,
        url,
        headers: [...headers],
        body,
        response: respObj,
        timestamp: Date.now(),
      }
      const newHistory = [entry, ...history]
      setHistory(newHistory)
      setSelectedHistoryId(entry.id)
      persistHistory(newHistory)
    } finally {
      setLoading(false)
    }
  }, [method, url, headers, body, history, bodyError])

  const loadFromHistory = (entry: HistoryEntry) => {
    setMethod(entry.method)
    setUrl(entry.url)
    setHeaders(entry.headers.map((h) => ({ ...h })))
    setBody(entry.body)
    setResponse(entry.response)
    setSelectedHistoryId(entry.id)
  }

  const saveAsSnippet = () => {
    if (!snippetName.trim()) return
    const snippet: SavedSnippet = {
      id: `snip_${Date.now()}`,
      name: snippetName.trim(),
      method,
      url,
      headers: [...headers],
      body,
      createdAt: Date.now(),
    }
    const updated = [snippet, ...savedSnippets]
    setSavedSnippets(updated)
    persistSnippets(updated)
    setSnippetName('')
    setSaveMsg('Snippet saved!')
    setTimeout(() => setSaveMsg(''), 2000)
  }

  const loadSnippet = (snippet: SavedSnippet) => {
    setMethod(snippet.method)
    setUrl(snippet.url)
    setHeaders(snippet.headers.map((h) => ({ ...h })))
    setBody(snippet.body)
    setShowSavedDropdown(false)
  }

  const deleteSnippet = (id: string) => {
    const updated = savedSnippets.filter((s) => s.id !== id)
    setSavedSnippets(updated)
    persistSnippets(updated)
  }

  const clearHistory = () => {
    setHistory([])
    setSelectedHistoryId(null)
    localStorage.removeItem('playground_history')
  }

  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '', enabled: true }])
  }

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index))
  }

  const updateHeader = (index: number, field: 'key' | 'value' | 'enabled', val: string | boolean) => {
    const updated = [...headers]
    updated[index] = { ...updated[index], [field]: val }
    setHeaders(updated)
  }

  const formatBody = () => {
    try {
      const parsed = JSON.parse(body)
      setBody(JSON.stringify(parsed, null, 2))
    } catch {}
  }

  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(idx)
    setTimeout(() => setCopiedIndex(null), 1500)
  }

  return (
    <div className="min-h-screen bg-passport-bg text-passport-text">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">API Playground</h1>
          <p className="text-passport-muted text-sm">Test Passport Agent API endpoints without leaving the dashboard.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column — Request builder */}
          <div className="space-y-4">
            {/* Method + URL bar */}
            <div className="bg-passport-surface border border-passport-border rounded-passport-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                {/* Method selector */}
                <div className="relative">
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as Method)}
                    className="appearance-none bg-passport-surface-2 border border-passport-border text-sm font-mono font-bold px-3 py-2 pr-8 rounded-passport cursor-pointer focus:outline-none focus:border-passport-green focus:ring-1 focus:ring-passport-green"
                  >
                    {(['GET', 'POST', 'PATCH', 'DELETE'] as Method[]).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-passport-muted" />
                </div>

                {/* URL input */}
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="/enforce"
                  className="flex-1 bg-passport-bg border border-passport-border rounded-passport px-3 py-2 text-sm font-mono focus:outline-none focus:border-passport-green"
                />

                {/* Send button */}
                <button
                  onClick={sendRequest}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4 py-2 bg-passport-green text-white text-sm font-semibold rounded-passport hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Play size={14} />
                  {loading ? 'Sending...' : 'Send'}
                </button>
              </div>

              {/* Headers */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-passport-muted uppercase tracking-wider">Headers</span>
                  <button onClick={addHeader} className="text-xs text-passport-azure hover:underline flex items-center gap-1">
                    <Plus size={12} /> Add
                  </button>
                </div>
                <div className="space-y-1.5">
                  {headers.map((h, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={h.enabled}
                        onChange={(e) => updateHeader(i, 'enabled', e.target.checked)}
                        className="w-3.5 h-3.5 accent-passport-green"
                      />
                      <input
                        type="text"
                        value={h.key}
                        onChange={(e) => updateHeader(i, 'key', e.target.value)}
                        placeholder="Header name"
                        className="w-1/3 bg-passport-bg border border-passport-border rounded-passport px-2 py-1 text-xs font-mono focus:outline-none focus:border-passport-green"
                      />
                      <input
                        type="text"
                        value={h.value}
                        onChange={(e) => updateHeader(i, 'value', e.target.value)}
                        placeholder="Value"
                        className="flex-1 bg-passport-bg border border-passport-border rounded-passport px-2 py-1 text-xs font-mono focus:outline-none focus:border-passport-green"
                      />
                      <button
                        onClick={() => removeHeader(i)}
                        className="text-passport-muted hover:text-passport-red p-0.5"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Body editor */}
            <div className="bg-passport-surface border border-passport-border rounded-passport-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-passport-muted uppercase tracking-wider">Body (JSON)</span>
                <div className="flex items-center gap-2">
                  <button onClick={formatBody} className="text-xs text-passport-azure hover:underline">
                    Format
                  </button>
                  <button
                      onClick={() => copyToClipboard(body, -1)}
                      className="text-xs text-passport-azure hover:underline flex items-center gap-1"
                    >
                      {copiedIndex === -1 ? <Check size={12} /> : <Copy size={12} />}
                      Copy
                    </button>
                </div>
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                className="w-full bg-passport-bg border border-passport-border rounded-passport p-3 text-sm font-mono focus:outline-none focus:border-passport-green resize-y"
                placeholder='{"intent": {...}}'
              />
              {bodyError && (
                <p className="text-xs text-passport-red mt-1">JSON Error: {bodyError}</p>
              )}
            </div>

            {/* Save snippet */}
            <div className="bg-passport-surface border border-passport-border rounded-passport-lg p-4">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={snippetName}
                  onChange={(e) => setSnippetName(e.target.value)}
                  placeholder="Snippet name (e.g., Enforce Check)"
                  className="flex-1 bg-passport-bg border border-passport-border rounded-passport px-3 py-2 text-sm focus:outline-none focus:border-passport-green"
                  onKeyDown={(e) => e.key === 'Enter' && saveAsSnippet()}
                />
                <button
                  onClick={saveAsSnippet}
                  className="flex items-center gap-1.5 px-3 py-2 border border-passport-border rounded-passport text-sm hover:bg-passport-surface-2 transition-colors"
                >
                  <Save size={14} /> Save
                </button>
                {saveMsg && <span className="text-xs text-passport-green">{saveMsg}</span>}
              </div>

              {/* Saved snippets dropdown */}
              {savedSnippets.length > 0 && (
                <div className="mt-3">
                  <button
                    onClick={() => setShowSavedDropdown(!showSavedDropdown)}
                    className="flex items-center gap-1 text-xs text-passport-azure hover:underline"
                  >
                    <Clock size={12} /> Saved Snippets ({savedSnippets.length})
                    <ChevronDown size={12} className={`transition-transform ${showSavedDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showSavedDropdown && (
                    <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                      {savedSnippets.map((snip) => (
                        <div
                          key={snip.id}
                          className="flex items-center justify-between bg-passport-bg rounded-passport px-3 py-1.5"
                        >
                          <button
                            onClick={() => loadSnippet(snip)}
                            className="flex items-center gap-2 text-sm hover:text-passport-azure text-left flex-1"
                          >
                            <span className={`font-mono text-xs font-bold ${METHOD_COLORS[snip.method]}`}>
                              {snip.method}
                            </span>
                            <span className="truncate">{snip.name}</span>
                            <span className="text-passport-muted text-xs font-mono truncate">{snip.url}</span>
                          </button>
                          <button onClick={() => deleteSnippet(snip.id)} className="text-passport-muted hover:text-passport-red ml-2">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right column — Response + History */}
          <div className="space-y-4">
            {/* Response viewer */}
            <div className="bg-passport-surface border border-passport-border rounded-passport-lg p-4 min-h-[300px]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-passport-muted uppercase tracking-wider">Response</span>
                {response && (
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-mono font-bold ${STATUS_COLORS(response.status)}`}>
                      {response.status || 'ERR'}
                    </span>
                    <span className="text-xs text-passport-dim">{response.time}ms</span>
                    <button
                      onClick={() => copyToClipboard(response.body, 0)}
                      className="text-xs text-passport-azure hover:underline flex items-center gap-1"
                    >
                      {copiedIndex === 0 ? <Check size={12} /> : <Copy size={12} />}
                      Copy
                    </button>
                  </div>
                )}
              </div>
              {loading ? (
                <div className="flex items-center justify-center h-48 text-passport-muted text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-passport-muted border-t-passport-green rounded-full animate-spin" />
                    Sending request...
                  </div>
                </div>
              ) : response ? (
                <div className="bg-passport-bg rounded-passport p-3">
                  <JSONSyntaxHighlight json={response.body} />
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 text-passport-dim text-sm">
                  Send a request to see the response here
                </div>
              )}
            </div>

            {/* Request History */}
            <div className="bg-passport-surface border border-passport-border rounded-passport-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-passport-muted uppercase tracking-wider">
                  History (last {history.length})
                </span>
                {history.length > 0 && (
                  <button onClick={clearHistory} className="text-xs text-passport-muted hover:text-passport-red flex items-center gap-1">
                    <Trash2 size={12} /> Clear
                  </button>
                )}
              </div>
              {history.length === 0 ? (
                <p className="text-passport-dim text-sm">No requests yet. Send one to see it here.</p>
              ) : (
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {history.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => loadFromHistory(entry)}
                      className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-passport text-xs transition-colors ${
                        entry.id === selectedHistoryId
                          ? 'bg-passport-green-dim border border-passport-green/30'
                          : 'hover:bg-passport-surface-2'
                      }`}
                    >
                      <span className={`font-mono font-bold w-12 shrink-0 ${METHOD_COLORS[entry.method]}`}>
                        {entry.method}
                      </span>
                      <span className="truncate font-mono flex-1">{entry.url}</span>
                      {entry.response && (
                        <span className={`font-mono font-bold ${STATUS_COLORS(entry.response.status)}`}>
                          {entry.response.status}
                        </span>
                      )}
                      <span className="text-passport-dim text-[10px]">
                        {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
