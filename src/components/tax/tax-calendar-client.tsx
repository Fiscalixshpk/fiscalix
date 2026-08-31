'use client'

import { useState, useMemo } from 'react'
import { Calendar, CheckCircle2, Clock, AlertTriangle, Plus, X, Lock } from 'lucide-react'
import { toast } from 'sonner'

interface TaxDeadline {
  id: string
  title: string
  description: string
  dueDay: number // day of month
  months: number[] // which months (1-12), empty = every month
  category: 'tvsh' | 'tatim-fitimi' | 'kontribut' | 'deklarate' | 'tjeter'
  law: string // legal basis
  completed?: boolean
  completedAt?: string
  appliesWhenNotVat?: boolean // true = vetëm për biznese PA TVSH
  appliesWhenVat?: boolean    // true = vetëm për biznese NË TVSH
}

const CATEGORIES = {
  'tvsh': { label: 'TVSH', color: '#7B2CF5', bg: 'rgba(123,44,245,0.12)' },
  'tatim-fitimi': { label: 'Tatim Fitimi', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  'kontribut': { label: 'Kontribute', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  'deklarate': { label: 'Deklaratë', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  'tjeter': { label: 'Tjetër', color:'white', bg: 'rgba(107,114,128,0.12)' },
}

// Kosovo ATK Tax Deadlines based on law
const ATK_DEADLINES: TaxDeadline[] = [
  // TVSH - monthly
  {
    id: 'tvsh-1', title: 'Deklarata e TVSH-së',
    description: 'Dorëzimi i deklaratës mujore të TVSH-së dhe pagesa e detyrimit. Ligji Nr. 05/L-037 për TVSH-në.',
    dueDay: 20, months: [],
    category: 'tvsh', law: 'Ligji Nr. 05/L-037, Neni 76',
    appliesWhenVat: true,
  },
  // Tatim fitimi - quarterly
  {
    id: 'tf-q1', title: 'Tatimi mbi Fitimin — Parapagimi Q1',
    description: 'Parapagimi i tatimit mbi fitimin për tremujorin e parë (Janar-Mars).',
    dueDay: 15, months: [4],
    category: 'tatim-fitimi', law: 'Ligji Nr. 05/L-029, Neni 33'
  },
  {
    id: 'tf-q2', title: 'Tatimi mbi Fitimin — Parapagimi Q2',
    description: 'Parapagimi i tatimit mbi fitimin për tremujorin e dytë (Prill-Qershor).',
    dueDay: 15, months: [7],
    category: 'tatim-fitimi', law: 'Ligji Nr. 05/L-029, Neni 33'
  },
  {
    id: 'tf-q3', title: 'Tatimi mbi Fitimin — Parapagimi Q3',
    description: 'Parapagimi i tatimit mbi fitimin për tremujorin e tretë (Korrik-Shtator).',
    dueDay: 15, months: [10],
    category: 'tatim-fitimi', law: 'Ligji Nr. 05/L-029, Neni 33'
  },
  {
    id: 'tf-annual', title: 'Deklarata Vjetore e Tatimit mbi Fitimin',
    description: 'Dorëzimi i deklaratës vjetore të tatimit mbi fitimin për vitin paraprak.',
    dueDay: 31, months: [3],
    category: 'tatim-fitimi', law: 'Ligji Nr. 05/L-029, Neni 32'
  },
  // Kontribute pensionale - monthly
  {
    id: 'kp-1', title: 'Kontributet Pensionale',
    description: 'Pagesa e kontributeve pensionale për punonjësit. 5% punëdhënësi + 5% punëmarrësi.',
    dueDay: 15, months: [],
    category: 'kontribut', law: 'Ligji Nr. 04/L-101, Neni 9'
  },
  // TAP - monthly
  {
    id: 'tap-1', title: 'Tatimi mbi të Ardhurat Personale (TAP)',
    description: 'Deklarata mujore dhe pagesa e TAP-it për punonjësit.',
    dueDay: 15, months: [],
    category: 'deklarate', law: 'Ligji Nr. 05/L-028, Neni 35'
  },
  // Annual declarations
  {
    id: 'tap-annual', title: 'Deklarata Vjetore TAP — Individë',
    description: 'Dorëzimi i deklaratës vjetore të tatimit mbi të ardhurat personale për individët.',
    dueDay: 31, months: [3],
    category: 'deklarate', law: 'Ligji Nr. 05/L-028, Neni 36'
  },
  {
    id: 'tba', title: 'Tatimi mbi Bizneset e Vogla (TAP) — 9%',
    description: 'Parapagim tremujor: 9% e të ardhurave bruto nga shërbime/veprimtaritë profesionale, ose minimumi €37.5/tremujor (cilado më e madhe). Vlen për biznese pa TVSH me qarkullim nën 50,000€/vit.',
    dueDay: 15, months: [1, 4, 7, 10],
    category: 'tatim-fitimi', law: 'Ligji Nr. 05/L-029, Neni 18 · Udhëzim ATK për TAP',
    appliesWhenNotVat: true,
  },
  {
    id: 'reg-tvsh', title: 'Regjistrim TVSH (nëse kërkohet)',
    description: 'Detyrimi i regjistrimit për TVSH kur qarkullimi kalon 30,000€ brenda 12 muajve.',
    dueDay: 15, months: [],
    category: 'tvsh', law: 'Ligji Nr. 05/L-037, Neni 12',
    appliesWhenNotVat: true,
  },
]

function getDaysUntil(dueDay: number, month?: number): number {
  const now = new Date()
  const year = now.getFullYear()
  const targetMonth = month !== undefined ? month - 1 : now.getMonth()
  const due = new Date(year, targetMonth, dueDay)
  if (due < now && month === undefined) {
    due.setMonth(due.getMonth() + 1)
  }
  return Math.ceil((due.getTime() - now.getTime()) / 86400000)
}

function getNextDue(deadline: TaxDeadline): Date {
  const now = new Date()
  const year = now.getFullYear()

  if (deadline.months.length === 0) {
    // Monthly
    const due = new Date(year, now.getMonth(), deadline.dueDay)
    if (due < now) due.setMonth(due.getMonth() + 1)
    return due
  }

  // Specific months
  for (const m of deadline.months) {
    const due = new Date(year, m - 1, deadline.dueDay)
    if (due >= now) return due
  }
  // Next year
  return new Date(year + 1, deadline.months[0] - 1, deadline.dueDay)
}

interface Props {
  hasAccess: boolean
  plan: string
  isVatRegistered?: boolean
}

export default function TaxCalendarClient({ hasAccess, plan, isVatRegistered = true }: Props) {
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<string>('all')
  const [showUpcoming, setShowUpcoming] = useState(true)

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const deadlines = useMemo(() => {
    return ATK_DEADLINES
      .filter(d => {
        if (d.appliesWhenVat && !isVatRegistered) return false
        if (d.appliesWhenNotVat && isVatRegistered) return false
        return true
      })
      .map(d => {
        const nextDue = getNextDue(d)
        const daysUntil = Math.ceil((nextDue.getTime() - now.getTime()) / 86400000)
        return { ...d, nextDue, daysUntil, isCompleted: completed.has(d.id) }
      }).sort((a, b) => a.nextDue.getTime() - b.nextDue.getTime())
  }, [completed, isVatRegistered])

  const upcoming = deadlines.filter(d => !d.isCompleted && d.daysUntil <= 30)
  const overdue = deadlines.filter(d => !d.isCompleted && d.daysUntil < 0)
  const filtered = filter === 'all' ? deadlines : deadlines.filter(d => d.category === filter)

  function toggleComplete(id: string) {
    setCompleted(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else { next.add(id); toast.success('Afati u shënua si i kompletuar!') }
      return next
    })
  }

  if (!hasAccess) {
    return (
      <div className="page-enter">
        <div className="mb-8">
          <h1 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 24, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>
            Kalendar Tatimor
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: 14 }}>Afatet tatimore sipas ligjit të Kosovës</p>
        </div>
        <div style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center', padding: '48px 32px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--purple-bg)', border: '2px solid var(--border-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Lock size={28} style={{ color: 'var(--purple-light)' }} />
          </div>
          <h2 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 20, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>
            Funksion Advanced
          </h2>
          <p style={{ color: 'var(--text-3)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
            Kalendari Tatimor është i disponueshëm vetëm për planet <strong style={{ color: 'var(--text-2)' }}>Advanced</strong> dhe <strong style={{ color: 'var(--text-2)' }}>Enterprise</strong>.
          </p>
          <a href="/settings?tab=billing" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#5A1FD6,#9B5CF8)', color: 'white', padding: '12px 24px', borderRadius: 10, fontWeight: 700, fontSize: 14, fontFamily: 'Poppins,sans-serif', textDecoration: 'none' }}>
            Upgrade në Advanced →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 24, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>
            Kalendar Tatimor
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: 14 }}>
            Afatet tatimore sipas ligjit të Kosovës — {currentMonth}/{currentYear}
          </p>
        </div>
        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '8px 14px', fontSize: 13, color: '#10B981', fontWeight: 600 }}>
          ✓ Bazuar në legjislacionin e ATK-së 2026
        </div>
      </div>

      {/* Alert - overdue */}
      {overdue.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={18} style={{ color: '#EF4444', flexShrink: 0 }} />
          <p style={{ fontSize: 14, color: '#EF4444', fontWeight: 600 }}>
            {overdue.length} afat{overdue.length > 1 ? 'e' : ''} ka kaluar! Kontakto kontabilistin menjëherë.
          </p>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {[
          { label: 'Afate këtë muaj', value: deadlines.filter(d => d.nextDue.getMonth() + 1 === currentMonth).length, color: '#7B2CF5', bg: 'rgba(123,44,245,0.1)' },
          { label: 'Brenda 7 ditëve', value: deadlines.filter(d => !d.isCompleted && d.daysUntil >= 0 && d.daysUntil <= 7).length, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
          { label: 'Të kompletuara', value: completed.size, color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
          { label: 'Totali vjetor', value: ATK_DEADLINES.length, color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
        ].map((s, i) => (
          <div key={i} className="kpi-card">
            <p style={{ fontSize: 28, fontWeight: 800, fontFamily: 'Poppins,sans-serif', color: s.color }}>{s.value}</p>
            <p style={{ fontSize: 12, color:'var(--text-1)', marginTop: 4 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[{ id: 'all', label: 'Të gjitha' }, ...Object.entries(CATEGORIES).map(([id, c]) => ({ id, label: c.label }))].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid',
              background: filter === f.id ? 'var(--purple)' : 'transparent',
              color: filter === f.id ? 'white' : 'var(--text-3)',
              borderColor: filter === f.id ? 'var(--purple)' : 'var(--border)',
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Deadlines grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Upcoming (next 30 days) */}
        <div>
          <h3 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--text-2)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            📅 Afate të ardhshme (30 ditë)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {upcoming.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-3)', fontSize: 13 }}>
                ✓ Nuk ka afate brenda 30 ditëve
              </div>
            ) : upcoming.map(d => {
              const cat = CATEGORIES[d.category]
              const isUrgent = d.daysUntil <= 7
              return (
                <div key={d.id}
                  style={{ background: 'var(--bg-card)', border: `1px solid ${isUrgent ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`, borderRadius: 12, padding: '14px 16px', transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: cat.bg, color: cat.color }}>{cat.label}</span>
                        {isUrgent && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}>⚠ Urgjent</span>}
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 600, color:'var(--text-1)', marginBottom: 3 }}>{d.title}</p>
                      <p style={{ fontSize: 12, color:'var(--text-1)', lineHeight: 1.5 }}>{d.description}</p>
                      <p style={{ fontSize: 11, color:'var(--text-1)', marginTop: 6, fontStyle: 'italic' }}>{d.law}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p suppressHydrationWarning style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Poppins,sans-serif', color: isUrgent ? '#EF4444' : 'var(--purple-light)' }}>{d.daysUntil}d</p>
                      <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>
                        {d.nextDue.toLocaleDateString('sq-AL', { day: '2-digit', month: 'short' })}
                      </p>
                      <button onClick={() => toggleComplete(d.id)}
                        style={{ padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.25)' }}>
                        ✓ Kompletuar
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Completed */}
        <div>
          <h3 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--text-2)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            ✅ Të kompletuara
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.filter(d => d.isCompleted).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-3)', fontSize: 13 }}>
                ✓ Asnjë e kompletuar akoma
              </div>
            ) : filtered.filter(d => d.isCompleted).map(d => {
              const cat = CATEGORIES[d.category]
              return (
                <div key={d.id}
                  style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', opacity: 0.7 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: cat.bg, color: cat.color, marginBottom: 4, display: 'inline-block' }}>{cat.label}</span>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', textDecoration: 'line-through' }}>{d.title}</p>
                    </div>
                    <button onClick={() => toggleComplete(d.id)}
                      style={{ padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer', background: 'transparent', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                      <X size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* All deadlines */}
      <div>
        <h3 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--text-2)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          📋 Të gjitha afatet
        </h3>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <table className="finex-table">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th>Detyrimi</th>
                <th>Kategoria</th>
                <th>Afati</th>
                <th>Ditë</th>
                <th>Baza Ligjore</th>
                <th style={{ textAlign: 'right' }}>Statusi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => {
                const cat = CATEGORIES[d.category]
                return (
                  <tr key={d.id} onClick={() => toggleComplete(d.id)} style={{ cursor: 'pointer', opacity: d.isCompleted ? 0.5 : 1 }}>
                    <td>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', textDecoration: d.isCompleted ? 'line-through' : 'none' }}>{d.title}</p>
                    </td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: cat.bg, color: cat.color }}>{cat.label}</span>
                    </td>
                    <td style={{ color: 'var(--text-2)', fontSize: 13 }}>
                      {d.nextDue.toLocaleDateString('sq-AL', { day: '2-digit', month: 'long' })}
                    </td>
                    <td>
                      <span style={{ fontSize: 13, fontWeight: 700, color: d.daysUntil < 0 ? '#EF4444' : d.daysUntil <= 7 ? '#F59E0B' : 'var(--text-2)' }}>
                        {d.daysUntil < 0 ? `${Math.abs(d.daysUntil)}d vonë` : `${d.daysUntil}d`}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-3)', fontSize: 11, fontStyle: 'italic' }}>{d.law}</td>
                    <td style={{ textAlign: 'right' }}>
                      {d.isCompleted
                        ? <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: 'rgba(16,185,129,0.1)', color: '#10B981', fontWeight: 600 }}>✓ Kompletuar</span>
                        : <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: 'var(--purple-bg)', color: 'var(--purple-light)', fontWeight: 600 }}>Në pritje</span>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
