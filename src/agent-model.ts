// ---------------------------------------------------------------------------
// Agent execution model — types + state machines
// ---------------------------------------------------------------------------

export type AgentStatus  = 'active' | 'suspended' | 'revoked'
export type TaskStatus   = 'created' | 'running' | 'completed' | 'failed'
export type RunStatus    = 'running' | 'completed' | 'failed' | 'cancelled'
export type LogDecision  = 'allow' | 'deny' | 'modify'

// ---------------------------------------------------------------------------
// State machines
// ---------------------------------------------------------------------------

export const TaskTransitions: Record<TaskStatus, TaskStatus[]> = {
  created:   ['running'],
  running:   ['completed', 'failed'],
  completed: [],  // terminal
  failed:    ['created'],  // can be retried (reset to created)
}

export const RunTransitions: Record<RunStatus, RunStatus[]> = {
  running:   ['completed', 'failed', 'cancelled'],
  completed: [],  // terminal
  failed:    [],  // terminal
  cancelled: [],  // terminal
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function canTransitionStatus(current: string, next: string, transitions: Record<string, string[]>): boolean {
  const allowed = transitions[current]
  if (!allowed) return false
  return allowed.includes(next)
}

// ---------------------------------------------------------------------------
// Document shapes (for reference, not runtime)
// ---------------------------------------------------------------------------

export interface Agent {
  id: string
  name: string
  model: string
  provider: string
  orgId: string
  status: AgentStatus
  passport: { passportNumber: string; systemPromptHash: string }
  registeredAt: string
}

export interface Task {
  id: string
  payload: Record<string, unknown>
  status: TaskStatus
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  failedAt: string | null
  error: string | null
  runCount: number
}

export interface Run {
  id: string
  agentId: string
  taskId: string
  sessionId: string
  status: RunStatus
  startedAt: string
  endedAt: string | null
  totalActions: number
  allowedActions: number
  deniedActions: number
  error: string | null
}

export interface LogEntry {
  id: string
  agentId: string
  runId: string
  tool: string
  decision: LogDecision
  reason: string | null
  parameters: Record<string, unknown>
  timestamp: string
}
