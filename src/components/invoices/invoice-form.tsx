'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import type { Company } from '@/types'
import { getCategoryConfig } from '@/lib/category-config'
import { hasQuantity, hasDiscount } from '@/lib/business-categories'
import dynamic from 'next/dynamic'
const InvoiceTemplates = dynamic(() => import('./invoice-templates'), { ssr: false })
const ServicePicker = dynamic(() => import('./service-picker'), { ssr: false })
const PatientAutocomplete = dynamic(() => import('./patient-autocomplete'), { ssr: false })

interface LineItem {
  description: string
  quantity: number
  unit_price: number
}

interface Props {
  company: Company
  userId: string
  nextInvoiceNumber?: string
  subscription?: { plan: string; status: string } | null
  editInvoice?: {
    id: string
    invoice_number: string
    client_name: string
    client_email?: string
    supplier_name?: string
    supplier_address?: string
    supplier_vat?: string
    recipient_name?: string
    recipient_address?: string
    client_address?: string
    client_vat?: string
    issue_date: string
    due_date?: string
    tax_rate: number
    discount_amount?: number
    currency?: string
    notes?: string
    payment_method?: string
    payment_split?: string
    status: string
    invoice_items?: { description: string; quantity: number; unit?: string; unit_price: number; discount_percent?: number }[]
  } | null
}

