'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Navbar from '@/components/navbar'
import {
  Search,
  ChevronRight,
  ChevronDown,
  Lock,
  Key,
  Copy,
  CheckCircle2,
  Terminal,
  BookOpen,
  Zap,
  Shield,
  Activity,
  Server,
  Globe,
  BarChart3,
  Webhook,
} from 'lucide-react'

/* ─── Types ─── */

interface Endpoint {
  id: string
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  description: string
  auth: 'JWT' | 'API Key' | 'None'
  requestBody?: Record<string, unknown>
  responses: Record<string, string>
  example: { curl: string; ts: string }
}

interface Category {
  id: string
  title: string
  icon: React.ReactNode
  endpoints: Endpoint[]
}

/* ─── Syntax Highlighting ─── */

function highlightTS(code: string) {
  const keywords = ['import', 'from', 'const', 'let', 'var', 'new', 'await', 'return', 'async', 'function', 'class', 'export', 'default', 'type', 'interface', 'if', 'else', 'try', 'catch', 'throw']
  const parts = code.split(/('[^']*'|`[^`]*`|"[^"]*"|\b(?:import|from|const|let|var|new|await|return|async|function|class|export|default|type|interface|if|else|try|catch|throw)\b|\/\/.*|\{|\}|\(|\)|\[|\]|=>|;|:|,|\.|\?)/g)
  return parts.map((part, i) => {
    if (part.match(/^['"`].*['"`]$/)) return <span key={i} className="text-passport-green">{part}</span>
    if (keywords.includes(part)) return <span key={i} className="text-passport-azure">{part}</span>
    if (part.startsWith('//')) return <span key={i} className="text-passport-coral">{part}</span>
    if (part === '{' || part === '}' || part === '(' || part === ')' || part === '[' || part === ']' || part === '=>')
      return <span key={i} className="text-passport-dim">{part}</span>
    return <span key={i}>{part}</span>
  })
}

function highlightBash(code: string) {
  const lines = code.split('\n')
  return lines.map((line, i) => (
    <div key={i}>
      {line.startsWith('#') ? (
        <span className="text-passport-coral">{line}</span>
      ) : (
        line.split(/('[^']*')/g).map((part, j) =>
          part.startsWith("'") && part.endsWith("'") ? (
            <span key={j} className="text-passport-green">{part}</span>
          ) : (
            <span key={j}>{part}</span>
          )
        )
      )}
    </div>
  ))
}

/* ─── Components ─── */

function MethodBadge({ method }: { method: Endpoint['method'] }) {
  const map = {
    GET: 'method-get',
    POST: 'method-post',
    PATCH: 'method-patch',
    DELETE: 'method-delete',
  }
  return <span className={`method-tag ${map[method]}`}>{method}</span>
}

function CodeBlock({ code, lang }: { code: string; lang: 'bash' | 'typescript' }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative rounded-md overflow-hidden bg-[#0d1117] border border-passport-border">
      <div className="flex items-center justify-between px-3 py-2 border-b border-passport-border bg-passport-surface">
        <span className="font-mono text-[10px] uppercase tracking-wider text-passport-dim">{lang}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[10px] font-mono text-passport-muted hover:text-passport-text transition-colors"
        >
          {copied ? <CheckCircle2 size={12} className="text-passport-green" /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed font-mono">
        <code>{lang === 'bash' ? highlightBash(code) : highlightTS(code)}</code>
      </pre>
    </div>
  )
}

function EndpointCard({ endpoint }: { endpoint: Endpoint }) {
  const [open, setOpen] = useState(false)

  return (
    <div id={endpoint.id} className="border border-passport-border rounded-md overflow-hidden scroll-mt-24">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-passport-surface/50 transition-colors"
      >
        <MethodBadge method={endpoint.method} />
        <code className="font-mono text-sm text-passport-text">{endpoint.path}</code>
        <span className="hidden sm:inline text-xs text-passport-muted ml-2">{endpoint.description}</span>
        <span className="ml-auto flex items-center gap-2 shrink-0">
          {endpoint.auth !== 'None' && <Lock size={12} className="text-passport-green" />}
          {open ? <ChevronDown size={14} className="text-passport-muted" /> : <ChevronRight size={14} className="text-passport-muted" />}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-passport-border bg-passport-surface/20 animate-fade-in">
          <div className="pt-3 space-y-4">
            <p className="text-sm text-passport-muted leading-relaxed">{endpoint.description}</p>

            <div className="flex items-center gap-2">
              <span className="label-text mb-0">Auth:</span>
              <span className={`text-xs font-mono px-2 py-0.5 rounded ${endpoint.auth === 'None' ? 'bg-passport-surface text-passport-dim' : 'bg-passport-green/10 text-passport-green'}`}>
                {endpoint.auth}
              </span>
            </div>

            {endpoint.requestBody && (
              <div>
                <div className="label-text mb-1">Request Body</div>
                <pre className="p-3 rounded bg-[#0d1117] border border-passport-border text-[12px] font-mono text-passport-text overflow-x-auto">
                  {JSON.stringify(endpoint.requestBody, null, 2)}
                </pre>
              </div>
            )}

            <div>
              <div className="label-text mb-1">Responses</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(endpoint.responses).map(([code, desc]) => (
                  <div key={code} className="flex items-center gap-2 text-xs">
                    <span className={`font-mono font-bold ${code.startsWith('2') ? 'text-passport-green' : code.startsWith('4') ? 'text-passport-amber' : 'text-passport-red'}`}>
                      {code}
                    </span>
                    <span className="text-passport-muted">{desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="label-text mb-1">Example</div>
              <CodeBlock code={endpoint.example.curl} lang="bash" />
              <CodeBlock code={endpoint.example.ts} lang="typescript" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Data ─── */

const categories: Category[] = [
  {
    id: 'auth',
    title: 'Authentication',
    icon: <Key size={18} className="text-passport-green" />,
    endpoints: [
      {
        id: 'post-auth-login',
        method: 'POST',
        path: '/auth/login',
        description: 'Authenticate and get JWT token',
        auth: 'None',
        requestBody: { email: 'user@example.com', password: 'string' },
        responses: { '200': 'JWT token + user info', '400': 'Validation error', '401': 'Invalid credentials' },
        example: {
          curl: `curl -X POST http://localhost:3000/auth/login \\
  -H 'Content-Type: application/json' \\
  -d '{"email":"admin@example.com","password":"your-password"}'`,
          ts: `const res = await fetch('http://localhost:3000/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@example.com', password: 'your-password' }),
})
const { token, user } = await res.json()`,
        },
      },
    ],
  },
  {
    id: 'tasks',
    title: 'Tasks & Runs',
    icon: <Terminal size={18} className="text-passport-azure" />,
    endpoints: [
      {
        id: 'post-task',
        method: 'POST',
        path: '/task',
        description: 'Create a new task',
        auth: 'JWT',
        requestBody: { payload: { query: 'string' } },
        responses: { '201': 'Task created', '400': 'Validation error', '401': 'Unauthorized', '503': 'Firestore unavailable' },
        example: {
          curl: `curl -X POST http://localhost:3000/task \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer <token>' \\
  -d '{"payload":{"query":"analyze sales data"}}'`,
          ts: `const res = await fetch('http://localhost:3000/task', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token,
  },
  body: JSON.stringify({ payload: { query: 'analyze sales data' } }),
})
const task = await res.json()`,
        },
      },
      {
        id: 'get-task-id',
        method: 'GET',
        path: '/task/:id',
        description: 'Get task by ID',
        auth: 'None',
        responses: { '200': 'Task document', '404': 'Task not found', '503': 'Firestore unavailable' },
        example: {
          curl: `curl http://localhost:3000/task/task_abc123`,
          ts: `const res = await fetch('http://localhost:3000/task/task_abc123')
const task = await res.json()`,
        },
      },
      {
        id: 'get-tasks',
        method: 'GET',
        path: '/tasks',
        description: 'List tasks with pagination and optional status filter',
        auth: 'None',
        responses: { '200': 'Paginated task list', '503': 'Firestore unavailable' },
        example: {
          curl: `curl 'http://localhost:3000/tasks?page=1&limit=20&status=pending'`,
          ts: `const res = await fetch('http://localhost:3000/tasks?page=1&limit=20')
const { data, pagination } = await res.json()`,
        },
      },
      {
        id: 'post-agent-run',
        method: 'POST',
        path: '/agent/run',
        description: 'Start an agent run on a task',
        auth: 'JWT',
        requestBody: { agentId: 'agent_xxx', taskId: 'task_xxx' },
        responses: { '201': 'Run started', '400': 'Validation error', '401': 'Unauthorized', '409': 'Invalid state transition' },
        example: {
          curl: `curl -X POST http://localhost:3000/agent/run \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer <token>' \\
  -d '{"agentId":"agent_abc","taskId":"task_123"}'`,
          ts: `const res = await fetch('http://localhost:3000/agent/run', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token,
  },
  body: JSON.stringify({ agentId: 'agent_abc', taskId: 'task_123' }),
})
const run = await res.json()`,
        },
      },
      {
        id: 'get-runs',
        method: 'GET',
        path: '/runs',
        description: 'List runs with pagination and optional status filter',
        auth: 'None',
        responses: { '200': 'Paginated run list', '503': 'Firestore unavailable' },
        example: {
          curl: `curl 'http://localhost:3000/runs?page=1&limit=20&status=running'`,
          ts: `const res = await fetch('http://localhost:3000/runs?page=1&limit=20')
const { data, pagination } = await res.json()`,
        },
      },
      {
        id: 'post-run-log',
        method: 'POST',
        path: '/run/:id/log',
        description: 'Log an agent action during a run',
        auth: 'JWT',
        requestBody: { tool: 'web_search', decision: 'allow', parameters: {}, reason: 'string' },
        responses: { '201': 'Action logged', '400': 'Validation error', '401': 'Unauthorized', '404': 'Run not found', '409': 'Run not active' },
        example: {
          curl: `curl -X POST http://localhost:3000/run/run_abc/log \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer <token>' \\
  -d '{"tool":"web_search","decision":"allow","parameters":{"query":"AI safety"}}'`,
          ts: `const res = await fetch('http://localhost:3000/run/run_abc/log', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token,
  },
  body: JSON.stringify({
    tool: 'web_search',
    decision: 'allow',
    parameters: { query: 'AI safety' },
  }),
})`,
        },
      },
      {
        id: 'patch-run-complete',
        method: 'PATCH',
        path: '/run/:id/complete',
        description: 'Mark a run as completed',
        auth: 'JWT',
        responses: { '200': 'Run completed', '401': 'Unauthorized', '404': 'Run not found', '409': 'Invalid transition' },
        example: {
          curl: `curl -X PATCH http://localhost:3000/run/run_abc/complete \\
  -H 'Authorization: Bearer <token>'`,
          ts: `const res = await fetch('http://localhost:3000/run/run_abc/complete', {
  method: 'PATCH',
  headers: { 'Authorization': 'Bearer ' + token },
})`,
        },
      },
      {
        id: 'patch-run-fail',
        method: 'PATCH',
        path: '/run/:id/fail',
        description: 'Mark a run as failed',
        auth: 'JWT',
        requestBody: { error: 'string' },
        responses: { '200': 'Run failed', '401': 'Unauthorized', '404': 'Run not found', '409': 'Invalid transition' },
        example: {
          curl: `curl -X PATCH http://localhost:3000/run/run_abc/fail \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer <token>' \\
  -d '{"error":"Timeout exceeded"}'`,
          ts: `const res = await fetch('http://localhost:3000/run/run_abc/fail', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token,
  },
  body: JSON.stringify({ error: 'Timeout exceeded' }),
})`,
        },
      },
    ],
  },
  {
    id: 'agents',
    title: 'Agents',
    icon: <Shield size={18} className="text-passport-coral" />,
    endpoints: [
      {
        id: 'post-agents-register',
        method: 'POST',
        path: '/agents/register',
        description: 'Register a new agent',
        auth: 'None',
        requestBody: { name: 'string', model: 'gpt-4', provider: 'openai', systemPrompt: 'string', environment: 'production', metadata: {} },
        responses: { '201': 'Agent registered with secret key', '400': 'Validation error', '503': 'Firestore unavailable' },
        example: {
          curl: `curl -X POST http://localhost:3000/agents/register \\
  -H 'Content-Type: application/json' \\
  -d '{"name":"ResearchAgent","model":"gpt-4","provider":"openai"}'`,
          ts: `const res = await fetch('http://localhost:3000/agents/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'ResearchAgent',
    model: 'gpt-4',
    provider: 'openai',
  }),
})
const { agentId, secretKey } = await res.json()`,
        },
      },
      {
        id: 'get-agents',
        method: 'GET',
        path: '/agents',
        description: 'List agents with optional status filter and pagination',
        auth: 'None',
        responses: { '200': 'Paginated agent list', '503': 'Firestore unavailable' },
        example: {
          curl: `curl 'http://localhost:3000/agents?status=active'`,
          ts: `const res = await fetch('http://localhost:3000/agents?status=active')
const { data, pagination } = await res.json()`,
        },
      },
      {
        id: 'get-agent-id',
        method: 'GET',
        path: '/agents/:id',
        description: 'Get agent by ID',
        auth: 'None',
        responses: { '200': 'Agent document', '404': 'Agent not found' },
        example: {
          curl: `curl http://localhost:3000/agents/agent_abc`,
          ts: `const res = await fetch('http://localhost:3000/agents/agent_abc')
const agent = await res.json()`,
        },
      },
      {
        id: 'patch-agent-revoke',
        method: 'PATCH',
        path: '/agents/:id/revoke',
        description: 'Revoke an agent',
        auth: 'JWT',
        requestBody: { reason: 'string' },
        responses: { '200': 'Agent revoked', '401': 'Unauthorized', '404': 'Agent not found' },
        example: {
          curl: `curl -X PATCH http://localhost:3000/agents/agent_abc/revoke \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer <token>' \\
  -d '{"reason":"Security incident"}'`,
          ts: `const res = await fetch('http://localhost:3000/agents/agent_abc/revoke', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token,
  },
  body: JSON.stringify({ reason: 'Security incident' }),
})`,
        },
      },
      {
        id: 'post-agent-rotate',
        method: 'POST',
        path: '/agents/:id/rotate-key',
        description: 'Rotate agent secret key',
        auth: 'JWT',
        responses: { '200': 'Key rotated', '401': 'Unauthorized', '404': 'Agent not found' },
        example: {
          curl: `curl -X POST http://localhost:3000/agents/agent_abc/rotate-key \\
  -H 'Authorization: Bearer <token>'`,
          ts: `const res = await fetch('http://localhost:3000/agents/agent_abc/rotate-key', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + token },
})
const { newSecretKey } = await res.json()`,
        },
      },
    ],
  },
  {
    id: 'policies',
    title: 'Policies',
    icon: <BookOpen size={18} className="text-passport-amber" />,
    endpoints: [
      {
        id: 'post-policies',
        method: 'POST',
        path: '/policies',
        description: 'Create a new policy',
        auth: 'JWT',
        requestBody: {
          name: 'string',
          description: 'string',
          scope: { agentId: '*', environment: ['*'] },
          priority: 50,
          rules: {
            allowedTools: ['web_search'],
            deniedTools: ['delete_database'],
            allowedDomains: ['*.example.com'],
            deniedDomains: ['*.bad.com'],
            costLimit: null,
            dataRestrictions: null,
          },
        },
        responses: { '201': 'Policy created', '400': 'Validation error', '401': 'Unauthorized', '503': 'Firestore unavailable' },
        example: {
          curl: `curl -X POST http://localhost:3000/policies \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer <token>' \\
  -d '{"name":"Safe Web","rules":{"allowedTools":["web_search","read_file"],"deniedTools":["delete_database"]}}'`,
          ts: `const res = await fetch('http://localhost:3000/policies', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token,
  },
  body: JSON.stringify({
    name: 'Safe Web',
    rules: {
      allowedTools: ['web_search', 'read_file'],
      deniedTools: ['delete_database'],
    },
  }),
})`,
        },
      },
      {
        id: 'get-policies',
        method: 'GET',
        path: '/policies',
        description: 'List policies with optional filters and pagination',
        auth: 'None',
        responses: { '200': 'Paginated policy list', '503': 'Firestore unavailable' },
        example: {
          curl: `curl 'http://localhost:3000/policies?status=active'`,
          ts: `const res = await fetch('http://localhost:3000/policies?status=active')
const { data, pagination } = await res.json()`,
        },
      },
      {
        id: 'get-policy-id',
        method: 'GET',
        path: '/policies/:id',
        description: 'Get policy by ID',
        auth: 'None',
        responses: { '200': 'Policy document', '404': 'Policy not found' },
        example: {
          curl: `curl http://localhost:3000/policies/pol_abc`,
          ts: `const res = await fetch('http://localhost:3000/policies/pol_abc')
const policy = await res.json()`,
        },
      },
      {
        id: 'patch-policy-id',
        method: 'PATCH',
        path: '/policies/:id',
        description: 'Update a policy',
        auth: 'JWT',
        requestBody: { name: 'string', status: 'active', rules: {}, priority: 50 },
        responses: { '200': 'Policy updated', '401': 'Unauthorized', '404': 'Policy not found' },
        example: {
          curl: `curl -X PATCH http://localhost:3000/policies/pol_abc \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer <token>' \\
  -d '{"status":"inactive"}'`,
          ts: `const res = await fetch('http://localhost:3000/policies/pol_abc', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token,
  },
  body: JSON.stringify({ status: 'inactive' }),
})`,
        },
      },
    ],
  },
  {
    id: 'enforcement',
    title: 'Enforcement',
    icon: <Zap size={18} className="text-passport-green" />,
    endpoints: [
      {
        id: 'post-enforce',
        method: 'POST',
        path: '/enforce',
        description: 'Evaluate agent intent against policies',
        auth: 'JWT',
        requestBody: {
          intent: {
            intentId: 'string',
            agentId: 'agent_xxx',
            tool: 'web_search',
            parameters: { query: 'string' },
          },
        },
        responses: { '200': 'Enforcement decision + gateway ticket', '400': 'Validation error', '401': 'Agent unknown', '403': 'Agent inactive', '500': 'Enforce failed' },
        example: {
          curl: `curl -X POST http://localhost:3000/enforce \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer <token>' \\
  -d '{"intent":{"intentId":"int_001","agentId":"agent_abc","tool":"web_search","parameters":{"query":"latest AI news"}}}'`,
          ts: `const res = await fetch('http://localhost:3000/enforce', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token,
  },
  body: JSON.stringify({
    intent: {
      intentId: 'int_001',
      agentId: 'agent_abc',
      tool: 'web_search',
      parameters: { query: 'latest AI news' },
    },
  }),
})
const { decision, gatewayTicket } = await res.json()`,
        },
      },
      {
        id: 'post-gateway-execute',
        method: 'POST',
        path: '/gateway/execute',
        description: 'Execute tool via gateway ticket',
        auth: 'None',
        requestBody: { gatewayTicket: 'gt_xxx', action: { tool: 'web_search' } },
        responses: { '200': 'Executed', '400': 'Validation error', '403': 'Invalid or replayed ticket', '500': 'Gateway failed' },
        example: {
          curl: `curl -X POST http://localhost:3000/gateway/execute \\
  -H 'Content-Type: application/json' \\
  -d '{"gatewayTicket":"gt_abc...","action":{"tool":"web_search"}}'`,
          ts: `const res = await fetch('http://localhost:3000/gateway/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    gatewayTicket: 'gt_abc...',
    action: { tool: 'web_search' },
  }),
})
const { executed, result } = await res.json()`,
        },
      },
    ],
  },
  {
    id: 'observability',
    title: 'Observability',
    icon: <Activity size={18} className="text-passport-azure" />,
    endpoints: [
      {
        id: 'get-audit',
        method: 'GET',
        path: '/audit',
        description: 'Query action intents with optional decision/tool filters and pagination',
        auth: 'None',
        responses: { '200': 'Paginated audit log', '503': 'Firestore unavailable' },
        example: {
          curl: `curl 'http://localhost:3000/audit?decision=deny&limit=50'`,
          ts: `const res = await fetch('http://localhost:3000/audit?decision=deny&limit=50')
const { data, pagination } = await res.json()`,
        },
      },
      {
        id: 'get-audit-timeline',
        method: 'GET',
        path: '/audit/timeline',
        description: 'Execution timeline — chronological event history',
        auth: 'None',
        responses: { '200': 'Timeline events', '503': 'Firestore unavailable' },
        example: {
          curl: `curl 'http://localhost:3000/audit/timeline?limit=50'`,
          ts: `const res = await fetch('http://localhost:3000/audit/timeline?limit=50')
const { timeline } = await res.json()`,
        },
      },
      {
        id: 'get-run-trace',
        method: 'GET',
        path: '/run/:id/trace',
        description: 'Full execution trace for a run',
        auth: 'None',
        responses: { '200': 'Run + task + events', '404': 'Run not found', '503': 'Firestore unavailable' },
        example: {
          curl: `curl http://localhost:3000/run/run_abc/trace`,
          ts: `const res = await fetch('http://localhost:3000/run/run_abc/trace')
const { run, task, events } = await res.json()`,
        },
      },
      {
        id: 'get-metrics',
        method: 'GET',
        path: '/metrics',
        description: 'Operational metrics — task/run/agent counts and avg duration',
        auth: 'None',
        responses: { '200': 'Metrics snapshot', '503': 'Firestore unavailable' },
        example: {
          curl: `curl http://localhost:3000/metrics`,
          ts: `const res = await fetch('http://localhost:3000/metrics')
const metrics = await res.json()`,
        },
      },
      {
        id: 'get-diagnostics',
        method: 'GET',
        path: '/diagnostics',
        description: 'System diagnostics — full health check with Firebase connectivity',
        auth: 'None',
        responses: { '200': 'Diagnostics report', '500': 'Diagnostics failed' },
        example: {
          curl: `curl http://localhost:3000/diagnostics`,
          ts: `const res = await fetch('http://localhost:3000/diagnostics')
const diag = await res.json()`,
        },
      },
      {
        id: 'get-consistency',
        method: 'GET',
        path: '/consistency',
        description: 'Detect bad states — orphaned runs and stuck tasks',
        auth: 'None',
        responses: { '200': 'Consistency report', '500': 'Check failed' },
        example: {
          curl: `curl http://localhost:3000/consistency`,
          ts: `const res = await fetch('http://localhost:3000/consistency')
const report = await res.json()`,
        },
      },
      {
        id: 'post-repair',
        method: 'POST',
        path: '/repair',
        description: 'Safely repair common inconsistencies',
        auth: 'JWT',
        requestBody: { action: 'orphaned' },
        responses: { '200': 'Repair result', '401': 'Unauthorized', '500': 'Repair failed' },
        example: {
          curl: `curl -X POST http://localhost:3000/repair \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer <token>' \\
  -d '{"action":"orphaned"}'`,
          ts: `const res = await fetch('http://localhost:3000/repair', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token,
  },
  body: JSON.stringify({ action: 'orphaned' }),
})`,
        },
      },
      {
        id: 'get-report',
        method: 'GET',
        path: '/report',
        description: 'Operational summary report',
        auth: 'None',
        responses: { '200': 'Operational report', '500': 'Report failed' },
        example: {
          curl: `curl http://localhost:3000/report`,
          ts: `const res = await fetch('http://localhost:3000/report')
const report = await res.json()`,
        },
      },
      {
        id: 'get-health',
        method: 'GET',
        path: '/health',
        description: 'Health check — no auth required',
        auth: 'None',
        responses: { '200': 'Health status', '503': 'Service unavailable' },
        example: {
          curl: `curl http://localhost:3000/health`,
          ts: `const res = await fetch('http://localhost:3000/health')
const health = await res.json()`,
        },
      },
      {
        id: 'get-sessions',
        method: 'GET',
        path: '/sessions',
        description: 'List recent sessions',
        auth: 'None',
        responses: { '200': 'Session list', '503': 'Firestore unavailable' },
        example: {
          curl: `curl http://localhost:3000/sessions`,
          ts: `const res = await fetch('http://localhost:3000/sessions')
const { data } = await res.json()`,
        },
      },
      {
        id: 'get-session-id',
        method: 'GET',
        path: '/sessions/:id',
        description: 'Get session details with runs and logs',
        auth: 'None',
        responses: { '200': 'Session details', '404': 'Session not found', '503': 'Firestore unavailable' },
        example: {
          curl: `curl http://localhost:3000/sessions/sess_abc`,
          ts: `const res = await fetch('http://localhost:3000/sessions/sess_abc')
const { session, runs, logs } = await res.json()`,
        },
      },
      {
        id: 'get-analytics-overview',
        method: 'GET',
        path: '/analytics/overview',
        description: 'Analytics overview — enforcement stats, top violations, active agents',
        auth: 'None',
        responses: { '200': 'Analytics overview', '503': 'Firestore unavailable' },
        example: {
          curl: `curl 'http://localhost:3000/analytics/overview?period=7d'`,
          ts: `const res = await fetch('http://localhost:3000/analytics/overview?period=7d')
const overview = await res.json()`,
        },
      },
      {
        id: 'get-analytics-trends',
        method: 'GET',
        path: '/analytics/trends',
        description: 'Daily enforcement trends over a period',
        auth: 'None',
        responses: { '200': 'Trend data', '503': 'Firestore unavailable' },
        example: {
          curl: `curl 'http://localhost:3000/analytics/trends?period=7d'`,
          ts: `const res = await fetch('http://localhost:3000/analytics/trends?period=7d')
const { daily } = await res.json()`,
        },
      },
      {
        id: 'get-analytics-agents',
        method: 'GET',
        path: '/analytics/agents',
        description: 'Per-agent enforcement statistics',
        auth: 'None',
        responses: { '200': 'Agent stats', '503': 'Firestore unavailable' },
        example: {
          curl: `curl 'http://localhost:3000/analytics/agents?period=7d'`,
          ts: `const res = await fetch('http://localhost:3000/analytics/agents?period=7d')
const { agents } = await res.json()`,
        },
      },
      {
        id: 'get-analytics-policies',
        method: 'GET',
        path: '/analytics/policies',
        description: 'Per-policy trigger and prevention statistics',
        auth: 'None',
        responses: { '200': 'Policy stats', '503': 'Firestore unavailable' },
        example: {
          curl: `curl 'http://localhost:3000/analytics/policies?period=7d'`,
          ts: `const res = await fetch('http://localhost:3000/analytics/policies?period=7d')
const { policies } = await res.json()`,
        },
      },
    ],
  },
  {
    id: 'organization',
    title: 'Organization',
    icon: <Globe size={18} className="text-passport-green" />,
    endpoints: [
      {
        id: 'post-org-seed',
        method: 'POST',
        path: '/org/seed',
        description: 'Create isolated demo org',
        auth: 'JWT',
        requestBody: { name: 'string', email: 'string' },
        responses: { '201': 'Org seeded', '400': 'Validation error', '401': 'Unauthorized', '500': 'Seed failed' },
        example: {
          curl: `curl -X POST http://localhost:3000/org/seed \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer <token>' \\
  -d '{"name":"Acme Corp","email":"admin@acme.com"}'`,
          ts: `const res = await fetch('http://localhost:3000/org/seed', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token,
  },
  body: JSON.stringify({ name: 'Acme Corp', email: 'admin@acme.com' }),
})`,
        },
      },
      {
        id: 'get-org-metrics',
        method: 'GET',
        path: '/org/metrics',
        description: 'Org-scoped metrics',
        auth: 'None',
        responses: { '200': 'Org metrics', '400': 'Missing orgId', '500': 'Metrics failed' },
        example: {
          curl: `curl 'http://localhost:3000/org/metrics?orgId=org_abc'`,
          ts: `const res = await fetch('http://localhost:3000/org/metrics?orgId=org_abc')
const metrics = await res.json()`,
        },
      },
    ],
  },
  {
    id: 'api-keys',
    title: 'API Keys',
    icon: <Key size={18} className="text-passport-amber" />,
    endpoints: [
      {
        id: 'post-api-keys',
        method: 'POST',
        path: '/api-keys',
        description: 'Create a new API key (returned once)',
        auth: 'JWT',
        requestBody: { name: 'string', scopes: ['read', 'write'] },
        responses: { '201': 'API key created', '400': 'Validation error', '401': 'Unauthorized', '503': 'Firestore unavailable' },
        example: {
          curl: `curl -X POST http://localhost:3000/api-keys \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer <token>' \\
  -d '{"name":"Production","scopes":["read","write"]}'`,
          ts: `const res = await fetch('http://localhost:3000/api-keys', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token,
  },
  body: JSON.stringify({ name: 'Production', scopes: ['read', 'write'] }),
})
const { key } = await res.json() // returned once`,
        },
      },
      {
        id: 'get-api-keys',
        method: 'GET',
        path: '/api-keys',
        description: 'List API keys (masked)',
        auth: 'JWT',
        responses: { '200': 'Paginated key list', '401': 'Unauthorized', '503': 'Firestore unavailable' },
        example: {
          curl: `curl http://localhost:3000/api-keys \\
  -H 'Authorization: Bearer <token>'`,
          ts: `const res = await fetch('http://localhost:3000/api-keys', {
  headers: { 'Authorization': 'Bearer ' + token },
})
const { data, pagination } = await res.json()`,
        },
      },
      {
        id: 'delete-api-key',
        method: 'DELETE',
        path: '/api-keys/:id',
        description: 'Revoke an API key',
        auth: 'JWT',
        responses: { '200': 'Key revoked', '401': 'Unauthorized', '404': 'Key not found' },
        example: {
          curl: `curl -X DELETE http://localhost:3000/api-keys/key_abc \\
  -H 'Authorization: Bearer <token>'`,
          ts: `const res = await fetch('http://localhost:3000/api-keys/key_abc', {
  method: 'DELETE',
  headers: { 'Authorization': 'Bearer ' + token },
})`,
        },
      },
      {
        id: 'post-api-key-rotate',
        method: 'POST',
        path: '/api-keys/:id/rotate',
        description: 'Rotate API key — revoke old, create new',
        auth: 'JWT',
        responses: { '201': 'Key rotated', '401': 'Unauthorized', '404': 'Key not found', '503': 'Firestore unavailable' },
        example: {
          curl: `curl -X POST http://localhost:3000/api-keys/key_abc/rotate \\
  -H 'Authorization: Bearer <token>'`,
          ts: `const res = await fetch('http://localhost:3000/api-keys/key_abc/rotate', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer ' + token },
})
const { key } = await res.json() // returned once`,
        },
      },
    ],
  },
  {
    id: 'webhooks',
    title: 'Webhooks',
    icon: <Webhook size={18} className="text-passport-coral" />,
    endpoints: [
      {
        id: 'post-webhooks',
        method: 'POST',
        path: '/webhooks',
        description: 'Register a webhook',
        auth: 'None',
        requestBody: { url: 'https://hooks.slack.com/...', events: ['policy.violation'], name: 'string', secret: 'string', active: true },
        responses: { '201': 'Webhook registered', '400': 'Validation error', '503': 'Firestore unavailable' },
        example: {
          curl: `curl -X POST http://localhost:3000/webhooks \\
  -H 'Content-Type: application/json' \\
  -d '{"url":"https://hooks.slack.com/services/...","events":["policy.violation"],"name":"Slack Alerts"}'`,
          ts: `const res = await fetch('http://localhost:3000/webhooks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://hooks.slack.com/services/...',
    events: ['policy.violation'],
    name: 'Slack Alerts',
  }),
})`,
        },
      },
      {
        id: 'get-webhooks',
        method: 'GET',
        path: '/webhooks',
        description: 'List webhooks for org',
        auth: 'None',
        responses: { '200': 'Webhook list', '503': 'Firestore unavailable' },
        example: {
          curl: `curl http://localhost:3000/webhooks`,
          ts: `const res = await fetch('http://localhost:3000/webhooks')
const { data } = await res.json()`,
        },
      },
      {
        id: 'get-webhook-id',
        method: 'GET',
        path: '/webhooks/:id',
        description: 'Get webhook details + delivery log',
        auth: 'None',
        responses: { '200': 'Webhook details', '404': 'Webhook not found' },
        example: {
          curl: `curl http://localhost:3000/webhooks/wh_abc`,
          ts: `const res = await fetch('http://localhost:3000/webhooks/wh_abc')
const webhook = await res.json()`,
        },
      },
      {
        id: 'delete-webhook',
        method: 'DELETE',
        path: '/webhooks/:id',
        description: 'Deactivate a webhook',
        auth: 'None',
        responses: { '200': 'Webhook deactivated', '404': 'Webhook not found' },
        example: {
          curl: `curl -X DELETE http://localhost:3000/webhooks/wh_abc`,
          ts: `const res = await fetch('http://localhost:3000/webhooks/wh_abc', {
  method: 'DELETE',
})`,
        },
      },
      {
        id: 'post-webhook-test',
        method: 'POST',
        path: '/webhooks/:id/test',
        description: 'Send test ping event',
        auth: 'None',
        responses: { '200': 'Test dispatched', '400': 'Webhook inactive', '404': 'Webhook not found' },
        example: {
          curl: `curl -X POST http://localhost:3000/webhooks/wh_abc/test`,
          ts: `const res = await fetch('http://localhost:3000/webhooks/wh_abc/test', {
  method: 'POST',
})`,
        },
      },
      {
        id: 'post-webhook-rotate',
        method: 'POST',
        path: '/webhooks/:id/rotate',
        description: 'Rotate webhook secret',
        auth: 'None',
        responses: { '200': 'Secret rotated', '404': 'Webhook not found' },
        example: {
          curl: `curl -X POST http://localhost:3000/webhooks/wh_abc/rotate`,
          ts: `const res = await fetch('http://localhost:3000/webhooks/wh_abc/rotate', {
  method: 'POST',
})
const { newSecret } = await res.json()`,
        },
      },
    ],
  },
]

/* ─── Page ─── */

export default function DocsPage() {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return categories
      .map((cat) => ({
        ...cat,
        endpoints: cat.endpoints.filter(
          (ep) =>
            ep.path.toLowerCase().includes(q) ||
            ep.description.toLowerCase().includes(q) ||
            ep.method.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.endpoints.length > 0)
  }, [query])

  const jwtExample = `curl -X POST http://localhost:3000/enforce \\
  -H 'Authorization: Bearer eyJhbG...' \\
  -H 'Content-Type: application/json' \\
  -d '{"intent":{"tool":"web_search","agentId":"agent_abc"}}'`

  const apiKeyExample = `curl -X POST http://localhost:3000/enforce \\
  -H 'X-API-Key: passport_live_...' \\
  -H 'Content-Type: application/json' \\
  -d '{"intent":{"tool":"web_search","agentId":"agent_abc"}}'`

  return (
    <div className="min-h-screen bg-passport-bg">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-passport-green/20 bg-passport-green/5 text-passport-green text-xs font-mono mb-6">
              <Server size={12} />
              RESTful API v2.1
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-passport-text tracking-tight mb-4">
              API Reference
            </h1>
            <p className="text-lg text-passport-muted max-w-2xl mx-auto">
              RESTful API for AI Agent Passport — authenticate, authorize, and audit AI agents in production.
            </p>
          </div>

          {/* Search */}
          <div className="max-w-xl mx-auto mb-12">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-passport-dim" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search endpoints by path, method, or description..."
                className="input-field pl-9 pr-4 py-2.5 text-sm"
              />
            </div>
          </div>

          {/* Auth Section */}
          <div className="grid lg:grid-cols-2 gap-6 mb-16">
            <div className="glass-panel p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lock size={16} className="text-passport-green" />
                <h2 className="text-sm font-bold text-passport-text">JWT Bearer Token</h2>
              </div>
              <p className="text-sm text-passport-muted mb-4 leading-relaxed">
                Obtain a JWT from <code className="text-passport-text bg-passport-surface px-1 rounded">POST /auth/login</code>. Include it in the{' '}
                <code className="text-passport-text bg-passport-surface px-1 rounded">Authorization</code> header for all protected endpoints.
              </p>
              <CodeBlock code={jwtExample} lang="bash" />
            </div>

            <div className="glass-panel p-6">
              <div className="flex items-center gap-2 mb-4">
                <Key size={16} className="text-passport-amber" />
                <h2 className="text-sm font-bold text-passport-text">API Key (X-API-Key)</h2>
              </div>
              <p className="text-sm text-passport-muted mb-4 leading-relaxed">
                Use API keys for SDK and service-to-service authentication. Pass the key in the{' '}
                <code className="text-passport-text bg-passport-surface px-1 rounded">X-API-Key</code> header. Keys are hashed with PBKDF2.
              </p>
              <CodeBlock code={apiKeyExample} lang="bash" />
            </div>
          </div>

          {/* Category Tabs */}
          {!query && (
            <div className="flex flex-wrap gap-2 mb-8">
              <button
                onClick={() => setActiveCategory(null)}
                aria-pressed={activeCategory === null}
                className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition-colors border ${
                  activeCategory === null
                    ? 'bg-passport-green/10 text-passport-green border-passport-green/30'
                    : 'text-passport-muted hover:text-passport-text border-passport-border'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  aria-pressed={activeCategory === cat.id}
                  className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition-colors border flex items-center gap-1.5 ${
                    activeCategory === cat.id
                      ? 'bg-passport-green/10 text-passport-green border-passport-green/30'
                      : 'text-passport-muted hover:text-passport-text border-passport-border'
                  }`}
                >
                  {cat.icon}
                  {cat.title}
                </button>
              ))}
            </div>
          )}

          {/* Endpoints */}
          <div className="space-y-10">
            {filtered.map((cat) => (
              <section key={cat.id} id={cat.id} className={activeCategory && activeCategory !== cat.id ? 'hidden' : ''}>
                <div className="flex items-center gap-2 mb-4">
                  {cat.icon}
                  <h2 className="text-lg font-bold text-passport-text">{cat.title}</h2>
                  <span className="text-xs font-mono text-passport-dim ml-1">{cat.endpoints.length}</span>
                </div>
                <div className="space-y-3">
                  {cat.endpoints.map((ep) => (
                    <EndpointCard key={ep.id} endpoint={ep} />
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Error Codes */}
          <section className="mt-16 pt-10 border-t border-passport-border">
            <h2 className="text-xl font-bold text-passport-text mb-6">Error Codes</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-passport-border">
                    <th className="text-left py-2 pr-4 font-mono text-[10px] uppercase tracking-wider text-passport-dim">Code</th>
                    <th className="text-left py-2 pr-4 font-mono text-[10px] uppercase tracking-wider text-passport-dim">HTTP</th>
                    <th className="text-left py-2 font-mono text-[10px] uppercase tracking-wider text-passport-dim">Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['ok', '200', 'Request succeeded'],
                    ['created', '201', 'Resource created successfully'],
                    ['validation', '400', 'Request body or parameters are invalid'],
                    ['unauthorized', '401', 'Missing or invalid authentication'],
                    ['invalid_token', '401', 'JWT token is expired or malformed'],
                    ['agent_unknown', '401', 'Agent ID not found'],
                    ['forbidden', '403', 'Insufficient permissions'],
                    ['agent_inactive', '403', 'Agent status is not active'],
                    ['invalid_ticket', '403', 'Gateway ticket is invalid or expired'],
                    ['ticket_replayed', '403', 'Gateway ticket was already used'],
                    ['not_found', '404', 'Resource does not exist'],
                    ['conflict', '409', 'Invalid state transition or duplicate'],
                    ['rate_limited', '429', 'Too many requests — check X-RateLimit-Remaining'],
                    ['config_error', '500', 'Server misconfiguration'],
                    ['firestore', '503', 'Database service unavailable'],
                    ['enforce_failed', '500', 'Policy engine error'],
                    ['gateway_failed', '500', 'Gateway execution error'],
                    ['diagnostics_failed', '500', 'Health check failed'],
                    ['consistency_failed', '500', 'Consistency check failed'],
                    ['repair_failed', '500', 'Auto-repair failed'],
                    ['report_failed', '500', 'Report generation failed'],
                    ['seed_failed', '500', 'Org seeding failed'],
                    ['metrics_failed', '500', 'Metrics query failed'],
                  ].map(([code, http, meaning]) => (
                    <tr key={code} className="border-b border-passport-border/50 hover:bg-passport-surface/30 transition-colors">
                      <td className="py-2 pr-4 font-mono text-passport-text">{code}</td>
                      <td className="py-2 pr-4 font-mono text-passport-muted">{http}</td>
                      <td className="py-2 text-passport-muted">{meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Rate Limits */}
          <section className="mt-16 pt-10 border-t border-passport-border">
            <h2 className="text-xl font-bold text-passport-text mb-6">Rate Limiting</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="glass-panel p-6">
                <p className="text-sm text-passport-muted leading-relaxed mb-4">
                  All endpoints are rate-limited per IP using a sliding window algorithm. Redis-backed distributed rate limiting is used in production.
                </p>
                <ul className="space-y-2 text-sm text-passport-muted">
                  <li className="flex items-center gap-2">
                    <span className="method-tag method-get">GET</span>
                    <span>200 requests / minute (default)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="method-tag method-post">POST</span>
                    <span>200 requests / minute (default)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="method-tag method-post">POST</span>
                    <span className="text-passport-text">/auth/login</span>
                    <span>20 / minute</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="method-tag method-post">POST</span>
                    <span className="text-passport-text">/enforce</span>
                    <span>100 / minute</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="method-tag method-post">POST</span>
                    <span className="text-passport-text">/gateway/execute</span>
                    <span>50 / minute</span>
                  </li>
                </ul>
              </div>
              <div className="glass-panel p-6">
                <h3 className="text-sm font-bold text-passport-text mb-3">Response Headers</h3>
                <div className="space-y-3">
                  <div>
                    <code className="text-xs font-mono text-passport-green bg-passport-green/5 px-1.5 py-0.5 rounded">X-RateLimit-Remaining</code>
                    <p className="text-xs text-passport-muted mt-1">Number of requests remaining in the current window.</p>
                  </div>
                  <div>
                    <code className="text-xs font-mono text-passport-amber bg-passport-amber/5 px-1.5 py-0.5 rounded">Retry-After</code>
                    <p className="text-xs text-passport-muted mt-1">Seconds until the rate limit resets (returned on 429).</p>
                  </div>
                </div>
                <div className="mt-4 p-3 rounded bg-passport-surface/50 border border-passport-border">
                  <p className="text-xs font-mono text-passport-coral">429 Too Many Requests</p>
                  <pre className="text-[11px] font-mono text-passport-muted mt-1">
                    {JSON.stringify({ error: { code: 'rate_limited', message: 'Too many requests' } }, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </section>

          {/* SDK Section */}
          <section className="mt-16 pt-10 border-t border-passport-border">
            <h2 className="text-xl font-bold text-passport-text mb-6">SDK</h2>
            <div className="glass-panel p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-passport-text">@passport-agent/sdk</h3>
                  <p className="text-xs text-passport-muted mt-1">Official TypeScript SDK for Node.js and browsers.</p>
                </div>
                <Link
                  href="https://www.npmjs.com/package/@passport-agent/sdk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary text-xs"
                >
                  <Globe size={12} />
                  View on npm
                </Link>
              </div>
              <CodeBlock
                code={`npm install @passport-agent/sdk`}
                lang="bash"
              />
              <div className="mt-3">
                <CodeBlock
                  code={`import { AgentControlPlane } from '@passport-agent/sdk'

const agent = new AgentControlPlane({
  apiKey: 'passport_live_...',
  policies: ['safe-web-search', 'read-only-db'],
})

const result = await agent.run({
  tool: 'query_database',
  parameters: { table: 'users', limit: 10 },
})
// → { decision: 'allowed', ticket: 'gt_...' }`}
                  lang="typescript"
                />
              </div>
            </div>
          </section>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 text-center border-t border-passport-border">
        <p className="font-mono text-[10px] text-passport-dim tracking-wider">
          Passport Agent v2.1 {'\u00B7'} RESTful API {'\u00B7'} OpenAPI 3.0
        </p>
      </footer>
    </div>
  )
}
