import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/toast'
import SentryInit from '@/components/sentry-init'
import OfflineBanner from '@/components/offline-banner'
import ApiHealthCheck from '@/components/api-health-check'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://passport-agent-demo.netlify.app'),
  title: 'AI Agent Passport',
  description: 'OAuth for AI Agents. Create policies, register agents, and enforce permissions automatically.',
  openGraph: {
    title: 'AI Agent Passport',
    description: 'Control what your AI agents can do with pre-execution policy enforcement.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
      </head>
      <body className={`${inter.variable} ${jetbrains.variable} antialiased`}>
        <SentryInit />
        <ToastProvider>
          <OfflineBanner />
          <ApiHealthCheck />
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
