'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Circle, ChevronRight, X, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Step {
  id: string
  title: string
  desc: string
  href: string
  action: string
}

const STEPS: Step[] = [
  { id: 'company',  title: 'Plotëso kompaninë',     desc: 'Shto logon, adresën dhe IBAN-in tënd',    href: '/settings',        action: 'Shko te Cilësimet' },
  { id: 'invoice',  title: 'Krijo faturën e parë',  desc: 'Lësho faturën e parë profesionale',        href: '/invoices/new',    action: 'Krijo Faturë' },
  { id: 'expense',  title: 'Shto një shpenzim',     desc: 'Regjistro shpenzimin e parë të biznesit',  href: '/expenses/new',    action: 'Shto Shpenzim' },
  { id: 'category', title: 'Krijo kategorinë',      desc: 'Organizo shpenzimet sipas kategorive',     href: '/settings',        action: 'Shko te Cilësimet' },
  { id: 'explore',  title: 'Eksploro dashboard-in', desc: 'Shiko raportet dhe analizat financiare',   href: '/dashboard',       action: 'Shiko Dashboard' },
]

interface Props {
  invoiceCount: number
  expenseCount: number
  hasCompanyDetails: boolean
  hasCategoryCount: number
}

export default function OnboardingChecklist({ invoiceCount, expenseCount, hasCompanyDetails, hasCategoryCount }: Props) {
  const [dismissed, setDismissed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const d = localStorage.getItem('fiscalix_onboarding_dismissed')
    if (d) setDismissed(true)
  }, [])

  function dismiss() {
    localStorage.setItem('fiscalix_onboarding_dismissed', '1')
    setDismissed(true)
  }

  if (!mounted || dismissed) return null

  const completed: Record<string, boolean> = {
    company:  hasCompanyDetails,
    invoice:  invoiceCount > 0,
    expense:  expenseCount > 0,
    category: hasCategoryCount > 0,
    explore:  invoiceCount > 0 && expenseCount > 0,
  }

  const completedCount = Object.values(completed).filter(Boolean).length
  const allDone = completedCount === STEPS.length

  if (allDone) {
    return (
      <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle2 size={20} style={{ color: '#10B981' }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', fontFamily: 'Poppins,sans-serif' }}>Setup komplet! 🎉</p>
            <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Fiscalix është gati për biznesin tënd.</p>
          </div>
        </div>
        <button onClick={dismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
          <X size={16} />
        </button>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-purple)', borderRadius: 16, padding: 20, marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Sparkles size={18} style={{ color: 'var(--purple-light)' }} />
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', fontFamily: 'Poppins,sans-serif' }}>
              Konfiguro Fiscalix — {completedCount}/{STEPS.length}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Plotëso hapat për të filluar</p>
          </div>
        </div>
        <button onClick={dismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
          <X size={16} />
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, background: 'var(--bg-muted)', borderRadius: 4, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: 'linear-gradient(90deg,#5A1FD6,#9B5CF8)', width: `${(completedCount / STEPS.length) * 100}%`, borderRadius: 4, transition: 'width 0.4s ease' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {STEPS.map(step => {
          const done = completed[step.id]
          return (
            <div key={step.id}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: done ? 'rgba(16,185,129,0.06)' : 'var(--bg-muted)', border: `1px solid ${done ? 'rgba(16,185,129,0.2)' : 'var(--border)'}`, opacity: done ? 0.7 : 1 }}>
              {done
                ? <CheckCircle2 size={18} style={{ color: '#10B981', flexShrink: 0 }} />
                : <Circle size={18} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
              }
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: done ? 'var(--text-3)' : 'var(--text-1)', textDecoration: done ? 'line-through' : 'none' }}>{step.title}</p>
                <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{step.desc}</p>
              </div>
              {!done && (
                <a href={step.href}
                  style={{ fontSize: 12, fontWeight: 600, color: 'var(--purple-light)', display: 'flex', alignItems: 'center', gap: 3, textDecoration: 'none', flexShrink: 0 }}>
                  {step.action} <ChevronRight size={13} />
                </a>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
