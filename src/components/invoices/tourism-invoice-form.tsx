'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, ArrowLeft, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'
const ServicePicker = dynamic(() => import('./service-picker'), { ssr: false })

interface Company { id: string; name: string; vat_number?: string; address?: string; phone?: string; email?: string; is_vat_registered?: boolean; business_type?: string | null; bank_account?: string; bank_name?: string }
interface LineItem { description: string; unit: string; quantity: number; unit_price: number; total: number }
const UNITS = ['natë', 'person', 'paketë', 'ditë', 'tur', 'dhomë', 'transfer']
const INVOICE_TYPES = ['Faturë Rezervimi', 'Faturë Akomodimi', 'Faturë Paketë Turistike', 'Faturë Ture', 'Faturë Transferi', 'Faturë Eventi']
interface Props { company: Company; userId: string; nextInvoiceNumber?: string }

export default function TourismInvoiceForm({ company, userId, nextInvoiceNumber }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    invoice_number: nextInvoiceNumber || '',
    invoice_type: 'Faturë Rezervimi',
    issue_date: today,
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    client_name: '', client_address: '', client_vat: '', client_email: '',
    checkin_date: '', checkout_date: '',
    room_type: '', num_guests: '', destination: '',
    notes: '',
    vat_rate: company.is_vat_registered ? 8 : 0, // 8% TVSH për akomodim
  })

  const [items, setItems] = useState<LineItem[]>([
    { description: '', unit: 'natë', quantity: 1, unit_price: 0, total: 0 }
  ])
  const [saving, setSaving] = useState(false)

  function updateItem(i: number, field: keyof LineItem, value: string | number) {
    setItems(prev => prev.map((item, j) => {
      if (j !== i) return item
      const u = { ...item, [field]: value }
      if (field === 'quantity' || field === 'unit_price') u.total = +(Number(u.quantity) * Number(u.unit_price)).toFixed(2)
      return u
    }))
  }

  const subtotal = items.reduce((s, i) => s + Number(i.total), 0)
  const vatAmount = +(subtotal * form.vat_rate / 100).toFixed(2)
  const total = +(subtotal + vatAmount).toFixed(2)

  // Llogarit netët automatikisht
  const nights = form.checkin_date && form.checkout_date
    ? Math.max(0, Math.ceil((new Date(form.checkout_date).getTime() - new Date(form.checkin_date).getTime()) / 86400000))
    : 0

  async function save() {
    if (!form.client_name.trim()) { toast.error('Shto emrin e mysafirit'); return }
    if (items.every(i => !i.description.trim())) { toast.error('Shto të paktën një shërbim'); return }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Jo i autentikuar')
      const notesText = [
        (form.checkin_date && form.checkout_date) ? `Check-in: ${form.checkin_date} · Check-out: ${form.checkout_date}` : '',
        form.room_type ? `Dhoma: ${form.room_type}` : '',
        form.num_guests ? `Mysafirë: ${form.num_guests}` : '',
        form.destination ? `Destinacioni: ${form.destination}` : '',
        nights > 0 ? `Netë: ${nights}` : '',
        form.client_email ? `Email: ${form.client_email}` : '',
        form.notes || '',
      ].filter(Boolean).join('\n')

      const { data: invoice, error } = await supabase.from('invoices').insert({
        company_id: company.id, created_by: user.id,
        invoice_number: form.invoice_number,
        issue_date: form.issue_date, due_date: form.due_date,
        client_name: form.client_name, client_address: form.client_address || null,
        client_vat: form.client_vat || null, client_email: form.client_email || null,
        status: 'pending', subtotal,
        tax_rate: form.vat_rate, tax_amount: vatAmount,
        total_amount: total, total,
        payment_method: 'Bank Transfer', currency: 'EUR',
        notes: notesText || null,
      }).select().single()

      if (error) throw new Error(error.message)
      const validItems = items.filter(i => i.description.trim())
      if (validItems.length > 0) {
        await supabase.from('invoice_items').insert(validItems.map((item, i) => ({
          invoice_id: invoice.id,
          description: `${item.description} (${item.quantity} ${item.unit})`,
          quantity: item.quantity, unit_price: item.unit_price, total: item.total, sort_order: i,
        })))
      }
      toast.success(`${form.invoice_type} u krijua: ${invoice.invoice_number}`)
      router.push('/invoices'); router.refresh()
    } catch (err: unknown) { toast.error((err as Error).message) }
    finally { setSaving(false) }
  }

  const I = { background: 'var(--bg-input,var(--bg-muted))', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px', color: 'var(--text-1)', fontSize: 13, width: '100%', outline: 'none' }
  const L = { fontSize: 10, fontWeight: 700, color: 'var(--text-3)', display: 'block', marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }
  const S = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', marginBottom: 14 }

  return (
    <div className="page-enter">
      <button onClick={() => router.back()} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:18, background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', fontSize:13 }}>
        <ArrowLeft size={15}/> Kthehu
      </button>
      <div className="form-row">
        <div className="form-main">

          {/* Meta */}
          <div style={S}>
            <div className="form-grid-3">
              <div><label style={L}>Lloji</label>
                <select value={form.invoice_type} onChange={e=>setForm(p=>({...p,invoice_type:e.target.value}))} style={I}>
                  {INVOICE_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div><label style={L}>Nr. Faturës</label><input value={form.invoice_number} onChange={e=>setForm(p=>({...p,invoice_number:e.target.value}))} style={I}/></div>
              <div><label style={L}>Data Lëshimit</label><input type="date" value={form.issue_date} onChange={e=>setForm(p=>({...p,issue_date:e.target.value}))} style={I}/></div>
              <div><label style={L}>Afati Pagesës</label><input type="date" value={form.due_date} onChange={e=>setForm(p=>({...p,due_date:e.target.value}))} style={I}/></div>
            </div>
          </div>

          {/* Mysafiri */}
          <div style={S}>
            <h3 style={{ fontFamily:'Poppins,sans-serif', fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:14 }}>Mysafiri / Grupi</h3>
            <div className="form-grid-2">
              <div className="form-span-2"><label style={L}>Emri i Plotë / Grupi *</label><input value={form.client_name} onChange={e=>setForm(p=>({...p,client_name:e.target.value}))} placeholder="Agim Berisha / Grupi ABC" style={I}/></div>
              <div><label style={L}>Email</label><input type="email" value={form.client_email} onChange={e=>setForm(p=>({...p,client_email:e.target.value}))} placeholder="mysafiri@email.com" style={I}/></div>
              <div><label style={L}>Adresa / Shteti</label><input value={form.client_address} onChange={e=>setForm(p=>({...p,client_address:e.target.value}))} placeholder="Prishtinë, Kosovë" style={I}/></div>
              <div><label style={L}>NUI (kompani)</label><input value={form.client_vat} onChange={e=>setForm(p=>({...p,client_vat:e.target.value}))} style={I}/></div>
            </div>
          </div>

          {/* Rezervimi */}
          <div style={S}>
            <h3 style={{ fontFamily:'Poppins,sans-serif', fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:14 }}>Detajet e Rezervimit</h3>
            <div className="form-grid-2">
              <div>
                <label style={L}>Check-in</label>
                <input type="date" value={form.checkin_date} onChange={e=>setForm(p=>({...p,checkin_date:e.target.value}))} style={I}/>
              </div>
              <div>
                <label style={L}>Check-out {nights > 0 && <span style={{ color:'var(--text-1)' }}>· {nights} netë</span>}</label>
                <input type="date" value={form.checkout_date} onChange={e=>setForm(p=>({...p,checkout_date:e.target.value}))} style={I}/>
              </div>
              <div>
                <label style={L}>Lloji i Dhomës / Paketa</label>
                <input value={form.room_type} onChange={e=>setForm(p=>({...p,room_type:e.target.value}))} placeholder="Dhomë Standarde, Suite, Vila..." style={I}/>
              </div>
              <div>
                <label style={L}>Nr. Mysafirësh</label>
                <input type="number" value={form.num_guests} onChange={e=>setForm(p=>({...p,num_guests:e.target.value}))} placeholder="2" style={I}/>
              </div>
              <div className="form-span-2">
                <label style={L}>Destinacioni / Lokacioni</label>
                <input value={form.destination} onChange={e=>setForm(p=>({...p,destination:e.target.value}))} placeholder="Brezovica, Sharr, Prizren, Pejë..." style={I}/>
              </div>
            </div>
          </div>

          {/* Shërbimet */}
          <div style={S}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:8 }}>
              <h3 style={{ fontFamily:'Poppins,sans-serif', fontSize:14, fontWeight:700, color:'var(--text-1)' }}>Shërbimet Turistike</h3>
              <ServicePicker companyId={company.id} onSelect={s=>setItems(prev=>[...prev,{description:s.name,unit:'natë',quantity:1,unit_price:s.price,total:s.price}])}/>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:480 }}>
                <thead><tr style={{ borderBottom:'1px solid var(--border)', background:'var(--bg-muted)' }}>
                  {['Shërbimi / Paketa','Njësia','Sasia','Çmimi/Njësi','Totali',''].map((h,i)=>(
                    <th key={i} style={{ padding:'8px 10px', textAlign:i>=2?'right':'left', fontSize:9, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>{items.map((item,i)=>(
                  <tr key={i} style={{ borderBottom:'1px solid var(--border)' }}>
                    <td style={{ padding:'6px 4px', minWidth:150 }}><input value={item.description} onChange={e=>updateItem(i,'description',e.target.value)} placeholder="Akomodim, Tur, Transfer..." style={{ ...I, fontSize:12 }}/></td>
                    <td style={{ padding:'6px 4px', width:100 }}><select value={item.unit} onChange={e=>updateItem(i,'unit',e.target.value)} style={{ ...I, fontSize:12, padding:'9px 6px' }}>{UNITS.map(u=><option key={u}>{u}</option>)}</select></td>
                    <td style={{ padding:'6px 4px', width:80 }}><input type="number" value={item.quantity||''} onChange={e=>updateItem(i,'quantity',parseFloat(e.target.value)||0)} style={{ ...I, fontSize:12, textAlign:'right' }}/></td>
                    <td style={{ padding:'6px 4px', width:110 }}><input type="number" value={item.unit_price||''} onChange={e=>updateItem(i,'unit_price',parseFloat(e.target.value)||0)} placeholder="€/natë" style={{ ...I, fontSize:12, textAlign:'right' }}/></td>
                    <td style={{ padding:'6px 10px', textAlign:'right', fontWeight:700, fontSize:13, whiteSpace:'nowrap', width:100 }}>€{Number(item.total).toFixed(2)}</td>
                    <td style={{ padding:'6px 4px', width:36 }}>{items.length>1&&<button onClick={()=>setItems(prev=>prev.filter((_,j)=>j!==i))} style={{ padding:6, borderRadius:7, border:'1px solid rgba(239,68,68,0.2)', background:'rgba(239,68,68,0.07)', color:'var(--text-1)', cursor:'pointer', display:'flex' }}><Trash2 size={12}/></button>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <button onClick={()=>setItems(prev=>[...prev,{description:'',unit:'natë',quantity:1,unit_price:0,total:0}])}
              style={{ display:'flex', alignItems:'center', gap:6, marginTop:10, padding:'7px 14px', borderRadius:9, border:'1px dashed rgba(16,185,129,0.35)', background:'transparent', color:'var(--text-1)', fontSize:12, fontWeight:600, cursor:'pointer' }}>
              <Plus size={13}/> Shto Shërbim
            </button>
          </div>

          <div style={S}><label style={L}>Shënime / Kushte Rezervimit</label><textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2} placeholder="Politika anulimit, kushte shtesë..." style={{ ...I, resize:'none' }}/></div>
        </div>

        {/* Sidebar */}
        <div className="form-sidebar">
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:18, marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
              <MapPin size={15} style={{ color:'var(--text-1)' }}/>
              <h3 style={{ fontFamily:'Poppins,sans-serif', fontSize:14, fontWeight:700, color:'var(--text-1)' }}>Totali</h3>
            </div>

            {/* Booking summary */}
            {(form.checkin_date || form.destination) && (
              <div style={{ padding:'10px 12px', borderRadius:10, background:'rgba(16,185,129,0.07)', border:'1px solid rgba(16,185,129,0.2)', marginBottom:14 }}>
                {form.destination && <p style={{ fontSize:12, fontWeight:700, color:'var(--text-1)', marginBottom:3 }}>📍 {form.destination}</p>}
                {form.checkin_date && <p style={{ fontSize:11, color:'var(--text-3)' }}>{form.checkin_date} → {form.checkout_date || '...'}</p>}
                {nights > 0 && <p style={{ fontSize:11, color:'var(--text-1)', fontWeight:700, marginTop:3 }}>{nights} netë · {form.num_guests ? form.num_guests + ' mysafirë' : ''}</p>}
              </div>
            )}

            <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:14 }}>
              {items.filter(i=>i.description&&i.total>0).map((item,i)=>(
                <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:11, gap:8 }}>
                  <span style={{ color:'var(--text-3)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.description} ×{item.quantity}</span>
                  <span style={{ color:'var(--text-1)', fontWeight:600, flexShrink:0 }}>€{item.total.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div style={{ borderTop:'1px solid var(--border)', paddingTop:12, display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}><span style={{ color:'var(--text-3)' }}>Nëntotali</span><span style={{ fontWeight:600 }}>€{subtotal.toFixed(2)}</span></div>
              {company.is_vat_registered && (<>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:12 }}>
                  <span style={{ color:'var(--text-3)' }}>TVSH</span>
                  <select value={form.vat_rate} onChange={e=>setForm(p=>({...p,vat_rate:parseInt(e.target.value)}))} style={{ ...I, width:'auto', padding:'4px 8px', fontSize:11 }}>
                    <option value={0}>0%</option><option value={8}>8%</option><option value={18}>18%</option>
                  </select>
                </div>
                {form.vat_rate > 0 && <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}><span style={{ color:'var(--text-3)' }}>TVSH {form.vat_rate}%</span><span style={{ color:'var(--text-1)', fontWeight:600 }}>€{vatAmount.toFixed(2)}</span></div>}
              </>)}
              <div style={{ borderTop:'2px solid #10B981', paddingTop:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:14, fontWeight:800, color:'var(--text-1)' }}>TOTALI</span>
                <span style={{ fontFamily:'Poppins,sans-serif', fontSize:22, fontWeight:900, color:'var(--text-1)' }}>€{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.2)', marginBottom:14, fontSize:11, color:'var(--text-3)', lineHeight:1.6 }}>
            TVSH 8% aplikohet për akomodim · 18% për shërbime shtesë
          </div>

          <button onClick={save} disabled={saving} style={{ width:'100%', padding:13, borderRadius:12, background:'linear-gradient(135deg,#065F46,#10B981)', color:'white', fontSize:14, fontWeight:700, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:8 }}>
            {saving?<Loader2 size={15} className="animate-spin"/>:null}
            {saving?'Duke ruajtur...':`Lësho ${form.invoice_type}`}
          </button>
          <p style={{ fontSize:11, color:'var(--text-1)', textAlign:'center' }}>Do të shfaqet si "Në Pritje" deri në pagesë</p>
        </div>
      </div>
    </div>
  )
}
