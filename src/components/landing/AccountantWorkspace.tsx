'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'
import { Download, AlertTriangle, CheckCircle, TrendingDown, Building2, ChevronRight } from 'lucide-react'

const clients = [
  { name: 'Tech Solutions SH.P.K.', health: 92, revenue: '€8,400', invoices: 14, status: 'ok', overdue: 0 },
  { name: 'Studio Media Prishtinë', health: 61, revenue: '€3,200', invoices: 8, status: 'warning', overdue: 2 },
  { name: 'Agjensi Digjitale', health: 38, revenue: '€1,800', invoices: 5, status: 'critical', overdue: 3 },
  { name: 'Restoranti Besa', health: 85, revenue: '€6,100', invoices: 22, status: 'ok', overdue: 0 },
  { name: 'Ndërtim & Arredim', health: 74, revenue: '€4,700', invoices: 11, status: 'warning', overdue: 1 },
]

const urgentTasks = [
  { client: 'Agjensi Digjitale', issue: '3 fatura vonuara · €2,400', priority: 'critical', color: '#EF4444' },
  { client: 'Studio Media', issue: 'TVSH T2 · 5 ditë mbetën', priority: 'warning', color: '#F59E0B' },
  { client: 'Studio Media', issue: 'Asnjë faturë këtë muaj', priority: 'warning', color: '#F59E0B' },
  { client: 'Ndërtim & Arredim', issue: 'Shpenzime që mungojnë', priority: 'info', color: '#3B82F6' },
]

function HealthRing({ score, color }: { score: number; color: string }) {
  const r = 18
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <svg width="44" height="44" style={{ flexShrink: 0 }}>
      <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
      <circle cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transformOrigin: '50% 50%', transform: 'rotate(-90deg)', transition: 'stroke-dashoffset 1s ease' }} />
      <text x="22" y="27" textAnchor="middle" fontSize="10" fontWeight="800" fill={color} fontFamily="Poppins,sans-serif">{score}</text>
    </svg>
  )
}

