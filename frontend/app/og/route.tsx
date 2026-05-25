import { ImageResponse } from 'next/og'

export const dynamic = "force-static"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') || 'AI Agent Passport'
  const description = searchParams.get('description') || 'OAuth for AI Agents'
  const version = searchParams.get('version') || '2.1'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'monospace',
          padding: 80,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundSize: '40px 40px',
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 32,
          }}
        >
          <span style={{ color: '#2ea043', fontSize: 48 }}>◇</span>
          <span
            style={{
              color: '#c9d1d9',
              fontSize: 72,
              fontWeight: 700,
            }}
          >
            {title}
          </span>
        </div>

        <span style={{ color: '#2ea043', fontSize: 36, marginBottom: 16 }}>
          {description}
        </span>

        <span style={{ color: '#8b949e', fontSize: 28, marginBottom: 40 }}>
          Set policies. Register agents. Enforce automatically.
        </span>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 16px',
            border: '1px solid rgba(46,160,67,0.2)',
            borderRadius: 6,
          }}
        >
          <span
            style={{
              color: '#2ea043',
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            v{version}
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  )
}
