// Policy Templates — pre-built, production-tested policy configurations
// Import and modify these to quickly set up common agent scenarios

export interface PolicyTemplate {
  name: string
  description: string
  scenario: string
  rules: {
    allowedTools: Array<{ toolName: string; parameterConstraints: Record<string, unknown> }>
    deniedTools: string[]
    allowedDomains: Array<{ pattern: string; methods: string[] }>
    deniedDomains: string[]
    dataRestrictions: { denyPiiInParameters: boolean; denySecretsInParameters: boolean }
  }
}

export const TEMPLATES: PolicyTemplate[] = [
  {
    name: 'Read-Only Support Bot',
    description: 'Can look up orders and inventory. Cannot send email, delete data, or access admin systems.',
    scenario: 'Customer support agent that answers queries about orders and products.',
    rules: {
      allowedTools: [
        { toolName: 'lookup_order', parameterConstraints: { orderId: { type: 'string', minLength: 1 } } },
        { toolName: 'check_inventory', parameterConstraints: { sku: { type: 'string', minLength: 1 } } },
        { toolName: 'search_kb', parameterConstraints: { query: { type: 'string', maxLength: 500 } } },
      ],
      deniedTools: ['send_email', 'delete_record', 'modify_order', 'refund_order', 'access_admin'],
      allowedDomains: [
        { pattern: '*.internal.com', methods: ['GET'] },
        { pattern: 'api.knowledgebase.io', methods: ['GET'] },
      ],
      deniedDomains: ['*.evil.com', '169.254.169.254', 'localhost', '127.0.0.1', '10.0.0.0/8'],
      dataRestrictions: { denyPiiInParameters: true, denySecretsInParameters: true },
    },
  },
  {
    name: 'CI/CD Pipeline Agent',
    description: 'Can trigger builds, read logs, and notify teams. Cannot push to production or access admin panels.',
    scenario: 'CI/CD automation agent that monitors pipelines and retries failed builds.',
    rules: {
      allowedTools: [
        { toolName: 'trigger_build', parameterConstraints: { branch: { type: 'string' } } },
        { toolName: 'read_logs', parameterConstraints: { buildId: { type: 'string' } } },
        { toolName: 'notify_slack', parameterConstraints: { channel: { type: 'string' } } },
        { toolName: 'create_pr', parameterConstraints: { title: { type: 'string' } } },
      ],
      deniedTools: ['deploy', 'push_main', 'access_admin', 'rotate_secrets', 'modify_firewall'],
      allowedDomains: [
        { pattern: 'api.github.com', methods: ['GET', 'POST'] },
        { pattern: 'hooks.slack.com', methods: ['POST'] },
        { pattern: '*.internal-ci.com', methods: ['GET'] },
      ],
      deniedDomains: ['*.admin-panel.com', '169.254.169.254', 'localhost'],
      dataRestrictions: { denyPiiInParameters: false, denySecretsInParameters: true },
    },
  },
  {
    name: 'Document Processor',
    description: 'Can read, extract, and validate documents. Cannot write to external APIs or send data outside the org.',
    scenario: 'Agent that processes incoming PDFs, extracts data, and routes to teams.',
    rules: {
      allowedTools: [
        { toolName: 'read_document', parameterConstraints: { path: { type: 'string' } } },
        { toolName: 'extract_text', parameterConstraints: { documentId: { type: 'string' } } },
        { toolName: 'validate_fields', parameterConstraints: { ruleset: { type: 'string' } } },
      ],
      deniedTools: ['send_email', 'write_external', 'share_document', 'delete_document'],
      allowedDomains: [
        { pattern: '*.internal-docs.com', methods: ['GET'] },
      ],
      deniedDomains: ['*.external-api.com', '169.254.169.254'],
      dataRestrictions: { denyPiiInParameters: true, denySecretsInParameters: true },
    },
  },
  {
    name: 'Internal Tools Agent',
    description: 'Full access to internal APIs. Can send reports via email. Limited to *.acme.com domains only.',
    scenario: 'Trusted internal agent that queries databases and generates reports.',
    rules: {
      allowedTools: [
        { toolName: 'query_db', parameterConstraints: { sql: { type: 'string', maxLength: 1000 } } },
        { toolName: 'generate_report', parameterConstraints: { format: { enum: ['pdf', 'csv'] } } },
        { toolName: 'send_email', parameterConstraints: { to: { type: 'string' } } },
        { toolName: 'read_file', parameterConstraints: { path: { type: 'string' } } },
      ],
      deniedTools: ['delete_record', 'drop_table', 'access_admin'],
      allowedDomains: [
        { pattern: '*.acme.com', methods: ['GET', 'POST', 'PUT'] },
        { pattern: 'api.sendgrid.com', methods: ['POST'] },
      ],
      deniedDomains: ['*.external.com', '169.254.169.254', 'localhost'],
      dataRestrictions: { denyPiiInParameters: false, denySecretsInParameters: true },
    },
  },
  {
    name: 'Strict Compliance Agent',
    description: 'Read-only access to everything. Every action audited. Zero data exfiltration risk.',
    scenario: 'Financial services agent that processes transactions under strict compliance.',
    rules: {
      allowedTools: [
        { toolName: 'read_transaction', parameterConstraints: { transactionId: { type: 'string' } } },
        { toolName: 'validate_compliance', parameterConstraints: { ruleset: { type: 'string' } } },
        { toolName: 'audit_log', parameterConstraints: { query: { type: 'string' } } },
      ],
      deniedTools: ['write_transaction', 'approve_transfer', 'send_email', 'export_data'],
      allowedDomains: [
        { pattern: '*.internal-bank.com', methods: ['GET'] },
      ],
      deniedDomains: ['169.254.169.254', 'localhost', '127.0.0.1', '0.0.0.0'],
      dataRestrictions: { denyPiiInParameters: true, denySecretsInParameters: true },
    },
  },
]

export function findTemplate(name: string): PolicyTemplate | undefined {
  return TEMPLATES.find(t => t.name === name)
}

export function listTemplates(): string[] {
  return TEMPLATES.map(t => `${t.name} — ${t.scenario}`)
}
