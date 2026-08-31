'use client'

import dynamic from 'next/dynamic'
import type { CategoryDashboardConfig } from '@/lib/category-dashboard'

interface Stats {
  totalRevenue: number; totalExpenses: number; profit: number
  pendingAmount: number; totalInvoices: number; monthlyRevenue: number
  monthlyExpenses: number; pendingCount: number; overdueCount: number
}

interface Props {
  config: CategoryDashboardConfig
  stats: Stats
  userName?: string
  businessType?: string | null
}

// Lazy load per business type
const MarketDashboard   = dynamic(() => import('./business/market-dashboard'),   { ssr: false })
const PharmacyDashboard = dynamic(() => import('./business/pharmacy-dashboard'), { ssr: false })
const BakeryDashboard   = dynamic(() => import('./business/bakery-dashboard'),   { ssr: false })
const SalonDashboard    = dynamic(() => import('./business/salon-dashboard'),    { ssr: false })
const BarberDashboard   = dynamic(() => import('./business/barber-dashboard'),   { ssr: false })
const BeautyDashboard   = dynamic(() => import('./business/beauty-dashboard'),   { ssr: false })
const SpaDashboard      = dynamic(() => import('./business/spa-dashboard'),      { ssr: false })
const GymDashboard      = dynamic(() => import('./business/gym-dashboard'),      { ssr: false })
const HealthDashboard   = dynamic(() => import('./business/health-dashboard'),    { ssr: false })
const OtherDashboard    = dynamic(() => import('./business/other-dashboard'),     { ssr: false })

export default function CategoryDashboard({ config, stats, userName, businessType }: Props) {
  const s = {
    revenue:      stats.totalRevenue,
    transactions: stats.totalInvoices,
    expenses:     stats.totalExpenses,
    profit:       stats.profit,
  }

  switch (businessType) {
    case 'market':
    case 'retail':
      return <MarketDashboard   stats={s} userName={userName} />
    case 'pharmacy':
      return <PharmacyDashboard stats={s} userName={userName} />
    case 'bakery':
      return <BakeryDashboard   stats={s} userName={userName} />
    case 'salon':
      return <SalonDashboard    stats={s} userName={userName} />
    case 'barber':
      return <BarberDashboard   stats={s} userName={userName} />
    case 'beauty':
      return <BeautyDashboard   stats={s} userName={userName} />
    case 'spa':
      return <SpaDashboard      stats={s} userName={userName} />
    case 'gym':
      return <GymDashboard      stats={s} userName={userName} />
    case 'health':
      return <HealthDashboard    stats={s} userName={userName} />
    case 'other':
      return <OtherDashboard     stats={s} userName={userName} />
    default:
      return <GenericDashboard config={config} stats={stats} userName={userName} />
  }
}

// Generic fallback for restaurant/cafe/bar/health (kanë dashboard te vet)
function GenericDashboard({ config, stats, userName }: { config: CategoryDashboardConfig; stats: Stats; userName?: string }) {
  const hour   = new Date().getHours()
  const greet  = hour < 12 ? 'Mirëmëngjes' : hour < 17 ? 'Mirëdita' : 'Mirëmbrëma'
  const name   = userName?.split(' ')[0] || ''
  const fmt    = (n: number, p?: string) => (p ? p : '') + (n/100).toLocaleString('sq-AL', { minimumFractionDigits: 2 })
  const fmtInt = (n: number) => n.toLocaleString('sq-AL')

  const kpiValues: Record<string, { value: number; prefix?: string }> = {
    revenue:  { value: stats.totalRevenue,  prefix: '€' },
    expenses: { value: stats.totalExpenses, prefix: '€' },
    profit:   { value: stats.profit,        prefix: '€' },
    invoices: { value: stats.totalInvoices },
    pending:  { value: stats.pendingAmount, prefix: '€' },
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap: 20 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color:'var(--text-1)', letterSpacing:'-0.03em' }}>
            {greet}{name ? `, ${name}` : ''}
          </h1>
          <p style={{ fontSize: 13, color:'var(--text-3)', marginTop: 2 }}>
            {new Date().toLocaleDateString('sq-AL', { weekday:'long', day:'numeric', month:'long' })}
          </p>
        </div>
        {config.quickActions[0] && (
          <a href={config.quickActions[0].href} style={{ padding:'9px 18px', borderRadius: 10, background:'#7C3AED', color:'white', fontSize: 13, fontWeight: 700, textDecoration:'none' }}>
            {config.quickActions[0].label}
          </a>
        )}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap: 14 }}>
        {config.kpis.map(kpi => {
          const kv = kpiValues[kpi.key]
          return (
            <div key={kpi.label} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius: 14, padding:'18px 16px', borderTop:`3px solid ${kpi.color}` }}>
              <p style={{ fontSize: 11, fontWeight: 700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom: 8 }}>{kpi.label}</p>
              <p style={{ fontSize: 24, fontWeight: 900, color: kpi.color, letterSpacing:'-0.03em', lineHeight: 1 }}>
                {kv ? (kv.prefix ? fmt(kv.value, kv.prefix) : fmtInt(kv.value)) : '—'}
              </p>
              <p style={{ fontSize: 11, color:'var(--text-3)', marginTop: 5 }}>{kpi.sublabel}</p>
            </div>
          )
        })}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 14 }}>
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius: 14, padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color:'var(--text-1)', marginBottom: 14 }}>Veprime të Shpejta</p>
          <div style={{ display:'flex', flexDirection:'column', gap: 8 }}>
            {config.quickActions.map(a => (
              <a key={a.href} href={a.href} style={{ display:'flex', alignItems:'center', gap: 10, padding:'10px 14px', borderRadius: 10, border:'1px solid var(--border)', background:'var(--bg-muted)', textDecoration:'none', fontSize: 13, fontWeight: 600, color:'var(--text-1)' }}>
                <span style={{ width: 8, height: 8, borderRadius:'50%', background: a.color, flexShrink: 0 }}/>{a.label}
              </a>
            ))}
          </div>
        </div>
        {config.tips.length > 0 && (
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius: 14, padding: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color:'var(--text-1)', marginBottom: 14 }}>Keshilla Tatimore</p>
            {config.tips.map((t,i) => (
              <div key={i} style={{ display:'flex', gap: 10, padding:'10px 12px', borderRadius: 9, background:'var(--bg-muted)', border:'1px solid var(--border)', marginBottom: 8 }}>
                <span style={{ width: 3, borderRadius: 2, background:'#7C3AED', flexShrink: 0 }}/>
                <p style={{ fontSize: 12, color:'var(--text-1)' }}>{t}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
