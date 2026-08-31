'use client'

import { motion, useInView, AnimatePresence } from 'framer-motion'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, ChevronDown } from 'lucide-react'

// ── TESTIMONIALS ──────────────────────────────────────────────────────────────
const testimonials = [
  {
    name: 'Artan Krasniqi',
    role: 'Pronar Biznesi · Studio Web',
    text: 'Nuk dërgoj më dokumente në WhatsApp. Kontabilisti im i ka gjithçka live. Kursej 4-5 orë çdo muaj.',
    avatar: 'AK',
    color: '#5A1FD6',
  },
  {
    name: 'Blerina Hoxha',
    role: 'Kontabiliste · Zyra Financiare',
    text: 'Menaxhoj 47 klientë nga 1 llogari. Command Center më tregon çdo ditë kë duhet kontaktoj. Revolucionar.',
    avatar: 'BH',
    color: '#F59E0B',
    featured: true,
  },
  {
    name: 'Faton Dërmaku',
    role: 'CEO · Kompani IT',
    text: 'Libri i Shitjeve dhe Blerjeve gjenerоhet me 1 klikim. Paraqitja tek ATK nuk ka qenë kurrë kaq e lehtë.',
    avatar: 'FD',
    color: '#10B981',
  },
]

export function Testimonials() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section ref={ref} style={{ padding: '120px 24px', background: 'linear-gradient(180deg,#0D0E26,#08091A)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <motion.h2 initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}}
            style={{ fontFamily: 'Poppins,sans-serif', fontSize: 'clamp(26px,3vw,44px)', fontWeight: 900, letterSpacing: '-0.025em' }}>
            Çfarë thonë klientët tanë
          </motion.h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
          {testimonials.map((t, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 28 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.12 }}
              style={{
                background: t.featured ? `linear-gradient(160deg,${t.color}18,${t.color}08)` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${t.featured ? t.color + '35' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 20, padding: '28px 24px', position: 'relative',
                boxShadow: t.featured ? `0 0 60px ${t.color}15` : 'none',
              }}>
              {t.featured && (
                <div style={{ position: 'absolute', top: -12, right: 20, background: t.color, borderRadius: 100, padding: '3px 14px', fontSize: 10, fontWeight: 800, color:'var(--text-1)' }}>
                  ⭐ E FAVORITIT
                </div>
              )}
              <p style={{ fontSize: 15, color:'var(--text-1)', lineHeight: 1.75, marginBottom: 22, fontStyle: 'italic' }}>
                "{t.text}"
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(135deg,${t.color},${t.color}80)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'white', flexShrink: 0 }}>
                  {t.avatar}
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, color:'var(--text-1)' }}>{t.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-3)' }}>{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── PRICING ──────────────────────────────────────────────────────────────────
const plans = [
  { name: 'Basic', price: '19', tag: 'Pa AI', color: '#3B82F6', popular: false, features: ['Fatura pa limit', 'Shpenzime + kategori', 'Dashboard financiar', 'PDF + QR Kod', 'Eksport CSV', 'Libri Shitjeve/Blerjeve'] },
  { name: 'Premium', price: '39', tag: 'Me AI OCR', color: '#9B5CF8', popular: true, features: ['Gjithçka nga Basic', 'AI Scanner 150/muaj', 'Analiza e avancuar', 'Notifikime email', 'Suport prioritar'] },
  { name: 'Advanced', price: '79', tag: 'AI i plotë', color: '#10B981', popular: false, features: ['Gjithçka nga Premium', 'AI Scanner pa limit', 'Kontrib. Pensionale', 'Multi-kompani', 'Raporte ATK Excel', 'Import Bankar'] },
  { name: 'Kontabilist', price: '99', tag: 'Multi-klient', color: '#F59E0B', popular: false, features: ['Deri 100+ klientë', 'Command Center i plotë', 'Raporte ATK/klient', 'Afate ATK automatike', 'Health Score/klient', 'Shkarkim librat direkt'] },
]

