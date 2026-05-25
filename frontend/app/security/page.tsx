'use client'

import { useState } from 'react'
import Link from 'next/link'
import Navbar from '@/components/navbar'
import {
  Shield,
  ArrowLeft,
  Lock,
  Server,
  Globe,
  Key,
  Eye,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  Clock,
  Mail,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Gauge,
  Fingerprint,
  Database,
  Activity,
  ScanEye,
  ClipboardCheck,
  Users,
  Radio,
  Bug,
  ShieldAlert,
  CircuitBoard,
} from 'lucide-react'

const complianceData = [
  { standard: 'SOC 2 Type II', status: 'In Progress', statusColor: 'text-passport-amber', details: 'Audit initiated, report expected Q3 2026' },
  { standard: 'HIPAA', status: 'Available', statusColor: 'text-passport-green', details: 'BAA available for healthcare customers' },
  { standard: 'GDPR', status: 'Compliant', statusColor: 'text-passport-green', details: 'Data export, deletion, processing records' },
  { standard: 'PCI-DSS', status: 'Via Stripe', statusColor: 'text-passport-azure', details: 'Stripe handles all payment data' },
  { standard: 'ISO 27001', status: 'Planned', statusColor: 'text-passport-dim', details: 'Targeting Q4 2026' },
]

const infrastructureItems = [
  { icon: <Lock size={16} className="text-passport-green" />, text: 'All data encrypted at rest (AES-256) and in transit (TLS 1.3)' },
  { icon: <Server size={16} className="text-passport-green" />, text: 'Hosted on Google Cloud / Render with SOC 2 certified infrastructure' },
  { icon: <Globe size={16} className="text-passport-green" />, text: 'DDoS protection via Cloudflare' },
  { icon: <ShieldAlert size={16} className="text-passport-green" />, text: 'WAF rules blocking OWASP Top 10 attacks' },
  { icon: <ScanEye size={16} className="text-passport-green" />, text: 'Regular vulnerability scanning' },
]

const appSecurityItems = [
  'No hardcoded secrets — all credentials via environment variables',
  'PBKDF2-SHA256 password hashing (100,000 iterations)',
  'JWT with automatic expiry (24 hours)',
  'HMAC-SHA256 intent signing for agent requests',
  'AES-256-GCM encryption for webhook secrets',
  'SQL/NoSQL/XSS injection protection on all inputs',
  'Rate limiting on all endpoints',
  'Circuit breakers on external services',
]

const authItems = [
  { icon: <Key size={16} className="text-passport-azure" />, text: 'JWT Bearer token authentication' },
  { icon: <Fingerprint size={16} className="text-passport-azure" />, text: 'API Key authentication with PBKDF2 hashing (keys never stored in plaintext)' },
  { icon: <Users size={16} className="text-passport-azure" />, text: 'Role-based access control (org_admin, org_member, readonly)' },
  { icon: <Database size={16} className="text-passport-azure" />, text: 'Organization isolation (multi-tenant data separation)' },
  { icon: <Lock size={16} className="text-passport-azure" />, text: 'Account lockout after 5 failed attempts' },
  { icon: <Mail size={16} className="text-passport-azure" />, text: 'Email verification required for all accounts' },
  { icon: <ClipboardCheck size={16} className="text-passport-azure" />, text: 'Password complexity enforcement (8+ chars, 1 digit, 1 special)' },
]

const dataProtectionItems = [
  'Data encrypted at rest (Firestore automatic encryption)',
  'TLS 1.3 for all data in transit',
  'Data stored in US region (configurable for EU customers)',
  'GDPR: data export and deletion built in',
  'Audit logs immutable and cryptographically verifiable',
  'No customer data used for AI training',
  'Data retention: configurable per organization',
]

interface Incident {
  date: string
  title: string
  duration: string
  status: string
  description: string
  rootCause: string
  fix: string
}

const incidentData: Incident[] = [
  {
    date: 'May 22, 2026',
    title: 'API Latency Degraded',
    duration: '23 minutes',
    status: 'Resolved',
    description: 'Between 14:32-14:55 UTC, API response times increased to 2-5 seconds.',
    rootCause: 'Database connection pool exhaustion during traffic spike.',
    fix: 'Increased connection pool size and added query caching.',
  },
  {
    date: 'May 15, 2026',
    title: 'Webhook Delivery Delayed',
    duration: '45 minutes',
    status: 'Resolved',
    description: 'Webhook deliveries were delayed by up to 10 minutes.',
    rootCause: 'Queue worker restart during deployment.',
    fix: 'Added graceful shutdown and health checks before draining.',
  },
  {
    date: 'May 8, 2026',
    title: 'Email Delivery Interruption',
    duration: '2 hours',
    status: 'Resolved',
    description: 'Verification emails were not being delivered.',
    rootCause: 'Resend API key rotation not propagated to all instances.',
    fix: 'Implemented centralized secret management.',
  },
]

