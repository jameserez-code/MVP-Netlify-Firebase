// Policy Templates — pre-built, production-tested policy configurations
// Import and modify these to quickly set up common agent scenarios

export interface TemplatePolicy {
  name: string
  allowedTools: string[]
  deniedTools: string[]
  allowedDomains?: string[]
  deniedDomains?: string[]
  piiDetection: boolean
  maxCost: number
}

export interface PolicyTemplate {
  id: string
  name: string
  description: string
  category: string
  policies: TemplatePolicy[]
}

export const TEMPLATES: PolicyTemplate[] = [
  {
    id: 'safe-customer-support',
    name: 'Safe Customer Support Agent',
    description: 'Allows web search and database reads. Blocks destructive actions and PII.',
    category: 'customer-support',
    policies: [
      {
        name: 'Safe Web Search',
        allowedTools: ['web_search', 'read_database', 'send_email'],
        deniedTools: ['delete_database', 'write_database', 'execute_code'],
        deniedDomains: ['localhost', '127.0.0.1'],
        piiDetection: true,
        maxCost: 10,
      }
    ]
  },
  {
    id: 'read-only-analyst',
    name: 'Read-Only Data Analyst',
    description: 'Read-only access to databases. No writes, no external APIs.',
    category: 'data-analysis',
    policies: [
      {
        name: 'Read-Only Database',
        allowedTools: ['query_database', 'generate_chart', 'export_csv'],
        deniedTools: ['write_database', 'delete_table', 'update_row'],
        piiDetection: true,
        maxCost: 50,
      }
    ]
  },
  {
    id: 'social-media-safe',
    name: 'Social Media Manager',
    description: 'Text generation and posting. No external URLs or file uploads.',
    category: 'social-media',
    policies: [
      {
        name: 'Safe Social Media',
        allowedTools: ['generate_text', 'post_tweet', 'schedule_post'],
        deniedTools: ['upload_file', 'access_billing', 'delete_account'],
        piiDetection: false,
        maxCost: 5,
      }
    ]
  },
  {
    id: 'e-commerce-agent',
    name: 'E-commerce Agent',
    description: 'Inventory checks and order lookups. No payment processing.',
    category: 'e-commerce',
    policies: [
      {
        name: 'Safe E-commerce',
        allowedTools: ['check_inventory', 'lookup_order', 'track_shipment'],
        deniedTools: ['process_payment', 'refund_order', 'delete_order', 'modify_inventory'],
        piiDetection: true,
        maxCost: 20,
      }
    ]
  },
  {
    id: 'hr-onboarding',
    name: 'HR Onboarding Agent',
    description: 'Document generation and onboarding tasks. No salary data access.',
    category: 'hr',
    policies: [
      {
        name: 'Safe HR',
        allowedTools: ['generate_document', 'schedule_meeting', 'send_welcome_email'],
        deniedTools: ['access_payroll', 'view_salary', 'modify_benefits', 'delete_employee'],
        piiDetection: true,
        maxCost: 15,
      }
    ]
  },
  {
    id: 'devops-monitoring',
    name: 'DevOps Monitoring Agent',
    description: 'Read metrics and logs. No deployments or infrastructure changes.',
    category: 'devops',
    policies: [
      {
        name: 'Read-Only DevOps',
        allowedTools: ['read_metrics', 'read_logs', 'check_health', 'list_pods'],
        deniedTools: ['deploy', 'scale_cluster', 'delete_pod', 'modify_config', 'restart_service'],
        piiDetection: false,
        maxCost: 30,
      }
    ]
  },
  {
    id: 'legal-document-review',
    name: 'Legal Document Review',
    description: 'Read-only document analysis. No external sharing.',
    category: 'legal',
    policies: [
      {
        name: 'Read-Only Legal',
        allowedTools: ['read_document', 'analyze_clause', 'compare_versions'],
        deniedTools: ['share_document', 'send_email', 'upload_external', 'delete_document'],
        piiDetection: true,
        maxCost: 25,
      }
    ]
  },
  {
    id: 'research-assistant',
    name: 'Research Assistant',
    description: 'Web search and summarization. No file writes.',
    category: 'research',
    policies: [
      {
        name: 'Safe Research',
        allowedTools: ['web_search', 'read_webpage', 'summarize_text'],
        deniedTools: ['write_file', 'upload_file', 'send_email', 'execute_code'],
        piiDetection: false,
        maxCost: 15,
      }
    ]
  },
  {
    id: 'code-review-bot',
    name: 'Code Review Bot',
    description: 'Read code and suggest improvements. No execution.',
    category: 'development',
    policies: [
      {
        name: 'Safe Code Review',
        allowedTools: ['read_code', 'analyze_diff', 'suggest_fix', 'run_linter'],
        deniedTools: ['execute_code', 'write_code', 'deploy', 'access_secrets'],
        piiDetection: false,
        maxCost: 10,
      }
    ]
  },
  {
    id: 'compliance-auditor',
    name: 'Compliance Auditor',
    description: 'Read-only access to audit logs and compliance data.',
    category: 'compliance',
    policies: [
      {
        name: 'Read-Only Audit',
        allowedTools: ['read_audit_log', 'read_compliance_report', 'export_csv'],
        deniedTools: ['modify_log', 'delete_log', 'write_report', 'send_email'],
        piiDetection: true,
        maxCost: 40,
      }
    ]
  }
]

export function getTemplates(): PolicyTemplate[] {
  return TEMPLATES
}

export function findTemplateById(id: string): PolicyTemplate | undefined {
  return TEMPLATES.find(t => t.id === id)
}

export function getCategories(): string[] {
  const cats = new Set(TEMPLATES.map(t => t.category))
  return ['all', ...Array.from(cats)]
}
