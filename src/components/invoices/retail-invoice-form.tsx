'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, ArrowLeft, ShoppingBag } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import dynamic from 'next/dynamic'
const ServicePicker = dynamic(() => import('./service-picker'), { ssr: false })

interface Company { id: string; name: string; vat_number?: string; address?: string; phone?: string; email?: string; is_vat_registered?: boolean; business_type?: string | null; bank_account?: string; bank_name?: string }
interface LineItem { description: string; unit: string; quantity: number; unit_price: number; vat_rate: number; total: number }
const UNITS = ['copë', 'kg', 'litra', 'paketë', 'kuti', 'palet', 'metër', 'm²', 'ton']
const INVOICE_TYPES = ['Faturë Shitjeje', 'Faturë Shumice', 'Faturë Konsinjacioni', 'Faturë Kthimi']
interface Props { company: Company; userId: string; nextInvoiceNumber?: string }

export default function RetailInvoiceForm({ company, userId, nextInvoiceNumber }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    invoice_number: nextInvoiceNumber || '',
    invoice_type: 'Faturë Shitjeje',
    issue_date: today,
    due_date: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    client_name: '', client_address: '', client_vat: '',
    discount: '', notes: '',
    vat_rate: company.is_vat_registered ? 18 : 0,
  })

  const [items, setItems] = useState<LineItem[]>([
    { description: '', unit: 'copë', quantity: 1, unit_price: 0, vat_rate: company.is_vat_registered ? 18 : 0, total: 0 }
  ])
  const [saving, setSaving] = useState(false)

  function updateItem(i: number, field: keyof LineItem, value: string | number) {
    setItems(prev => prev.map((item, j) => {
      if (j !== i) return item
      const u = { ...item, [field]: value }
      if (field === 'quantity' || field === 'unit_price') {
        u.total = +(Number(u.quantity) * Number(u.unit_price)).toFixed(2)
      }
      return u
    }))
  }

  const subtotal = items.reduce((s, i) => s + Number(i.total), 0)
  const discount = Number(form.discount) || 0
  const afterDiscount = subtotal - discount
  const vatAmount = +(afterDiscount * form.vat_rate / 100).toFixed(2)
  const total = +(afterDiscount + vatAmount).toFixed(2)

  async function save() {
    if (!form.client_name.trim()) { toast.error('Shto emrin e blerësit'); return }
    if (items.every(i => !i.description.trim())) { toast.error('Shto të paktën një artikull'); return }
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Jo i autentikuar')
      const notesText = [
        discount > 0 ? `Skonto: -€${discount.toFixed(2)}` : '',
        form.notes || '',
      ].filter(Boolean).join('\n')

      const { data: invoice, error } = await supabase.from('invoices').insert({
        company_id: company.id, created_by: user.id,
        invoice_number: form.invoice_number,
        issue_date: form.issue_date, due_date: form.due_date,
        client_name: form.client_name, client_address: form.client_address || null,
        client_vat: form.client_vat || null,
        status: 'pending', subtotal, discount_amount: discount,
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
          description: `${item.description} (${item.unit})`,
          quantity: item.quantity, unit_price: item.unit_price,
          total: item.total, sort_order: i,
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
      <div style={{ display:'flex', gap:24, alignItems:'flex-start', flexWrap:'wrap' }}>
        <div style={{ flex:1, minWidth:300 }}>

          {/* Numri + Data */}
          <div style={S}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
              <div><label style={L}>Lloji</label>
                <select value={form.invoice_type} onChange={e=>setForm(p=>({...p,invoice_type:e.target.value}))} style={I}>
                  {INVOICE_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div><label style={L}>Nr. Faturës</label><input value={form.invoice_number} onChange={e=>setForm(p=>({...p,invoice_number:e.target.value}))} style={I}/></div>
              <div><label style={L}>Data</label><input type="date" value={form.issue_date} onChange={e=>setForm(p=>({...p,issue_date:e.target.value}))} style={I}/></div>
              <div><label style={L}>Afati Pagesës</label><input type="date" value={form.due_date} onChange={e=>setForm(p=>({...p,due_date:e.target.value}))} style={I}/></div>
            </div>
          </div>

          {/* Blerësi */}
          <div style={S}>
            <h3 style={{ fontFamily:'Poppins,sans-serif', fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:14 }}>Blerësi</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div style={{ gridColumn:'1/-1' }}><label style={L}>Emri / Kompania *</label><input value={form.client_name} onChange={e=>setForm(p=>({...p,client_name:e.target.value}))} placeholder="Kompania / Personi" style={I}/></div>
              <div><label style={L}>Adresa</label><input value={form.client_address} onChange={e=>setForm(p=>({...p,client_address:e.target.value}))} style={I}/></div>
              <div><label style={L}>NUI Fiskal</label><input value={form.client_vat} onChange={e=>setForm(p=>({...p,client_vat:e.target.value}))} style={I}/></div>
            </div>
          </div>

          {/* Artikujt */}
          <div style={S}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:8 }}>
              <h3 style={{ fontFamily:'Poppins,sans-serif', fontSize:14, fontWeight:700, color:'var(--text-1)' }}>Artikujt / Mallrat</h3>
              <ServicePicker companyId={company.id} onSelect={s=>setItems(prev=>[...prev,{description:s.name,unit:'copë',quantity:1,unit_price:s.price,vat_rate:form.vat_rate,total:s.price}])}/>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:520 }}>
                <thead><tr style={{ borderBottom:'1px solid var(--border)', background:'var(--bg-muted)' }}>
                  {['Artikulli / Malli','Njësia','Sasia','Çmimi/Njësi','Totali',''].map((h,i)=>(
                    <th key={i} style={{ padding:'8px 10px', textAlign:i>=2?'right':'left', fontSize:9, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>{items.map((item,i)=>(
                  <tr key={i} style={{ borderBottom:'1px solid var(--border)' }}>
                    <td style={{ padding:'6px 4px', minWidth:140 }}><input value={item.description} onChange={e=>updateItem(i,'description',e.target.value)} placeholder="Emri i mallit" style={{ ...I, fontSize:12 }}/></td>
                    <td style={{ padding:'6px 4px', width:90 }}><select value={item.unit} onChange={e=>updateItem(i,'unit',e.target.value)} style={{ ...I, fontSize:12, padding:'9px 6px' }}>{UNITS.map(u=><option key={u}>{u}</option>)}</select></td>
                    <td style={{ padding:'6px 4px', width:80 }}><input type="number" value={item.quantity||''} onChange={e=>updateItem(i,'quantity',parseFloat(e.target.value)||0)} style={{ ...I, fontSize:12, textAlign:'right' }}/></td>
                    <td style={{ padding:'6px 4px', width:110 }}><input type="number" value={item.unit_price||''} onChange={e=>updateItem(i,'unit_price',parseFloat(e.target.value)||0)} style={{ ...I, fontSize:12, textAlign:'right' }}/></td>
                    <td style={{ padding:'6px 10px', textAlign:'right', fontWeight:700, fontSize:13, whiteSpace:'nowrap', width:100, color:'var(--text-1)' }}>€{Number(item.total).toFixed(2)}</td>
                    <td style={{ padding:'6px 4px', width:36 }}>{items.length>1&&<button onClick={()=>setItems(prev=>prev.filter((_,j)=>j!==i))} style={{ padding:6, borderRadius:7, border:'1px solid rgba(239,68,68,0.2)', background:'rgba(239,68,68,0.07)', color:'var(--text-1)', cursor:'pointer', display:'flex' }}><Trash2 size={12}/></button>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <button onClick={()=>setItems(prev=>[...prev,{description:'',unit:'copë',quantity:1,unit_price:0,vat_rate:form.vat_rate,total:0}])}
              style={{ display:'flex', alignItems:'center', gap:6, marginTop:10, padding:'7px 14px', borderRadius:9, border:'1px dashed rgba(5,150,105,0.35)', background:'transparent', color:'var(--text-1)', fontSize:12, fontWeight:600, cursor:'pointer' }}>
              <Plus size={13}/> Shto Artikull
            </button>
          </div>

          <div style={S}><label style={L}>Shënime</label><textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2} placeholder="Kushte pagese, vërejtje..." style={{ ...I, resize:'none' }}/></div>
        </div>

        {/* Sidebar */}
        <div style={{ width:'100%', maxWidth:290, flexShrink:0, position:'sticky', top:20 }}>
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:18, marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
              <ShoppingBag size={15} style={{ color:'var(--text-1)' }}/>
              <h3 style={{ fontFamily:'Poppins,sans-serif', fontSize:14, fontWeight:700, color:'var(--text-1)' }}>Totali</h3>
            </div>
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
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:12 }}>
                <label style={{ color:'var(--text-3)' }}>(-) Skonto</label>
                <div style={{ position:'relative', width:100 }}>
                  <span style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)', fontSize:11 }}>€</span>
                  <input type="number" value={form.discount} onChange={e=>setForm(p=>({...p,discount:e.target.value}))} placeholder="0" style={{ ...I, paddingLeft:20, fontSize:12, padding:'5px 8px 5px 20px', width:'100%' }}/>
                </div>
              </div>
              {company.is_vat_registered && (<>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:12 }}>
                  <span style={{ color:'var(--text-3)' }}>TVSH</span>
                  <select value={form.vat_rate} onChange={e=>setForm(p=>({...p,vat_rate:parseInt(e.target.value)}))} style={{ ...I, width:'auto', padding:'4px 8px', fontSize:11 }}>
                    <option value={0}>0%</option><option value={8}>8%</option><option value={18}>18%</option>
                  </select>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}><span style={{ color:'var(--text-3)' }}>TVSH {form.vat_rate}%</span><span style={{ color:'var(--text-1)', fontWeight:600 }}>€{vatAmount.toFixed(2)}</span></div>
              </>)}
              <div style={{ borderTop:'2px solid #059669', paddingTop:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:14, fontWeight:800, color:'var(--text-1)' }}>TOTALI</span>
                <span style={{ fontFamily:'Poppins,sans-serif', fontSize:22, fontWeight:900, color:'var(--text-1)' }}>€{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(5,150,105,0.06)', border:'1px solid rgba(5,150,105,0.2)', marginBottom:14, fontSize:11, color:'var(--text-3)', lineHeight:1.6 }}>
            TVSH 18% për mallra të përgjithshme · 8% për ushqim
          </div>

          <button onClick={save} disabled={saving} style={{ width:'100%', padding:13, borderRadius:12, background:'linear-gradient(135deg,#064E3B,#059669)', color:'white', fontSize:14, fontWeight:700, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, marginBottom:8 }}>
            {saving?<Loader2 size={15} className="animate-spin"/>:null}
            {saving?'Duke ruajtur...':`Lësho ${form.invoice_type}`}
          </button>
          <p style={{ fontSize:11, color:'var(--text-1)', textAlign:'center' }}>Fatura regjistrohet te Libri i Shitjeve</p>
        </div>
      </div>
    </div>
  )
}
