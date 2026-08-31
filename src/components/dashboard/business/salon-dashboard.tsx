'use client'
import Link from 'next/link'
import { Scissors, Calendar, TrendingUp, Receipt, Users, Sparkles } from 'lucide-react'

interface Props {
  stats: { revenue: number; transactions: number; expenses: number; profit: number }
  userName?: string
  businessType?: string
}

const LABELS: Record<string, { title: string; icon: any; clients: string; services: string }> = {
  salon:   { title: 'Sallon',    icon: Scissors,  clients: 'Klientë', services: 'Shërbime flokësh' },
  barber:  { title: 'Berber',    icon: Scissors,  clients: 'Klientë', services: 'Shërbime berberi' },
  beauty:  { title: 'Beauty',    icon: Sparkles,  clients: 'Klientë', services: 'Trajtim estetik' },
  spa:     { title: 'Spa',       icon: Sparkles,  clients: 'Klientë', services: 'Trajtim spa' },
  gym:     { title: 'Gym',       icon: Users,     clients: 'Anëtarë', services: 'Abonamente & klasa' },
}

export default function SalonDashboard({ stats, userName, businessType = 'salon' }: Props) {
  const cfg = LABELS[businessType] || LABELS.salon
  const Icon = cfg.icon
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
            {greet}{firstName ? `, ${firstName}` : ''}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>{date}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/pos" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, background: '#7C3AED', color: 'white', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            <Receipt size={14} /> Arka Fiskale
          </Link>
          <Link href="/terminet" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', color:'var(--text-1)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            <Calendar size={14} /> Terminet
          </Link>
        </div>
      </div>

      {/* TVSH info */}
      <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <TrendingUp size={16} color="#EA580C" style={{ marginTop: 1, flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#C2410C', marginBottom: 2 }}>TVSH 18% — Shërbime {cfg.title}</p>
          <p style={{ fontSize: 11, color: '#EA580C' }}>Shërbimet e {cfg.title.toLowerCase()} i nënshtrohen TVSH 18%. Regjistrim i detyrueshëm kur qarkullimi tejkalon €30,000/vit.</p>
        </div>
      </div>

      {/* KPIs */}
      {businessType === 'gym' && (
        <Link href="/gym-members" style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', borderRadius:12, background:'#EFF6FF', border:'1px solid #BFDBFE', textDecoration:'none', marginBottom:4 }}>
          <Users size={16} color="#2563EB"/>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:13, fontWeight:700, color:'#1D4ED8' }}>Menaxho Anëtarësitë</p>
            <p style={{ fontSize:11, color:'var(--text-1)' }}>Shto, filtro, kontrollo skadimet</p>
          </div>
          <span style={{ fontSize:12, color:'var(--text-1)', fontWeight:600 }}>→</span>
        </Link>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {[
          { label: 'Të Ardhurat',   value: fmt(stats.revenue),        color: '#7C3AED', sub: cfg.services },
          { label: cfg.clients,     value: String(stats.transactions), color: '#10B981', sub: 'sot'       },
          { label: 'Shpenzimet',    value: fmt(stats.expenses),        color: '#EF4444', sub: 'operative' },
          { label: 'Fitimi Neto',   value: fmt(stats.profit),          color: '#3B82F6', sub: 'periudha'  },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 16px', borderTop: '3px solid ' + k.color }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{k.label}</p>
            <p style={{ fontSize: 24, fontWeight: 900, color: k.color, letterSpacing: '-0.03em', lineHeight: 1 }}>{k.value}</p>
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5 }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Veprime */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14 }}>Veprime të Shpejta</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Arka Fiskale',     href: '/pos',          icon: Receipt,    color: '#7C3AED' },
              { label: 'Terminet Sot',     href: '/terminet',     icon: Calendar,   color: '#10B981' },
              { label: 'Shpenzim i Ri',    href: '/expenses/new', icon: TrendingUp, color: '#EF4444' },
              { label: 'Raport Financiar', href: '/raporte-financiare', icon: TrendingUp, color: '#3B82F6' },
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
            `Shërbimet ${cfg.title} — 18% TVSH`,
            'Materialet dhe produktet — 18% TVSH (zbritshme)',
            'Tatimi mbi Biznes (TB) 9% mbi fitimin neto',
            'Kontribute pensionale 5% + 5%',
            'Regjistrim TVSH nga €30,000 qarkullim',
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
