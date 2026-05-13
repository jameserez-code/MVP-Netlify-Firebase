// Shared API types — used by server routes and SDK

export type AgentStatus = 'active' | 'suspended' | 'revoked';
export type TaskStatus = 'created' | 'running' | 'completed' | 'failed';
export type RunStatus = 'running' | 'completed' | 'failed' | 'cancelled';
export type LogDecision = 'allow' | 'deny' | 'modify';
export type PolicyStatus = 'active' | 'suspended';

// --- API Responses ---

export interface ApiError {
  error: { code: string; message: string; [key: string]: unknown };
}

export interface LoginResponse {
  token: string;
  user: { email: string; role: string };
}

export interface AgentResponse {
  agentId: string;
  passportNumber: string;
  secretKey: string;
  secretKeyPrefix: string;
  systemPromptHash: string;
  registeredAt: string;
  sdkConfig?: { agentId: string; model: string; provider: string; environment: string };
}

export interface AgentDoc {
  id: string;
  name: string;
  model: string;
  provider: string;
  orgId: string;
  status: AgentStatus;
  passport: { passportNumber: string; systemPromptHash: string };
  signingKey: { keyId: string; algorithm: string; iterations: number; rotatedAt: string | null };
  registeredAt: string;
  lastSeenAt: string | null;
  revokedAt: string | null;
  metadata: Record<string, unknown>;
}

export interface TaskResponse {
  id: string;
  payload: Record<string, unknown>;
  status: TaskStatus;
  createdAt: string;
  completedAt?: string | null;
  failedAt?: string | null;
  error?: string | null;
}

export interface RunResponse {
  id: string;
  agentId: string;
  taskId: string;
  sessionId: string;
  status: RunStatus;
  startedAt: string;
  endedAt: string | null;
  totalActions: number;
  allowedActions: number;
  deniedActions: number;
  error: string | null;
}

export interface PolicyDoc {
  id: string;
  orgId: string;
  name: string;
  description: string;
  status: PolicyStatus;
  scope: { agentId: string; environment: string[] };
  rules: {
    allowedTools: Array<{ toolName: string; parameterConstraints: Record<string, unknown>; modifyParameters?: Record<string, string>; rateLimit?: { maxCalls: number; windowSeconds: number } }>;
    deniedTools: string[];
    allowedDomains: Array<{ pattern: string; methods: string[]; maxResponseBytes?: number }>;
    deniedDomains: string[];
    costLimit: { maxUsdPerSession: number; maxUsdPerDay: number } | null;
    dataRestrictions: { denyPiiInParameters: boolean; denySecretsInParameters: boolean } | null;
  };
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface EnforceResponse {
  decision: string;
  intentId: string;
  decidedAt: string;
  reason?: string;
  violatedRule?: string;
  gatewayTicket?: string;
  ticketExpiresAt?: string;
  modifications?: string[];
  modifiedParameters?: Record<string, unknown>;
}

export interface GatewayResponse {
  executed: boolean;
  result: Record<string, unknown>;
  latencyMs: number;
  auditId?: string;
}

export interface LogEntry {
  id: string;
  agentId: string;
  runId: string;
  tool: string;
  decision: LogDecision;
  reason: string | null;
  parameters: Record<string, unknown>;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

// --- Request Bodies ---

export interface CreateTaskRequest { payload: Record<string, unknown> }
export interface StartRunRequest { agentId: string; taskId: string }
export interface LogActionRequest { tool: string; decision: string; parameters?: Record<string, unknown>; reason?: string }
export interface CompleteRunRequest {}
export interface FailRunRequest { error?: string }
export interface RegisterAgentRequest { name: string; model: string; provider: string; systemPrompt?: string; environment?: string; metadata?: Record<string, unknown> }
export interface CreatePolicyRequest { name: string; description?: string; scope?: { agentId?: string; environment?: string[] }; priority?: number; rules: { allowedTools: Array<{ toolName: string; parameterConstraints?: Record<string, unknown>; modifyParameters?: Record<string, string> }>; deniedTools?: string[]; allowedDomains?: Array<{ pattern: string; methods: string[] }>; deniedDomains?: string[]; dataRestrictions?: { denyPiiInParameters?: boolean; denySecretsInParameters?: boolean } } }
export interface EnforceRequest { intent: { intentId: string; agentId: string; tool: string; parameters: Record<string, unknown>; sessionId?: string; conversationTurn?: number } }
export interface GatewayExecuteRequest { gatewayTicket: string; action: { tool: string; parameters: Record<string, unknown> } }
