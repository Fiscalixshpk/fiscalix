'use client'
import Link from 'next/link'
import { ShoppingBag, Receipt, TrendingUp, FileText, Package } from 'lucide-react'

interface Props {
  stats: { revenue: number; transactions: number; expenses: number; profit: number }
  userName?: string
}

export default function OtherDashboard({ stats, userName }: Props) {
  const firstName = userName?.split(' ')[0] || ''
  const hour  = new Date().getHours()
  const greet = hour < 12 ? 'Mirëmëngjes' : hour < 17 ? 'Mirëdita' : 'Mirëmbrëma'
  const fmt   = (n: number) => '€' + (n / 100).toLocaleString('sq-AL', { minimumFractionDigits: 2 })
  const date  = new Date().toLocaleDateString('sq-AL', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-1)', letterSpacing: '-0.03em' }}>
            {greet}{firstName ? `, ${firstName}` : ''}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>{date}</p>
        </div>
        <Link href="/pos" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, background: '#7C3AED', color: 'white', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          <ShoppingBag size={14} /> Kupon Fiskal
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {[
          { label: 'Shitjet',      value: fmt(stats.revenue),        color: '#7C3AED', sub: 'të ardhura totale' },
          { label: 'Transaksione', value: String(stats.transactions), color: '#10B981', sub: 'shitje të kryera'  },
          { label: 'Shpenzimet',   value: fmt(stats.expenses),        color: '#EF4444', sub: 'kosto operative'  },
          { label: 'Fitimi',       value: fmt(stats.profit),          color: '#3B82F6', sub: 'fitim neto'       },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 16px', borderTop: '3px solid ' + k.color }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{k.label}</p>
            <p style={{ fontSize: 24, fontWeight: 900, color: k.color, letterSpacing: '-0.03em', lineHeight: 1 }}>{k.value}</p>
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5 }}>{k.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14 }}>Veprime të Shpejta</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Kupon Fiskal',    href: '/pos',          icon: Receipt,    color: '#7C3AED' },
              { label: 'Shpenzim i Ri',   href: '/expenses/new', icon: Package,    color: '#EF4444' },
              { label: 'Raport Financiar',href: '/raporte-financiare', icon: TrendingUp, color: '#10B981' },
              { label: 'Historia',        href: '/pos/reports',  icon: FileText,   color: '#3B82F6' },
            ].map(a => (
              <Link key={a.href} href={a.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-muted)', textDecoration: 'none', fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                <a.icon size={15} color={a.color} />
                {a.label}
              </Link>
            ))}
          </div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14 }}>Tatimi</p>
          {['TVSH 18% — shërbime të zakonshme', 'Tatimi mbi Biznes (TB) 9% mbi fitim', 'Kontribute pensionale 10% total', 'Regjistrim TVSH nga €30,000 qarkullim'].map((t,i) => (
            <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'var(--bg-muted)', border: '1px solid var(--border)', marginBottom: 6 }}>
              <span style={{ color: '#7C3AED', fontWeight: 800, flexShrink: 0 }}>→</span>
              <p style={{ fontSize: 12, color: 'var(--text-2)' }}>{t}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
