'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const steps = [
  {
    n: '01',
    title: 'Lidhe kontabilistin',
    desc: 'Kontabilisti regjistrohet me pakon Kontabilist. Ti i jep qasje — ai sheh gjithçka të biznesit tënd.',
    icon: '🤝',
    color: '#9B5CF8',
    tags: ['Qasje e sigurt', 'Role të ndara'],
  },
  {
    n: '02',
    title: 'Ngarko dokumentet',
    desc: 'Krijo fatura, regjistro shpenzime, ngarko faturat e furnitorëve me AI Scanner. Gjithçka centralizohet.',
    icon: '📂',
    color: '#3B82F6',
    tags: ['AI OCR', 'Import bankar'],
  },
  {
    n: '03',
    title: 'Kontabilisti merr qasje',
    desc: 'Kontabilisti sheh fatura, shpenzime dhe dokumentet të biznesit tënd — në kohë reale, pa email e WhatsApp.',
    icon: '⚡',
    color: '#F59E0B',
    tags: ['Kohë reale', 'Pa vonesë'],
  },
  {
    n: '04',
    title: 'Raporte automatike',
    desc: 'Libri Shitjeve, Blerjeve, Pension 5%+5% — Excel gati për ATK me 1 klikim. Afate tatimore automatike.',
    icon: '📊',
    color: '#10B981',
    tags: ['Format EDI', 'ATK Kosovo'],
  },
]

export default function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section ref={ref} style={{ padding: '120px 24px', background: 'linear-gradient(180deg,#08091A 0%,#0D0E26 50%,#08091A 100%)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 72 }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}}
            style={{ display: 'inline-block', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, padding: '4px 14px', fontSize: 11, fontWeight: 800, color: '#10B981', letterSpacing: '0.08em', marginBottom: 20, textTransform: 'uppercase' as const }}>
            Si funksionon
          </motion.div>
          <motion.h2 initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.1 }}
            style={{ fontFamily: 'Poppins,sans-serif', fontSize: 'clamp(28px,3.5vw,48px)', fontWeight: 900, letterSpacing: '-0.025em' }}>
            Aktiv brenda 5 minutave
          </motion.h2>
        </div>

        <div style={{ position: 'relative' }}>
          {/* Connector line */}
          <div style={{ position: 'absolute', top: 44, left: '12.5%', right: '12.5%', height: 1, background: 'linear-gradient(90deg,transparent,rgba(155,92,248,0.3) 20%,rgba(155,92,248,0.3) 80%,transparent)', pointerEvents: 'none' }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24 }}>
            {steps.map((s, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 32 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: i * 0.15 }}
                style={{ textAlign: 'center', position: 'relative' }}>

                {/* Step circle */}
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  style={{ width: 72, height: 72, borderRadius: '50%', background: `linear-gradient(135deg,${s.color}30,${s.color}10)`, border: `2px solid ${s.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', position: 'relative', zIndex: 1, cursor: 'default' }}>
                  <span style={{ fontSize: 30 }}>{s.icon}</span>
                  <div style={{ position: 'absolute', top: -4, right: -4, width: 22, height: 22, borderRadius: '50%', background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, fontFamily: 'Poppins,sans-serif', color:'var(--text-1)' }}>
                    {s.n}
                  </div>
                </motion.div>

                <h3 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 16, fontWeight: 800, marginBottom: 10, color:'var(--text-1)' }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.65, marginBottom: 14 }}>{s.desc}</p>

                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {s.tags.map((tag, j) => (
                    <span key={j} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 100, background: `${s.color}15`, color: s.color, fontWeight: 700 }}>{tag}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
