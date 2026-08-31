'use client'
import Link from 'next/link'
import { Receipt, Settings, TrendingUp, History } from 'lucide-react'

interface Props {
  userName?: string
  totalSalesToday: number
  totalSalesMonth: number
  txCountToday: number
  companyName: string
}

export default function ArkaDashboard({ userName, totalSalesToday, totalSalesMonth, txCountToday, companyName }: Props) {
  const firstName = userName?.split(' ')[0] || ''
  const hour  = new Date().getHours()
  const greet = hour < 12 ? 'Mirëmëngjes' : hour < 17 ? 'Mirëdita' : 'Mirëmbrëma'
  const date  = new Date().toLocaleDateString('sq-AL', { weekday: 'long', day: 'numeric', month: 'long' })
  const fmt   = (n: number) => '€' + (n / 100).toLocaleString('sq-AL', { minimumFractionDigits: 2 })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600, margin: '0 auto' }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-1)', letterSpacing: '-0.03em' }}>
          {greet}{firstName ? `, ${firstName}` : ''}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>{date} · {companyName}</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        {[
          { label: 'Shitjet Sot',    value: fmt(totalSalesToday),   color: '#06B6D4' },
          { label: 'Kuponë Sot',     value: String(txCountToday),   color: '#10B981' },
          { label: 'Shitjet Muajit', value: fmt(totalSalesMonth),   color: '#7C3AED' },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 16px', borderTop: `3px solid ${k.color}` }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{k.label}</p>
            <p style={{ fontSize: 26, fontWeight: 900, color: k.color, letterSpacing: '-0.03em', lineHeight: 1 }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>Veprime</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'Lësho Kupon Fiskal',  href: '/pos',          icon: Receipt,    color: '#06B6D4' },
            { label: 'Historia Kuponave',    href: '/pos/history',  icon: History,    color: '#10B981' },
            { label: 'Raportet',             href: '/pos/reports',  icon: TrendingUp, color: '#7C3AED' },
            { label: 'Cilësimet & ATK',      href: '/settings',     icon: Settings,   color: '#6B7280' },
          ].map(a => (
            <Link key={a.href} href={a.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-muted)', textDecoration: 'none', fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
              <a.icon size={15} color={a.color} />
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Info */}
      <div style={{ background: '#ECFEFF', border: '1px solid #A5F3FC', borderRadius: 12, padding: '12px 16px' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#0E7490', marginBottom: 3 }}>Plani Arka — €59/vit</p>
        <p style={{ fontSize: 12, color: '#0891B2', lineHeight: 1.5 }}>
          Për raporte të avancuara, fatura B2B dhe modul të plotë — kaloni te plani Basic ose Pro.
        </p>
      </div>
    </div>
  )
}
