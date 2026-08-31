'use client'

import { motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useEffect, useRef } from 'react'

function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const count = useMotionValue(0)
  const spring = useSpring(count, { duration: 2000, bounce: 0 })
  const display = useTransform(spring, (v) => `${Math.round(v).toLocaleString()}${suffix}`)

  useEffect(() => {
    if (inView) count.set(to)
  }, [inView, to, count])

  return <motion.span ref={ref}>{display}</motion.span>
}

const stats = [
  { value: 100, suffix: '+', label: 'Biznese Aktive', color: '#9B5CF8', icon: '🏢' },
  { value: 10000, suffix: '+', label: 'Fatura të Procesuara', color: '#3B82F6', icon: '📄' },
  { value: 500, suffix: '+', label: 'Raporte ATK', color: '#10B981', icon: '📊' },
  { value: 99.9, suffix: '%', label: 'Uptime Garantuar', color: '#F59E0B', icon: '⚡' },
]

export default function Trust() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} style={{ padding: '0 24px 100px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          style={{ background: 'rgba(255,255,255,0.025)', border:'1px solid var(--border)', borderRadius: 24, padding: '40px 48px', backdropFilter: 'blur(20px)', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0, position: 'relative', overflow: 'hidden' }}>

          {/* Glow inside */}
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 600, height: 200, background: 'radial-gradient(ellipse,rgba(90,31,214,0.12) 0%,transparent 70%)', pointerEvents: 'none' }} />

          {stats.map((s, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              style={{ textAlign: 'center', padding: '8px 20px', borderRight: i < stats.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none', position: 'relative' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{s.icon}</div>
              <div style={{ fontFamily: 'Poppins,sans-serif', fontSize: 42, fontWeight: 900, color: s.color, lineHeight: 1, letterSpacing: '-0.04em', marginBottom: 8 }}>
                <Counter to={s.value} suffix={s.suffix} />
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-3)', fontWeight: 500 }}>{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
