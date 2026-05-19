/**
 * AI Agent Passport SDK — TypeScript declarations
 *
 * Enforce policies on AI agent tool calls with HMAC-signed intents,
 * session management, and OpenAI-compatible tool_call processing.
 */

export interface AgentControlPlaneOptions {
  /** Unique agent identifier */
  agentId: string;
  /** Secret key for HMAC signing */
  secretKey: string;
  /** API endpoint base URL */
  endpoint: string;
  /** Optional API key for authentication */
  apiKey?: string;
  /** Model name (e.g. 'gpt-4') */
  model?: string;
  /** Provider name (e.g. 'openai') */
  provider?: string;
  /** System prompt hash tracking */
  systemPrompt?: string;
}

export interface Session {
  sessionId: string;
  taskHint: string | null;
}

export interface SessionEnd {
  sessionId: string | null;
  completedAt: string;
}

export interface EnforceResult {
  decision: 'allow' | 'deny' | 'modify';
  reason?: string;
  violatedRule?: string;
  gatewayTicket?: string;
  ticketExpiresAt?: string;
  modifiedParameters?: Record<string, unknown>;
  modifications?: string[];
}

export interface AgentRecord {
  id: string;
  name: string;
  model?: string;
  provider?: string;
  status?: string;
  passport?: Record<string, unknown>;
  registeredAt?: string;
  lastSeenAt?: string | null;
}

export interface AuditEntry {
  id: string;
  intentId?: string;
  agentId?: string;
  tool?: string;
  decision?: 'allow' | 'deny' | 'modify';
  reason?: string;
  timestamp?: string;
  createdAt?: string;
  parameters?: Record<string, unknown>;
}

export interface AuditOptions {
  decision?: 'allow' | 'deny' | 'modify';
  tool?: string;
  limit?: number;
  offset?: number;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResult {
  role: 'tool';
  tool_call_id: string;
  name: string;
  content: string;
}

export interface ProcessToolCallsOptions {
  useWrapped?: boolean;
}

/**
 * Main SDK class for agent policy enforcement.
 */
export class AgentControlPlane {
  agentId: string;
  secretKey: string;
  endpoint: string;
  apiKey?: string;
  model: string;
  provider: string;
  systemPrompt: string;
  sessionId: string | null;
  conversationTurn: number;

  constructor(options: AgentControlPlaneOptions);

  /**
   * Start a new session. Call before running an agent task.
   */
  startSession(taskHint?: string): Session;

  /**
   * End the active session.
   */
  endSession(): SessionEnd;

  /**
   * Wrap a tool function with enforcement.
   * @param toolName - name of the tool (must match policy)
   * @param toolFn - the real tool implementation
   */
  wrapTool<T extends (...args: any[]) => any>(
    toolName: string,
    toolFn: T
  ): (parameters: Record<string, unknown>) => Promise<ReturnType<T>>;

  /**
   * Process an array of tool_calls from an OpenAI ChatCompletion response.
   */
  processToolCalls(
    toolCalls: ToolCall[],
    toolImpls: Record<string, (...args: any[]) => any>,
    opts?: ProcessToolCallsOptions
  ): Promise<ToolResult[]>;

  /**
   * List all registered agents.
   */
  listAgents(): Promise<{ data: AgentRecord[]; pagination?: { total: number; page: number; pageSize: number } }>;

  /**
   * Query the audit log.
   */
  getAuditLog(options?: AuditOptions): Promise<{ data: AuditEntry[]; pagination?: { total: number; page: number; pageSize: number } }>;

  /**
   * Revoke an agent by ID.
   */
  revokeAgent(id: string): Promise<{ id: string; status: string }>;
}

/**
 * Generate a unique intent ID.
 */
export function generateIntentId(): string;

/**
 * Thrown when the policy engine denies an agent action.
 */
export class PermissionError extends Error {
  code: string;
  reason: string;
  violatedRule: string | null;
  intentId: string | null;
  tool: string;
  toJSON(): Record<string, unknown>;
}

/**
 * Thrown when the enforcement gateway is unreachable.
 */
export class GatewayError extends Error {
  code: string;
  toJSON(): Record<string, unknown>;
}

/**
 * Thrown when an API request fails after all retries.
 */
export class RequestError extends Error {
  code: string;
  statusCode: number | null;
  toJSON(): Record<string, unknown>;
}
