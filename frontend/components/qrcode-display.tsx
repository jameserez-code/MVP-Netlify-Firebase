'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

interface QRCodeDisplayProps {
  value: string
  size?: number
  className?: string
}

export default function QRCodeDisplay({ value, size = 160, className = '' }: QRCodeDisplayProps) {
  const [dataUrl, setDataUrl] = useState<string>('')

  useEffect(() => {
    QRCode.toDataURL(value, {
      width: size,
      margin: 2,
      color: {
        dark: '#2ea043',
        light: '#0d1117',
      },
    }).then(setDataUrl)
  }, [value, size])

  if (!dataUrl) return null

  return (
    <img
      src={dataUrl}
      alt="QR Code"
      className={`rounded-passport border border-passport-border ${className}`}
      width={size}
      height={size}
    />
  )
}
