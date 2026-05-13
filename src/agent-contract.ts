// Agent execution contract + registry
// Defines the interface every agent must satisfy.
// Workers call this to execute tasks deterministically.

import type { Firestore } from 'firebase-admin/firestore'

// ---------------------------------------------------------------------------
// Execution contract — what every agent must provide
// ---------------------------------------------------------------------------
export interface AgentContext {
  taskId: string
  runId: string
  sessionId: string
  payload: Record<string, unknown>
  agentId: string
  config: Record<string, unknown>
  startedAt: string
}

export interface AgentResult {
  status: 'completed' | 'failed'
  output?: Record<string, unknown>
  error?: string
  durationMs: number
  toolCalls?: Array<{
    tool: string
    decision: 'allow' | 'deny' | 'modify'
    parameters: Record<string, unknown>
    reason?: string
  }>
}

export interface AgentExecutor {
  execute(context: AgentContext, db: Firestore): Promise<AgentResult>
}

// ---------------------------------------------------------------------------
// Execution registry — map of agent implementations
// No dynamic loading, no plugin system. Explicit registration.
// ---------------------------------------------------------------------------
const registry = new Map<string, AgentExecutor>()

export function registerExecutor(agentType: string, executor: AgentExecutor) {
  registry.set(agentType, executor)
}

export function getExecutor(agentType: string): AgentExecutor | undefined {
  return registry.get(agentType)
}

export function listExecutors(): string[] {
  return Array.from(registry.keys())
}

// ---------------------------------------------------------------------------
// Sandbox constraints — enforced by worker, not by agents
// ---------------------------------------------------------------------------
export interface ExecutionConstraints {
  maxRuntimeMs: number      // hard timeout
  maxRetries: number        // 0 = no retry
  allowedCapabilities: string[]  // e.g. ['http', 'database']
  maxToolCallsPerRun: number
  maxPayloadSizeBytes: number
}

export const DEFAULT_CONSTRAINTS: ExecutionConstraints = {
  maxRuntimeMs: 30_000,
  maxRetries: 3,
  allowedCapabilities: ['http'],
  maxToolCallsPerRun: 100,
  maxPayloadSizeBytes: 100_000,
}

export function validatePayloadSize(payload: Record<string, unknown>, maxBytes: number): boolean {
  return JSON.stringify(payload).length <= maxBytes
}

// ---------------------------------------------------------------------------
// Built-in executor: echo (for testing)
// ---------------------------------------------------------------------------
const echoExecutor: AgentExecutor = {
  async execute(context) {
    const start = Date.now()
    return {
      status: 'completed',
      output: { echo: context.payload, taskId: context.taskId },
      durationMs: Date.now() - start,
      toolCalls: [],
    }
  },
}

registerExecutor('echo', echoExecutor)

// ---------------------------------------------------------------------------
// Deterministic replay — stores execution artifacts for later comparison
// ---------------------------------------------------------------------------
export async function storeExecutionArtifact(
  db: Firestore,
  runId: string,
  result: AgentResult,
) {
  await db.collection('runs').doc(runId).update({
    executionArtifact: {
      output: result.output,
      error: result.error,
      toolCalls: result.toolCalls || [],
      durationMs: result.durationMs,
      storedAt: new Date().toISOString(),
    },
  })
}

export async function getExecutionArtifact(
  db: Firestore,
  runId: string,
): Promise<AgentResult | null> {
  const snap = await db.collection('runs').doc(runId).get()
  if (!snap.exists) return null
  const data = snap.data() as any
  return data?.executionArtifact || null
}
