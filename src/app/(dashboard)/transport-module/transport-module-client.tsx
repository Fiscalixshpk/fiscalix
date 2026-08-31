'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Truck, MapPin, Wrench, TrendingUp, Search } from 'lucide-react'

interface Props { companyId: string; data1: any[]; data2: any[]; data3: any[] }

export default function TransportModuleClient({ companyId, data1: iVehicles, data2: iOrders, data3: iMaintenance }: Props) {
  const [tab, setTab] = useState('overview')
  const [vehicles, setVehicles] = useState(iVehicles || [])
  const [orders, setOrders] = useState(iOrders || [])
  const [maintenance, setMaintenance] = useState(iMaintenance || [])
  const [showForm, setShowForm] = useState<string | null>(null)
  const supabase = createClient()

  const I = { background:'var(--bg-input,var(--bg-muted))', border:'1px solid var(--border)', borderRadius:10, padding:'9px 12px', color:'var(--text-1)', fontSize:13, width:'100%', outline:'none' }
  const L = { fontSize:10, fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:5, textTransform:'uppercase' as const, letterSpacing:'0.06em' }
  const S = { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'18px 20px', marginBottom:14 }

  const activeVehicles = vehicles.filter(v => v.status === 'active').length
  const inTransit = orders.filter(o => o.status === 'in_transit').length
  const totalRevenue = orders.reduce((s, o) => s + Number(o.price || 0), 0)
  const maintenanceCost = maintenance.reduce((s, m) => s + Number(m.cost || 0), 0)
  const today = new Date().toISOString().split('T')[0]
  const expiringInsurance = vehicles.filter(v => v.insurance_expiry && v.insurance_expiry <= new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0])

  const ORDER_STATUS: Record<string, {label:string; color:string}> = {
    scheduled: { label:'🗓️ Planifikuar', color:'#6366F1' },
    in_transit: { label:'🚛 Në Transit', color:'#F59E0B' },
    delivered: { label:'✅ Dorëzuar', color:'#10B981' },
    cancelled: { label:'❌ Anulluar', color:'#EF4444' },
  }

  async function addVehicle(f: any) {
    const { data, error } = await supabase.from('vehicles').insert({ ...f, year: parseInt(f.year)||null, mileage: parseFloat(f.mileage)||0, company_id: companyId }).select().single()
    if (error) { toast.error(error.message); return }
    setVehicles(v => [data, ...v]); setShowForm(null); toast.success('Automjeti u shtua')
  }

  async function addOrder(f: any) {
    const { data, error } = await supabase.from('transport_orders').insert({ ...f, price: parseFloat(f.price)||0, weight_kg: parseFloat(f.weight_kg)||null, distance_km: parseFloat(f.distance_km)||null, company_id: companyId }).select().single()
    if (error) { toast.error(error.message); return }
    setOrders(o => [data, ...o]); setShowForm(null); toast.success('Porosia u shtua')
  }

  async function addMaintenance(f: any) {
    const { data, error } = await supabase.from('vehicle_maintenance').insert({ ...f, cost: parseFloat(f.cost)||0, company_id: companyId }).select().single()
    if (error) { toast.error(error.message); return }
    setMaintenance(m => [data, ...m]); setShowForm(null); toast.success('Mirëmbajtja u regjistrua')
  }

  async function updateOrderStatus(id: string, status: string) {
    await supabase.from('transport_orders').update({ status }).eq('id', id)
    setOrders(o => o.map(x => x.id === id ? { ...x, status } : x))
  }

  return (
    <div className="page-enter">
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontFamily:'Poppins,sans-serif', fontSize:24, fontWeight:800, color:'var(--text-1)', marginBottom:4 }}>🚗 Moduli i Transportit</h1>
        <p style={{ fontSize:13, color:'var(--text-3)' }}>Flota, porositë, shoferët, mirëmbajtja</p>
      </div>

      <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
        {['overview','vehicles','orders','maintenance'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding:'8px 16px', borderRadius:10, border:`1px solid ${tab===t?'rgba(124,58,237,0.4)':'var(--border)'}`, background:tab===t?'rgba(124,58,237,0.12)':'var(--bg-card)', color:tab===t?'var(--purple)':'var(--text-2)', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            {({overview:'Pasqyra',vehicles:'Flota',orders:'Porositë',maintenance:'Mirëmbajtja'} as any)[t]}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:16 }}>
            {[
              { label:'Automjete', value:vehicles.length.toString(), color:'#3B82F6', icon:'🚛' },
              { label:'Aktive', value:activeVehicles.toString(), color:'#10B981', icon:'🟢' },
              { label:'Në Transit', value:inTransit.toString(), color:'#F59E0B', icon:'🛣️' },
              { label:'Të Ardhura', value:`€${totalRevenue.toLocaleString()}`, color:'#9B5CF8', icon:'💰' },
              { label:'Kost Mirëmbajtje', value:`€${maintenanceCost.toLocaleString()}`, color:'#EF4444', icon:'🔧' },
            ].map((k,i) => (
              <div key={i} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'14px 16px', borderTop:`3px solid ${k.color}` }}>
                <p style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>{k.icon} {k.label}</p>
                <p style={{ fontFamily:'Poppins,sans-serif', fontSize:20, fontWeight:900, color:k.color }}>{k.value}</p>
              </div>
            ))}
          </div>
          {expiringInsurance.length > 0 && (
            <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:12, padding:'12px 16px', marginBottom:14 }}>
              <p style={{ fontSize:12, fontWeight:700, color:'#92400E', marginBottom:8 }}>⚠️ Sigurime që Skadojnë Brenda 30 Ditëve</p>
              {expiringInsurance.map(v => (
                <p key={v.id} style={{ fontSize:12, color:'var(--text-2)' }}>🚛 {v.plate} — {v.brand} {v.model} · Skadon: {v.insurance_expiry}</p>
              ))}
            </div>
          )}
          <div style={S}>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:12 }}>Porositë e Fundit</p>
            {orders.slice(0,6).map(o => (
              <div key={o.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                <div>
                  <p style={{ fontSize:13, fontWeight:600, color:'var(--text-1)' }}>{o.client_name}</p>
                  <p style={{ fontSize:11, color:'var(--text-3)' }}>{o.from_location || '—'} → {o.to_location || '—'} · {o.departure_date}</p>
                </div>
                <div style={{ textAlign:'right' }}>
                  <p style={{ fontWeight:700, color:'var(--text-1)' }}>€{Number(o.price||0).toFixed(0)}</p>
                  <span style={{ fontSize:10, color:ORDER_STATUS[o.status]?.color }}>{ORDER_STATUS[o.status]?.label}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'vehicles' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
            <button onClick={() => setShowForm('vehicle')} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>
              <Plus size={14}/> Automjet i Ri
            </button>
          </div>
          {showForm === 'vehicle' && <SF fields={[
            ['plate','Targa *','text'],['brand','Marka','text'],['model','Modeli','text'],
            ['year','Viti','number'],['driver_name','Shofer','text'],
            ['insurance_expiry','Skadimi Sigurimit','date'],['registration_expiry','Skadimi Regjistrimit','date'],
          ]} onSave={addVehicle} onCancel={() => setShowForm(null)} I={I} L={L}/>}
          <div style={{ overflowX:'auto' }}>
            <table className="finex-table">
              <thead><tr><th>Targa</th><th>Marka/Modeli</th><th>Shofer</th><th>Sigurim Skadon</th><th>Regj. Skadon</th><th>Statusi</th></tr></thead>
              <tbody>
                {vehicles.map(v => (
                  <tr key={v.id}>
                    <td style={{ fontWeight:800, fontSize:15 }}>{v.plate}</td>
                    <td style={{ fontSize:12 }}>{v.brand} {v.model} {v.year ? `(${v.year})` : ''}</td>
                    <td style={{ fontSize:12 }}>{v.driver_name || '—'}</td>
                    <td style={{ fontSize:11, color:v.insurance_expiry < today ? '#EF4444' : 'var(--text-3)' }}>{v.insurance_expiry || '—'}</td>
                    <td style={{ fontSize:11, color:v.registration_expiry < today ? '#EF4444' : 'var(--text-3)' }}>{v.registration_expiry || '—'}</td>
                    <td><span style={{ fontSize:11, padding:'2px 8px', borderRadius:6, background:v.status==='active'?'rgba(16,185,129,0.1)':'rgba(245,158,11,0.1)', color:v.status==='active'?'#10B981':'#F59E0B' }}>{v.status==='active'?'🟢 Aktiv':v.status==='maintenance'?'🔧 Mirëmbajtje':'⬛ Jashtë Shërbimit'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
            <button onClick={() => setShowForm('order')} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>
              <Plus size={14}/> Porosi e Re
            </button>
          </div>
          {showForm === 'order' && <SF fields={[
            ['client_name','Klienti *','text'],['client_phone','Telefoni','text'],
            ['from_location','Nga','text'],['to_location','Deri','text'],
            ['departure_date','Data Nisjes','date'],['cargo_type','Lloji Ngarkesës','text'],
            ['weight_kg','Pesha (kg)','number'],['distance_km','Distanca (km)','number'],
            ['price','Çmimi (€)','number'],['driver_name','Shofer','text'],
          ]} onSave={addOrder} onCancel={() => setShowForm(null)} I={I} L={L}/>}
          <div style={{ overflowX:'auto' }}>
            <table className="finex-table">
              <thead><tr><th>Klienti</th><th>Nga → Deri</th><th>Data</th><th>Ngarkesa</th><th style={{ textAlign:'right' }}>Pesha</th><th style={{ textAlign:'right' }}>Çmimi</th><th>Statusi</th></tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontWeight:700 }}>{o.client_name}</td>
                    <td style={{ fontSize:11 }}>{o.from_location || '—'} → {o.to_location || '—'}</td>
                    <td style={{ fontSize:11, color:'var(--text-3)' }}>{o.departure_date || '—'}</td>
                    <td style={{ fontSize:11, color:'var(--text-3)' }}>{o.cargo_type || '—'}</td>
                    <td style={{ textAlign:'right', fontSize:11 }}>{o.weight_kg ? `${o.weight_kg}kg` : '—'}</td>
                    <td style={{ textAlign:'right', fontWeight:700 }}>€{Number(o.price||0).toFixed(0)}</td>
                    <td>
                      <select value={o.status} onChange={e => updateOrderStatus(o.id, e.target.value)}
                        style={{ background:'transparent', border:'none', color:ORDER_STATUS[o.status]?.color, fontSize:11, fontWeight:700, cursor:'pointer', outline:'none' }}>
                        {Object.entries(ORDER_STATUS).map(([v,l]) => <option key={v} value={v}>{l.label}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'maintenance' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <p style={{ fontSize:14, fontWeight:700, color:'var(--text-1)' }}>Kostot totale: <span style={{ color:'var(--text-1)' }}>€{maintenanceCost.toLocaleString()}</span></p>
            <button onClick={() => setShowForm('maintenance')} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>
              <Plus size={14}/> Shto Mirëmbajtje
            </button>
          </div>
          {showForm === 'maintenance' && <SF fields={[
            ['vehicle_id','Automjeti','select_vehicles'],
            ['maintenance_date','Data *','date'],
            ['type','Lloji','text'],
            ['description','Përshkrimi','text'],
            ['cost','Kostoja (€)','number'],
            ['service_center','Servisi','text'],
            ['next_service_date','Shërbimi i Radhës','date'],
          ]} onSave={addMaintenance} onCancel={() => setShowForm(null)} I={I} L={L} extra={{ vehicles }}/>}
          <div style={{ overflowX:'auto' }}>
            <table className="finex-table">
              <thead><tr><th>Automjeti</th><th>Data</th><th>Lloji</th><th>Servisi</th><th style={{ textAlign:'right' }}>Kostoja</th><th>Shërbimi i Radhës</th></tr></thead>
              <tbody>
                {maintenance.map(m => (
                  <tr key={m.id}>
                    <td style={{ fontWeight:700 }}>{vehicles.find(v => v.id === m.vehicle_id)?.plate || '—'}</td>
                    <td style={{ fontSize:11, color:'var(--text-3)' }}>{m.maintenance_date}</td>
                    <td style={{ fontSize:11 }}>{m.type || '—'}</td>
                    <td style={{ fontSize:11, color:'var(--text-3)' }}>{m.service_center || '—'}</td>
                    <td style={{ textAlign:'right', fontWeight:700, color:'var(--text-1)' }}>€{Number(m.cost||0).toFixed(0)}</td>
                    <td style={{ fontSize:11, color:'var(--text-1)' }}>{m.next_service_date || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function SF({ fields, onSave, onCancel, I, L, extra }: any) {
  const [form, setForm] = useState<Record<string, string>>({})
  return (
    <div style={{ background:'rgba(124,58,237,0.06)', border:'1px solid rgba(124,58,237,0.2)', borderRadius:14, padding:16, marginBottom:14 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12, marginBottom:12 }}>
        {fields.map(([key, label, type]: [string, string, string]) => (
          <div key={key}>
            <label style={L}>{label}</label>
            {type === 'select_vehicles' ? (
              <select value={form[key]||''} onChange={e => setForm(p => ({...p,[key]:e.target.value}))} style={I}>
                <option value="">Zgjidh automjetin</option>
                {extra?.vehicles?.map((v: any) => <option key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model}</option>)}
              </select>
            ) : (
              <input type={type} value={form[key]||''} onChange={e => setForm(p => ({...p,[key]:e.target.value}))} style={I}/>
            )}
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={() => onSave(form)} style={{ padding:'8px 20px', borderRadius:10, background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>Shto</button>
        <button onClick={onCancel} style={{ padding:'8px 16px', borderRadius:10, background:'transparent', border:'1px solid var(--border)', color:'var(--text-1)', fontSize:13, cursor:'pointer' }}>Anulo</button>
      </div>
    </div>
  )
}