export default function InvoiceForm({ company, userId, nextInvoiceNumber, subscription, editInvoice }: Props) {
  const isEdit = !!editInvoice
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    invoice_number: editInvoice?.invoice_number || nextInvoiceNumber || '',
    client_name:    editInvoice?.client_name    || '',
    client_email:   editInvoice?.client_email   || '',
    patient_id:     '',
    patient_gender: '',
    patient_birth_year: '',
    diagnosis:      '',
    client_address: editInvoice?.client_address || '',
    client_vat:     editInvoice?.client_vat     || '',
    issue_date:     editInvoice?.issue_date     || new Date().toISOString().split('T')[0],
    due_date:       editInvoice?.due_date       || new Date(Date.now()+30*86400000).toISOString().split('T')[0],
    tax_rate:       editInvoice?.tax_rate       ?? (company.is_vat_registered === false ? 0 : 18),
    discount_amount: editInvoice?.discount_amount ?? 0,
    currency:       editInvoice?.currency       || 'EUR',
    notes:          editInvoice?.notes          || '',
    supplier_name:    editInvoice?.supplier_name    || '',
    supplier_address: editInvoice?.supplier_address || '',
    supplier_vat:     editInvoice?.supplier_vat     || '',
    recipient_name:   editInvoice?.recipient_name   || '',
    recipient_address:editInvoice?.recipient_address|| '',
    payment_method: editInvoice?.payment_method || 'Bank Transfer',
    client_phone:   (editInvoice as {client_phone?: string})?.client_phone || '',
  })

  const [items, setItems] = useState<LineItem[]>(() => {
    if (editInvoice?.invoice_items && editInvoice.invoice_items.length > 0) {
      return editInvoice.invoice_items.map(i => ({
        description: i.description || '',
        quantity:    Number(i.quantity) || 1,
        unit_price:  Number(i.unit_price) || 0,
      }))
    }
    return [{ description: '', quantity: 1, unit_price: 0 }]
  })

  // Auto payment split based on method
  const getPaymentSplit = (method: string) => {
    if (method === 'Cash') return '100% Kesh'
    if (method === 'Bank Transfer') return '100% Transfer Bankar'
    if (method === '50/50') return '50% Kesh · 50% Transfer Bankar'
    return method
  }

  const subtotal = items.reduce((sum, i) => sum + (Number(i.quantity)||0) * (Number(i.unit_price)||0), 0)
  const discountedSubtotal = subtotal - Number(form.discount_amount||0)
  const taxAmount = discountedSubtotal * (Number(form.tax_rate)/100)
  const total = discountedSubtotal + taxAmount

  function updateItem(index: number, field: keyof LineItem, value: string | number) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  async function handleSubmit(statusArg: 'pending' | 'draft') {
    if (!form.client_name.trim()) { toast.error('Shto emrin e klientit'); return }
    if (items.some(i => !i.description.trim())) { toast.error('Shto përshkrimin për të gjithë artikujt'); return }

    // If cash payment, auto mark as paid
    const status = (!isEdit && statusArg === 'pending' && form.payment_method === 'Cash') ? 'paid' : statusArg

    setLoading(true)
    try {
      const invoiceData = {
        client_name:     form.client_name,
        client_email:    form.client_email  || null,
        client_phone:    form.client_phone  || null,
        client_address:  form.client_address|| null,
        client_vat:      form.client_vat    || null,
        issue_date:      form.issue_date,
        due_date:        form.due_date      || null,
        subtotal:        Number(subtotal),
        tax_rate:        Number(form.tax_rate),
        tax_amount:      Number(taxAmount),
        discount_amount: Number(form.discount_amount)||0,
        total:           Number(total),
        total_amount:    Number(total),
        currency:        form.currency,
        notes:           form.notes || null,
        supplier_name:    form.supplier_name    || null,
        supplier_address: form.supplier_address || null,
        supplier_vat:     form.supplier_vat     || null,
        recipient_name:   form.recipient_name   || null,
        recipient_address:form.recipient_address|| null,
        invoice_footer:   (form as any).invoice_footer || null,
        payment_method:  form.payment_method || null,
        payment_split:   getPaymentSplit(form.payment_method),
        ...(status === 'paid' ? { paid_date: new Date().toISOString().split('T')[0] } : {}),
      }

      let invoiceId: string

      if (isEdit) {
        const { error } = await supabase.from('invoices').update(invoiceData).eq('id', editInvoice!.id)
        if (error) throw error
        invoiceId = editInvoice!.id
        await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId)
      } else {
        const { data: inv, error } = await supabase.from('invoices').insert({
          ...invoiceData,
          company_id:     company.id,
          created_by:     userId,
          invoice_number: form.invoice_number,
          status,
        }).select().single()
        if (error) throw error
        invoiceId = inv.id
        await supabase.from('companies').update({ invoice_counter: (company.invoice_counter||0)+1 }).eq('id', company.id)
      }

      const itemsData = items.map((item, i) => ({
        invoice_id:  invoiceId,
        description: item.description,
        quantity:    Number(item.quantity),
        unit:        'copë',
        unit_price:  Number(item.unit_price),
        discount_percent: 0,
        total:       Number(item.quantity)*Number(item.unit_price),
        sort_order:  i,
      }))
      await supabase.from('invoice_items').insert(itemsData)

      try {
        await supabase.from('activity_logs').insert({
          user_id: userId, company_id: company.id,
          action: isEdit ? 'update_invoice' : 'create_invoice',
          entity_type: 'invoice', entity_id: invoiceId,
        })
      } catch {}

      toast.success(isEdit ? 'Fatura u përditësua!' : status==='draft' ? 'Draft u ruajt!' : 'Fatura u krijua!')
      router.push(`/invoices/${invoiceId}`)
    } catch (err: unknown) {
      const msg = (err as {message?: string})?.message || 'Gabim gjatë ruajtjes'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const L = { fontSize: 11, fontWeight: 700 as const, color: 'var(--text-3)', display: 'block' as const, marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }
  const S = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 16 }

  return (
    <div className="page-enter">
      <button onClick={() => router.back()}
        style={{ display:'flex', alignItems:'center', gap:6, marginBottom:20, background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', fontSize:13 }}>
        <ArrowLeft size={15}/> Kthehu
      </button>

      <div className="form-layout" style={{ display:'flex', gap:20, alignItems:'flex-start', flexWrap:'wrap' }}>
        {/* Left */}
        <div style={{ flex:1, minWidth: 'min(100%, 320px)' }}>

          {/* Header info */}
          <div style={S}>
            <h2 style={{ fontFamily:'Poppins,sans-serif', fontSize:18, fontWeight:700, color:'var(--text-1)', marginBottom:16 }}>
              {isEdit ? `Edito · ${editInvoice?.invoice_number}` : 'Faturë e Re'}
            </h2>
            <div className="invoice-grid" style={{ display:'grid', gap:14 }}>
              <div>
                <label style={L}>Nr. Faturës</label>
                <input value={form.invoice_number} onChange={e=>setForm(p=>({...p,invoice_number:e.target.value}))}
                  className="finex-input" disabled={isEdit}/>
              </div>
              <div>
                <label style={L}>Monedha</label>
                <select value={form.currency} onChange={e=>setForm(p=>({...p,currency:e.target.value}))} className="finex-input">
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="CHF">CHF</option>
                </select>
              </div>
              <div>
                <label style={L}>{company.business_type === 'health' ? 'Data e Vizitës' : 'Data e Lëshimit'}</label>
                <input type="date" value={form.issue_date} onChange={e=>setForm(p=>({...p,issue_date:e.target.value}))} className="finex-input"/>
              </div>
              {company.business_type !== 'health' && (
              <div>
                <label style={L}>Data e Skadimit</label>
                <input type="date" value={form.due_date} onChange={e=>setForm(p=>({...p,due_date:e.target.value}))} className="finex-input"/>
              </div>
              )}
            </div>
          </div>

          {/* Client / Patient */}
          <div style={S}>
            <h3 style={{ fontFamily:'Poppins,sans-serif', fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:14 }}>
              {company.business_type === 'health' ? 'Pacienti' : 'Klienti'}
            </h3>
            <div className="invoice-grid" style={{ display:'grid', gap:14 }}>
              <div style={{ gridColumn:'span 2' }}>
                <label style={L}>{company.business_type === 'health' ? 'Emri i pacientit *' : 'Emri i klientit *'}</label>
                {company.business_type === 'health' ? (
                  <PatientAutocomplete
                    companyId={company.id}
                    value={form.client_name}
                    onChange={name => setForm(p => ({ ...p, client_name: name }))}
                    onSelect={(patient) => setForm(p => ({
                      ...p,
                      client_name: patient.full_name,
                      patient_id: patient.id,
                      patient_gender: patient.gender || '',
                      patient_birth_year: patient.birth_year ? String(patient.birth_year) : '',
                    }))}
                  />
                ) : (
                  <input value={form.client_name} onChange={e=>setForm(p=>({...p,client_name:e.target.value}))}
                    placeholder="Emri / Kompania" className="finex-input"/>
                )}
              </div>

              {company.business_type === 'health' ? (
                <>
                  <div>
                    <label style={L}>Gjinia</label>
                    <select value={form.patient_gender || ''} onChange={e=>setForm(p=>({...p,patient_gender:e.target.value}))} className="finex-input">
                      <option value="">Zgjidh...</option>
                      <option value="M">Mashkull</option>
                      <option value="F">Femër</option>
                      <option value="other">Tjetër</option>
                    </select>
                  </div>
                  <div>
                    <label style={L}>Viti i Lindjes</label>
                    <input type="number" value={form.patient_birth_year || ''} onChange={e=>setForm(p=>({...p,patient_birth_year:e.target.value}))}
                      placeholder="1985" className="finex-input"/>
                  </div>
                  <div style={{ gridColumn:'span 2' }}>
                    <label style={L}>Diagnoza</label>
                    <input value={form.diagnosis || ''} onChange={e=>setForm(p=>({...p,diagnosis:e.target.value}))}
                      placeholder="p.sh. Kontroll i rregullt, Ekografi obstetrike..." className="finex-input"/>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label style={L}>Email</label>
                    <input type="email" value={form.client_email} onChange={e=>setForm(p=>({...p,client_email:e.target.value}))}
                      placeholder="email@example.com" className="finex-input"/>
                  </div>
                  <div>
                    <label style={L}>Telefon</label>
                    <input value={form.client_phone} onChange={e=>setForm(p=>({...p,client_phone:e.target.value}))}
                      placeholder="+383..." className="finex-input"/>
                  </div>
                  <div style={{ gridColumn:'span 2' }}>
                    <label style={L}>Adresa</label>
                    <input value={form.client_address} onChange={e=>setForm(p=>({...p,client_address:e.target.value}))}
                      placeholder="Qyteti, Shteti" className="finex-input"/>
                  </div>
                  <div>
                    <label style={L}>NUI/NF (opsionale)</label>
                    <input value={form.client_vat} onChange={e=>setForm(p=>({...p,client_vat:e.target.value}))}
                      placeholder="Numri fiskal" className="finex-input"/>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Templates */}
          {(() => {
            const config = getCategoryConfig(company.business_type || null)
            if (!config || !config.invoiceTemplates?.length) return null
            return (
              <InvoiceTemplates config={config} onApply={newItems => setItems(newItems.map(i => ({
                description: i.description,
                quantity: i.quantity,
                unit_price: i.unit_price,
              })))} />
            )
          })()}

          {/* Items */}
          <div style={S}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:8 }}>
              <h3 style={{ fontFamily:'Poppins,sans-serif', fontSize:14, fontWeight:700, color:'var(--text-1)' }}>
                {company.business_type === 'health' ? 'Shërbimet Mjekësore' : 'Artikujt'}
              </h3>
              <ServicePicker companyId={company.id} onSelect={service => {
                setItems(prev => [...prev, { description: service.name, quantity: 1, unit_price: service.price }])
              }}/>
            </div>
            <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch' as 'touch' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:360 }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid var(--border)' }}>
                    {[
                      'Përshkrimi',
                      ...(hasQuantity(company.business_type||null) ? ['Sasia'] : []),
                      company.business_type === 'health' ? 'Çmimi' : 'Çmimi/Njësi',
                      'Totali',
                      ''
                    ].map((h,i) => (
                      <th key={i} style={{ padding:'6px 8px', fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.05em', textAlign:i>=1?'right':'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => {
                    const qty = hasQuantity(company.business_type||null) ? (Number(item.quantity)||0) : 1
                    const lineTotal = qty*(Number(item.unit_price)||0)
                    return (
                      <tr key={i} style={{ borderBottom:'1px solid var(--border)' }}>
                        <td style={{ padding:'6px 4px' }}>
                          <input value={item.description} onChange={e=>updateItem(i,'description',e.target.value)}
                            placeholder="Shërbim / Produkt" className="finex-input" style={{ fontSize:13 }}/>
                        </td>
                        {hasQuantity(company.business_type||null) && (
                          <td style={{ padding:'6px 4px', width:80 }}>
                            <input type="number" value={item.quantity} min="0.01" step="0.01"
                              onChange={e=>updateItem(i,'quantity',parseFloat(e.target.value)||1)}
                              onFocus={e=>e.target.select()}
                              className="finex-input" style={{ fontSize:13, textAlign:'right' }}/>
                          </td>
                        )}
                        <td style={{ padding:'6px 4px', width:100 }}>
                          <input type="number" value={item.unit_price} min="0" step="0.01"
                            onChange={e=>updateItem(i,'unit_price',parseFloat(e.target.value)||0)}
                            onFocus={e=>e.target.select()}
                            className="finex-input" style={{ fontSize:13, textAlign:'right' }}/>
                        </td>
                        <td style={{ padding:'6px 8px', textAlign:'right', fontWeight:700, fontSize:13, color:'var(--text-1)', whiteSpace:'nowrap' }}>
                          {formatCurrency(lineTotal)}
                        </td>
                        <td style={{ padding:'6px 4px', width:32 }}>
                          <button onClick={()=>setItems(p=>p.filter((_,j)=>j!==i))} disabled={items.length===1}
                            style={{ padding:5, borderRadius:7, border:'none', background:'transparent', cursor:'pointer', color:'var(--text-3)', opacity:items.length===1?0.3:1 }}
                            onMouseEnter={e=>(e.currentTarget.style.color='#EF4444')}
                            onMouseLeave={e=>(e.currentTarget.style.color='var(--text-3)')}>
                            <Trash2 size={13}/>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <button onClick={()=>setItems(p=>[...p,{description:'',quantity:1,unit_price:0}])}
              style={{ marginTop:10, display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:10, border:'1.5px dashed var(--border-purple)', background:'var(--purple-bg)', color:'var(--purple-light)', fontSize:13, fontWeight:600, cursor:'pointer', width:'100%', justifyContent:'center' }}>
              <Plus size={14}/> Shto artikull
            </button>
          </div>

          {/* Payment method */}
          {company.business_type !== 'health' && (
          <div style={S}>
            <h3 style={{ fontFamily:'Poppins,sans-serif', fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:14 }}>Pagesa</h3>
            <div className="invoice-grid" style={{ display:'grid', gap:14 }}>
              <div>
                <label style={L}>Mënyra e Pagesës</label>
                <select value={form.payment_method} onChange={e=>setForm(p=>({...p,payment_method:e.target.value}))} className="finex-input">
                  <option value="Bank Transfer">100% Transfer Bankar</option>
                  <option value="Cash">100% Kesh</option>
                  <option value="50/50">50% Kesh · 50% Transfer Bankar</option>
                </select>
              </div>
              <div>
                <label style={L}>Statusi i Pagesës</label>
                <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', fontSize:13, fontWeight:600, color:'var(--text-1)' }}>
                  {getPaymentSplit(form.payment_method)}
                </div>
              </div>
              <div style={{ gridColumn:'span 2' }}>
                <label style={L}>Shënime</label>
                <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}
                  placeholder="Shënime shtesë..." className="finex-input" style={{ resize:'vertical', minHeight:60 }}/>
              </div>

              {/* B2B — Furnitori dhe Pranusi */}
              {company.business_type === 'b2b' && (
                <>
                  <div style={{ gridColumn:'span 2', borderTop:'1px solid var(--border)', paddingTop:16, marginTop:4 }}>
                    <h4 style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', margin:'0 0 12px', fontFamily:'Poppins,sans-serif' }}>
                      📦 Furnitori (Shitësi)
                    </h4>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                      <div>
                        <label style={L}>Emri i Furnitorit</label>
                        <input value={form.supplier_name || ''} onChange={e=>setForm(p=>({...p,supplier_name:e.target.value}))}
                          placeholder="Kompania furnituese..." className="finex-input"/>
                      </div>
                      <div>
                        <label style={L}>NUI / NIPT Furnitorit</label>
                        <input value={form.supplier_vat || ''} onChange={e=>setForm(p=>({...p,supplier_vat:e.target.value}))}
                          placeholder="NUI ose NIPT..." className="finex-input"/>
                      </div>
                      <div style={{ gridColumn:'span 2' }}>
                        <label style={L}>Adresa e Furnitorit</label>
                        <input value={form.supplier_address || ''} onChange={e=>setForm(p=>({...p,supplier_address:e.target.value}))}
                          placeholder="Adresa e plotë..." className="finex-input"/>
                      </div>
                    </div>
                  </div>

                  <div style={{ gridColumn:'span 2', borderTop:'1px solid var(--border)', paddingTop:16 }}>
                    <h4 style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', margin:'0 0 12px', fontFamily:'Poppins,sans-serif' }}>
                      📬 Pranusi (Blerësi)
                    </h4>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                      <div>
                        <label style={L}>Emri i Pranuesit</label>
                        <input value={form.recipient_name || ''} onChange={e=>setForm(p=>({...p,recipient_name:e.target.value}))}
                          placeholder="Kompania blerëse..." className="finex-input"/>
                      </div>
                      <div style={{ gridColumn:'span 1' }}>
                        <label style={L}>Adresa e Pranuesit</label>
                        <input value={form.recipient_address || ''} onChange={e=>setForm(p=>({...p,recipient_address:e.target.value}))}
                          placeholder="Adresa e plotë..." className="finex-input"/>
                      </div>
                    </div>
                  </div>

                  <div style={{ gridColumn:'span 2', borderTop:'1px solid var(--border)', paddingTop:16 }}>
                    <h4 style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', margin:'0 0 6px', fontFamily:'Poppins,sans-serif' }}>
                      📝 Footer i Faturës
                    </h4>
                    <p style={{ fontSize:11, color:'var(--text-3)', margin:'0 0 10px' }}>Ky tekst del çdo herë te fundi i faturës (IBAN, kushte pagese, etj.)</p>
                    <textarea
                      value={(form as any).invoice_footer || company.invoice_footer || ''}
                      onChange={e=>setForm(p=>({...p, invoice_footer: e.target.value}))}
                      placeholder={`p.sh. Llogaria bankare: BKPR-12345\nAfati i pagesës: 30 ditë\nFaleminderit për bashkëpunimin!`}
                      className="finex-input" style={{ resize:'vertical', minHeight:80, fontFamily:'Geist Mono, monospace', fontSize:12 }}/>
                  </div>

                  {/* Nënshkrimet */}
                  <div style={{ gridColumn:'1/-1', borderTop:'1px solid var(--border)', paddingTop:16 }}>
                    <h4 style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', margin:'0 0 12px', fontFamily:'Poppins,sans-serif' }}>
                      ✍️ Nënshkrimet
                    </h4>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                      <div>
                        <label style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:5, textTransform:'uppercase' as const, letterSpacing:'.05em' }}>
                          Nënshkrimi Furnitorit
                        </label>
                        <div style={{ height:70, borderRadius:9, border:'1.5px dashed var(--border)', background:'var(--bg-muted)', display:'flex', alignItems:'flex-end', padding:'8px 12px' }}>
                          <span style={{ fontSize:11, color:'var(--text-3)' }}>Furnitori / Data: _______________</span>
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:5, textTransform:'uppercase' as const, letterSpacing:'.05em' }}>
                          Nënshkrimi Pranuesit
                        </label>
                        <div style={{ height:70, borderRadius:9, border:'1.5px dashed var(--border)', background:'var(--bg-muted)', display:'flex', alignItems:'flex-end', padding:'8px 12px' }}>
                          <span style={{ fontSize:11, color:'var(--text-3)' }}>Pranusi / Data: _______________</span>
                        </div>
                      </div>
                    </div>
                    <p style={{ fontSize:11, color:'var(--text-3)', margin:'8px 0 0' }}>Nënshkrimet shfaqen te versioni i printuar i faturës</p>
                  </div>
                </>
              )}
            </div>
          </div>
          )}
        </div>

        {/* Summary sidebar */}
        <div className="form-sidebar" style={{ width:'100%', maxWidth:300, flexShrink:0, position:'sticky', top:20 }}>
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:18 }}>
            <h3 style={{ fontFamily:'Poppins,sans-serif', fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:14 }}>Përmbledhja</h3>

            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:13, color:'var(--text-3)' }}>Nëntotali</span>
              <span style={{ fontSize:13, fontWeight:600, color:'var(--text-1)' }}>{formatCurrency(subtotal)}</span>
            </div>

            {hasDiscount(company.business_type||null) && (
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, alignItems:'center' }}>
              <span style={{ fontSize:13, color:'var(--text-3)' }}>Zbritja</span>
              <input type="number" value={form.discount_amount} min="0"
                onChange={e=>setForm(p=>({...p,discount_amount:parseFloat(e.target.value)||0}))}
                onFocus={e=>e.target.select()}
                className="finex-input" style={{ width:70, fontSize:12, padding:'4px 8px', textAlign:'right' }}/>
            </div>
            )}

            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8, alignItems:'center' }}>
              <span style={{ fontSize:13, color:'var(--text-3)' }}>TVSH</span>
              {company.is_vat_registered === false ? (
                <span style={{ fontSize:12, color:'var(--text-3)', fontStyle:'italic' }}>Nuk është në TVSH</span>
              ) : (
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <select value={form.tax_rate} onChange={e=>setForm(p=>({...p,tax_rate:parseFloat(e.target.value)}))}
                    style={{ background:'var(--bg-muted)', border:'1px solid var(--border)', borderRadius:6, color:'var(--text-1)', padding:'4px 8px', fontSize:12 }}>
                    <option value={0}>0%</option>
                    <option value={8}>8%</option>
                    <option value={18}>18%</option>
                  </select>
                  <span style={{ fontSize:13, fontWeight:600, color:'var(--text-1)' }}>{formatCurrency(taxAmount)}</span>
                </div>
              )}
            </div>

            <div style={{ borderTop:'1px solid var(--border)', paddingTop:12, marginTop:4, display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontWeight:700, fontSize:15, color:'var(--text-1)' }}>Totali</span>
              <span style={{ fontWeight:800, fontSize:20, color:'var(--purple-light)', fontFamily:'Poppins,sans-serif' }}>{formatCurrency(total)}</span>
            </div>

            <div style={{ marginTop:16, display:'flex', flexDirection:'column', gap:8 }}>
              <button onClick={()=>handleSubmit('pending')} disabled={loading}
                className="finex-button-primary w-full py-2.5 flex items-center justify-center gap-2 text-sm font-semibold">
                {loading ? <><Loader2 size={14} className="animate-spin"/>Duke ruajtur...</> : isEdit ? 'Ruaj Ndryshimet' : 'Krijo Faturën'}
              </button>
              {!isEdit && (
                <button onClick={()=>handleSubmit('draft')} disabled={loading}
                  className="finex-button-secondary w-full py-2.5 flex items-center justify-center gap-2 text-sm">
                  Ruaj si Draft
                </button>
              )}
            </div>
          </div>

          {/* Company info */}
          <div style={{ marginTop:12, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:14 }}>
            <p style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>NGA</p>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)' }}>{company.name}</p>
            {company.email && <p style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>{company.email}</p>}
            {company.iban && <p style={{ fontSize:11, color:'var(--purple-light)', marginTop:2 }}>IBAN: {company.iban}</p>}
            {company.vat_number && <p style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>NUI: {company.vat_number}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
