'use client'
// Terminet POS — Sallon / Mjek / Spa
// Kalendar ditor + rezervim + checkout → kupon fiskal

import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Plus, Clock, User, Phone, Check, X, Zap,
  ChevronLeft, ChevronRight, Scissors, Stethoscope,
  CreditCard, Banknote, AlertTriangle, Calendar,
} from 'lucide-react'
import QRCanvas from '@/components/pos/qr-canvas'

interface Service { id: string; name: string; price: number; duration_minutes: number; category: string | null }
interface Appointment {
  id: string; client_name: string; client_phone: string | null
  service_id: string | null; service_name: string; service_price: number
  appointment_date: string; appointment_time: string; duration_minutes: number
  operator_name: string | null; notes: string | null; status: string
}

interface Props {
  cashierName:           string
  company:               { id: string; name: string; nui: string; businessType: string }
  services:              Service[]
  initialAppointments:   Appointment[]
  isMockMode:            boolean
}

const HOURS = Array.from({ length: 26 }, (_, i) => {
  const h = Math.floor(i / 2) + 8
  const m = i % 2 === 0 ? '00' : '30'
  return `${String(h).padStart(2, '0')}:${m}`
}).filter(t => parseInt(t.split(':')[0]) < 21)

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  confirmed:  { bg: 'rgba(59,130,246,0.15)',  color: '#3B82F6',  label: 'Konfirmuar' },
  completed:  { bg: 'rgba(16,185,129,0.15)',  color: '#10B981',  label: 'Kompletuar' },
  cancelled:  { bg: 'rgba(239,68,68,0.12)',   color: '#EF4444',  label: 'Anuluar'    },
  no_show:    { bg: 'rgba(245,158,11,0.12)',  color: '#F59E0B',  label: 'Nuk erdhi' },
}

const fmtEUR = (a: number) => `€${(a / 10000).toFixed(2)}`

