'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Circle, ChevronRight, X, Sparkles } from 'lucide-react'

interface Step {
  id: string
  title: string
  desc: string
  href?: string
  action?: string
  onClick?: () => void
}

interface Props {
  clientCount: number
  pendingInviteCount: number
  hasInvoiced: boolean
  onAddClient: () => void
}

export default function AccountantOnboarding({ clientCount, pendingInviteCount, hasInvoiced, onAddClient }: Props) {
  const [dismissed, setDismissed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const d = localStorage.getItem('fiscalix_accountant_onboarding_dismissed')
    if (d) setDismissed(true)
  }, [])

  function dismiss() {
    localStorage.setItem('fiscalix_accountant_onboarding_dismissed', '1')
    setDismissed(true)
  }

  if (!mounted || dismissed) return null

  const STEPS: Step[] = [
    { id: 'invite',   title: 'Fto klientin e parë',        desc: 'Dërgo ftesë me email te biznesi i parë',            action: 'Shto Klient', onClick: onAddClient },
    { id: 'accepted', title: 'Prit pranimin e ftesës',      desc: 'Klienti duhet ta pranojë ftesën para se ta shohësh', href: '/accountant/markets', action: 'Shiko gjithsesi' },
    { id: 'workspace',title: 'Eksploro Workspace-in',       desc: 'Shënime, Checklist, Dokumentet — gjithçka për klientin', href: '/accountant', action: 'Shko te Portofoli' },
    { id: 'invoice',  title: 'Faturat e Mia',               desc: 'Faturoje klientin tënd për shërbimin e kontabilitetit',  href: '/invoices/new', action: 'Krijo Faturë' },
  ]

  const completed: Record<string, boolean> = {
    invite: clientCount > 0 || pendingInviteCount > 0,
    accepted: clientCount > 0,
    workspace: clientCount > 0,
    invoice: hasInvoiced,
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
            <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Workspace-i yt është gati për klientë.</p>
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
              Fillo Workspace-in — {completedCount}/{STEPS.length}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Hapat e parë për të menaxhuar klientët</p>
          </div>
        </div>
        <button onClick={dismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}>
          <X size={16} />
        </button>
      </div>

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
              {!done && step.onClick && (
                <button onClick={step.onClick}
                  style={{ fontSize: 12, fontWeight: 600, color: 'var(--purple-light)', display: 'flex', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                  {step.action} <ChevronRight size={13} />
                </button>
              )}
              {!done && !step.onClick && step.href && (
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
