'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const features = [
  { icon: '📄', title: 'Faturim Profesional', desc: 'PDF me logo, QR kod bankare, TVSH 0/8/18%, ngjyrë e personalizuar.', size: 'medium', color: '#5A1FD6', gradient: 'rgba(90,31,214,0.12)' },
  { icon: '🤖', title: 'AI OCR Scanner', desc: '150 skanime/muaj. Foto faturën — AI vendos vendor, shumën, datën.', size: 'medium', color: '#F59E0B', gradient: 'rgba(245,158,11,0.12)' },
  { icon: '👥', title: 'Menaxhim Multi-Klient', desc: 'Kontabilisti menaxhon 100+ klientë nga 1 llogari. Command Center i plotë.', size: 'large', color: '#F59E0B', gradient: 'rgba(245,158,11,0.1)' },
  { icon: '📊', title: 'Raporte ATK', desc: 'Libri Shitjeve, Blerjeve, Pension 5%+5% — Excel format EDI.', size: 'small', color: '#10B981', gradient: 'rgba(16,185,129,0.12)' },
  { icon: '📅', title: 'Kalendar Tatimor', desc: 'TVSH, TAP, TAK, Pension — afate reale të ATK Kosovo.', size: 'small', color: '#3B82F6', gradient: 'rgba(59,130,246,0.12)' },
  { icon: '🏦', title: 'Import Bankar', desc: 'ProCredit, Raiffeisen, TEB, BKT — CSV automatik.', size: 'medium', color: '#9B5CF8', gradient: 'rgba(155,92,248,0.12)' },
  { icon: '🔄', title: 'Fatura Automatike', desc: 'Retainers mujore me email njoftim automatik.', size: 'medium', color: '#EF4444', gradient: 'rgba(239,68,68,0.1)' },
  { icon: '🔒', title: 'Role dhe Leje', desc: 'Business Owner, Kontabilist, Staff — akses i personalizuar.', size: 'small', color: '#6B7280', gradient: 'rgba(107,114,128,0.12)' },
  { icon: '📱', title: 'Mobile & Desktop', desc: 'Responsive i plotë. iOS, Android, Mac, Windows.', size: 'small', color: '#3B82F6', gradient: 'rgba(59,130,246,0.1)' },
]

export default function Features() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section ref={ref} style={{ padding: '120px 24px', background: '#08091A' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}}
            style={{ display: 'inline-block', background: 'rgba(155,92,248,0.1)', border: '1px solid rgba(155,92,248,0.25)', borderRadius: 8, padding: '4px 14px', fontSize: 11, fontWeight: 800, color: '#9B5CF8', letterSpacing: '0.08em', marginBottom: 20, textTransform: 'uppercase' as const }}>
            Modulet
          </motion.div>
          <motion.h2 initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.1 }}
            style={{ fontFamily: 'Poppins,sans-serif', fontSize: 'clamp(28px,3.5vw,48px)', fontWeight: 900, letterSpacing: '-0.025em', lineHeight: 1.12, marginBottom: 16 }}>
            Çdo gjë që i nevojitet<br />biznesit dhe kontabilistit
          </motion.h2>
        </div>

        {/* Bento Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gridTemplateRows: 'auto', gap: 12 }}>
          {features.map((f, i) => {
            const colSpan = f.size === 'large' ? 2 : f.size === 'medium' ? 1 : 1
            const rowSpan = f.size === 'large' ? 2 : 1

            return (
              <motion.div key={i}
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
                transition={{ duration: 0.5, delay: i * 0.07 }}
                whileHover={{ y: -4, scale: 1.015 }}
                style={{
                  gridColumn: `span ${colSpan}`,
                  gridRow: `span ${rowSpan}`,
                  background: f.gradient,
                  border: `1px solid ${f.color}20`,
                  borderRadius: 20,
                  padding: f.size === 'large' ? '32px 28px' : '24px 22px',
                  cursor: 'default',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.25s',
                }}>
                {/* Glow */}
                <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle,${f.color}25 0%,transparent 70%)`, pointerEvents: 'none' }} />

                <div style={{ position: 'relative' }}>
                  <motion.span
                    whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                    transition={{ duration: 0.4 }}
                    style={{ fontSize: f.size === 'large' ? 40 : 32, display: 'block', marginBottom: f.size === 'large' ? 20 : 14, lineHeight: 1 }}>
                    {f.icon}
                  </motion.span>
                  <h3 style={{ fontFamily: 'Poppins,sans-serif', fontSize: f.size === 'large' ? 20 : 15, fontWeight: 800, marginBottom: 8, color:'var(--text-1)' }}>
                    {f.title}
                  </h3>
                  <p style={{ fontSize: 13.5, color: 'var(--text-3)', lineHeight: 1.65 }}>{f.desc}</p>

                  {f.size === 'large' && (
                    <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
                      {['100+ klientë', 'Health Score', 'Afate live'].map((tag, j) => (
                        <span key={j} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 100, background: `${f.color}18`, color: f.color, fontWeight: 700 }}>{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
