'use client'

import Link from 'next/link'
import Navbar from '@/components/navbar'
import { Shield, ArrowLeft } from 'lucide-react'

export default function TermsPage() {
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
            <div className="p-2 rounded-passport bg-passport-azure/10">
              <Shield size={24} className="text-passport-azure" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-passport-text">Terms of Service</h1>
          </div>

          <p className="text-sm text-passport-muted mb-8">Last updated: January 1, 2025</p>

          <div className="prose prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-lg font-semibold text-passport-text mb-3">1. Acceptance of Terms</h2>
              <p className="text-sm text-passport-muted leading-relaxed">
                By accessing or using the Passport Agent platform (&ldquo;Service&rdquo;), you agree to be bound by these
                Terms of Service (&ldquo;Terms&rdquo;). If you are using the Service on behalf of an organization, you represent
                that you have the authority to bind that organization to these Terms. If you do not agree to these
                Terms, you may not access or use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-passport-text mb-3">2. Account Terms</h2>
              <ul className="list-disc list-inside text-sm text-passport-muted leading-relaxed space-y-1.5 ml-2">
                <li>You must provide accurate and complete registration information.</li>
                <li>You are responsible for maintaining the security of your account credentials.</li>
                <li>You are responsible for all activity that occurs under your account.</li>
                <li>You must be at least 18 years of age to use the Service.</li>
                <li>One person or legal entity may not maintain more than one free account.</li>
                <li>You may not share account credentials with unauthorized third parties.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-passport-text mb-3">3. Acceptable Use</h2>
              <p className="text-sm text-passport-muted leading-relaxed mb-3">
                You agree not to use the Service for any purpose that is unlawful or prohibited by these Terms.
                Specifically, you agree not to:
              </p>
              <ul className="list-disc list-inside text-sm text-passport-muted leading-relaxed space-y-1.5 ml-2">
                <li>Use the Service to circumvent security controls of other systems</li>
                <li>Attempt to gain unauthorized access to the Service or its related systems</li>
                <li>Interfere with or disrupt the Service or servers connected to the Service</li>
                <li>Transmit malware, viruses, or any code of a destructive nature</li>
                <li>Use the Service for any illegal or fraudulent activity</li>
                <li>Violate any applicable laws or regulations in your jurisdiction</li>
                <li>Exceed rate limits in a manner intended to degrade service for others</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-passport-text mb-3">4. Payment Terms</h2>
              <p className="text-sm text-passport-muted leading-relaxed mb-3">
                Certain features of the Service are provided on a paid subscription basis:
              </p>
              <ul className="list-disc list-inside text-sm text-passport-muted leading-relaxed space-y-1.5 ml-2">
                <li>Fees are billed in advance on a monthly or annual basis as selected.</li>
                <li>All fees are non-refundable except as required by law.</li>
                <li>We reserve the right to change pricing with 30 days&apos; notice.</li>
                <li>Failure to pay may result in suspension or termination of your account.</li>
                <li>Usage-based charges may apply for exceeding plan limits.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-passport-text mb-3">5. Intellectual Property</h2>
              <p className="text-sm text-passport-muted leading-relaxed">
                The Service and its original content, features, and functionality are owned by Passport Agent and
                are protected by international copyright, trademark, patent, trade secret, and other intellectual
                property laws. You retain ownership of all data and content you upload to the Service. You grant
                us a limited license to process your data solely for the purpose of providing the Service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-passport-text mb-3">6. Termination</h2>
              <p className="text-sm text-passport-muted leading-relaxed">
                We may terminate or suspend your account immediately, without prior notice, for conduct that we
                determine violates these Terms or is harmful to other users, us, or third parties, or for any
                other reason at our sole discretion. Upon termination, your right to use the Service will
                immediately cease. Data will be retained for 30 days for recovery purposes before permanent
                deletion, except where legally required otherwise.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-passport-text mb-3">7. Disclaimers and Limitation of Liability</h2>
              <p className="text-sm text-passport-muted leading-relaxed mb-3">
                THE SERVICE IS PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS. PASSPORT AGENT EXPRESSLY
                DISCLAIMS ALL WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
                IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>
              <p className="text-sm text-passport-muted leading-relaxed">
                To the maximum extent permitted by applicable law, Passport Agent shall not be liable for any
                indirect, incidental, special, consequential, or punitive damages, including without limitation,
                loss of profits, data, use, or goodwill, arising out of or in connection with your use of the
                Service, whether based on warranty, contract, tort, or any other legal theory.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-passport-text mb-3">8. Service Level</h2>
              <p className="text-sm text-passport-muted leading-relaxed">
                We strive to maintain high availability of the Service. However, we do not guarantee uninterrupted
                access. Scheduled maintenance will be announced in advance. We reserve the right to modify or
                discontinue any feature of the Service with reasonable notice.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-passport-text mb-3">9. Governing Law</h2>
              <p className="text-sm text-passport-muted leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of the State of Delaware,
                United States, without regard to its conflict of law provisions. Any disputes arising from these
                Terms shall be resolved through binding arbitration in accordance with the rules of the American
                Arbitration Association.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-passport-text mb-3">10. Changes to Terms</h2>
              <p className="text-sm text-passport-muted leading-relaxed">
                We reserve the right to modify these Terms at any time. We will provide notice of material changes
                via email and through the platform. Your continued use of the Service after any such changes
                constitutes your acceptance of the new Terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-passport-text mb-3">11. Contact</h2>
              <p className="text-sm text-passport-muted leading-relaxed">
                For questions about these Terms, please contact us at:
              </p>
              <div className="mt-3 p-4 rounded-passport bg-passport-surface/50 border border-passport-border">
                <p className="text-sm text-passport-text font-mono">legal@passportagent.ai</p>
              </div>
            </section>
          </div>
        </div>

        <div className="text-center mt-8 pb-8">
          <p className="text-xs text-passport-dim">
            &copy; {new Date().getFullYear()} Passport Agent. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
