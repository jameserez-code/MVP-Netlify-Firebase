import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/toast'
import SentryInit from '@/components/sentry-init'

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
  title: 'AI Agent Passport',
  description: 'OAuth for AI Agents. Create policies, register agents, and enforce permissions automatically.',
  openGraph: {
    title: 'AI Agent Passport',
    description: 'Control what your AI agents can do with pre-execution policy enforcement.',
    images: ['/og-image.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
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
      <body className={`${inter.variable} ${jetbrains.variable} antialiased`}>
        <SentryInit />
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
