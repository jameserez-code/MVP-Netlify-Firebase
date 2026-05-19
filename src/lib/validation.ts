import { z } from 'zod'

// ---------------------------------------------------------------------------
// Zod schemas for all API endpoints (Zod v4 compatible)
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters').regex(/\d/, 'Password must contain at least 1 number').regex(/[^a-zA-Z0-9]/, 'Password must contain at least 1 special character'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').regex(/\d/, 'Password must contain at least 1 number').regex(/[^a-zA-Z0-9]/, 'Password must contain at least 1 special character'),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').regex(/\d/, 'Password must contain at least 1 number').regex(/[^a-zA-Z0-9]/, 'Password must contain at least 1 special character'),
})

export const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email format'),
})

export const taskCreationSchema = z.object({
  payload: z.record(z.string(), z.any()).refine((v) => Object.keys(v).length > 0, { message: 'payload is required' }),
})

export const agentRegistrationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  model: z.string().min(1, 'Model is required'),
  provider: z.string().min(1, 'Provider is required'),
  systemPrompt: z.string().optional(),
  environment: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
})

export const policyCreationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  scope: z.object({
    agentId: z.string().optional(),
    environment: z.array(z.string()).optional(),
  }).optional(),
  priority: z.number().int().min(0).max(100).optional(),
  rules: z.object({
    allowedTools: z.array(z.record(z.string(), z.any())).default([]),
    deniedTools: z.array(z.string()).default([]),
    allowedDomains: z.array(z.record(z.string(), z.any())).default([]),
    deniedDomains: z.array(z.string()).default([]),
    costLimit: z.record(z.string(), z.any()).nullable().optional(),
    dataRestrictions: z.record(z.string(), z.any()).nullable().optional(),
  }).optional(),
})

export const intentEvaluationSchema = z.object({
  intent: z.object({
    intentId: z.string().min(1, 'intentId is required'),
    tool: z.string().min(1, 'tool is required'),
    agentId: z.string().min(1, 'agentId is required'),
    parameters: z.record(z.string(), z.any()).optional(),
    sessionId: z.string().optional(),
    conversationTurn: z.number().optional(),
  }),
})

export const gatewayExecuteSchema = z.object({
  gatewayTicket: z.string().min(1, 'gatewayTicket is required'),
  action: z.object({
    tool: z.string().min(1, 'action.tool is required'),
    parameters: z.record(z.string(), z.any()).optional(),
  }),
})

export const orgSeedSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
})

export const startRunSchema = z.object({
  agentId: z.string().min(1, 'agentId is required'),
  taskId: z.string().min(1, 'taskId is required'),
})

export const logActionSchema = z.object({
  tool: z.string().min(1, 'tool is required'),
  decision: z.enum(['allow', 'deny', 'modify']),
  parameters: z.record(z.string(), z.any()).optional(),
  reason: z.string().optional(),
})

export const failRunSchema = z.object({
  error: z.string().optional(),
})

export const repairSchema = z.object({
  action: z.enum(['orphaned', 'stuck']).optional(),
})

export const revokeAgentSchema = z.object({
  reason: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Endpoint → schema mapping
// ---------------------------------------------------------------------------

const SCHEMA_MAP: Record<string, z.ZodTypeAny> = {
  'POST /auth/login': loginSchema,
  'POST /auth/register': registerSchema,
  'POST /auth/forgot-password': forgotPasswordSchema,
  'POST /auth/reset-password': resetPasswordSchema,
  'POST /auth/change-password': changePasswordSchema,
  'POST /auth/resend-verification': resendVerificationSchema,
  'POST /task': taskCreationSchema,
  'POST /agents/register': agentRegistrationSchema,
  'POST /policies': policyCreationSchema,
  'POST /enforce': intentEvaluationSchema,
  'POST /gateway/execute': gatewayExecuteSchema,
  'POST /org/seed': orgSeedSchema,
  'POST /agent/run': startRunSchema,
  'POST /run/:id/log': logActionSchema,
  'PATCH /run/:id/fail': failRunSchema,
  'POST /repair': repairSchema,
  'PATCH /agents/:id/revoke': revokeAgentSchema,
}

function getSchemaKey(method: string, url: string): string | null {
  // Exact match first
  const exact = `${method} ${url}`
  if (SCHEMA_MAP[exact]) return exact

  // Handle parameterized routes roughly
  for (const key of Object.keys(SCHEMA_MAP)) {
    const [, path] = key.split(' ')
    if (!path) continue
    // Convert :param to regex
    const regex = new RegExp('^' + path.replace(/:[^/]+/g, '[^/]+') + '$')
    if (regex.test(url)) return key
  }
  return null
}

// ---------------------------------------------------------------------------
// Validation helper — converts Zod errors to field map
// ---------------------------------------------------------------------------

export function formatZodError(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const issue of error.issues) {
    const path = issue.path.join('.') || 'body'
    fields[path] = issue.message
  }
  return fields
}

// ---------------------------------------------------------------------------
// Fastify preHandler hook that validates request.body against schemas
// ---------------------------------------------------------------------------

export function createValidationHook() {
  return async (request: any, reply: any) => {
    const method = request.method
    const url = (request.url || '').split('?')[0]
    const key = getSchemaKey(method, url)
    if (!key) return // no schema for this route

    const schema = SCHEMA_MAP[key]
    const result = schema.safeParse(request.body || {})
    if (!result.success) {
      const fields = formatZodError(result.error)
      reply.code(400).send({
        error: {
          code: 'validation_error',
          fields,
        },
      })
    }
  }
}
