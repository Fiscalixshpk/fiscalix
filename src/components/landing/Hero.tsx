'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Play, TrendingUp, FileText, Bell, Users, CheckCircle, AlertTriangle, BarChart3 } from 'lucide-react'
import { useRef } from 'react'

const fadeUp = { hidden: { opacity: 0, y: 28 }, show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] } }) }

function DashboardMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{ perspective: 1200 }}
    >
      <div style={{
        background: 'rgba(13,14,38,0.95)', border:'1px solid var(--border)',
        borderRadius: 22, padding: 20, boxShadow: '0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)', maxWidth: 560,
      }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981' }} />
          <div style={{ flex: 1, height: 22, background: 'var(--bg-card)', borderRadius: 6, display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
            <span style={{ fontSize: 10, color: 'var(--text-3)' }}>app.fiscalix.com/dashboard</span>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
          {[
            { l: 'Të ardhura', v: '€14,280', t: '+18.4%', col: '#5A1FD6' },
            { l: 'Fatura aktive', v: '47', t: '12 vonuara', col: '#F59E0B' },
            { l: 'Fitimi neto', v: '€9,640', t: '+12.1%', col: '#10B981' },
          ].map((k, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.7 + i * 0.1 }}
              style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '11px 12px', border:'1px solid var(--border)' }}>
              <p style={{ fontSize: 9.5, color: 'var(--text-3)', marginBottom: 4 }}>{k.l}</p>
              <p style={{ fontFamily: 'Poppins,sans-serif', fontSize: 17, fontWeight: 800, color:'var(--text-1)', lineHeight: 1 }}>{k.v}</p>
              <p style={{ fontSize: 9.5, color: k.col, marginTop: 3, fontWeight: 600 }}>{k.t}</p>
            </motion.div>
          ))}
        </div>

        {/* Chart */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: '14px 14px 10px', marginBottom: 12, border:'1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color:'var(--text-1)' }}>Të ardhurat — 2026</p>
            <span style={{ fontSize: 9.5, color: '#10B981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>▲ 18.4%</span>
          </div>
          <svg viewBox="0 0 480 72" style={{ width: '100%', height: 72 }}>
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5A1FD6" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#5A1FD6" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,60 C40,55 80,50 120,42 C160,34 200,38 240,28 C280,18 320,22 360,14 C400,6 440,10 480,4" fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" />
            <defs>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#5A1FD6" />
                <stop offset="100%" stopColor="#9B5CF8" />
              </linearGradient>
            </defs>
            <path d="M0,60 C40,55 80,50 120,42 C160,34 200,38 240,28 C280,18 320,22 360,14 C400,6 440,10 480,4 L480,72 L0,72 Z" fill="url(#chartGrad)" />
            {[0, 1, 2, 3, 4, 5].map(i => (
              <line key={i} x1={i * 96} y1="0" x2={i * 96} y2="72" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            ))}
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            {['Jan', 'Shk', 'Mar', 'Pri', 'Maj', 'Qer'].map(m => (
              <span key={m} style={{ fontSize: 8.5, color: 'var(--text-3)' }}>{m}</span>
            ))}
          </div>
        </div>

        {/* Two columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {/* Recent invoices */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 12, border:'1px solid var(--border)' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', marginBottom: 10 }}>FATURAT E FUNDIT</p>
            {[
              { n: 'Tech Solutions', a: '€1,200', s: 'Paguar', c: '#10B981' },
              { n: 'Studio Media', a: '€850', s: 'Pritje', c: '#F59E0B' },
              { n: 'Agjensi Web', a: '€2,400', s: 'Vonuar', c: '#EF4444' },
            ].map((inv, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                <div>
                  <p style={{ fontSize: 10.5, fontWeight: 600, color:'var(--text-1)' }}>{inv.n}</p>
                  <p style={{ fontSize: 9.5, color: 'var(--text-3)' }}>{inv.a}</p>
                </div>
                <span style={{ fontSize: 8.5, padding: '2px 7px', borderRadius: 20, background: `${inv.c}18`, color: inv.c, fontWeight: 700 }}>{inv.s}</span>
              </div>
            ))}
          </div>

          {/* Tax deadlines */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 12, border:'1px solid var(--border)' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', marginBottom: 10 }}>AFATET ATK</p>
            {[
              { l: 'TVSH T2', d: '5 ditë', col: '#EF4444' },
              { l: 'Pension Qer.', d: '12 ditë', col: '#F59E0B' },
              { l: 'TAP T2', d: '18 ditë', col: '#3B82F6' },
            ].map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${t.col}15`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: t.col, lineHeight: 1, fontFamily: 'Poppins,sans-serif' }}>{t.d.split(' ')[0]}</span>
                  <span style={{ fontSize: 7, color: t.col }}>ditë</span>
                </div>
                <p style={{ fontSize: 10.5, fontWeight: 600, color:'var(--text-1)' }}>{t.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating notification */}
      <motion.div
        animate={{ y: [-4, 4, -4] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'absolute', top: -16, right: -16, background: 'rgba(13,14,38,0.95)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 14, padding: '10px 14px', boxShadow:'0 4px 14px rgba(0,0,0,0.08)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckCircle size={14} style={{ color: '#10B981' }} />
        </div>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color:'var(--text-1)' }}>Faturë e paguar</p>
          <p style={{ fontSize: 9.5, color: 'var(--text-3)' }}>Tech Solutions · €1,200</p>
        </div>
      </motion.div>

      {/* Floating AI badge */}
      <motion.div
        animate={{ y: [4, -4, 4] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        style={{ position: 'absolute', bottom: -16, left: -16, background: 'linear-gradient(135deg,rgba(90,31,214,0.9),rgba(123,44,245,0.9))', border: '1px solid rgba(155,92,248,0.4)', borderRadius: 14, padding: '10px 14px', boxShadow: '0 8px 32px rgba(90,31,214,0.4)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>🤖</span>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color:'var(--text-1)' }}>AI Scanner aktiv</p>
          <p style={{ fontSize: 9.5, color:'var(--text-2)' }}>Fatura u lexua automatikisht</p>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function Hero() {
  return (
    <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '120px 24px 80px', position: 'relative', overflow: 'hidden' }}>
      {/* Animated background */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.15, 0.22, 0.15] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: 900, height: 900, borderRadius: '50%', background: 'radial-gradient(circle, rgba(90,31,214,1) 0%, transparent 70%)', filter: 'blur(100px)', opacity: 0.15 }}
        />
        <div style={{ position: 'absolute', top: '30%', left: '5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(16,185,129,1) 0%,transparent 70%)', filter: 'blur(100px)', opacity: 0.05 }} />
        <div style={{ position: 'absolute', top: '15%', right: '5%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle,rgba(245,158,11,1) 0%,transparent 70%)', filter: 'blur(100px)', opacity: 0.05 }} />
        {/* Grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '60px 60px', maskImage: 'radial-gradient(ellipse at 50% 50%, black 30%, transparent 80%)' }} />
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>

          {/* Left */}
          <div>
            <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(90,31,214,0.12)', border: '1px solid rgba(155,92,248,0.3)', borderRadius: 100, padding: '6px 18px', marginBottom: 28 }}>
              <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }}
                style={{ width: 6, height: 6, borderRadius: '50%', background: '#9B5CF8', display: 'inline-block' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--purple)', letterSpacing: '0.04em' }}>Platforma #1 e Kontabilitetit në Kosovë</span>
            </motion.div>

            <motion.h1 custom={1} variants={fadeUp} initial="hidden" animate="show"
              style={{ fontFamily: 'Poppins,sans-serif', fontSize: 'clamp(38px,4.5vw,60px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 24 }}>
              Kontabiliteti dhe<br />
              <span style={{ background: 'linear-gradient(135deg,#9B5CF8 0%,#5A1FD6 50%,#3B82F6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Menaxhimi Financiar
              </span><br />
              në Një Platformë
            </motion.h1>

            <motion.p custom={2} variants={fadeUp} initial="hidden" animate="show"
              style={{ fontSize: 18, color: 'var(--text-3)', lineHeight: 1.75, marginBottom: 40, maxWidth: 480 }}>
              Menaxho faturat, shpenzimet dhe detyrimet tatimore ndërsa kontabilisti juaj
              ka qasje në kohë reale në gjithçka — nga një platformë e vetme.
            </motion.p>

            <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show"
              style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '14px 32px', borderRadius: 13, background: 'linear-gradient(135deg,#5A1FD6,#7B2CF5)', color: 'white', fontSize: 15, fontWeight: 700, textDecoration: 'none', boxShadow: '0 8px 32px rgba(90,31,214,0.45)' }}>
                Fillo Falas <ArrowRight size={16} />
              </Link>
              <button style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 28px', borderRadius: 13, border:'1px solid var(--border)', background: 'var(--bg-card)', color:'var(--text-1)', fontSize: 15, fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(10px)' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Play size={10} fill="white" />
                </div>
                Shiko Demo
              </button>
            </motion.div>

            <motion.p custom={4} variants={fadeUp} initial="hidden" animate="show"
              style={{ marginTop: 22, fontSize: 13, color: 'var(--text-3)' }}>
              Pa kartë krediti <span style={{ margin: '0 6px', opacity: 0.5 }}>·</span> 14 ditë falas <span style={{ margin: '0 6px', opacity: 0.5 }}>·</span> Anulo kur të duash
            </motion.p>
          </div>

          {/* Right: Mockup */}
          <div style={{ position: 'relative', paddingTop: 20, paddingBottom: 20, paddingRight: 20 }}>
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  )
}
