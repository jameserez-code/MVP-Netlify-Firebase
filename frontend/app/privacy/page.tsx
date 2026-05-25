'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import Navbar from '@/components/navbar'
import { Shield, ArrowLeft } from 'lucide-react'

export default function PrivacyPage() {
  const currentYear = useMemo(() => new Date().getFullYear(), [])
  return (
    <div className="min-h-screen bg-passport-bg">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 pt-28">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-passport-muted hover:text-passport-text transition-colors mb-8"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>

        <div className="glass-panel p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 rounded-passport bg-passport-green/10">
              <Shield size={24} className="text-passport-green" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-passport-text">Privacy Policy</h1>
          </div>

          <p className="text-sm text-passport-muted mb-8">Last updated: January 1, 2025</p>

          <div className="prose prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-lg font-semibold text-passport-text mb-3">1. Information We Collect</h2>
              <p className="text-sm text-passport-muted leading-relaxed mb-3">
                Passport Agent collects information necessary to provide the AI Agent governance platform. This includes:
              </p>
              <ul className="list-disc list-inside text-sm text-passport-muted leading-relaxed space-y-1.5 ml-2">
                <li><span className="text-passport-text">Account Information:</span> Name, email address, organization name, and hashed passwords for authentication.</li>
                <li><span className="text-passport-text">Agent Data:</span> Agent identifiers, model configurations, provider information, and registration metadata that you provide.</li>
                <li><span className="text-passport-text">Policy Data:</span> Policy definitions, rules, and enforcement configurations that you create.</li>
                <li><span className="text-passport-text">Action Logs:</span> Records of agent intents, policy decisions (allow/deny/modify), tool usage, and execution traces for audit purposes.</li>
                <li><span className="text-passport-text">Usage Data:</span> API request counts, enforcement statistics, and analytics metrics for operational monitoring.</li>
                <li><span className="text-passport-text">Technical Data:</span> IP addresses, user agents, and session information for security and rate limiting.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-passport-text mb-3">2. How We Use Information</h2>
              <p className="text-sm text-passport-muted leading-relaxed mb-3">
                We use the collected information exclusively for providing and improving the Passport Agent service:
              </p>
              <ul className="list-disc list-inside text-sm text-passport-muted leading-relaxed space-y-1.5 ml-2">
                <li>Authenticating users and securing access to the platform</li>
                <li>Processing policy enforcement decisions for AI agents</li>
                <li>Generating audit trails and compliance reports</li>
                <li>Providing analytics and operational insights</li>
                <li>Detecting and preventing security incidents</li>
                <li>Improving the platform based on aggregated usage patterns</li>
                <li>Complying with legal obligations and responding to lawful requests</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-passport-text mb-3">3. Data Storage and Security</h2>
              <p className="text-sm text-passport-muted leading-relaxed mb-3">
                Passport Agent employs industry-standard security measures to protect your data:
              </p>
              <ul className="list-disc list-inside text-sm text-passport-muted leading-relaxed space-y-1.5 ml-2">
                <li>All data is encrypted in transit using TLS 1.3</li>
                <li>Passwords are hashed using bcrypt with unique salts</li>
                <li>API keys are hashed using PBKDF2 before storage</li>
                <li>Data is stored in geographically distributed, SOC 2 compliant data centers</li>
                <li>Access to production data is restricted to authorized personnel</li>
                <li>Regular security audits and penetration testing are conducted</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-passport-text mb-3">4. Data Retention</h2>
              <p className="text-sm text-passport-muted leading-relaxed mb-3">
                We retain your data for as long as your account is active or as needed to provide services:
              </p>
              <ul className="list-disc list-inside text-sm text-passport-muted leading-relaxed space-y-1.5 ml-2">
                <li><span className="text-passport-text">Audit Logs:</span> Retained per your configured retention policy (default 90 days)</li>
                <li><span className="text-passport-text">Agent and Policy Data:</span> Retained for the life of your organization</li>
                <li><span className="text-passport-text">Account Data:</span> Retained until account deletion, then permanently removed within 30 days</li>
                <li><span className="text-passport-text">Demo Data:</span> Automatically purged after 24 hours in demo environments</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-passport-text mb-3">5. Your Rights</h2>
              <p className="text-sm text-passport-muted leading-relaxed mb-3">
                Depending on your jurisdiction, you may have the following rights regarding your personal data:
              </p>
              <ul className="list-disc list-inside text-sm text-passport-muted leading-relaxed space-y-1.5 ml-2">
                <li><span className="text-passport-text">Access:</span> Request a copy of your personal data</li>
                <li><span className="text-passport-text">Rectification:</span> Correct inaccurate or incomplete data</li>
                <li><span className="text-passport-text">Erasure:</span> Request deletion of your data (Right to be Forgotten)</li>
                <li><span className="text-passport-text">Portability:</span> Receive your data in a structured, machine-readable format</li>
                <li><span className="text-passport-text">Restriction:</span> Limit how we process your data</li>
                <li><span className="text-passport-text">Objection:</span> Object to processing based on legitimate interests</li>
              </ul>
              <p className="text-sm text-passport-muted leading-relaxed mt-2">
                You can exercise many of these rights directly through the Settings page in your dashboard.
                For other requests, contact us at the email below.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-passport-text mb-3">6. Third-Party Services</h2>
              <p className="text-sm text-passport-muted leading-relaxed">
                Passport Agent may use third-party services for infrastructure (cloud hosting, database services).
                These providers are bound by data processing agreements and do not have independent access to your data
                beyond what is necessary to provide the service. We do not sell, rent, or share your personal data
                with third parties for their marketing purposes.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-passport-text mb-3">7. Cookies and Tracking</h2>
              <p className="text-sm text-passport-muted leading-relaxed">
                Passport Agent uses essential cookies for authentication and security (session management, CSRF protection).
                We do not use tracking cookies, analytics cookies, or advertising cookies. No third-party cookies are
                set by our platform. You can configure your browser to reject cookies, but this may prevent you from
                logging into the platform.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-passport-text mb-3">8. Contact</h2>
              <p className="text-sm text-passport-muted leading-relaxed">
                For privacy-related inquiries, data requests, or to exercise your rights, please contact us:
              </p>
              <div className="mt-3 p-4 rounded-passport bg-passport-surface/50 border border-passport-border">
                <p className="text-sm text-passport-text font-mono">privacy@passportagent.ai</p>
                <p className="text-xs text-passport-muted mt-1">
                  Response time: within 30 days per GDPR requirements
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-passport-text mb-3">9. Changes to This Policy</h2>
              <p className="text-sm text-passport-muted leading-relaxed">
                We may update this privacy policy from time to time. We will notify users of material changes
                via email and through the platform. Continued use of Passport Agent after changes constitutes
                acceptance of the updated policy.
              </p>
            </section>
          </div>
        </div>

        <div className="text-center mt-8 pb-8">
          <p className="text-xs text-passport-dim">
            {'\u00A9'} {currentYear} Passport Agent. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
