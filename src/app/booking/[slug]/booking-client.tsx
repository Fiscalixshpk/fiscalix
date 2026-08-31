'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { CheckCircle, ChevronLeft, ChevronRight, Clock, MapPin, Phone } from 'lucide-react'

interface Props {
  companyId: string
  company: any
  linkTitle: string
  services: any[]
  bookedSlots: { appointment_date: string; appointment_time: string; duration_minutes: number }[]
}

const WORK_HOURS = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00']

const DAYS_SQ = ['Hën','Mar','Mër','Enj','Pre','Sht','Die']
const MONTHS_SQ = ['Janar','Shkurt','Mars','Prill','Maj','Qershor','Korrik','Gusht','Shtator','Tetor','Nëntor','Dhjetor']

export default function BookingPageClient({ companyId, company, linkTitle, services, bookedSlots }: Props) {
  const [step, setStep] = useState<1|2|3|4>(1) // 1:service, 2:date, 3:time, 4:confirm
  const [selectedService, setSelectedService] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [calMonth, setCalMonth] = useState(new Date())
  const [form, setForm] = useState({ name:'', phone:'', email:'', notes:'' })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const supabase = createClient()

  const today = new Date()
  today.setHours(0,0,0,0)

  // Orët e zëna per datën e zgjedhur
  const bookedTimesForDate = useMemo(() => {
    return bookedSlots
      .filter(s => s.appointment_date === selectedDate)
      .map(s => s.appointment_time)
  }, [bookedSlots, selectedDate])

  // Orët e lira
  const availableTimes = useMemo(() => {
    return WORK_HOURS.filter(t => !bookedTimesForDate.includes(t))
  }, [bookedTimesForDate])

  // Kalendar
  const calDays = useMemo(() => {
    const year = calMonth.getFullYear()
    const month = calMonth.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const offset = firstDay === 0 ? 6 : firstDay - 1 // Hëna si fillim
    const days: (Date | null)[] = Array(offset).fill(null)
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(new Date(year, month, d))
    }
    return days
  }, [calMonth])

  function isDayAvailable(date: Date) {
    if (date < today) return false
    const day = date.getDay()
    if (day === 0) return false // E diele jo
    const dateStr = date.toISOString().split('T')[0]
    const booked = bookedSlots.filter(s => s.appointment_date === dateStr).length
    return booked < WORK_HOURS.length
  }

  function hasFreeSlots(date: Date) {
    const dateStr = date.toISOString().split('T')[0]
    const bookedCount = bookedSlots.filter(s => s.appointment_date === dateStr).length
    return WORK_HOURS.length - bookedCount
  }

  async function submitBooking() {
    if (!form.name || !form.phone) { toast.error('Emri dhe telefoni janë të detyrueshme'); return }
    setSubmitting(true)
    try {
      const { error } = await supabase.from('appointments').insert({
        company_id: companyId,
        service_id: selectedService?.id || null,
        client_name: form.name,
        client_phone: form.phone,
        client_email: form.email || null,
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        duration_minutes: selectedService?.duration_minutes || 30,
        status: 'confirmed',
        notes: form.notes || null,
        source: 'online_link',
      })
      if (error) throw error
      setDone(true)
    } catch (e: any) {
      toast.error(e.message || 'Gabim gjatë rezervimit')
    } finally {
      setSubmitting(false)
    }
  }

  // SUCCESS screen
  if (done) return (
    <div style={{ minHeight:'100vh', background:'var(--bg-card)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'var(--bg-muted)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:20, padding:40, textAlign:'center', maxWidth:440, width:'100%' }}>
        <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(16,185,129,0.15)', border:'2px solid #10B981', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
          <CheckCircle size={32} style={{ color:'#10B981' }}/>
        </div>
        <h2 style={{ fontFamily:'Poppins,sans-serif', fontSize:24, fontWeight:800, color:'var(--text-1)', marginBottom:10 }}>Rezervimi u Konfirmua!</h2>
        <p style={{ fontSize:14, color:'#94A3B8', marginBottom:20 }}>Termini juaj u regjistrua me sukses</p>
        <div style={{ background:'var(--bg-muted)', borderRadius:12, padding:'16px 20px', textAlign:'left', marginBottom:20 }}>
          <p style={{ fontSize:13, color:'#94A3B8', marginBottom:6 }}>📅 <strong style={{ color:'var(--text-1)' }}>{selectedDate}</strong> në orën <strong style={{ color:'#10B981' }}>{selectedTime}</strong></p>
          {selectedService && <p style={{ fontSize:13, color:'#94A3B8', marginBottom:6 }}>🩺 <strong style={{ color:'var(--text-1)' }}>{selectedService.name}</strong></p>}
          <p style={{ fontSize:13, color:'#94A3B8' }}>👤 <strong style={{ color:'var(--text-1)' }}>{form.name}</strong> · {form.phone}</p>
        </div>
        <p style={{ fontSize:12, color:'#64748B' }}>Nëse keni nevojë të anulloni, kontaktoni direkt {company?.phone ? `në ${company.phone}` : 'biznesin'}</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-card)', padding:'20px 16px' }}>
      <div style={{ maxWidth:520, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:56, height:56, borderRadius:16, background:'linear-gradient(135deg,#5A1FD6,#9B5CF8)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', fontSize:24 }}>
            🗓️
          </div>
          <h1 style={{ fontFamily:'Poppins,sans-serif', fontSize:22, fontWeight:800, color:'var(--text-1)', marginBottom:4 }}>{linkTitle}</h1>
          {company?.address && <p style={{ fontSize:12, color:'#64748B', display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}><MapPin size={12}/>{company.address}{company.city ? `, ${company.city}` : ''}</p>}
          {company?.phone && <p style={{ fontSize:12, color:'#64748B', marginTop:4, display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}><Phone size={12}/>{company.phone}</p>}
        </div>

        {/* Progress */}
        <div style={{ display:'flex', gap:6, marginBottom:24 }}>
          {['Shërbimi','Data','Ora','Konfirmo'].map((label, i) => (
            <div key={i} style={{ flex:1, textAlign:'center' }}>
              <div style={{ height:3, borderRadius:2, background: step > i ? '#7C3AED' : step === i+1 ? '#7C3AED' : 'var(--bg-muted)', marginBottom:4, opacity: step > i+1 ? 1 : step === i+1 ? 1 : 0.4 }}/>
              <p style={{ fontSize:9, color: step === i+1 ? 'var(--purple)' : '#475569', fontWeight: step === i+1 ? 700 : 400 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* STEP 1 — Shërbimi */}
        {step === 1 && (
          <div>
            <p style={{ fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:14 }}>Zgjidh Shërbimin</p>
            {services.length === 0 ? (
              <div style={{ background:'var(--bg-muted)', borderRadius:14, padding:24, textAlign:'center', color:'#64748B', fontSize:13 }}>
                Nuk ka shërbime të disponueshme
              </div>
            ) : services.map(s => (
              <button key={s.id} onClick={() => { setSelectedService(s); setStep(2) }}
                style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', background: selectedService?.id === s.id ? 'rgba(124,58,237,0.15)' : '#1E293B', border:`1px solid ${selectedService?.id === s.id ? 'rgba(124,58,237,0.5)' : 'var(--border)'}`, borderRadius:14, marginBottom:8, cursor:'pointer', textAlign:'left' }}>
                <div>
                  <p style={{ fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:3 }}>{s.name}</p>
                  <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                    {s.category && <span style={{ fontSize:11, color:'#9B5CF8' }}>{s.category}</span>}
                    <span style={{ fontSize:11, color:'#64748B', display:'flex', alignItems:'center', gap:4 }}><Clock size={11}/>{s.duration_minutes} min</span>
                    {s.description && <span style={{ fontSize:11, color:'#64748B' }}>{s.description}</span>}
                  </div>
                </div>
                <span style={{ fontFamily:'Poppins,sans-serif', fontSize:16, fontWeight:800, color:'#10B981', flexShrink:0, marginLeft:12 }}>
                  {Number(s.price) > 0 ? `€${Number(s.price).toFixed(0)}` : 'Falas'}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* STEP 2 — Data */}
        {step === 2 && (
          <div>
            <button onClick={() => setStep(1)} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', color:'#9B5CF8', fontSize:12, cursor:'pointer', marginBottom:14, fontWeight:600 }}>
              <ChevronLeft size={14}/> Kthehu
            </button>
            <p style={{ fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:14 }}>Zgjidh Datën</p>

            {/* Calendar Nav */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <button onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth()-1, 1))}
                style={{ padding:'6px', borderRadius:8, background:'var(--bg-muted)', border:'1px solid var(--border-color,#e2dcff)', color:'var(--text-1)', cursor:'pointer', display:'flex' }}>
                <ChevronLeft size={16}/>
              </button>
              <p style={{ fontSize:14, fontWeight:700, color:'var(--text-1)' }}>
                {MONTHS_SQ[calMonth.getMonth()]} {calMonth.getFullYear()}
              </p>
              <button onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth()+1, 1))}
                style={{ padding:'6px', borderRadius:8, background:'var(--bg-muted)', border:'1px solid var(--border-color,#e2dcff)', color:'var(--text-1)', cursor:'pointer', display:'flex' }}>
                <ChevronRight size={16}/>
              </button>
            </div>

            {/* Day headers */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, marginBottom:6 }}>
              {DAYS_SQ.map(d => <p key={d} style={{ textAlign:'center', fontSize:10, color:'#64748B', fontWeight:600 }}>{d}</p>)}
            </div>

            {/* Days grid */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
              {calDays.map((day, i) => {
                if (!day) return <div key={i}/>
                const dateStr = day.toISOString().split('T')[0]
                const available = isDayAvailable(day)
                const freeSlots = available ? hasFreeSlots(day) : 0
                const isSelected = dateStr === selectedDate
                const isPast = day < today
                const isSunday = day.getDay() === 0

                return (
                  <button key={i}
                    onClick={() => { if (available) { setSelectedDate(dateStr); setStep(3) } }}
                    disabled={!available}
                    style={{
                      padding:'8px 4px', borderRadius:10, border:`1px solid ${isSelected?'#7C3AED':available?'rgba(16,185,129,0.3)':'var(--border)'}`,
                      background: isSelected?'rgba(124,58,237,0.3)':available?'rgba(16,185,129,0.06)':'transparent',
                      color: isSelected?'white':available?'#34D399':isPast||isSunday?'#334155':'#475569',
                      cursor: available?'pointer':'default',
                      textAlign:'center', fontSize:13, fontWeight: available?700:400,
                    }}>
                    {day.getDate()}
                    {available && freeSlots <= 3 && freeSlots > 0 && (
                      <div style={{ fontSize:8, color:'#F59E0B', marginTop:2 }}>{freeSlots} free</div>
                    )}
                  </button>
                )
              })}
            </div>

            <div style={{ marginTop:14, display:'flex', gap:12, fontSize:11, color:'#64748B' }}>
              <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10, height:10, borderRadius:3, background:'rgba(16,185,129,0.3)', display:'inline-block' }}/> E lirë</span>
              <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:10, height:10, borderRadius:3, background:'var(--bg-muted)', display:'inline-block' }}/> E zënë / E kaluar</span>
            </div>
          </div>
        )}

        {/* STEP 3 — Ora */}
        {step === 3 && (
          <div>
            <button onClick={() => setStep(2)} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', color:'#9B5CF8', fontSize:12, cursor:'pointer', marginBottom:14, fontWeight:600 }}>
              <ChevronLeft size={14}/> Kthehu
            </button>
            <p style={{ fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:4 }}>Zgjidh Orën</p>
            <p style={{ fontSize:12, color:'#64748B', marginBottom:14 }}>📅 {selectedDate} — Orët e lira</p>

            {availableTimes.length === 0 ? (
              <div style={{ background:'var(--bg-muted)', borderRadius:14, padding:24, textAlign:'center' }}>
                <p style={{ color:'#EF4444', fontSize:13, marginBottom:8 }}>Nuk ka orë të lira për këtë datë</p>
                <button onClick={() => setStep(2)} style={{ fontSize:12, color:'#9B5CF8', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>Zgjidh datë tjetër</button>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                {WORK_HOURS.map(time => {
                  const isBooked = bookedTimesForDate.includes(time)
                  const isSelected = time === selectedTime
                  return (
                    <button key={time}
                      onClick={() => { if (!isBooked) { setSelectedTime(time); setStep(4) } }}
                      disabled={isBooked}
                      style={{
                        padding:'10px 6px', borderRadius:10, border:`1px solid ${isSelected?'#7C3AED':isBooked?'var(--border)':'rgba(16,185,129,0.3)'}`,
                        background: isSelected?'rgba(124,58,237,0.3)':isBooked?'var(--bg-muted)':'rgba(16,185,129,0.06)',
                        color: isSelected?'white':isBooked?'#334155':'#34D399',
                        fontSize:13, fontWeight:600, cursor:isBooked?'not-allowed':'pointer',
                        textDecoration: isBooked?'line-through':'none',
                      }}>
                      {time}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* STEP 4 — Konfirmo */}
        {step === 4 && (
          <div>
            <button onClick={() => setStep(3)} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', color:'#9B5CF8', fontSize:12, cursor:'pointer', marginBottom:14, fontWeight:600 }}>
              <ChevronLeft size={14}/> Kthehu
            </button>
            <p style={{ fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:14 }}>Konfirmo Rezervimin</p>

            {/* Summary */}
            <div style={{ background:'rgba(124,58,237,0.08)', border:'1px solid rgba(124,58,237,0.2)', borderRadius:14, padding:'14px 18px', marginBottom:16 }}>
              {selectedService && <p style={{ fontSize:13, color:'var(--purple)', marginBottom:4 }}>🩺 {selectedService.name}</p>}
              <p style={{ fontSize:13, color:'var(--purple)', marginBottom:4 }}>📅 {selectedDate} në orën {selectedTime}</p>
              {selectedService && Number(selectedService.price) > 0 && (
                <p style={{ fontSize:13, color:'var(--purple)' }}>💰 €{Number(selectedService.price).toFixed(0)}</p>
              )}
            </div>

            {/* Form */}
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
              {[
                { key:'name', label:'Emri i Plotë *', type:'text', placeholder:'Emri Mbiemri' },
                { key:'phone', label:'Telefoni *', type:'tel', placeholder:'+383 4X XXX XXX' },
                { key:'email', label:'Email (opsional)', type:'email', placeholder:'email@example.com' },
                { key:'notes', label:'Shënime (opsional)', type:'text', placeholder:'Nëse keni diçka specifike...' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize:11, fontWeight:600, color:'#94A3B8', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.06em' }}>{f.label}</label>
                  <input
                    type={f.type}
                    value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))}
                    placeholder={f.placeholder}
                    style={{ width:'100%', padding:'12px 14px', borderRadius:10, background:'var(--bg-muted)', border:'1px solid var(--border-color,#e2dcff)', color:'var(--text-1)', fontSize:14, outline:'none', boxSizing:'border-box' }}
                  />
                </div>
              ))}
            </div>

            <button onClick={submitBooking} disabled={submitting}
              style={{ width:'100%', padding:'14px', borderRadius:12, background:'linear-gradient(135deg,#5A1FD6,#9B5CF8)', color:'white', fontFamily:'Poppins,sans-serif', fontSize:15, fontWeight:800, border:'none', cursor:'pointer', opacity:submitting?0.7:1 }}>
              {submitting ? 'Duke rezervuar...' : 'Konfirmo Terminin →'}
            </button>

            <p style={{ fontSize:11, color:'#475569', textAlign:'center', marginTop:10 }}>
              Pa regjistrim · Pa llogari · Rezervimi konfirmohet menjëherë
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