function formatDateAlb(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const days   = ['E Diel','E Hënë','E Martë','E Mërkurë','E Enjte','E Premte','E Shtunë']
  const months = ['Jan','Shk','Mar','Pri','Maj','Qer','Kor','Gus','Sht','Tet','Nën','Dhj']
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

export default function AppointmentsClient({ cashierName, company, services, initialAppointments, isMockMode }: Props) {
  const [date,         setDate]         = useState(() => new Date().toISOString().split('T')[0])
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments)
  const [loading,      setLoading]      = useState(false)
  const [showAdd,      setShowAdd]      = useState(false)
  const [checkingOut,  setCheckingOut]  = useState<string | null>(null)
  const [payMethod,    setPayMethod]    = useState<'cash' | 'card'>('cash')
  const [receipt,      setReceipt]      = useState<{ receiptNumber: string; transactionId: number | null; totalEUR: string; qrCodeData: string; clientName: string } | null>(null)

  const [form, setForm] = useState({
    client_name:      '',
    client_phone:     '',
    service_id:       services[0]?.id || '',
    appointment_time: '09:00',
    operator_name:    cashierName,
    notes:            '',
    custom_price:     '',
  })

  // Load appointments when date changes
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    if (date === today) return // already loaded
    setLoading(true)
    fetch(`/api/pos/appointments?date=${date}`)
      .then(r => r.json())
      .then(d => setAppointments(d.appointments || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [date])

  function prevDay() {
    const d = new Date(date); d.setDate(d.getDate() - 1)
    setDate(d.toISOString().split('T')[0])
  }
  function nextDay() {
    const d = new Date(date); d.setDate(d.getDate() + 1)
    setDate(d.toISOString().split('T')[0])
  }

  const selectedService = useMemo(() => services.find(s => s.id === form.service_id) || null, [services, form.service_id])
  const servicePrice    = form.custom_price ? Math.round(parseFloat(form.custom_price) * 10000) : (selectedService?.price || 0)

  // ── ADD APPOINTMENT ──────────────────────────────────────
  async function addAppointment() {
    if (!form.client_name.trim()) { toast.error('Vendos emrin e klientit'); return }
    if (!form.appointment_time)   { toast.error('Vendos orën'); return }
    if (!selectedService && !form.custom_price) { toast.error('Zgjidh shërbimin'); return }

    try {
      const res  = await fetch('/api/pos/appointments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name:      form.client_name.trim(),
          client_phone:     form.client_phone.trim() || null,
          service_id:       form.service_id || null,
          service_name:     selectedService?.name || 'Shërbim',
          service_price:    servicePrice,
          appointment_date: date,
          appointment_time: form.appointment_time,
          duration_minutes: selectedService?.duration_minutes || 30,
          operator_name:    form.operator_name || cashierName,
          notes:            form.notes.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAppointments(prev => [...prev, data.appointment].sort((a, b) => a.appointment_time.localeCompare(b.appointment_time)))
      toast.success(`Termini u shtua — ${form.client_name}`)
      setShowAdd(false)
      setForm(f => ({ ...f, client_name: '', client_phone: '', notes: '', custom_price: '' }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim')
    }
  }

  // ── CHECKOUT ─────────────────────────────────────────────
  async function checkout(app: Appointment) {
    setCheckingOut(app.id)
    try {
      const res  = await fetch('/api/pos/fiscalize', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{
            productId:  null,
            name:       app.service_name,
            price:      app.service_price,
            quantity:   1,
            total:      app.service_price,
            taxRate:    'E',
            unit:       'vizitë',
          }],
          paymentMethod:  payMethod,
          companyId:      company.id,
          appointmentId:  app.id,
          operatorName:   app.operator_name || cashierName,
          couponId:       0,
        }),
      })
      const data = await res.json()
      if (data.success || data.status === 'offline') {
        // Mark as completed
        await fetch('/api/pos/appointments', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: app.id, status: 'completed' }),
        })
        setAppointments(prev => prev.map(a => a.id === app.id ? { ...a, status: 'completed' } : a))
        setReceipt({
          receiptNumber:  data.receiptNumber,
          transactionId:  data.transactionId,
          totalEUR:       (app.service_price / 10000).toFixed(2),
          qrCodeData:     data.qrCodeData,
          clientName:     app.client_name,
        })
        if (data.status === 'offline') toast.warning('Offline — dërgon automatikisht')
      } else {
        toast.error(data.error ?? 'Fiskalizimi dështoi')
      }
    } catch { toast.error('Gabim rrjeti') }
    finally { setCheckingOut(null) }
  }

  async function cancelApp(id: string) {
    await fetch('/api/pos/appointments', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'cancelled' }),
    })
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a))
    toast.success('Termini u anulua')
  }

  // ── CALENDAR GRID ────────────────────────────────────────
  const appsByTime = useMemo(() => {
    const map: Record<string, Appointment[]> = {}
    for (const app of appointments) {
      const h = app.appointment_time.substring(0, 5)
      if (!map[h]) map[h] = []
      map[h].push(app)
    }
    return map
  }, [appointments])

  const confirmed = appointments.filter(a => a.status === 'confirmed')
  const totalDay  = confirmed.reduce((s, a) => s + a.service_price, 0)

  const BusinessIcon = ['salon', 'barber'].includes(company.businessType) ? Scissors : Stethoscope

  const S = {
    label: { fontSize: 10, fontWeight: 700 as const, color: 'var(--text-3)', display: 'block', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', background: 'var(--bg-base)', overflow: 'hidden' }}>

      {/* ── RECEIPT MODAL ── */}
      {receipt && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: 24, width: 'min(300px,92vw)', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '2px solid #10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
              <Check size={22} color="#10B981" />
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color:'var(--text-1)', marginBottom: 4 }}>{receipt.clientName}</p>
            <p style={{ fontSize: 32, fontWeight: 900, color:'var(--text-1)', fontFamily: 'Poppins,sans-serif', margin: '10px 0' }}>€{receipt.totalEUR}</p>
            <p style={{ fontSize: 11, color:'var(--text-1)', marginBottom: 10 }}>{receipt.receiptNumber}{receipt.transactionId ? ` · ATK #${receipt.transactionId}` : ''}</p>
            {receipt.qrCodeData && !receipt.qrCodeData.startsWith('MOCK') && <QRCanvas data={receipt.qrCodeData} size={100} />}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button
                onClick={() => {
                  import('@/hooks/usePrintReceipt').then(({ buildATKReceipt }) => {
                    import('@/components/pos/receipt-printer').then(({ printReceipt }) => {
                      const atk = buildATKReceipt(
                        { receiptNumber: receipt.receiptNumber, qrCodeData: receipt.qrCodeData, status: 'fiscalized', totals: { totalEUR: receipt.totalEUR, taxEUR: (parseFloat(receipt.totalEUR)*0.18/1.18).toFixed(2), noTaxEUR: (parseFloat(receipt.totalEUR)/1.18).toFixed(2) } },
                        [{ name: receipt.clientName, price: Math.round(parseFloat(receipt.totalEUR)*10000), quantity: 1, unit: 'vizitë', taxRate: 'E' }],
                        company,
                        { paymentMethod: payMethod || 'cash', operatorName: cashierName }
                      )
                      printReceipt(atk)
                    })
                  })
                }}
                style={{ flex: 1, padding: '11px 0', borderRadius: 10, border: '1.5px solid var(--border)', background: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                🖨️ Printo
              </button>
              <button onClick={() => setReceipt(null)} className="finex-button-primary" style={{ flex: 2, padding: '11px 0' }}>
                Mbyll
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOP BAR ── */}
      <div style={{ display: 'flex', alignItems: 'center', height: 48, background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '0 14px', gap: 10, flexShrink: 0 }}>
        <BusinessIcon size={16} color="var(--purple-light)" />
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Terminet</span>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <button onClick={prevDay} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={14} color="var(--text-2)" />
          </button>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', minWidth: 220, textAlign: 'center' }}>
            {formatDateAlb(date)}
            {date === new Date().toISOString().split('T')[0] && <span style={{ fontSize: 10, background: 'var(--purple)', color:'var(--text-1)', padding: '1px 7px', borderRadius: 20, fontWeight: 700, marginLeft: 8 }}>Sot</span>}
          </span>
          <button onClick={nextDay} style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRight size={14} color="var(--text-2)" />
          </button>
        </div>

        {isMockMode && <span style={{ fontSize: 10, color: '#F59E0B', fontWeight: 700 }}>MOCK</span>}
        <button onClick={() => setShowAdd(true)} className="finex-button-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', fontSize: 13 }}>
          <Plus size={14} /> Termin
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── CALENDAR ── */}
        <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
          {loading && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--purple)', animation: 'progress 1s ease infinite' }} />
          )}

          {HOURS.map(hour => {
            const apps = appsByTime[hour] || []
            const isNow = (() => {
              const now  = new Date()
              const nowH = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
              const next = HOURS[HOURS.indexOf(hour) + 1]
              return date === new Date().toISOString().split('T')[0] && nowH >= hour && (!next || nowH < next)
            })()

            return (
              <div key={hour} style={{ display: 'flex', borderBottom: '1px solid var(--border)', minHeight: 64, position: 'relative', background: isNow ? 'rgba(123,44,245,0.04)' : 'transparent' }}>
                {/* Time label */}
                <div style={{ width: 60, flexShrink: 0, padding: '8px 10px', borderRight: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: isNow ? 'var(--purple-light)' : 'var(--text-3)' }}>{hour}</span>
                </div>

                {/* Now indicator */}
                {isNow && <div style={{ position: 'absolute', left: 60, right: 0, top: 0, height: 2, background: 'var(--purple)', opacity: 0.6 }} />}

                {/* Appointments */}
                <div style={{ flex: 1, padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {apps.map(app => {
                    const st = STATUS_STYLE[app.status] || STATUS_STYLE.confirmed
                    return (
                      <div key={app.id} style={{ background: st.bg, border: `1px solid ${st.color}40`, borderLeft: `3px solid ${st.color}`, borderRadius: 9, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{app.client_name}</p>
                            {app.client_phone && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{app.client_phone}</span>}
                          </div>
                          <p style={{ fontSize: 12, color: st.color, fontWeight: 600 }}>
                            {app.service_name} · {fmtEUR(app.service_price)} · {app.duration_minutes}min
                          </p>
                          {app.operator_name && app.operator_name !== cashierName && (
                            <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{app.operator_name}</p>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          {app.status === 'confirmed' && (
                            <>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                <div style={{ display: 'flex', gap: 5 }}>
                                  <button onClick={() => setPayMethod('cash')}
                                    style={{ width: 28, height: 28, borderRadius: 7, border: payMethod === 'cash' ? '1.5px solid #10B981' : '1px solid var(--border)', background: payMethod === 'cash' ? 'rgba(16,185,129,0.1)' : 'var(--bg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Banknote size={13} color={payMethod === 'cash' ? '#10B981' : 'var(--text-3)'} />
                                  </button>
                                  <button onClick={() => setPayMethod('card')}
                                    style={{ width: 28, height: 28, borderRadius: 7, border: payMethod === 'card' ? '1.5px solid var(--purple)' : '1px solid var(--border)', background: payMethod === 'card' ? 'var(--purple-bg)' : 'var(--bg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <CreditCard size={13} color={payMethod === 'card' ? 'var(--purple-light)' : 'var(--text-3)'} />
                                  </button>
                                </div>
                                <button onClick={() => checkout(app)} disabled={checkingOut === app.id}
                                  style={{ height: 28, padding: '0 10px', borderRadius: 7, border: 'none', background: 'var(--purple)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color:'var(--text-1)' }}>
                                  {checkingOut === app.id
                                    ? <span style={{ width: 12, height: 12, border: '2px solid var(--border-color,#e2dcff)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                    : <><Zap size={11} /> Fiskalizo</>}
                                </button>
                              </div>
                              <button onClick={() => cancelApp(app.id)}
                                style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#EF4444'}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'}>
                                <X size={13} />
                              </button>
                            </>
                          )}
                          {app.status !== 'confirmed' && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: st.color, padding: '4px 10px', borderRadius: 20, background: st.bg }}>
                              {st.label}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {/* Empty slot hint */}
                  {apps.length === 0 && (
                    <button onClick={() => { setShowAdd(true); setForm(f => ({ ...f, appointment_time: hour })) }}
                      style={{ width: '100%', height: 32, background: 'transparent', border: '1px dashed transparent', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0 8px', color: 'transparent', transition: 'all 0.15s', fontSize: 12 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'transparent' }}>
                      <Plus size={12} style={{ marginRight: 5 }} /> Shto termin
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{ width: 240, borderLeft: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          {/* Day stats */}
          <div style={{ padding: '16px 14px', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Sot</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Terminet',  value: confirmed.length,         color: 'var(--purple-light)' },
                { label: 'Totali',    value: fmtEUR(totalDay),         color: '#10B981' },
                { label: 'Kompletuar', value: appointments.filter(a => a.status === 'completed').length, color: '#3B82F6' },
                { label: 'Anuluar',   value: appointments.filter(a => a.status === 'cancelled').length,  color: '#EF4444' },
              ].map(s => (
                <div key={s.label} style={{ padding: '8px 10px', borderRadius: 9, background: 'var(--bg-muted)', border: '1px solid var(--border)' }}>
                  <p style={{ fontSize: 16, fontWeight: 800, color: s.color, fontFamily: 'Poppins,sans-serif', lineHeight: 1, marginBottom: 3 }}>{s.value}</p>
                  <p style={{ fontSize: 10, color: 'var(--text-3)' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Services list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Shërbimet</p>
            {services.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Shto shërbime te Cilësimet → Shërbimet</p>
            ) : (
              services.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{s.name}</p>
                    <p style={{ fontSize: 10, color: 'var(--text-3)' }}>{s.duration_minutes}min</p>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--purple-light)', fontFamily: 'Poppins,sans-serif' }}>{fmtEUR(s.price)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── ADD MODAL ── */}
      {showAdd && (
        <>
          <div onClick={() => setShowAdd(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 199, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 18, padding: 24, width: 'min(420px,94vw)', zIndex: 200, boxShadow: '0 24px 60px rgba(0,0,0,0.4)', maxHeight: '88vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>Termin i Ri</p>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={S.label}>Emri i Klientit *</label>
                  <input value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                    placeholder="Ana Berisha" className="finex-input" autoFocus />
                </div>
                <div>
                  <label style={S.label}>Telefoni</label>
                  <input value={form.client_phone} onChange={e => setForm(f => ({ ...f, client_phone: e.target.value }))}
                    placeholder="+383 44 123 456" className="finex-input" />
                </div>
              </div>

              <div>
                <label style={S.label}>Shërbimi</label>
                <select value={form.service_id} onChange={e => setForm(f => ({ ...f, service_id: e.target.value }))}
                  className="finex-input" style={{ cursor: 'pointer' }}>
                  <option value="">— Zgjedh shërbimin —</option>
                  {services.map(s => (
                    <option key={s.id} value={s.id}>{s.name} — {fmtEUR(s.price)} ({s.duration_minutes}min)</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={S.label}>Ora *</label>
                  <select value={form.appointment_time} onChange={e => setForm(f => ({ ...f, appointment_time: e.target.value }))}
                    className="finex-input" style={{ cursor: 'pointer' }}>
                    {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Çmimi (€) — opsional</label>
                  <input type="number" step="0.01" value={form.custom_price}
                    onChange={e => setForm(f => ({ ...f, custom_price: e.target.value }))}
                    placeholder={selectedService ? (selectedService.price / 10000).toFixed(2) : '0.00'}
                    className="finex-input" />
                </div>
              </div>

              <div>
                <label style={S.label}>Operatori</label>
                <input value={form.operator_name} onChange={e => setForm(f => ({ ...f, operator_name: e.target.value }))}
                  className="finex-input" />
              </div>

              <div>
                <label style={S.label}>Shënimi</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Ngjyrosje, prerje speciale..." className="finex-input" />
              </div>

              {selectedService && (
                <div style={{ padding: '10px 12px', borderRadius: 9, background: 'var(--bg-muted)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-2)' }}>{selectedService.name}</span>
                  <span style={{ fontWeight: 700, color: 'var(--purple-light)', fontFamily: 'Poppins,sans-serif' }}>{fmtEUR(servicePrice)}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowAdd(false)} className="finex-button-secondary" style={{ flex: 1, padding: '10px 0', fontSize: 13 }}>Anulo</button>
                <button onClick={addAppointment} className="finex-button-primary"
                  style={{ flex: 2, padding: '10px 0', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                  <Calendar size={14} /> Shto Terminin
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin     { to { transform: rotate(360deg) } }
        @keyframes progress { 0% { opacity: 1 } 50% { opacity: 0.5 } 100% { opacity: 1 } }
      `}</style>
    </div>
  )
}
