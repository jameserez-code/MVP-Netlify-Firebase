'use client'

import { useEffect } from 'react'
import { AlertOctagon, Shield, Mail } from 'lucide-react'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalErrorPage({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="dark" />
        <title>Error - Passport Agent</title>
      </head>
      <body style={{
        backgroundColor: '#0d1117',
        color: '#c9d1d9',
        fontFamily: 'system-ui, sans-serif',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 0,
      }}>
        <div style={{
          maxWidth: '440px',
          width: '100%',
          margin: '0 16px',
          position: 'relative',
        }}>
          <div style={{
            background: 'rgba(22,27,34,0.7)',
            border: '1px solid rgba(48,54,61,0.5)',
            borderRadius: '8px',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            padding: '32px',
            textAlign: 'center',
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(248,81,73,0.1)',
              border: '1px solid rgba(248,81,73,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <AlertOctagon size={36} color="#f85149" />
            </div>

            <h1 style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#c9d1d9',
              margin: '0 0 8px',
            }}>
              Something went wrong on our end
            </h1>
            <p style={{
              fontSize: '14px',
              color: '#8b949e',
              margin: '0 0 6px',
              lineHeight: 1.5,
            }}>
              We&apos;re working on it
            </p>
            <p style={{
              fontSize: '12px',
              color: '#484f58',
              margin: '0 0 24px',
            }}>
              A critical error occurred preventing the application from loading.
            </p>

            {error.digest && (
              <div style={{
                padding: '8px 12px',
                borderRadius: '6px',
                background: 'rgba(22,27,34,0.5)',
                border: '1px solid #30363d',
                marginBottom: '24px',
                display: 'inline-block',
              }}>
                <span style={{ fontSize: '10px', color: '#484f58', fontFamily: 'monospace', textTransform: 'uppercase' }}>Error ID: </span>
                <code style={{ fontSize: '12px', color: '#8b949e', fontFamily: 'monospace' }}>{error.digest}</code>
              </div>
            )}

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              alignItems: 'center',
              marginBottom: '24px',
            }}>
              <button
                onClick={reset}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  background: 'rgba(46,160,67,0.12)',
                  border: '1px solid rgba(46,160,67,0.3)',
                  borderRadius: '4px',
                  color: '#2ea043',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '100%',
                  justifyContent: 'center',
                }}
              >
                Try Again
              </button>
              <a
                href="mailto:support@passportagent.ai"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  background: 'rgba(48,54,61,0.3)',
                  border: '1px solid rgba(48,54,61,0.6)',
                  borderRadius: '4px',
                  color: '#8b949e',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  width: '100%',
                  justifyContent: 'center',
                }}
              >
                <Mail size={14} />
                Contact Support
              </a>
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <Shield size={20} color="#2ea043" />
              <span style={{
                fontFamily: 'monospace',
                fontSize: '14px',
                fontWeight: 700,
                color: '#2ea043',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}>
                Passport Agent
              </span>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
