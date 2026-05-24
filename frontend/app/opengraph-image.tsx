import { ImageResponse } from 'next/og'

export const alt = 'AI Agent Passport'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
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
          background: '#0d1117',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: 48,
            height: 48,
            backgroundColor: '#2ea043',
            borderRadius: 10,
            marginBottom: 24,
          }}
        />
        <span style={{ color: '#c9d1d9', fontSize: 64, fontWeight: 700 }}>
          AI Agent Passport
        </span>
        <span style={{ color: '#2ea043', fontSize: 32 }}>OAuth for AI Agents</span>
        <span style={{ color: '#8b949e', fontSize: 24, marginTop: 24 }}>
          Set policies. Register agents. Enforce automatically.
        </span>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
