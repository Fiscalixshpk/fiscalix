'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function LandingNav() {
  const { scrollY } = useScroll()
  const bg = useTransform(scrollY, [0, 80], ['rgba(8,9,26,0)', 'rgba(8,9,26,0.92)'])
  const blur = useTransform(scrollY, [0, 80], ['blur(0px)', 'blur(24px)'])
  const borderOpacity = useTransform(scrollY, [0, 80], [0, 0.08])

  return (
    <motion.nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, backgroundColor: bg, backdropFilter: blur, WebkitBackdropFilter: blur, borderBottom: '1px solid rgba(255,255,255,var(--b-op, 0))' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 66, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#5A1FD6,#9B5CF8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: 'white', fontFamily: 'Poppins,sans-serif' }}>F</div>
          <span style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 800, fontSize: 20, color:'var(--text-1)', letterSpacing: '-0.02em' }}>Fiscalix</span>
        </Link>

        {/* Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {[
            ['Modulet', '#features'],
            ['Kontabilistët', '#accountant'],
            ['Çmimet', '#pricing'],
          ].map(([label, href]) => (
            <a key={href} href={href}
              style={{ padding: '7px 14px', borderRadius: 9, color: 'var(--text-3)', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'white')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}>
              {label}
            </a>
          ))}
          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.1)', margin: '0 6px' }} />
          <Link href="/login"
            style={{ padding: '8px 18px', borderRadius: 9, border:'1px solid var(--border)', color:'var(--text-1)', fontSize: 13.5, fontWeight: 600, textDecoration: 'none' }}>
            Kyçu
          </Link>
          <a href="mailto:info@fiscalix.com?subject=Kërkoj Demo - Fiscalix"
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px', borderRadius: 9, background: 'linear-gradient(135deg,#5A1FD6,#7B2CF5)', color: 'white', fontSize: 13.5, fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 16px rgba(90,31,214,0.35)' }}>
            Kërko Demo <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </motion.nav>
  )
}
