'use client'
// Shfaqet te dashboard — alerts aktive POS

import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface Alert { type: string; level: 'warning' | 'error'; message: string }

export default function POSAlertsWidget() {
  const [alerts,    setAlerts]    = useState<Alert[]>([])
  const [dismissed, setDismissed] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/pos/alerts')
      .then(r => r.json())
      .then(d => setAlerts(d.alerts ?? []))
      .catch(() => {})

    // Refresh çdo 5 minuta
    const interval = setInterval(() => {
      fetch('/api/pos/alerts')
        .then(r => r.json())
        .then(d => setAlerts(d.alerts ?? []))
        .catch(() => {})
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  const visible = alerts.filter(a => !dismissed.includes(a.type))
  if (visible.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
      {visible.map(alert => (
        <div key={alert.type} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 10,
          background: alert.level === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
          border: `1px solid ${alert.level === 'error' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
        }}>
          <AlertTriangle size={14} color={alert.level === 'error' ? '#EF4444' : '#F59E0B'} style={{ flexShrink: 0 }} />
          <p style={{ flex: 1, fontSize: 12, fontWeight: 500, color: alert.level === 'error' ? '#EF4444' : '#F59E0B', lineHeight: 1.4 }}>
            {alert.message}
          </p>
          <button onClick={() => setDismissed(p => [...p, alert.type])}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', flexShrink: 0 }}>
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  )
}
