'use client'
import Link from 'next/link'

interface Props {
  stats: { revenue: number; transactions: number; expenses: number; profit: number }
  userName?: string
}

export default function BeautyDashboard({ stats, userName }: Props) {
  const firstName = userName?.split(' ')[0] || ''
  const hour  = new Date().getHours()
  const greet = hour < 12 ? 'Mirëmëngjes' : hour < 17 ? 'Mirëdita' : 'Mirëmbrëma'
  const fmt   = (n: number) => '€' + (n / 100).toLocaleString('sq-AL', { minimumFractionDigits: 2 })
  const date  = new Date().toLocaleDateString('sq-AL', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-1)', letterSpacing: '-0.03em' }}>
            {greet}{firstName ? ', ' + firstName : ''}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>{date}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/pos" style={{ padding: '9px 16px', borderRadius: 10, background: '#A855F7', color:'var(--text-1)', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            Hap Arkën
          </Link>
          <Link href="/appointments" style={{ padding: '9px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-2)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            Terminet
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {[
          { label: 'Trajtimet Sot',        value: fmt(stats.revenue),        color: '#A855F7',  sub: 'kuponë fiskalë' },
          { label: 'Klientë Sot',        value: String(stats.transactions), color: '#10B981', sub: 'të shërbyer sot' },
          { label: 'Shpenzimet',   value: fmt(stats.expenses),       color: '#EF4444', sub: 'produkte dhe materiale' },
          { label: 'Fitimi Neto',  value: fmt(stats.profit),         color: '#7C3AED', sub: 'neto i ditës' },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 16px', borderTop: '3px solid ' + k.color }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{k.label}</p>
            <p style={{ fontSize: 24, fontWeight: 900, color: k.color, letterSpacing: '-0.03em', lineHeight: 1 }}>{k.value}</p>
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5 }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Actions + Tax info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14 }}>Veprime të Shpejta</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Shto Trajtim', href: '/pos/products', color: '#A855F7'   },
              { label: 'Shto Termin', href: '/appointments', color: '#3B82F6' },
              { label: 'Regjistro Shpenzim', href: '/expenses/new', color: '#EF4444' },
              { label: 'Raporti Ditor',      href: '/pos/reports',  color: '#10B981' },
            ].map(a => (
              <Link key={a.label} href={a.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-muted)', textDecoration: 'none', fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
                {a.label}
              </Link>
            ))}
          </div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14 }}>Informata Tatimore</p>
          {[
            { txt: 'TVSH 18% për shërbime kozmetike', color: '#A855F7'   },
            { txt: 'Produktet premium — TVSH 18%', color: '#F59E0B' },
            { txt: 'Pakot e trajtimeve rrisin vlerën mesatare', color: '#EF4444' },
          ].map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 9, background: 'var(--bg-muted)', border: '1px solid var(--border)', marginBottom: 8 }}>
              <span style={{ width: 3, minWidth: 3, borderRadius: 2, background: t.color, flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{t.txt}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