export default function AccountantWorkspace() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [activeClient, setActiveClient] = useState(0)

  return (
    <section ref={ref} style={{ padding: '120px 24px', background: 'linear-gradient(180deg,#08091A 0%,#0D0E26 100%)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 70 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }}
            style={{ display: 'inline-block', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, padding: '4px 14px', fontSize: 11, fontWeight: 800, color: '#F59E0B', letterSpacing: '0.08em', marginBottom: 20, textTransform: 'uppercase' as const }}>
            Kontabilistët
          </motion.div>
          <motion.h2 initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7, delay: 0.1 }}
            style={{ fontFamily: 'Poppins,sans-serif', fontSize: 'clamp(30px,4vw,52px)', fontWeight: 900, letterSpacing: '-0.025em', lineHeight: 1.12, marginBottom: 18 }}>
            Ndërtuar për Zyra<br />
            <span style={{ color: '#F59E0B' }}>Kontabiliteti Moderne</span>
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.2 }}
            style={{ fontSize: 18, color: 'var(--text-3)', maxWidth: 560, margin: '0 auto' }}>
            Menaxho deri në 100 klientë nga një llogari e vetme. Shiko gjithçka, vepro menjëherë.
          </motion.p>
        </div>

        {/* Command Center mockup */}
        <motion.div initial={{ opacity: 0, y: 40 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.9, delay: 0.3 }}
          style={{ background: 'rgba(13,14,38,0.95)', border: '1px solid var(--border)', borderRadius: 24, overflow: 'hidden', boxShadow:'0 4px 14px rgba(0,0,0,0.08)' }}>

          {/* Toolbar */}
          <div style={{ background: 'var(--bg-card)', borderBottom:'1px solid var(--border)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {['#EF4444', '#F59E0B', '#10B981'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ height: 24, background: 'var(--bg-muted)', borderRadius: 6, flex: 1, maxWidth: 280, display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
                <span style={{ fontSize: 10, color: 'var(--text-3)' }}>app.fiscalix.com/accountant</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background:'var(--bg-muted)', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>Live</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', minHeight: 520 }}>
            {/* Sidebar */}
            <div style={{ borderRight:'1px solid var(--border)', padding: '20px 16px' }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 12 }}>
                Klientët (5)
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {clients.map((cl, i) => {
                  const hColor = cl.health >= 80 ? '#10B981' : cl.health >= 60 ? '#F59E0B' : '#EF4444'
                  return (
                    <motion.div key={i}
                      onClick={() => setActiveClient(i)}
                      whileHover={{ x: 2 }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10, cursor: 'pointer', background: activeClient === i ? 'rgba(90,31,214,0.15)' : 'transparent', border: activeClient === i ? '1px solid rgba(90,31,214,0.3)' : '1px solid transparent', transition: 'all 0.15s' }}>
                      <HealthRing score={cl.health} color={hColor} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color:'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cl.name}</p>
                        <p style={{ fontSize: 10, color: 'var(--text-3)' }}>{cl.invoices} fatura · {cl.revenue}</p>
                      </div>
                      {cl.overdue > 0 && (
                        <span style={{ fontSize: 9, background: 'rgba(239,68,68,0.15)', color: '#EF4444', padding: '2px 6px', borderRadius: 20, fontWeight: 800, flexShrink: 0 }}>{cl.overdue}</span>
                      )}
                    </motion.div>
                  )
                })}
              </div>

              {/* Download buttons */}
              <div style={{ marginTop: 20, paddingTop: 16, borderTop:'1px solid var(--border)' }}>
                <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 10 }}>Shkarko Librat</p>
                {[
                  { label: 'Libri Shitjeve', color: '#10B981' },
                  { label: 'Libri Blerjeve', color: '#3B82F6' },
                  { label: 'Pension 5%+5%', color: '#F59E0B' },
                ].map((b, i) => (
                  <motion.div key={i} whileHover={{ x: 2 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', borderRadius: 9, background: `${b.color}10`, border: `1px solid ${b.color}25`, marginBottom: 6, cursor: 'pointer' }}>
                    <Download size={11} style={{ color: b.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: b.color }}>{b.label}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Main area */}
            <div style={{ padding: 24 }}>
              {/* KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
                {[
                  { l: 'Klientë Aktivë', v: '5', col: '#9B5CF8' },
                  { l: 'Probleme Kritike', v: '1', col: '#EF4444' },
                  { l: 'Paralajmërime', v: '2', col: '#F59E0B' },
                  { l: 'Score Mesatar', v: '70', col: '#10B981' },
                ].map((k, i) => (
                  <div key={i} style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '12px 14px', border: '1px solid var(--border)', borderTop: `2px solid ${k.col}` }}>
                    <p style={{ fontSize: 9.5, color: 'var(--text-3)', marginBottom: 5 }}>{k.l}</p>
                    <p style={{ fontFamily: 'Poppins,sans-serif', fontSize: 24, fontWeight: 900, color: k.col, lineHeight: 1 }}>{k.v}</p>
                  </div>
                ))}
              </div>

              {/* Urgent tasks */}
              <div style={{ background: 'rgba(255,255,255,0.025)', borderRadius: 14, padding: 16, border:'1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <AlertTriangle size={14} style={{ color: '#EF4444' }} />
                  <p style={{ fontSize: 12, fontWeight: 700, color:'var(--text-1)' }}>Veprime të nevojshme sot</p>
                  <span style={{ marginLeft: 'auto', fontSize: 10, background: 'rgba(239,68,68,0.12)', color: '#EF4444', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                    {urgentTasks.length} detyra
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {urgentTasks.map((t, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={inView ? { opacity: 1, x: 0 } : {}}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, background: 'var(--bg-card)', border:'1px solid var(--border)' }}>
                      <div style={{ width: 3, height: 36, borderRadius: 2, background: t.color, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color:'var(--text-1)' }}>{t.client}</p>
                        <p style={{ fontSize: 11, color: t.color, marginTop: 1 }}>{t.issue}</p>
                      </div>
                      <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 20, background: `${t.color}15`, color: t.color, fontWeight: 700, flexShrink: 0 }}>
                        {t.priority === 'critical' ? 'KRITIKE' : t.priority === 'warning' ? 'KUJDES' : 'NORMALE'}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature pills below */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.6 }}
          style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 40 }}>
          {['100+ klientë nga 1 llogari', 'Health Score automatik', 'Afate ATK live', 'Shkarkim librat me 1 klikim', 'Akses vetëm lexim për klientët', 'Detyra urgjente automatike'].map((f, i) => (
            <motion.div key={i} whileHover={{ scale: 1.03 }}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 100, background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 13, color:'var(--text-2)', fontWeight: 500 }}>
              <CheckCircle size={13} style={{ color: '#10B981' }} />
              {f}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
