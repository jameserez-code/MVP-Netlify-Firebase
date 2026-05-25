import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/toast'
import { NetworkErrorProvider } from '@/components/network-error'
import { CommandPaletteProvider } from '@/components/command-palette-provider'
import SentryInit from '@/components/sentry-init'
import OfflineBanner from '@/components/offline-banner'
import ApiHealthCheck from '@/components/api-health-check'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'sans-serif'],
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
  preload: true,
  fallback: ['ui-monospace', 'monospace'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://passport-agent-demo.netlify.app'),
  title: 'AI Agent Passport — OAuth for AI Agents',
  description: 'Control what your AI agents can do. Pre-execution policy enforcement for autonomous AI agents.',
  applicationName: 'AI Agent Passport',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'AI Agent Passport — OAuth for AI Agents',
    description: 'Control what your AI agents can do with pre-execution policy enforcement.',
    type: 'website',
    locale: 'en_US',
    siteName: 'AI Agent Passport',
    url: 'https://passport-agent-demo.netlify.app',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Agent Passport — OAuth for AI Agents',
    description: 'Control what your AI agents can do with pre-execution policy enforcement.',
  },
  manifest: '/manifest.json',
  alternates: {
    canonical: 'https://passport-agent-demo.netlify.app',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  userScalable: true,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0d1117" />
        <meta name="color-scheme" content="dark" />
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' *.vercel-scripts.com; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' *.passport-agent-demo.netlify.app localhost:*; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preload" href="/manifest.json" as="fetch" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'AI Agent Passport',
              applicationCategory: 'DeveloperApplication',
              operatingSystem: 'Web',
              description:
                'OAuth for AI Agents. Pre-execution policy enforcement for autonomous AI agents.',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
            }),
          }}
        />
      </head>
      <body className={`${inter.variable} ${jetbrains.variable} antialiased`}>
        <SentryInit />
        <CommandPaletteProvider>
          <NetworkErrorProvider>
            <ToastProvider>
              <OfflineBanner />
              <ApiHealthCheck />
              {children}
            </ToastProvider>
          </NetworkErrorProvider>
        </CommandPaletteProvider>
      </body>
    </html>
  )
}
