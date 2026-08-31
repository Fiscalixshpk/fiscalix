'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Home, Calendar, TrendingUp, Search, Trash2, Users, BedDouble } from 'lucide-react'

type Tab = 'overview' | 'rooms' | 'bookings' | 'checkin'

interface Props {
  companyId: string
  rooms: any[]
  bookings: any[]
}

export default function TourismModuleClient({ companyId, rooms: initRooms, bookings: initBookings }: Props) {
  const [tab, setTab] = useState<Tab>('overview')
  const [rooms, setRooms] = useState(initRooms || [])
  const [bookings, setBookings] = useState(initBookings || [])
  const [showForm, setShowForm] = useState<'room' | 'booking' | null>(null)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  const I = { background: 'var(--bg-input,var(--bg-muted))', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px', color: 'var(--text-1)', fontSize: 13, width: '100%', outline: 'none' }
  const L = { fontSize: 10, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }
  const S = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginBottom: 14 }

  const today = new Date().toISOString().split('T')[0]
  const occupiedRooms = rooms.filter(r => r.status === 'occupied').length
  const availableRooms = rooms.filter(r => r.status === 'available').length
  const checkedInToday = bookings.filter(b => b.check_in === today).length
  const checkingOutToday = bookings.filter(b => b.check_out === today).length
  const totalRevenue = bookings.filter(b => b.status === 'checked_out').reduce((s, b) => s + Number(b.total_amount || 0), 0)
  const occupancyRate = rooms.length > 0 ? Math.round((occupiedRooms / rooms.length) * 100) : 0

  const ROOM_STATUS: Record<string, { label: string; color: string }> = {
    available: { label: '🟢 Lirë', color: '#10B981' },
    occupied: { label: '🔴 Zënë', color: '#EF4444' },
    maintenance: { label: '🔧 Mirëmbajtje', color: '#F59E0B' },
    cleaning: { label: '🧹 Pastrим', color: '#3B82F6' },
  }

  const BOOKING_STATUS: Record<string, { label: string; color: string }> = {
    confirmed: { label: '✅ Konfirmuar', color: '#3B82F6' },
    checked_in: { label: '🏨 Check-In', color: '#10B981' },
    checked_out: { label: '👋 Check-Out', color: '#6B7280' },
    cancelled: { label: '❌ Anulluar', color: '#EF4444' },
    no_show: { label: '⚠️ No-Show', color: '#F59E0B' },
  }

  const TABS = [
    { id: 'overview', label: 'Pasqyra', icon: TrendingUp },
    { id: 'rooms', label: 'Dhomët', icon: BedDouble },
    { id: 'bookings', label: 'Rezervimet', icon: Calendar },
    { id: 'checkin', label: 'Check-In/Out', icon: Users },
  ]

  async function addRoom(form: any) {
    const { data, error } = await supabase.from('rooms').insert({ ...form, company_id: companyId, price_per_night: parseFloat(form.price_per_night) || 0, capacity: parseInt(form.capacity) || 2, floor: parseInt(form.floor) || null }).select().single()
    if (error) { toast.error(error.message); return }
    setRooms(r => [...r, data].sort((a, b) => a.room_number.localeCompare(b.room_number)))
    setShowForm(null)
    toast.success('Dhoma u shtua')
  }

  async function addBooking(form: any) {
    const checkIn = new Date(form.check_in)
    const checkOut = new Date(form.check_out)
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    const pricePerNight = parseFloat(form.price_per_night) || 0
    const total = nights * pricePerNight

    const { data, error } = await supabase.from('bookings').insert({
      ...form, company_id: companyId, nights, price_per_night: pricePerNight, total_amount: total, paid_amount: 0,
      adults: parseInt(form.adults) || 1, children: parseInt(form.children) || 0
    }).select().single()
    if (error) { toast.error(error.message); return }
    setBookings(b => [data, ...b])
    setShowForm(null)
    toast.success('Rezervimi u shtua')
  }

  async function updateBookingStatus(id: string, status: string) {
    await supabase.from('bookings').update({ status }).eq('id', id)
    setBookings(b => b.map(x => x.id === id ? { ...x, status } : x))
    if (status === 'checked_in') toast.success('Check-In u bë')
    if (status === 'checked_out') toast.success('Check-Out u bë')
  }

  const filteredBookings = useMemo(() => bookings.filter(b =>
    !search || b.guest_name?.toLowerCase().includes(search.toLowerCase()) ||
    rooms.find(r => r.id === b.room_id)?.room_number?.includes(search)
  ), [bookings, rooms, search])

  return (
    <div className="page-enter">
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Poppins,sans-serif', fontSize: 24, fontWeight: 800, color: 'var(--text-1)', marginBottom: 4 }}>
          🏨 Moduli i Turizmit
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Dhomët, rezervimet, check-in/out, faturim</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id as Tab)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: `1px solid ${tab === t.id ? 'rgba(124,58,237,0.4)' : 'var(--border)'}`, background: tab === t.id ? 'rgba(124,58,237,0.12)' : 'var(--bg-card)', color: tab === t.id ? 'var(--purple)' : 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <Icon size={14} /> {t.label}
            </button>
          )
        })}
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Dhoma Totale', value: rooms.length.toString(), color: '#3B82F6', icon: '🛏️' },
              { label: 'Të Zëna', value: occupiedRooms.toString(), color: '#EF4444', icon: '🔴' },
              { label: 'Të Lira', value: availableRooms.toString(), color: '#10B981', icon: '🟢' },
              { label: 'Normë Zënie', value: `${occupancyRate}%`, color: '#9B5CF8', icon: '📊' },
              { label: 'Check-In Sot', value: checkedInToday.toString(), color: '#F59E0B', icon: '📥' },
              { label: 'Check-Out Sot', value: checkingOutToday.toString(), color: '#6366F1', icon: '📤' },
              { label: 'Të Ardhura', value: `€${totalRevenue.toLocaleString()}`, color: '#10B981', icon: '💰' },
            ].map((k, i) => (
              <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', borderTop: `3px solid ${k.color}` }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{k.icon} {k.label}</p>
                <p style={{ fontFamily: 'Poppins,sans-serif', fontSize: 20, fontWeight: 900, color: k.color }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Room grid */}
          <div style={S}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14 }}>Statusi i Dhomave</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(100px,1fr))', gap: 8 }}>
              {rooms.map(r => (
                <div key={r.id} style={{ padding: '12px', borderRadius: 10, border: `1px solid ${ROOM_STATUS[r.status]?.color}30`, background: `${ROOM_STATUS[r.status]?.color}0D`, textAlign: 'center', cursor: 'pointer' }}>
                  <p style={{ fontSize: 16, fontWeight: 800, color: ROOM_STATUS[r.status]?.color }}>#{r.room_number}</p>
                  <p style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 2 }}>{r.room_type}</p>
                  <p style={{ fontSize: 9, color: ROOM_STATUS[r.status]?.color, marginTop: 2 }}>{ROOM_STATUS[r.status]?.label}</p>
                </div>
              ))}
              {rooms.length === 0 && <p style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-3)', padding: '20px 0', fontSize: 13 }}>Shto dhomë të parë</p>}
            </div>
          </div>

          {/* Arrivals today */}
          {(checkedInToday > 0 || checkingOutToday > 0) && (
            <div style={S}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 12 }}>📅 Sot</p>
              {bookings.filter(b => b.check_in === today || b.check_out === today).map(b => (
                <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom:'1px solid var(--border)' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{b.guest_name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Dhoma {rooms.find(r => r.id === b.room_id)?.room_number || '—'} · {b.nights} net</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: b.check_in === today ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)', color: b.check_in === today ? '#10B981' : '#818CF8' }}>
                      {b.check_in === today ? '📥 Check-In' : '📤 Check-Out'}
                    </span>
                    <p style={{ fontWeight: 700, color: '#F59E0B' }}>€{Number(b.total_amount || 0).toFixed(0)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ROOMS */}
      {tab === 'rooms' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <button onClick={() => setShowForm('room')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: 'linear-gradient(135deg,#6D28D9,#8B5CF6)', color: 'white', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
              <Plus size={14} /> Dhomë e Re
            </button>
          </div>

          {showForm === 'room' && <RoomForm onSave={addRoom} onCancel={() => setShowForm(null)} I={I} L={L} />}

          <div style={{ overflowX: 'auto' }}>
            <table className="finex-table">
              <thead>
                <tr><th>Nr.</th><th>Lloji</th><th>Kati</th><th style={{ textAlign: 'right' }}>Kapaciteti</th><th style={{ textAlign: 'right' }}>Çmimi/Natë</th><th>Statusi</th></tr>
              </thead>
              <tbody>
                {rooms.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 800, fontSize: 15 }}>#{r.room_number}</td>
                    <td style={{ fontSize: 12 }}>{r.room_type}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{r.floor || '—'}</td>
                    <td style={{ textAlign: 'right', fontSize: 12 }}>{r.capacity} persona</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>€{Number(r.price_per_night || 0).toFixed(0)}</td>
                    <td>
                      <select value={r.status} onChange={async e => {
                        await supabase.from('rooms').update({ status: e.target.value }).eq('id', r.id)
                        setRooms(rs => rs.map(x => x.id === r.id ? { ...x, status: e.target.value } : x))
                        toast.success('Statusi u ndryshua')
                      }} style={{ background: 'transparent', border: 'none', color: ROOM_STATUS[r.status]?.color, fontSize: 12, fontWeight: 700, cursor: 'pointer', outline: 'none' }}>
                        {Object.entries(ROOM_STATUS).map(([v, l]) => <option key={v} value={v}>{l.label}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rooms.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-3)', padding: '30px 0', fontSize: 13 }}>Nuk ka dhoma</p>}
          </div>
        </div>
      )}

      {/* BOOKINGS */}
      {tab === 'bookings' && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Kërko mik, dhomë..." style={{ ...I, paddingLeft: 36 }} />
            </div>
            <button onClick={() => setShowForm('booking')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: 'linear-gradient(135deg,#6D28D9,#8B5CF6)', color: 'white', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
              <Plus size={14} /> Rezervim i Ri
            </button>
          </div>

          {showForm === 'booking' && <BookingForm rooms={rooms} onSave={addBooking} onCancel={() => setShowForm(null)} I={I} L={L} />}

          <div style={{ overflowX: 'auto' }}>
            <table className="finex-table">
              <thead>
                <tr><th>Miku</th><th>Dhoma</th><th>Check-In</th><th>Check-Out</th><th style={{ textAlign: 'right' }}>Netë</th><th style={{ textAlign: 'right' }}>Totali</th><th>Burimi</th><th>Statusi</th></tr>
              </thead>
              <tbody>
                {filteredBookings.map(b => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 700 }}>{b.guest_name}</td>
                    <td style={{ fontSize: 12 }}>#{rooms.find(r => r.id === b.room_id)?.room_number || '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{b.check_in}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{b.check_out}</td>
                    <td style={{ textAlign: 'right' }}>{b.nights}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>€{Number(b.total_amount || 0).toFixed(0)}</td>
                    <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{b.source}</td>
                    <td>
                      <select value={b.status} onChange={e => updateBookingStatus(b.id, e.target.value)}
                        style={{ background: 'transparent', border: 'none', color: BOOKING_STATUS[b.status]?.color, fontSize: 11, fontWeight: 700, cursor: 'pointer', outline: 'none' }}>
                        {Object.entries(BOOKING_STATUS).map(([v, l]) => <option key={v} value={v}>{l.label}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredBookings.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-3)', padding: '30px 0', fontSize: 13 }}>Nuk ka rezervime</p>}
          </div>
        </div>
      )}

      {/* CHECK-IN/OUT */}
      {tab === 'checkin' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* Arrivals */}
            <div style={S}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#10B981', marginBottom: 12 }}>📥 Check-In Sot ({bookings.filter(b => b.check_in === today && b.status === 'confirmed').length})</p>
              {bookings.filter(b => b.check_in === today && b.status === 'confirmed').map(b => (
                <div key={b.id} style={{ padding: '10px', borderRadius: 10, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{b.guest_name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Dhoma #{rooms.find(r => r.id === b.room_id)?.room_number} · {b.nights} net · €{Number(b.total_amount || 0).toFixed(0)}</p>
                    </div>
                    <button onClick={() => updateBookingStatus(b.id, 'checked_in')}
                      style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10B981', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      ✓ Check-In
                    </button>
                  </div>
                  {b.guest_phone && <p style={{ fontSize: 11, color:'var(--text-1)' }}>📞 {b.guest_phone}</p>}
                </div>
              ))}
              {bookings.filter(b => b.check_in === today && b.status === 'confirmed').length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: '20px 0' }}>Nuk ka ardhje sot</p>
              )}
            </div>

            {/* Departures */}
            <div style={S}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#6366F1', marginBottom: 12 }}>📤 Check-Out Sot ({bookings.filter(b => b.check_out === today && b.status === 'checked_in').length})</p>
              {bookings.filter(b => b.check_out === today && b.status === 'checked_in').map(b => (
                <div key={b.id} style={{ padding: '10px', borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{b.guest_name}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Dhoma #{rooms.find(r => r.id === b.room_id)?.room_number} · €{Number(b.total_amount || 0).toFixed(0)}</p>
                    </div>
                    <button onClick={() => updateBookingStatus(b.id, 'checked_out')}
                      style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818CF8', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      ✓ Check-Out
                    </button>
                  </div>
                </div>
              ))}
              {bookings.filter(b => b.check_out === today && b.status === 'checked_in').length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: '20px 0' }}>Nuk ka largime sot</p>
              )}
            </div>
          </div>

          {/* Currently occupied */}
          <div style={S}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 12 }}>🏨 Aktualisht të Zëna</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10 }}>
              {bookings.filter(b => b.status === 'checked_in').map(b => (
                <div key={b.id} style={{ padding: '12px', borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#EF4444' }}>#{rooms.find(r => r.id === b.room_id)?.room_number}</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', marginTop: 4 }}>{b.guest_name}</p>
                  <p style={{ fontSize: 10, color: 'var(--text-3)' }}>{b.check_in} → {b.check_out}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RoomForm({ onSave, onCancel, I, L }: any) {
  const [form, setForm] = useState({ room_number: '', room_type: 'standard', floor: '', capacity: '2', price_per_night: '', status: 'available' })
  return (
    <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 14, padding: 16, marginBottom: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div><label style={L}>Nr. Dhomës *</label><input value={form.room_number} onChange={e => setForm(p => ({ ...p, room_number: e.target.value }))} style={I} placeholder="101" /></div>
        <div><label style={L}>Lloji</label>
          <select value={form.room_type} onChange={e => setForm(p => ({ ...p, room_type: e.target.value }))} style={I}>
            <option value="standard">Standard</option>
            <option value="deluxe">Deluxe</option>
            <option value="suite">Suite</option>
            <option value="apartment">Apartament</option>
          </select>
        </div>
        <div><label style={L}>Kati</label><input type="number" value={form.floor} onChange={e => setForm(p => ({ ...p, floor: e.target.value }))} style={I} placeholder="1" /></div>
        <div><label style={L}>Kapaciteti (persona)</label><input type="number" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} style={I} /></div>
        <div><label style={L}>Çmimi/Natë (€)</label><input type="number" value={form.price_per_night} onChange={e => setForm(p => ({ ...p, price_per_night: e.target.value }))} style={I} /></div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => onSave(form)} style={{ padding: '8px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#6D28D9,#8B5CF6)', color: 'white', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>Shto Dhomën</button>
        <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 10, background: 'transparent', border: '1px solid var(--border)', color:'var(--text-1)', fontSize: 13, cursor: 'pointer' }}>Anulo</button>
      </div>
    </div>
  )
}

function BookingForm({ rooms, onSave, onCancel, I, L }: any) {
  const [form, setForm] = useState({ guest_name: '', guest_phone: '', guest_email: '', guest_nationality: '', room_id: '', check_in: '', check_out: '', adults: '1', children: '0', price_per_night: '', source: 'direct', status: 'confirmed', special_requests: '' })

  const nights = form.check_in && form.check_out
    ? Math.ceil((new Date(form.check_out).getTime() - new Date(form.check_in).getTime()) / (1000 * 60 * 60 * 24))
    : 0
  const total = nights * (parseFloat(form.price_per_night) || 0)

  return (
    <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 14, padding: 16, marginBottom: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div><label style={L}>Emri Mikut *</label><input value={form.guest_name} onChange={e => setForm(p => ({ ...p, guest_name: e.target.value }))} style={I} /></div>
        <div><label style={L}>Telefoni</label><input value={form.guest_phone} onChange={e => setForm(p => ({ ...p, guest_phone: e.target.value }))} style={I} /></div>
        <div><label style={L}>Kombësia</label><input value={form.guest_nationality} onChange={e => setForm(p => ({ ...p, guest_nationality: e.target.value }))} style={I} placeholder="Shqiptar, Kosovar..." /></div>
        <div><label style={L}>Dhoma</label>
          <select value={form.room_id} onChange={e => {
            const room = rooms.find((r: any) => r.id === e.target.value)
            setForm(p => ({ ...p, room_id: e.target.value, price_per_night: room?.price_per_night?.toString() || '' }))
          }} style={I}>
            <option value="">Zgjidh dhomën</option>
            {rooms.filter((r: any) => r.status === 'available').map((r: any) => (
              <option key={r.id} value={r.id}>#{r.room_number} — {r.room_type} — €{r.price_per_night}/natë</option>
            ))}
          </select>
        </div>
        <div><label style={L}>Check-In</label><input type="date" value={form.check_in} onChange={e => setForm(p => ({ ...p, check_in: e.target.value }))} style={I} /></div>
        <div><label style={L}>Check-Out</label><input type="date" value={form.check_out} onChange={e => setForm(p => ({ ...p, check_out: e.target.value }))} style={I} /></div>
        <div><label style={L}>Çmimi/Natë (€)</label><input type="number" value={form.price_per_night} onChange={e => setForm(p => ({ ...p, price_per_night: e.target.value }))} style={I} /></div>
        <div><label style={L}>Burimi</label>
          <select value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))} style={I}>
            <option value="direct">Direkt</option>
            <option value="booking.com">Booking.com</option>
            <option value="airbnb">Airbnb</option>
            <option value="expedia">Expedia</option>
            <option value="phone">Telefon</option>
          </select>
        </div>
        <div><label style={L}>Të Rritur / Fëmijë</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="number" value={form.adults} onChange={e => setForm(p => ({ ...p, adults: e.target.value }))} style={{ ...I, width: '50%' }} placeholder="1" />
            <input type="number" value={form.children} onChange={e => setForm(p => ({ ...p, children: e.target.value }))} style={{ ...I, width: '50%' }} placeholder="0" />
          </div>
        </div>
      </div>
      {nights > 0 && (
        <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', marginBottom: 12, fontSize: 12, color: 'var(--text-2)' }}>
          {nights} netë × €{parseFloat(form.price_per_night) || 0} = <strong style={{ color: '#10B981' }}>€{total.toFixed(2)}</strong>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => onSave(form)} style={{ padding: '8px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#6D28D9,#8B5CF6)', color: 'white', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>Shto Rezervimin</button>
        <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 10, background: 'transparent', border: '1px solid var(--border)', color:'var(--text-1)', fontSize: 13, cursor: 'pointer' }}>Anulo</button>
      </div>
    </div>
  )
}
