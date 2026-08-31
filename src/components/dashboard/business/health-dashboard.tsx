'use client'
import Link from 'next/link'
import { Stethoscope, FlaskConical, Calendar, FileText, TrendingUp, Users } from 'lucide-react'

interface Props {
  stats: { revenue: number; transactions: number; expenses: number; profit: number }
  userName?: string
  businessType?: string
}

export default function HealthDashboard({ stats, userName, businessType }: Props) {
  const isDoctor = businessType === 'health'
  const tvshInfo = isDoctor
    ? 'Shërbimet mjekësore — 0% TVSH (të liruara sipas Ligjit 03/L-146)'
    : 'Shërbimet — 18% TVSH standard. Regjistrim i detyrueshëm nga €30,000 qarkullim.'
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
            {greet}{firstName ? ', Dr. ' + firstName : ''}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>{date}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/pos" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, background:'var(--bg-card)', color:'var(--text-1)', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            <Stethoscope size={14} />
            Kupon Fiskal
          </Link>
          <Link href="/invoices/new" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-2)', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
            <FileText size={14} />
            Faturë
          </Link>
        </div>
      </div>

      {/* Info TVSH */}
      <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <TrendingUp size={16} color="#2563EB" />
        </div>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: isDoctor ? '#1D4ED8' : '#5B21B6', marginBottom: 1 }}>Shërbimet mjekësore janë të liruara nga TVSH</p>
          <p style={{ fontSize: 11, color: isDoctor ? '#3B82F6' : '#7C3AED' }}>Sipas Ligjit Nr. 03/L-146 — kuponat lëshohen pa TVSH (taxa rate C = 0%)</p>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {[
          { label: 'Të Ardhurat',    value: fmt(stats.revenue),        color: '#0EA5E9', sub: 'vizita dhe procedura', icon: TrendingUp },
          { label: 'Pacientë Sot',   value: String(stats.transactions), color: '#10B981', sub: 'të shërbyer sot',     icon: Users },
          { label: 'Shpenzimet',     value: fmt(stats.expenses),        color: '#EF4444', sub: 'materiale mjekësore', icon: FlaskConical },
          { label: 'Fitimi Neto',    value: fmt(stats.profit),          color: '#7C3AED', sub: 'neto i periudhës',   icon: TrendingUp },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 16px', borderTop: '3px solid ' + k.color }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{k.label}</p>
            <p style={{ fontSize: 24, fontWeight: 900, color: k.color, letterSpacing: '-0.03em', lineHeight: 1 }}>{k.value}</p>
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5 }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Veprime + Këshilla */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14 }}>Veprime të Shpejta</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Lësho Kupon Fiskal', href: '/pos',          color: '#0EA5E9', icon: Stethoscope },
              { label: 'Shpenzim Mjekësor', href: '/expenses/new', color: '#EF4444', icon: FlaskConical },
              { label: 'Raport Financiar',  href: '/raporte-financiare', color: '#7C3AED', icon: TrendingUp },
              { label: 'Historia e Shitjeve', href: '/pos/reports', color: '#10B981', icon: FileText },
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              'Shërbimet mjekësore — 0% TVSH (të liruara sipas ligjit)',
              'Barnat dhe produktet farmaceutike — 0% TVSH',
              'Materialet mjekësore — 18% TVSH (zbritshme)',
              'Tatimi mbi Biznes (TB) 9% — mbi fitimin neto vjetor',
              'Kontribute pensionale 5% punëdhënës + 5% punëtor',
            ].map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
                <span style={{ color: '#0EA5E9', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>→</span>
                <p style={{ fontSize: 12, color: 'var(--text-2)' }}>{t}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