export function Pricing() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section ref={ref} id="pricing" style={{ padding: '120px 24px', background: '#08091A' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}}
            style={{ display: 'inline-block', background: 'rgba(155,92,248,0.1)', border: '1px solid rgba(155,92,248,0.25)', borderRadius: 8, padding: '4px 14px', fontSize: 11, fontWeight: 800, color: '#9B5CF8', letterSpacing: '0.08em', marginBottom: 20, textTransform: 'uppercase' as const }}>
            Çmimet
          </motion.div>
          <motion.h2 initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.1 }}
            style={{ fontFamily: 'Poppins,sans-serif', fontSize: 'clamp(28px,3.5vw,48px)', fontWeight: 900, letterSpacing: '-0.025em', marginBottom: 14 }}>
            Transparent, pa surpriza
          </motion.h2>
          <motion.p initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.2 }}
            style={{ fontSize: 16, color: 'var(--text-3)' }}>
            Transfer bankar · Kesh · Pa Stripe · Aktivizim menjëherë
          </motion.p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 14 }}>
          {plans.map((plan, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 28 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              style={{
                background: plan.popular ? `linear-gradient(160deg,rgba(90,31,214,0.22),rgba(123,44,245,0.1))` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${plan.popular ? 'rgba(155,92,248,0.45)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 20, padding: '26px 20px', position: 'relative',
                boxShadow: plan.popular ? '0 0 70px rgba(90,31,214,0.18)' : 'none',
                cursor: 'default',
              }}>
              {plan.popular && (
                <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#5A1FD6,#9B5CF8)', borderRadius: 100, padding: '4px 16px', fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap', color: 'white' }}>
                  MË E POPULLARIZUARA
                </div>
              )}

              <div style={{ fontFamily: 'Poppins,sans-serif', fontSize: 15, fontWeight: 800, marginBottom: 10 }}>{plan.name}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 5 }}>
                <span style={{ fontFamily: 'Poppins,sans-serif', fontSize: 36, fontWeight: 900, color: plan.color, letterSpacing: '-0.04em' }}>€{plan.price}</span>
                <span style={{ fontSize: 13, color: 'var(--text-3)' }}>/muaj</span>
              </div>
              <div style={{ display: 'inline-block', background: `${plan.color}18`, color: plan.color, borderRadius: 100, padding: '3px 12px', fontSize: 11, fontWeight: 700, marginBottom: 20 }}>{plan.tag}</div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24, minHeight: 168 }}>
                {plan.features.map((f, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color:'var(--text-1)', lineHeight: 1.4 }}>
                    <Check size={13} style={{ color: plan.color, flexShrink: 0, marginTop: 1 }} />
                    {f}
                  </div>
                ))}
              </div>

              <Link href="/register" style={{
                display: 'block', textAlign: 'center', padding: '11px 0', borderRadius: 11,
                background: plan.popular ? 'linear-gradient(135deg,#5A1FD6,#7B2CF5)' : `${plan.color}18`,
                color: plan.popular ? 'white' : plan.color,
                border: plan.popular ? 'none' : `1px solid ${plan.color}30`,
                fontSize: 13, fontWeight: 700, textDecoration: 'none',
              }}>
                Fillo falas
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Enterprise */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.5 }}
          style={{ background: 'rgba(255,255,255,0.025)', border:'1px solid var(--border)', borderRadius: 16, padding: '22px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <p style={{ fontFamily: 'Poppins,sans-serif', fontWeight: 800, fontSize: 16, marginBottom: 4 }}>Enterprise — Çmim me Kontratë</p>
            <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Fiskalizim · API bankare · Custom development · Trajnim stafi · Suport 24/7</p>
          </div>
          <a href="tel:+38343813121" style={{ padding: '11px 28px', borderRadius: 11, border:'1px solid var(--border)', color:'var(--text-1)', fontSize: 14, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            📞 +383 43 81 31 21
          </a>
        </motion.div>
      </div>
    </section>
  )
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
const faqs = [
  { q: 'A mund të lidhë kontabilisti im llogarinë time?', a: 'Po. Kontabilisti regjistrohet me pakon "Kontabilist" dhe ti i jep qasje kompanisë tënde. Ai sheh faturat, shpenzimet dhe dokumentet — pa editim.' },
  { q: 'Si funksionon pagesa? Pranoni Stripe?', a: 'Stripe nuk funksionon direkt në Kosovë. Pranojmë transfer bankar (ProCredit, Raiffeisen, TEB, BKT) dhe kesh. Pas konfirmimit, sistemi aktivizohet menjëherë.' },
  { q: 'A janë të sigurta të dhënat e mia?', a: 'Po. Fiscalix përdor Supabase me Row Level Security — secili biznes sheh vetëm të dhënat e veta. Enkriptim SSL i plotë. GDPR compliant.' },
  { q: 'Çfarë përfshihet në 14 ditët falas?', a: 'Qasje e plotë në të gjitha modulet e planit tuaj — pa kufizim. Pa kartë krediti. Anulo kur të duash.' },
  { q: 'A mundet kontabilisti të modifikojë faturat e mia?', a: 'Jo. Kontabilisti ka qasje vetëm lexim — shikon dhe shkarkon dokumente, nuk mund të editojë, fshijë ose krijojë fatura.' },
  { q: 'A mbështesin TVSH 8% dhe 0%?', a: 'Po. Fiscalix mbështet të gjitha normat e TVSH-së kosovare: 18% (standard), 8% (mallra bazë) dhe 0% (eksporte). Libri i Shitjeve gjeneron automatikisht kolonat korekte.' },
]

export function FAQ() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section ref={ref} style={{ padding: '120px 24px', background: 'linear-gradient(180deg,#08091A,#0D0E26)' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <motion.h2 initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}}
            style={{ fontFamily: 'Poppins,sans-serif', fontSize: 'clamp(26px,3vw,44px)', fontWeight: 900, letterSpacing: '-0.025em' }}>
            Pyetje të shpeshta
          </motion.h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {faqs.map((faq, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.08 }}
              style={{ background: open === i ? 'rgba(90,31,214,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${open === i ? 'rgba(90,31,214,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 14, overflow: 'hidden', transition: 'all 0.2s' }}>
              <button onClick={() => setOpen(open === i ? null : i)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 16 }}>
                <span style={{ fontFamily: 'Poppins,sans-serif', fontSize: 15, fontWeight: 700, color: open === i ? 'var(--purple)' : 'white', lineHeight: 1.4 }}>{faq.q}</span>
                <motion.div animate={{ rotate: open === i ? 180 : 0 }} transition={{ duration: 0.25 }} style={{ flexShrink: 0 }}>
                  <ChevronDown size={18} style={{ color: open === i ? '#9B5CF8' : 'rgba(255,255,255,0.3)' }} />
                </motion.div>
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
                    <p style={{ padding: '0 22px 18px', fontSize: 15, color: 'var(--text-3)', lineHeight: 1.75 }}>{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── CTA FINAL ─────────────────────────────────────────────────────────────────
export function CTA() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section ref={ref} style={{ padding: '140px 24px', position: 'relative', overflow: 'hidden', background: 'linear-gradient(180deg,#0D0E26,#0C0830)' }}>
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.12, 0.18, 0.12] }}
        transition={{ duration: 6, repeat: Infinity }}
        style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%,rgba(90,31,214,1) 0%,transparent 65%)', filter: 'blur(80px)', pointerEvents: 'none', opacity: 0.12 }}
      />
      {/* Grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.012) 1px,transparent 1px)', backgroundSize: '50px 50px', maskImage: 'radial-gradient(ellipse at 50% 50%,black 30%,transparent 80%)' }} />

      <div style={{ position: 'relative', maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
        <motion.h2 initial={{ opacity: 0, y: 28 }} animate={inView ? { opacity: 1, y: 0 } : {}}
          style={{ fontFamily: 'Poppins,sans-serif', fontSize: 'clamp(30px,4.5vw,58px)', fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1.1, marginBottom: 20 }}>
          Ndal kërkimin e dokumenteve.
          <span style={{ display: 'block', background: 'linear-gradient(135deg,#9B5CF8,#5A1FD6,#3B82F6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Menaxho gjithçka nga një platformë.
          </span>
        </motion.h2>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.15 }}
          style={{ fontSize: 18, color: 'var(--text-3)', marginBottom: 44, lineHeight: 1.65 }}>
          14 ditë falas, pa kartë krediti. Fatura e parë brenda 5 minutave.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.25 }}
          style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '16px 40px', borderRadius: 14, background: 'linear-gradient(135deg,#5A1FD6,#7B2CF5)', color: 'white', fontSize: 16, fontWeight: 800, textDecoration: 'none', boxShadow: '0 14px 50px rgba(90,31,214,0.5)', fontFamily: 'Poppins,sans-serif' }}>
            Fillo Falas <ArrowRight size={17} />
          </Link>
          <a href="tel:+38343813121" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '16px 32px', borderRadius: 14, border:'1px solid var(--border)', background: 'var(--bg-card)', color:'var(--text-1)', fontSize: 16, fontWeight: 600, textDecoration: 'none', backdropFilter: 'blur(10px)' }}>
            📞 +383 43 81 31 21
          </a>
        </motion.div>

        <motion.p initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.4 }}
          style={{ marginTop: 24, fontSize: 13, color: 'var(--text-3)' }}>
          Pa kartë krediti · Anulo kur të duash · Aktivizim i menjëhershëm
        </motion.p>
      </div>
    </section>
  )
}
