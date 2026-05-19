import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') || 'AI Agent Passport'
  const description = searchParams.get('description') || 'OAuth for AI Agents'
  const version = searchParams.get('version') || 'v2.1.0'

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0d1117',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Grid pattern */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(46,160,67,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(46,160,67,0.06) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Glow */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 600,
            height: 400,
            background: 'radial-gradient(circle, rgba(46,160,67,0.12) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
            zIndex: 1,
            padding: '0 60px',
            textAlign: 'center',
          }}
        >
          {/* Logo / Shield */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 12,
              border: '2px solid rgba(46,160,67,0.4)',
              background: 'rgba(46,160,67,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 8,
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2ea043" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 28,
              color: '#2ea043',
              fontWeight: 500,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            }}
          >
            {description}
          </div>
          <div
            style={{
              marginTop: 24,
              padding: '10px 24px',
              borderRadius: 6,
              border: '1px solid rgba(48,54,61,0.6)',
              background: 'rgba(22,27,34,0.7)',
              fontSize: 14,
              color: '#8b949e',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            }}
          >
            {version} — Control what your AI agents can do
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
