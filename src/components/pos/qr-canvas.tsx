'use client'

import { useEffect, useRef, useState } from 'react'

export default function QRCanvas({ data, size = 120 }: { data: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!data || data === 'MOCK|' + data.split('|')[1]) return
    import('qrcode').then(QRCode => {
      QRCode.toDataURL(data, {
        width:  size,
        margin: 1,
        color:  { dark: '#000000', light: '#FFFFFF' },
        errorCorrectionLevel: 'M',
      }).then(url => setDataUrl(url)).catch(() => {})
    }).catch(() => {})
  }, [data, size])

  if (!dataUrl) return (
    <div style={{ width: size, height: size, margin: '0 auto 12px', borderRadius: 10, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 10, color: '#9CA3AF', textAlign: 'center' }}>QR ATK</span>
    </div>
  )

  return (
    <div style={{ width: size, height: size, margin: '0 auto 12px', borderRadius: 10, overflow: 'hidden', background: 'white' }}>
      <img src={dataUrl} alt="QR Kupon ATK" width={size} height={size} style={{ display: 'block' }} />
    </div>
  )
}
