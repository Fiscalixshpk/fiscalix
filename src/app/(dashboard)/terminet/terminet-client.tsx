'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Calendar, Clock, Link, Copy, Settings, CheckCircle, XCircle, Search, Trash2 } from 'lucide-react'

type Tab = 'today' | 'appointments' | 'services' | 'booking_link'

interface Props {
  companyId: string
  companyName: string
  businessType: string
  services: any[]
  appointments: any[]
  bookingLink: any
}

const TIMES = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00']

export default function TerminetClient({ companyId, companyName, businessType, services: iServices, appointments: iAppointments, bookingLink: iLink }: Props) {
  const [tab, setTab] = useState<Tab>('today')
  const [services, setServices] = useState(iServices || [])
  const [appointments, setAppointments] = useState(iAppointments || [])
  const [bookingLink, setBookingLink] = useState(iLink || null)
  const [showForm, setShowForm] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  const I = { background:'var(--bg-input)', border:'1px solid var(--border)', borderRadius:10, padding:'9px 12px', color:'var(--text-1)', fontSize:13, width:'100%', outline:'none' }
  const L = { fontSize:10, fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:5, textTransform:'uppercase' as const, letterSpacing:'0.06em' }
  const S = { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'18px 20px', marginBottom:14 }

  const today = new Date().toISOString().split('T')[0]
  const todayApps = appointments.filter(a => a.appointment_date === today)
  const upcomingApps = appointments.filter(a => a.appointment_date >= today && a.status === 'confirmed').sort((a, b) => `${a.appointment_date}${a.appointment_time}`.localeCompare(`${b.appointment_date}${b.appointment_time}`))

  const STATUS: Record<string, {label:string; color:string}> = {
    confirmed: { label:'✅ Konfirmuar', color:'#10B981' },
    completed: { label:'🎯 Kompletuar', color:'#6366F1' },
    cancelled: { label:'❌ Anulluar', color:'#EF4444' },
    no_show: { label:'⚠️ Nuk u Paraqit', color:'#F59E0B' },
  }

  const SERVICE_PLACEHOLDER: Record<string, {name: string, category: string}[]> = {
    health: [
      { name: 'Vizitë Gjinekologjike', category: 'Gjinekologji' },
      { name: 'Konsultë e Përgjithshme', category: 'Mjekësi e Përgjithshme' },
      { name: 'Ekografi', category: 'Diagnostikim' },
      { name: 'Analizë Gjaku', category: 'Laborator' },
    ],
    legal: [
      { name: 'Konsultë Juridike', category: 'Konsulencë' },
      { name: 'Përfaqësim në Gjykatë', category: 'Procedurale' },
      { name: 'Hartim Kontrate', category: 'Dokumenta' },
      { name: 'Konsultë Familjare', category: 'E Drejtë Familjare' },
    ],
    it: [
      { name: 'Konsultë IT', category: 'Konsulencë' },
      { name: 'Mbështetje Teknike', category: 'Support' },
      { name: 'Auditim Sistemi', category: 'Siguri' },
      { name: 'Trajnim Software', category: 'Trajnim' },
    ],
    education: [
      { name: 'Provim Niveli', category: 'Vlerësim' },
      { name: 'Konsultë me Prind', category: 'Takim' },
      { name: 'Orientim Karriere', category: 'Konsulencë' },
      { name: 'Seancë Private', category: 'Mësim' },
    ],
    services: [
      { name: 'Kontroll i Sistemit', category: 'Mirëmbajtje' },
      { name: 'Shërbim në Shtëpi', category: 'Riparim' },
      { name: 'Vlerësim Defekti', category: 'Diagnostikim' },
      { name: 'Instalim', category: 'Instalim' },
    ],
    agency: [
      { name: 'Takim Briefing', category: 'Planifikim' },
      { name: 'Prezantim Projektit', category: 'Prezantim' },
      { name: 'Konsultë Strategjike', category: 'Konsulencë' },
      { name: 'Review i Materialeve', category: 'Rishikim' },
    ],
  }

  const suggestions = SERVICE_PLACEHOLDER[businessType] || [
    { name: 'Konsultë', category: 'Konsulencë' },
    { name: 'Takim', category: 'Takim' },
  ]

  const [appForm, setAppForm] = useState({ service_id:'', client_name:'', client_phone:'', client_email:'', appointment_date:today, appointment_time:'09:00', notes:'' })
  const [svcForm, setSvcForm] = useState({ name:'', description:'', duration_minutes:'30', price:'', category:'' })
  const [linkSlug, setLinkSlug] = useState(bookingLink?.slug || companyName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || '')

  async function addAppointment() {
    if (!appForm.client_name || !appForm.appointment_date || !appForm.appointment_time) { toast.error('Plotëso fushat e detyrueshme'); return }
    const svc = services.find(s => s.id === appForm.service_id)
    const { data, error } = await supabase.from('appointments').insert({
      ...appForm, company_id: companyId, duration_minutes: svc?.duration_minutes || 30, source: 'manual'
    }).select('*, business_services(name)').single()
    if (error) { toast.error(error.message); return }
    setAppointments(a => [data, ...a])
    setAppForm({ service_id:'', client_name:'', client_phone:'', client_email:'', appointment_date:today, appointment_time:'09:00', notes:'' })
    setShowForm(null)
    toast.success('Termini u shtua')
  }

  async function addService() {
    if (!svcForm.name) { toast.error('Shto emrin e shërbimit'); return }
    const { data, error } = await supabase.from('business_services').insert({
      ...svcForm, price: parseFloat(svcForm.price)||0, duration_minutes: parseInt(svcForm.duration_minutes)||30, company_id: companyId
    }).select().single()
    if (error) { toast.error(error.message); return }
    setServices(s => [...s, data])
    setSvcForm({ name:'', description:'', duration_minutes:'30', price:'', category:'' })
    setShowForm(null)
    toast.success('Shërbimi u shtua')
  }

  async function deleteService(id: string) {
    await supabase.from('business_services').update({ is_active: false }).eq('id', id)
    setServices(s => s.filter(x => x.id !== id))
    toast.success('U hoq')
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('appointments').update({ status }).eq('id', id)
    setAppointments(a => a.map(x => x.id === id ? { ...x, status } : x))
  }

  async function saveBookingLink() {
    if (!linkSlug) return
    if (bookingLink) {
      const { data } = await supabase.from('booking_links').update({ slug: linkSlug, title: companyName, is_active: true }).eq('id', bookingLink.id).select().single()
      setBookingLink(data)
    } else {
      const { data } = await supabase.from('booking_links').insert({ slug: linkSlug, title: companyName, company_id: companyId, is_active: true }).select().single()
      setBookingLink(data)
    }
    toast.success('Linku u ruajt')
  }

  const bookingUrl = typeof window !== 'undefined' ? `${window.location.origin}/booking/${linkSlug}` : `/booking/${linkSlug}`

  const filteredApps = useMemo(() => appointments.filter(a =>
    !search || a.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    a.client_phone?.includes(search) || a.business_services?.name?.toLowerCase().includes(search.toLowerCase())
  ), [appointments, search])

  return (
    <div className="page-enter">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20, flexWrap:'wrap', gap:10 }}>
        <div>
          <h1 style={{ fontFamily:'Poppins,sans-serif', fontSize:24, fontWeight:800, color:'var(--text-1)', marginBottom:4 }}>🗓️ Terminet</h1>
          <p style={{ fontSize:13, color:'var(--text-3)' }}>Rezervimet, oraret, link online</p>
        </div>
        <button onClick={() => setShowForm('appointment')}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 20px', borderRadius:12, background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>
          <Plus size={15}/> Shto Termin
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
        {[
          { id:'today', label:`Sot (${todayApps.length})` },
          { id:'appointments', label:'Të Gjitha' },
          { id:'services', label:'Shërbimet' },
          { id:'booking_link', label:'Link Online' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as Tab)}
            style={{ padding:'8px 16px', borderRadius:10, border:`1px solid ${tab===t.id?'#7C3AED':'var(--border)'}`, background:tab===t.id?'#7C3AED':'var(--bg-card)', color:tab===t.id?'white':'var(--text-2)', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Add appointment form */}
      {showForm === 'appointment' && (
        <div style={{ background:'var(--purple-bg)', border:'1px solid var(--border-purple)', borderRadius:14, padding:16, marginBottom:16 }}>
          <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:14 }}>Termin i Ri</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12, marginBottom:12 }}>
            <div><label style={L}>Shërbimi</label>
              <select value={appForm.service_id} onChange={e => setAppForm(p => ({...p, service_id:e.target.value}))} style={I}>
                <option value="">Zgjidh shërbimin</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes} min) — €{s.price}</option>)}
              </select>
            </div>
            <div><label style={L}>Emri Klientit *</label><input value={appForm.client_name} onChange={e => setAppForm(p => ({...p, client_name:e.target.value}))} style={I} placeholder="Emri Mbiemri"/></div>
            <div><label style={L}>Telefoni</label><input value={appForm.client_phone} onChange={e => setAppForm(p => ({...p, client_phone:e.target.value}))} style={I} placeholder="+383..."/></div>
            <div><label style={L}>Email</label><input value={appForm.client_email} onChange={e => setAppForm(p => ({...p, client_email:e.target.value}))} style={I}/></div>
            <div><label style={L}>Data *</label><input type="date" value={appForm.appointment_date} onChange={e => setAppForm(p => ({...p, appointment_date:e.target.value}))} style={I}/></div>
            <div><label style={L}>Ora *</label>
              <select value={appForm.appointment_time} onChange={e => setAppForm(p => ({...p, appointment_time:e.target.value}))} style={I}>
                {TIMES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ gridColumn:'span 2' }}><label style={L}>Shënime</label><input value={appForm.notes} onChange={e => setAppForm(p => ({...p, notes:e.target.value}))} style={I} placeholder="Opsionale..."/></div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={addAppointment} style={{ padding:'8px 20px', borderRadius:10, background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>Shto Terminin</button>
            <button onClick={() => setShowForm(null)} style={{ padding:'8px 16px', borderRadius:10, background:'transparent', border:'1px solid var(--border)', color:'var(--text-1)', fontSize:13, cursor:'pointer' }}>Anulo</button>
          </div>
        </div>
      )}

      {/* TODAY */}
      {tab === 'today' && (
        <div>
          {todayApps.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px 20px', color:'var(--text-3)' }}>
              <p style={{ fontSize:40, marginBottom:12 }}>🗓️</p>
              <p style={{ fontSize:15, fontWeight:600 }}>Nuk ka termine sot</p>
              <p style={{ fontSize:13, marginTop:6 }}>Shto termin ose prit rezervime online</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {todayApps.sort((a, b) => a.appointment_time.localeCompare(b.appointment_time)).map(a => (
                <div key={a.id} style={{ background:'var(--bg-card)', border:`1px solid ${STATUS[a.status]?.color}30`, borderRadius:14, padding:'16px 20px', borderLeft:`4px solid ${STATUS[a.status]?.color}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10 }}>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                        <span style={{ fontFamily:'Poppins,sans-serif', fontSize:22, fontWeight:900, color:STATUS[a.status]?.color }}>{a.appointment_time}</span>
                        <span style={{ fontSize:11, color:'var(--text-3)' }}>{a.duration_minutes} min</span>
                      </div>
                      <p style={{ fontSize:15, fontWeight:700, color:'var(--text-1)', marginBottom:2 }}>{a.client_name}</p>
                      <p style={{ fontSize:12, color:'var(--text-3)' }}>{a.business_services?.name || 'Pa shërbim'} {a.client_phone ? `· 📞 ${a.client_phone}` : ''}</p>
                      {a.notes && <p style={{ fontSize:11, color:'var(--text-3)', marginTop:4, fontStyle:'italic' }}>📝 {a.notes}</p>}
                    </div>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {a.status === 'confirmed' && (
                        <>
                          <button onClick={() => updateStatus(a.id, 'completed')}
                            style={{ padding:'6px 14px', borderRadius:8, background:'#F0FDF4', border:'1px solid #BBF7D0', color:'var(--text-1)', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                            ✓ Kompletuar
                          </button>
                          <button onClick={() => updateStatus(a.id, 'no_show')}
                            style={{ padding:'6px 14px', borderRadius:8, background:'#FFFBEB', border:'1px solid #FDE68A', color:'#92400E', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                            ⚠️ No-Show
                          </button>
                          <button onClick={() => updateStatus(a.id, 'cancelled')}
                            style={{ padding:'6px 12px', borderRadius:8, background:'#FEF2F2', border:'1px solid #FECACA', color:'var(--text-1)', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                            ✕
                          </button>
                        </>
                      )}
                      {a.status !== 'confirmed' && (
                        <span style={{ fontSize:12, padding:'6px 12px', borderRadius:8, background:`${STATUS[a.status]?.color}15`, color:STATUS[a.status]?.color, fontWeight:700 }}>
                          {STATUS[a.status]?.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upcoming */}
          {upcomingApps.filter(a => a.appointment_date > today).length > 0 && (
            <div style={{ marginTop:20 }}>
              <p style={{ fontSize:12, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>Të Ardhshme</p>
              {upcomingApps.filter(a => a.appointment_date > today).slice(0,5).map(a => (
                <div key={a.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', borderRadius:10, background:'var(--bg-card)', border:'1px solid var(--border)', marginBottom:6 }}>
                  <div>
                    <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)' }}>{a.client_name}</p>
                    <p style={{ fontSize:11, color:'var(--text-3)' }}>{a.business_services?.name || '—'}</p>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontSize:13, fontWeight:800, color:'#6366F1' }}>{a.appointment_date}</p>
                    <p style={{ fontSize:12, color:'var(--text-3)' }}>{a.appointment_time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ALL APPOINTMENTS */}
      {tab === 'appointments' && (
        <div>
          <div style={{ position:'relative', marginBottom:14 }}>
            <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)' }}/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Kërko klient, shërbim..." style={{ ...I, paddingLeft:36 }}/>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table className="finex-table">
              <thead><tr><th>Klienti</th><th>Shërbimi</th><th>Data</th><th>Ora</th><th>Telefoni</th><th>Statusi</th></tr></thead>
              <tbody>
                {filteredApps.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight:700 }}>{a.client_name}</td>
                    <td style={{ fontSize:12, color:'var(--text-3)' }}>{a.business_services?.name || '—'}</td>
                    <td style={{ fontSize:12, fontWeight:600, color:'#6366F1' }}>{a.appointment_date}</td>
                    <td style={{ fontSize:12 }}>{a.appointment_time}</td>
                    <td style={{ fontSize:12 }}>{a.client_phone || '—'}</td>
                    <td>
                      <select value={a.status} onChange={e => updateStatus(a.id, e.target.value)}
                        style={{ background:'transparent', border:'none', color:STATUS[a.status]?.color, fontSize:11, fontWeight:700, cursor:'pointer', outline:'none' }}>
                        {Object.entries(STATUS).map(([v,l]) => <option key={v} value={v}>{l.label}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredApps.length === 0 && <p style={{ textAlign:'center', color:'var(--text-3)', padding:'30px 0', fontSize:13 }}>Nuk ka termine</p>}
          </div>
        </div>
      )}

      {/* SERVICES */}
      {tab === 'services' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
            <button onClick={() => setShowForm(showForm === 'service' ? null : 'service')}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>
              <Plus size={14}/> Shërbim i Ri
            </button>
          </div>

          {showForm === 'service' && (
            <div style={{ background:'var(--purple-bg)', border:'1px solid var(--border-purple)', borderRadius:14, padding:16, marginBottom:14 }}>
              {/* Quick suggestions */}
              <p style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>Shërbime të sugjeruara:</p>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => setSvcForm(p => ({ ...p, name: s.name, category: s.category }))}
                    style={{ padding:'5px 12px', borderRadius:8, background:'var(--purple-bg)', border:'1px solid var(--border-purple)', color:'var(--purple)', fontSize:12, cursor:'pointer', fontWeight:500 }}>
                    {s.name}
                  </button>
                ))}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12, marginBottom:12 }}>
                <div><label style={L}>Emri Shërbimit *</label><input value={svcForm.name} onChange={e => setSvcForm(p => ({...p, name:e.target.value}))} style={I} placeholder={suggestions[0]?.name || 'Emri shërbimit'}/></div>
                <div><label style={L}>Kategoria</label><input value={svcForm.category} onChange={e => setSvcForm(p => ({...p, category:e.target.value}))} style={I} placeholder={suggestions[0]?.category || 'Kategoria'}/></div>
                <div><label style={L}>Kohëzgjatja (min)</label><input type="number" value={svcForm.duration_minutes} onChange={e => setSvcForm(p => ({...p, duration_minutes:e.target.value}))} style={I}/></div>
                <div><label style={L}>Çmimi (€)</label><input type="number" value={svcForm.price} onChange={e => setSvcForm(p => ({...p, price:e.target.value}))} style={I}/></div>
                <div style={{ gridColumn:'span 2' }}><label style={L}>Përshkrimi</label><input value={svcForm.description} onChange={e => setSvcForm(p => ({...p, description:e.target.value}))} style={I}/></div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={addService} style={{ padding:'8px 20px', borderRadius:10, background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>Shto</button>
                <button onClick={() => setShowForm(null)} style={{ padding:'8px 16px', borderRadius:10, background:'transparent', border:'1px solid var(--border)', color:'var(--text-1)', fontSize:13, cursor:'pointer' }}>Anulo</button>
              </div>
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:12 }}>
            {services.map(s => (
              <div key={s.id} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                  <p style={{ fontSize:14, fontWeight:700, color:'var(--text-1)' }}>{s.name}</p>
                  <button onClick={() => deleteService(s.id)} style={{ padding:'4px', borderRadius:6, border:'1px solid rgba(239,68,68,0.2)', background:'rgba(239,68,68,0.07)', color:'var(--text-1)', cursor:'pointer', display:'flex', flexShrink:0 }}>
                    <Trash2 size={12}/>
                  </button>
                </div>
                {s.category && <p style={{ fontSize:11, color:'#9B5CF8', marginBottom:6 }}>🏷️ {s.category}</p>}
                {s.description && <p style={{ fontSize:12, color:'var(--text-3)', marginBottom:8 }}>{s.description}</p>}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:12, color:'var(--text-3)' }}>⏱️ {s.duration_minutes} min</span>
                  <span style={{ fontFamily:'Poppins,sans-serif', fontSize:16, fontWeight:800, color:'var(--text-1)' }}>€{Number(s.price||0).toFixed(0)}</span>
                </div>
              </div>
            ))}
            {services.length === 0 && (
              <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'40px 0', color:'var(--text-3)' }}>
                <p style={{ fontSize:14 }}>Nuk ka shërbime — shto shërbimin e parë</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOOKING LINK */}
      {tab === 'booking_link' && (
        <div>
          <div style={S}>
            <h3 style={{ fontFamily:'Poppins,sans-serif', fontSize:16, fontWeight:800, color:'var(--text-1)', marginBottom:6 }}>🔗 Link për Rezervime Online</h3>
            <p style={{ fontSize:13, color:'var(--text-3)', marginBottom:20 }}>
              Gjenero linkun tënd — klienët mund të rezervojnë termin online pa telefon
            </p>

            <div style={{ marginBottom:16 }}>
              <label style={L}>Slug (emri në link)</label>
              <div style={{ display:'flex', gap:8 }}>
                <div style={{ display:'flex', alignItems:'center', padding:'9px 12px', borderRadius:'10px 0 0 10px', background:'var(--bg-muted)', border:'1px solid var(--border)', borderRight:'none', color:'var(--text-3)', fontSize:12, whiteSpace:'nowrap' }}>
                  /booking/
                </div>
                <input value={linkSlug} onChange={e => setLinkSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
                  style={{ ...I, borderRadius:'0 10px 10px 0', flex:1 }} placeholder="klinika-ime"/>
              </div>
            </div>

            <button onClick={saveBookingLink}
              style={{ padding:'10px 24px', borderRadius:10, background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer', marginBottom:20 }}>
              Ruaj Linkun
            </button>

            {bookingLink && (
              <div style={{ background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:12, padding:'16px 20px' }}>
                <p style={{ fontSize:12, fontWeight:700, color:'var(--text-1)', marginBottom:10 }}>✅ Linku është aktiv</p>
                <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                  <code style={{ fontSize:13, color:'var(--text-1)', background:'var(--bg-input)', padding:'8px 14px', borderRadius:8, flex:1, wordBreak:'break-all' }}>
                    {bookingUrl}
                  </code>
                  <button onClick={() => { navigator.clipboard.writeText(bookingUrl); toast.success('U kopjua!') }}
                    style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:8, background:'#F0FDF4', border:'1px solid #BBF7D0', color:'var(--text-1)', fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
                    <Copy size={13}/> Kopjo
                  </button>
                </div>
                <p style={{ fontSize:11, color:'var(--text-3)', marginTop:10 }}>
                  💡 Shpërnda këtë link në Instagram, WhatsApp, Facebook — klienët rezervojnë direkt
                </p>
              </div>
            )}
          </div>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12 }}>
            {[
              { label:'Totale', value:appointments.length.toString(), color:'#3B82F6' },
              { label:'Sot', value:todayApps.length.toString(), color:'#9B5CF8' },
              { label:'Online', value:appointments.filter(a => a.source === 'online_link').length.toString(), color:'#10B981' },
              { label:'Kompletuar', value:appointments.filter(a => a.status === 'completed').length.toString(), color:'#6366F1' },
            ].map((k,i) => (
              <div key={i} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'12px 16px', borderTop:`3px solid ${k.color}` }}>
                <p style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{k.label}</p>
                <p style={{ fontFamily:'Poppins,sans-serif', fontSize:22, fontWeight:900, color:k.color }}>{k.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
