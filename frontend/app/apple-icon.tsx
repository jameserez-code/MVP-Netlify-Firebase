import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0d1117',
          borderRadius: 36,
          border: '4px solid #2ea043',
        }}
      >
        <span
          style={{
            color: '#2ea043',
            fontSize: 72,
            fontWeight: 700,
            fontFamily: 'monospace',
          }}
        >
          PA
        </span>
      </div>
    ),
    { width: 180, height: 180 }
  )
}
