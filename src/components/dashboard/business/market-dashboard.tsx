'use client'
import Link from 'next/link'
import { ShoppingBag, Package, TrendingUp, Receipt, FileText } from 'lucide-react'

interface Props {
  stats: { revenue: number; transactions: number; expenses: number; profit: number }
  userName?: string
  businessType?: string
}

export default function MarketDashboard({ stats, userName, businessType = 'market' }: Props) {
  const isPharmacy = businessType === 'pharmacy'
  const firstName = userName?.split(' ')[0] || ''
  const hour  = new Date().getHours()
  const greet = hour < 12 ? 'Mirëmëngjes' : hour < 17 ? 'Mirëdita' : 'Mirëmbrëma'
  const fmt   = (n: number) => '€' + (n / 100).toLocaleString('sq-AL', { minimumFractionDigits: 2 })
  const date  = new Date().toLocaleDateString('sq-AL', { weekday: 'long', day: 'numeric', month: 'long' })
  const title = isPharmacy ? 'Farmaci' : 'Market'

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
          <ShoppingBag size={14} /> Hap POS
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {[
          { label: 'Shitjet',       value: fmt(stats.revenue),        color: '#7C3AED', sub: 'të ardhura totale' },
          { label: 'Transaksione',  value: String(stats.transactions), color: '#10B981', sub: 'shitje sot'       },
          { label: 'Shpenzimet',    value: fmt(stats.expenses),        color: '#EF4444', sub: 'blerje mallrash'  },
          { label: 'Fitimi Neto',   value: fmt(stats.profit),          color: '#3B82F6', sub: 'neto i periudhës' },
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
              { label: 'Hap POS',          href: '/pos',          icon: ShoppingBag, color: '#7C3AED' },
              { label: 'Menaxho Produktet', href: '/pos/products', icon: Package,    color: '#F59E0B' },
              { label: 'Shpenzim i Ri',    href: '/expenses/new', icon: TrendingUp, color: '#EF4444' },
              { label: 'Raport Financiar', href: '/raporte-financiare', icon: FileText, color: '#10B981' },
            ].map(a => (
              <Link key={a.href} href={a.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-muted)', textDecoration: 'none', fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                <a.icon size={15} color={a.color} />
                {a.label}
              </Link>
            ))}
          </div>
        </div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14 }}>Informata Tatimore</p>
          {[
            isPharmacy ? 'Barnat — 0% TVSH (të liruara)' : 'Mallrat ushqimore bazike — 8% TVSH',
            isPharmacy ? 'Pajisjet mjekësore — 18% TVSH' : 'Produktet e tjera — 18% TVSH',
            'Tatimi mbi Biznes (TB) 9% mbi fitimin neto',
            'Kontribute pensionale 5% + 5%',
            'Regjistrim TVSH nga €30,000 qarkullim/vit',
          ].map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, padding: '7px 10px', borderRadius: 8, background: 'var(--bg-muted)', border: '1px solid var(--border)', marginBottom: 6 }}>
              <span style={{ color: '#7C3AED', fontWeight: 800, flexShrink: 0 }}>→</span>
              <p style={{ fontSize: 12, color: 'var(--text-2)' }}>{t}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