function ExpandableCard({ title, icon, children, defaultOpen = false }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-passport-border rounded-md overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-passport-surface/50 transition-colors"
      >
        <span className="shrink-0">{icon}</span>
        <span className="text-sm font-semibold text-passport-text">{title}</span>
        <span className="ml-auto text-passport-muted">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
      </button>
      {open && (
        <div className="px-5 pb-4 border-t border-passport-border bg-passport-surface/10 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  )
}

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-passport-bg">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-28">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-passport-muted hover:text-passport-text transition-colors mb-8"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border border-passport-green/30 bg-passport-green/5 mb-6">
            <ShieldCheck size={32} className="text-passport-green" />
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-passport-text tracking-tight mb-4">
            Security at Passport Agent
          </h1>
          <p className="text-lg text-passport-muted max-w-xl mx-auto">
            Enterprise-grade security, compliance, and trust
          </p>
        </div>

        {/* Security Principles */}
        <section className="mb-20">
          <div className="section-divider mb-14" />
          <h2 className="text-2xl font-bold text-passport-text text-center mb-10">Our Security Principles</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: <Shield size={24} className="text-passport-green" />, title: 'Defense in Depth', desc: 'Multiple layers of security controls protect every component. From network perimeter to application logic, each layer assumes the layer above may be compromised.' },
              { icon: <CircuitBoard size={24} className="text-passport-azure" />, title: 'Zero Trust Architecture', desc: 'No implicit trust — every request is authenticated, authorized, and validated. Service-to-service communication requires explicit credentials.' },
              { icon: <Lock size={24} className="text-passport-coral" />, title: 'Security by Default', desc: 'The most secure configuration is the default. Features that reduce security posture are opt-in only. Principle of least privilege guides all design decisions.' },
            ].map((principle) => (
              <div key={principle.title} className="glass-panel p-6 hover:border-passport-green/30 hover:-translate-y-1 transition-all duration-200">
                <div className="w-10 h-10 rounded-full bg-passport-green/10 border border-passport-green/20 flex items-center justify-center mb-4">
                  {principle.icon}
                </div>
                <h3 className="text-lg font-semibold text-passport-text mb-2">{principle.title}</h3>
                <p className="text-sm text-passport-muted leading-relaxed">{principle.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Infrastructure Security */}
        <section className="mb-20">
          <div className="section-divider mb-14" />
          <div className="flex items-center gap-3 mb-8">
            <Server size={24} className="text-passport-green" />
            <h2 className="text-2xl font-bold text-passport-text">Infrastructure Security</h2>
          </div>
          <div className="glass-panel p-6">
            <ul className="space-y-4">
              {infrastructureItems.map((item) => (
                <li key={item.text} className="flex items-start gap-3 text-sm text-passport-muted">
                  <span className="shrink-0 mt-0.5">{item.icon}</span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Application Security */}
        <section className="mb-20">
          <div className="section-divider mb-14" />
          <div className="flex items-center gap-3 mb-8">
            <Activity size={24} className="text-passport-azure" />
            <h2 className="text-2xl font-bold text-passport-text">Application Security</h2>
          </div>
          <div className="glass-panel p-6">
            <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
              {appSecurityItems.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-passport-muted">
                  <CheckCircle2 size={16} className="text-passport-green shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Authentication & Authorization */}
        <section className="mb-20">
          <div className="section-divider mb-14" />
          <div className="flex items-center gap-3 mb-8">
            <Key size={24} className="text-passport-green" />
            <h2 className="text-2xl font-bold text-passport-text">Authentication & Authorization</h2>
          </div>
          <div className="glass-panel p-6">
            <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
              {authItems.map((item) => (
                <li key={item.text} className="flex items-start gap-3 text-sm text-passport-muted">
                  <span className="shrink-0 mt-0.5">{item.icon}</span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Data Protection */}
        <section className="mb-20">
          <div className="section-divider mb-14" />
          <div className="flex items-center gap-3 mb-8">
            <Database size={24} className="text-passport-coral" />
            <h2 className="text-2xl font-bold text-passport-text">Data Protection</h2>
          </div>
          <div className="glass-panel p-6">
            <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
              {dataProtectionItems.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-passport-muted">
                  <CheckCircle2 size={16} className="text-passport-green shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Compliance */}
        <section className="mb-20">
          <div className="section-divider mb-14" />
          <div className="flex items-center gap-3 mb-8">
            <FileCheck size={24} className="text-passport-amber" />
            <h2 className="text-2xl font-bold text-passport-text">Compliance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-passport-border">
                  <th className="text-left py-3 pr-4 font-mono text-[10px] uppercase tracking-wider text-passport-dim">Standard</th>
                  <th className="text-left py-3 pr-4 font-mono text-[10px] uppercase tracking-wider text-passport-dim">Status</th>
                  <th className="text-left py-3 font-mono text-[10px] uppercase tracking-wider text-passport-dim">Details</th>
                </tr>
              </thead>
              <tbody>
                {complianceData.map((row) => (
                  <tr key={row.standard} className="border-b border-passport-border/50 hover:bg-passport-surface/30 transition-colors">
                    <td className="py-3 pr-4 text-sm font-semibold text-passport-text">{row.standard}</td>
                    <td className={`py-3 pr-4 text-sm font-mono ${row.statusColor}`}>{row.status}</td>
                    <td className="py-3 text-sm text-passport-muted">{row.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Vulnerability Disclosure */}
        <section className="mb-20">
          <div className="section-divider mb-14" />
          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass-panel p-6">
              <div className="flex items-center gap-3 mb-4">
                <Bug size={20} className="text-passport-coral" />
                <h2 className="text-xl font-bold text-passport-text">Vulnerability Disclosure</h2>
              </div>
              <ul className="space-y-3 text-sm text-passport-muted">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-passport-green shrink-0 mt-0.5" />
                  <span>Responsible disclosure policy</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-passport-green shrink-0 mt-0.5" />
                  <span>Bug bounty program (coming soon)</span>
                </li>
                <li className="flex items-center gap-2 pt-2 border-t border-passport-border">
                  <Mail size={14} className="text-passport-azure" />
                  <span className="font-mono text-passport-text">security@passport-agent.ai</span>
                </li>
              </ul>
            </div>

            <div className="glass-panel p-6">
              <div className="flex items-center gap-3 mb-4">
                <Gauge size={20} className="text-passport-amber" />
                <h2 className="text-xl font-bold text-passport-text">Penetration Testing</h2>
              </div>
              <ul className="space-y-3 text-sm text-passport-muted">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-passport-green shrink-0 mt-0.5" />
                  <span>Quarterly external penetration tests by independent firm</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-passport-green shrink-0 mt-0.5" />
                  <span>Annual internal security assessment</span>
                </li>
                <li className="flex items-start gap-2 pt-2 border-t border-passport-border">
                  <CheckCircle2 size={14} className="text-passport-green shrink-0 mt-0.5" />
                  <span>Reports available to enterprise customers under NDA</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Incident Response */}
        <section className="mb-20">
          <div className="section-divider mb-14" />
          <div className="flex items-center gap-3 mb-8">
            <Radio size={24} className="text-passport-green" />
            <h2 className="text-2xl font-bold text-passport-text">Incident Response</h2>
          </div>
          <div className="glass-panel p-6">
            <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
              {[
                '24/7 monitoring and alerting',
                'Incident response plan with defined SLAs',
                'Post-incident reports published within 72 hours',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-passport-muted">
                  <CheckCircle2 size={16} className="text-passport-green shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-4 border-t border-passport-border text-sm text-passport-muted">
              Status page:{' '}
              <Link href="/status" className="text-passport-azure hover:underline font-mono">
                /status
              </Link>
            </div>
          </div>
        </section>

        {/* Incident History */}
        <section className="mb-20">
          <div className="section-divider mb-14" />
          <div className="flex items-center gap-3 mb-8">
            <Clock size={24} className="text-passport-coral" />
            <h2 className="text-2xl font-bold text-passport-text">Recent Incidents</h2>
          </div>
          <div className="space-y-4">
            {incidentData.map((incident) => (
              <ExpandableCard key={incident.date} title={incident.title} icon={<AlertTriangle size={16} className="text-passport-coral" />}>
                <div className="space-y-3 text-sm text-passport-muted">
                  <div className="flex flex-wrap gap-x-6 gap-y-1">
                    <span className="font-mono text-passport-text">{incident.date}</span>
                    <span className="font-mono text-passport-dim">Duration: {incident.duration}</span>
                    <span className="font-mono text-passport-green">Status: {incident.status}</span>
                  </div>
                  <p>{incident.description}</p>
                  <div>
                    <span className="font-semibold text-passport-text">Root cause: </span>
                    {incident.rootCause}
                  </div>
                  <div>
                    <span className="font-semibold text-passport-text">Fix: </span>
                    {incident.fix}
                  </div>
                </div>
              </ExpandableCard>
            ))}
          </div>
        </section>

        {/* Footer CTA */}
        <section className="text-center py-16 border-t border-passport-border">
          <div className="section-divider mb-12" />
          <h2 className="text-2xl font-bold text-passport-text mb-4">Have a security concern?</h2>
          <p className="text-passport-muted mb-8 max-w-md mx-auto">
            We take security seriously. If you discover a vulnerability, please report it through our responsible disclosure program.
          </p>
          <a
            href="mailto:security@passport-agent.ai"
            className="btn-primary text-base px-8 py-3"
          >
            <Mail size={16} />
            Contact Security Team
          </a>
        </section>
      </div>
    </div>
  )
}
