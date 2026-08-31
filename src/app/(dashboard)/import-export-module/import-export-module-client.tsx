'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Package, TrendingUp, Search, Warehouse } from 'lucide-react'

interface Props { companyId: string; data1: any[]; data2: any[]; data3: any[] }

export default function ImportExportModuleClient({ companyId, data1: iSuppliers, data2: iOrders, data3: iWarehouse }: Props) {
  const [tab, setTab] = useState('overview')
  const [suppliers, setSuppliers] = useState(iSuppliers || [])
  const [orders, setOrders] = useState(iOrders || [])
  const [warehouse, setWarehouse] = useState(iWarehouse || [])
  const [showForm, setShowForm] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  const I = { background:'var(--bg-input,var(--bg-muted))', border:'1px solid var(--border)', borderRadius:10, padding:'9px 12px', color:'var(--text-1)', fontSize:13, width:'100%', outline:'none' }
  const L = { fontSize:10, fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:5, textTransform:'uppercase' as const, letterSpacing:'0.06em' }
  const S = { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'18px 20px', marginBottom:14 }

  const totalImportValue = orders.filter(o => o.order_type === 'import').reduce((s, o) => s + Number(o.total_value || 0), 0)
  const totalExportValue = orders.filter(o => o.order_type === 'export').reduce((s, o) => s + Number(o.total_value || 0), 0)
  const inTransit = orders.filter(o => o.status === 'in_transit').length
  const totalCustomsDuty = orders.reduce((s, o) => s + Number(o.customs_duty || 0), 0)
  const lowStock = warehouse.filter(w => Number(w.quantity_in_stock) <= Number(w.min_stock))

  const ORDER_STATUS: Record<string, {label:string; color:string}> = {
    ordered: { label:'📋 Porositur', color:'#6366F1' },
    in_transit: { label:'🚢 Në Transit', color:'#F59E0B' },
    customs: { label:'🛃 Doganë', color:'#EF4444' },
    delivered: { label:'✅ Dorëzuar', color:'#10B981' },
    cancelled: { label:'❌ Anulluar', color:'#6B7280' },
  }

  async function addSupplier(f: any) {
    const { data, error } = await supabase.from('ie_suppliers').insert({ ...f, total_value: 0, company_id: companyId }).select().single()
    if (error) { toast.error(error.message); return }
    setSuppliers(s => [data, ...s]); setShowForm(null); toast.success('Furnitori u shtua')
  }

  async function addOrder(f: any) {
    const { data, error } = await supabase.from('ie_orders').insert({
      ...f, total_value: parseFloat(f.total_value)||0, customs_duty: parseFloat(f.customs_duty)||0,
      vat_import: parseFloat(f.vat_import)||0, transport_cost: parseFloat(f.transport_cost)||0,
      quantity: parseFloat(f.quantity)||0, unit_price: parseFloat(f.unit_price)||0, company_id: companyId
    }).select().single()
    if (error) { toast.error(error.message); return }
    setOrders(o => [data, ...o]); setShowForm(null); toast.success('Porosia u shtua')
  }

  async function addWarehouse(f: any) {
    const { data, error } = await supabase.from('ie_warehouse').insert({
      ...f, quantity_in_stock: parseFloat(f.quantity_in_stock)||0, unit_cost: parseFloat(f.unit_cost)||0,
      selling_price: parseFloat(f.selling_price)||0, min_stock: parseFloat(f.min_stock)||0, company_id: companyId
    }).select().single()
    if (error) { toast.error(error.message); return }
    setWarehouse(w => [data, ...w]); setShowForm(null); toast.success('Produkti u shtua')
  }

  async function updateOrderStatus(id: string, status: string) {
    await supabase.from('ie_orders').update({ status }).eq('id', id)
    setOrders(o => o.map(x => x.id === id ? { ...x, status } : x))
  }

  return (
    <div className="page-enter">
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontFamily:'Poppins,sans-serif', fontSize:24, fontWeight:800, color:'var(--text-1)', marginBottom:4 }}>📦 Moduli Import/Export</h1>
        <p style={{ fontSize:13, color:'var(--text-3)' }}>Furnitorët, porositë, dogana, magazina</p>
      </div>

      <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
        {['overview','suppliers','orders','warehouse'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding:'8px 16px', borderRadius:10, border:`1px solid ${tab===t?'rgba(124,58,237,0.4)':'var(--border)'}`, background:tab===t?'rgba(124,58,237,0.12)':'var(--bg-card)', color:tab===t?'var(--purple)':'var(--text-2)', fontSize:13, fontWeight:600, cursor:'pointer' }}>
            {({overview:'Pasqyra',suppliers:'Furnitorët',orders:'Porositë',warehouse:'Magazina'} as any)[t]}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:16 }}>
            {[
              { label:'Import Totale', value:`€${totalImportValue.toLocaleString()}`, color:'#3B82F6', icon:'📥' },
              { label:'Export Totale', value:`€${totalExportValue.toLocaleString()}`, color:'#10B981', icon:'📤' },
              { label:'Furnitorë', value:suppliers.length.toString(), color:'#9B5CF8', icon:'🏭' },
              { label:'Në Transit', value:inTransit.toString(), color:'#F59E0B', icon:'🚢' },
              { label:'Dogana & Taksa', value:`€${totalCustomsDuty.toLocaleString()}`, color:'#EF4444', icon:'🛃' },
              { label:'Produkte Magazinë', value:warehouse.length.toString(), color:'#6366F1', icon:'📦' },
            ].map((k,i) => (
              <div key={i} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'14px 16px', borderTop:`3px solid ${k.color}` }}>
                <p style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>{k.icon} {k.label}</p>
                <p style={{ fontFamily:'Poppins,sans-serif', fontSize:20, fontWeight:900, color:k.color }}>{k.value}</p>
              </div>
            ))}
          </div>
          {lowStock.length > 0 && (
            <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:12, padding:'12px 16px', marginBottom:14 }}>
              <p style={{ fontSize:12, fontWeight:700, color:'#92400E', marginBottom:8 }}>⚠️ Stoku i Ulët ({lowStock.length} produkte)</p>
              {lowStock.slice(0,5).map(w => (
                <p key={w.id} style={{ fontSize:12, color:'var(--text-2)' }}>📦 {w.product_name} — Stock: {w.quantity_in_stock} {w.unit} (min: {w.min_stock})</p>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'suppliers' && (
        <div>
          <div style={{ display:'flex', gap:10, marginBottom:14, alignItems:'center' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Kërko furnitor..." style={{ ...I, flex:1 }}/>
            <button onClick={() => setShowForm('supplier')} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>
              <Plus size={14}/> Furnitor i Ri
            </button>
          </div>
          {showForm === 'supplier' && <SF fields={[
            ['name','Emri *','text'],['country','Shteti','text'],['city','Qyteti','text'],
            ['contact_person','Kontakti','text'],['email','Email','text'],['phone','Telefoni','text'],
            ['category','Kategoria','text'],['payment_terms','Kushtet Pagesës','text'],['currency','Valuta','text'],
          ]} onSave={addSupplier} onCancel={() => setShowForm(null)} I={I} L={L}/>}
          <div style={{ overflowX:'auto' }}>
            <table className="finex-table">
              <thead><tr><th>Emri</th><th>Shteti</th><th>Kontakti</th><th>Kategoria</th><th>Kushtet</th><th>Porositë</th></tr></thead>
              <tbody>
                {suppliers.filter(s => !search || s.name?.toLowerCase().includes(search.toLowerCase())).map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight:700 }}>{s.name}</td>
                    <td style={{ fontSize:12 }}>{s.country || '—'} {s.city ? `· ${s.city}` : ''}</td>
                    <td style={{ fontSize:11 }}>{s.contact_person || s.email || '—'}</td>
                    <td style={{ fontSize:11, color:'var(--text-3)' }}>{s.category || '—'}</td>
                    <td style={{ fontSize:11, color:'var(--text-3)' }}>{s.payment_terms || '—'}</td>
                    <td style={{ textAlign:'center', fontWeight:700, color:'#9B5CF8' }}>{orders.filter(o => o.supplier_id === s.id).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14, gap:8 }}>
            <button onClick={() => setShowForm('import')} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, background:'rgba(59,130,246,0.12)', border:'1px solid rgba(59,130,246,0.3)', color:'#60A5FA', fontWeight:700, fontSize:13, cursor:'pointer' }}>
              <Plus size={14}/> Import i Ri
            </button>
            <button onClick={() => setShowForm('export')} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.3)', color:'#34D399', fontWeight:700, fontSize:13, cursor:'pointer' }}>
              <Plus size={14}/> Export i Ri
            </button>
          </div>
          {(showForm === 'import' || showForm === 'export') && <SFOrder
            type={showForm}
            suppliers={suppliers}
            onSave={(f: any) => addOrder({ ...f, order_type: showForm })}
            onCancel={() => setShowForm(null)} I={I} L={L}/>}
          <div style={{ overflowX:'auto' }}>
            <table className="finex-table">
              <thead><tr><th>Lloji</th><th>Klienti/Furnitori</th><th>Shteti</th><th>Mallrat</th><th>HS Kodi</th><th style={{ textAlign:'right' }}>Vlera</th><th style={{ textAlign:'right' }}>Dogana</th><th>Statusi</th></tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td><span style={{ fontSize:11, padding:'2px 8px', borderRadius:6, background:o.order_type==='import'?'rgba(59,130,246,0.1)':'rgba(16,185,129,0.1)', color:o.order_type==='import'?'#60A5FA':'#34D399' }}>{o.order_type==='import'?'📥 Import':'📤 Export'}</span></td>
                    <td style={{ fontWeight:700, fontSize:12 }}>{o.client_or_supplier}</td>
                    <td style={{ fontSize:11, color:'var(--text-3)' }}>{o.country || '—'}</td>
                    <td style={{ fontSize:11, color:'var(--text-3)', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis' }}>{o.goods_description || '—'}</td>
                    <td style={{ fontSize:11 }}>{o.hs_code || '—'}</td>
                    <td style={{ textAlign:'right', fontWeight:700 }}>€{Number(o.total_value||0).toLocaleString()}</td>
                    <td style={{ textAlign:'right', fontSize:11, color:'var(--text-1)' }}>€{Number(o.customs_duty||0).toFixed(0)}</td>
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

      {tab === 'warehouse' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
            <button onClick={() => setShowForm('warehouse')} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>
              <Plus size={14}/> Produkt i Ri
            </button>
          </div>
          {showForm === 'warehouse' && <SF fields={[
            ['product_name','Produkti *','text'],['hs_code','HS Kodi','text'],['category','Kategoria','text'],
            ['quantity_in_stock','Stoku','number'],['unit','Njësia','text'],
            ['unit_cost','Kostoja/Njësi (€)','number'],['selling_price','Çmimi Shitjes (€)','number'],
            ['min_stock','Stoku Minimal','number'],['location','Lokacioni','text'],
          ]} onSave={addWarehouse} onCancel={() => setShowForm(null)} I={I} L={L}/>}
          <div style={{ overflowX:'auto' }}>
            <table className="finex-table">
              <thead><tr><th>Produkti</th><th>HS Kodi</th><th>Kategoria</th><th style={{ textAlign:'right' }}>Stoku</th><th>Njësia</th><th style={{ textAlign:'right' }}>Kosto/Njësi</th><th style={{ textAlign:'right' }}>Çmimi</th><th style={{ textAlign:'right' }}>Vlera Totale</th></tr></thead>
              <tbody>
                {warehouse.filter(w => !search || w.product_name?.toLowerCase().includes(search.toLowerCase())).map(w => (
                  <tr key={w.id} style={{ background: Number(w.quantity_in_stock) <= Number(w.min_stock) ? 'rgba(245,158,11,0.04)' : 'transparent' }}>
                    <td style={{ fontWeight:700 }}>
                      {Number(w.quantity_in_stock) <= Number(w.min_stock) && <span style={{ marginRight:4 }}>⚠️</span>}
                      {w.product_name}
                    </td>
                    <td style={{ fontSize:11, color:'var(--text-3)' }}>{w.hs_code || '—'}</td>
                    <td style={{ fontSize:11, color:'var(--text-3)' }}>{w.category || '—'}</td>
                    <td style={{ textAlign:'right', fontWeight:800, color:Number(w.quantity_in_stock)<=Number(w.min_stock)?'#EF4444':'#10B981' }}>{w.quantity_in_stock}</td>
                    <td style={{ fontSize:11 }}>{w.unit}</td>
                    <td style={{ textAlign:'right', fontSize:12 }}>€{Number(w.unit_cost||0).toFixed(2)}</td>
                    <td style={{ textAlign:'right', fontSize:12 }}>€{Number(w.selling_price||0).toFixed(2)}</td>
                    <td style={{ textAlign:'right', fontWeight:700 }}>€{(Number(w.quantity_in_stock||0)*Number(w.unit_cost||0)).toFixed(0)}</td>
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

function SF({ fields, onSave, onCancel, I, L }: any) {
  const [form, setForm] = useState<Record<string, string>>({})
  return (
    <div style={{ background:'rgba(124,58,237,0.06)', border:'1px solid rgba(124,58,237,0.2)', borderRadius:14, padding:16, marginBottom:14 }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12, marginBottom:12 }}>
        {fields.map(([key, label, type]: [string, string, string]) => (
          <div key={key}><label style={L}>{label}</label><input type={type} value={form[key]||''} onChange={e => setForm(p => ({...p,[key]:e.target.value}))} style={I}/></div>
        ))}
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={() => onSave(form)} style={{ padding:'8px 20px', borderRadius:10, background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>Shto</button>
        <button onClick={onCancel} style={{ padding:'8px 16px', borderRadius:10, background:'transparent', border:'1px solid var(--border)', color:'var(--text-1)', fontSize:13, cursor:'pointer' }}>Anulo</button>
      </div>
    </div>
  )
}

function SFOrder({ type, suppliers, onSave, onCancel, I, L }: any) {
  const [form, setForm] = useState<Record<string, string>>({})
  return (
    <div style={{ background:'rgba(124,58,237,0.06)', border:'1px solid rgba(124,58,237,0.2)', borderRadius:14, padding:16, marginBottom:14 }}>
      <p style={{ fontSize:12, fontWeight:700, color:type==='import'?'#60A5FA':'#34D399', marginBottom:12 }}>{type==='import'?'📥 Import i Ri':'📤 Export i Ri'}</p>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12, marginBottom:12 }}>
        <div><label style={L}>{type==='import'?'Furnitori':'Klienti'} *</label><input value={form.client_or_supplier||''} onChange={e => setForm(p=>({...p,client_or_supplier:e.target.value}))} style={I}/></div>
        <div><label style={L}>Shteti</label><input value={form.country||''} onChange={e => setForm(p=>({...p,country:e.target.value}))} style={I}/></div>
        <div><label style={L}>Përshkrimi Mallrave</label><input value={form.goods_description||''} onChange={e => setForm(p=>({...p,goods_description:e.target.value}))} style={I}/></div>
        <div><label style={L}>HS Kodi</label><input value={form.hs_code||''} onChange={e => setForm(p=>({...p,hs_code:e.target.value}))} style={I}/></div>
        <div><label style={L}>Sasia</label><input type="number" value={form.quantity||''} onChange={e => setForm(p=>({...p,quantity:e.target.value}))} style={I}/></div>
        <div><label style={L}>Vlera Totale (€)</label><input type="number" value={form.total_value||''} onChange={e => setForm(p=>({...p,total_value:e.target.value}))} style={I}/></div>
        {type==='import' && <>
          <div><label style={L}>Dogana (€)</label><input type="number" value={form.customs_duty||''} onChange={e => setForm(p=>({...p,customs_duty:e.target.value}))} style={I}/></div>
          <div><label style={L}>TVSH Import (€)</label><input type="number" value={form.vat_import||''} onChange={e => setForm(p=>({...p,vat_import:e.target.value}))} style={I}/></div>
        </>}
        <div><label style={L}>Transport (€)</label><input type="number" value={form.transport_cost||''} onChange={e => setForm(p=>({...p,transport_cost:e.target.value}))} style={I}/></div>
        <div><label style={L}>Incoterm</label>
          <select value={form.incoterm||'FOB'} onChange={e => setForm(p=>({...p,incoterm:e.target.value}))} style={I}>
            {['FOB','CIF','EXW','DDP','DAP','CFR'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div><label style={L}>Data Porosisë</label><input type="date" value={form.order_date||''} onChange={e => setForm(p=>({...p,order_date:e.target.value}))} style={I}/></div>
        <div><label style={L}>Data Pritshmërisë</label><input type="date" value={form.expected_date||''} onChange={e => setForm(p=>({...p,expected_date:e.target.value}))} style={I}/></div>
      </div>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={() => onSave(form)} style={{ padding:'8px 20px', borderRadius:10, background:'linear-gradient(135deg,#6D28D9,#8B5CF6)', color:'white', fontWeight:700, fontSize:13, border:'none', cursor:'pointer' }}>Shto</button>
        <button onClick={onCancel} style={{ padding:'8px 16px', borderRadius:10, background:'transparent', border:'1px solid var(--border)', color:'var(--text-1)', fontSize:13, cursor:'pointer' }}>Anulo</button>
      </div>
    </div>
  )
}
