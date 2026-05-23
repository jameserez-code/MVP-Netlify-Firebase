'use client'
import { useEffect, useRef } from 'react'

interface QRCodeDisplayProps {
  value: string
  size?: number
}

export default function QRCodeDisplay({ value, size = 180 }: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    async function render() {
      const QRCode = (await import('qrcode')).default
      if (canvasRef.current) {
        await QRCode.toCanvas(canvasRef.current, value, {
          width: size,
          margin: 2,
          color: { dark: '#c9d1d9', light: '#0d1117' },
        })
      }
    }
    render()
  }, [value, size])

  return (
    <div className="inline-block p-3 bg-white rounded-passport">
      <canvas ref={canvasRef} />
    </div>
  )
}
