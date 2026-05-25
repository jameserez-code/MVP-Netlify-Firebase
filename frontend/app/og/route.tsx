import { ImageResponse } from 'next/og'

export const dynamic = "force-static"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') || 'AI Agent Passport'

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: '#0d1117', color: '#2ea043',
        fontSize: 60, fontWeight: 700
      }}>
        {title}
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
