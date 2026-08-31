'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, FileText, Trash2, Loader2, Check, ArrowRight, Download } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'

interface QuoteItem { id?: string; description: string; quantity: number; unit_price: number; total: number }
interface Quote { id: string; quote_number: string; client_name: string; client_email?: string; issue_date: string; valid_until?: string; status: string; total_amount: number; vat_rate: number; notes?: string; items: QuoteItem[] }

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  draft:     { bg:'rgba(107,114,128,0.1)', color:'white', label:'Draft' },
  sent:      { bg:'rgba(59,130,246,0.1)',  color:'#3B82F6', label:'Dërguar' },
  accepted:  { bg:'rgba(16,185,129,0.1)', color:'#10B981', label:'Pranuar' },
  rejected:  { bg:'rgba(239,68,68,0.1)',  color:'#EF4444', label:'Refuzuar' },
  converted: { bg:'rgba(90,31,214,0.1)', color:'#9B5CF8', label:'Konvertuar' },
}

const EMPTY_ITEM = { description: '', quantity: 1, unit_price: 0, total: 0 }

export default function QuotesClient({ quotes: initialQuotes, companyId, isVatRegistered }: { quotes: Quote[]; companyId: string; isVatRegistered: boolean }) {
  const router = useRouter()
  const [quotes, setQuotes] = useState(initialQuotes)
  const [showForm, setShowForm] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null)
  const [converting, setConverting] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function downloadPDF(quote: Quote) {
    setGeneratingPdf(quote.id)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const W = 210, M = 20

      // Header
      doc.setFillColor(90, 31, 214)
      doc.rect(0, 0, W, 38, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(22)
      doc.setFont('helvetica', 'bold')
      doc.text('OFERTË', M, 18)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text(quote.quote_number, M, 26)
      doc.setFontSize(10)
      doc.text(`Data: ${quote.issue_date}${quote.valid_until ? `   Vlefshme deri: ${quote.valid_until}` : ''}`, M, 34)

      // Client info
      doc.setTextColor(31, 41, 55)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('DREJTUAR:', M, 52)
      doc.setFont('helvetica', 'normal')
      doc.text(quote.client_name, M, 58)
      if (quote.client_email) doc.text(quote.client_email, M, 64)

      // Items table
      let y = 78
      doc.setFillColor(238, 242, 255)
      doc.rect(M, y-5, W-M*2, 8, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(90, 31, 214)
      doc.text('NR.', M+1, y)
      doc.text('PËRSHKRIMI', M+12, y)
      doc.text('SASIA', M+110, y)
      doc.text('ÇMIMI', M+130, y)
      doc.text('TOTALI', M+155, y)
      y += 4

      doc.setTextColor(31, 41, 55)
      doc.setFont('helvetica', 'normal')
      quote.items.forEach((item, i) => {
        y += 8
        if (i % 2 === 0) { doc.setFillColor(249, 250, 251); doc.rect(M, y-5, W-M*2, 8, 'F') }
        doc.text(String(i+1), M+1, y)
        doc.text(item.description.substring(0, 55), M+12, y)
        doc.text(String(item.quantity), M+115, y)
        doc.text(`€${Number(item.unit_price).toFixed(2)}`, M+128, y)
        doc.setFont('helvetica', 'bold')
        doc.text(`€${Number(item.total).toFixed(2)}`, M+153, y)
        doc.setFont('helvetica', 'normal')
      })

      // Totals
      y += 16
      const totalsX = 140
      doc.setFontSize(10)
      doc.text('Nëntotali:', totalsX, y); doc.text(`€${Number(quote.total_amount - (quote.total_amount * quote.vat_rate / (100 + quote.vat_rate))).toFixed(2)}`, totalsX + 45, y, { align:'right' })
      y += 7
      doc.text(`TVSH ${quote.vat_rate}%:`, totalsX, y); doc.text(`€${Number(quote.total_amount * quote.vat_rate / (100 + quote.vat_rate)).toFixed(2)}`, totalsX + 45, y, { align:'right' })
      y += 9
      doc.setFillColor(90, 31, 214)
      doc.rect(totalsX - 4, y - 6, 53, 10, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.text('TOTALI:', totalsX, y); doc.text(`€${Number(quote.total_amount).toFixed(2)}`, totalsX + 45, y, { align:'right' })

      // Notes
      if (quote.notes) {
        y += 20
        doc.setTextColor(31, 41, 55)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text('Shënime:', M, y)
        doc.setFont('helvetica', 'normal')
        doc.text(quote.notes.substring(0, 200), M, y + 6)
      }

      // Footer
      doc.setTextColor(156, 163, 175)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('Gjeneruar nga Fiscalix · fiscalix.com', W/2, 285, { align:'center' })

      doc.save(`Oferta_${quote.quote_number}_${quote.client_name.replace(/\s+/g,'_')}.pdf`)
      toast.success('PDF u shkarkua')
    } catch { toast.error('Gabim gjatë gjenerimit të PDF') }
    finally { setGeneratingPdf(null) }
  }

  const [form, setForm] = useState({
    client_name: '', client_email: '', client_address: '',
    issue_date: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30*86400000).toISOString().split('T')[0],
    vat_rate: isVatRegistered ? 18 : 0, notes: '',
  })
  const [items, setItems] = useState<QuoteItem[]>([{ ...EMPTY_ITEM }])
  const [saving, setSaving] = useState(false)

  function updateItem(i: number, field: keyof QuoteItem, val: string | number) {
    setItems(prev => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: val }
      if (field === 'quantity' || field === 'unit_price') {
        next[i].total = +(Number(next[i].quantity) * Number(next[i].unit_price)).toFixed(2)
      }
      return next
    })
  }

  const subtotal = items.reduce((s, i) => s + Number(i.total), 0)
  const vatAmount = +(subtotal * form.vat_rate / 100).toFixed(2)
  const totalAmount = +(subtotal + vatAmount).toFixed(2)

  async function saveQuote() {
    if (!form.client_name.trim()) { toast.error('Shto emrin e klientit'); return }
    if (items.every(i => !i.description.trim())) { toast.error('Shto të paktën një artikull'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, company_id: companyId, subtotal, vat_amount: vatAmount, total_amount: totalAmount, items: items.filter(i => i.description.trim()) })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setQuotes(prev => [{ ...data, items }, ...prev])
      setShowForm(false)
      setForm({ client_name:'', client_email:'', client_address:'', issue_date:new Date().toISOString().split('T')[0], valid_until:new Date(Date.now()+30*86400000).toISOString().split('T')[0], vat_rate:18, notes:'' })
      setItems([{ ...EMPTY_ITEM }])
      toast.success(`Oferta ${data.quote_number} u krijua`)
    } catch (err: unknown) { toast.error((err as Error).message) }
    finally { setSaving(false) }
  }

  async function convertToInvoice(quoteId: string) {
    setConverting(quoteId)
    try {
      const res = await fetch('/api/quotes/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote_id: quoteId })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: 'converted' } : q))
      toast.success(`Fatura ${data.invoice_number} u krijua nga oferta!`)
      router.push('/invoices')
    } catch (err: unknown) { toast.error((err as Error).message) }
    finally { setConverting(null) }
  }

  async function deleteQuote(id: string) {
    if (!window.confirm('A je i sigurt?')) return
    setDeleting(id)
    try {
      await fetch('/api/quotes', { method:'DELETE', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id }) })
      setQuotes(prev => prev.filter(q => q.id !== id))
      toast.success('Oferta u fshi')
    } catch { toast.error('Gabim') }
    finally { setDeleting(null) }
  }

  async function updateStatus(id: string, status: string) {
    await fetch('/api/quotes', { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id, status }) })
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, status } : q))
    toast.success('Statusi u ndryshua')
  }

  const I = { background:'var(--bg-input,var(--bg-muted))', border:'1px solid var(--border)', borderRadius:10, padding:'9px 12px', color:'var(--text-1)', fontSize:13, width:'100%', outline:'none' }

  return (
    <div className="page-enter space-y-6">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontFamily:'Poppins,sans-serif', fontSize:24, fontWeight:800, color:'var(--text-1)', marginBottom:4 }}>Ofertat</h1>
          <p style={{ fontSize:13, color:'var(--text-3)' }}>Krijo oferta profesionale dhe konverto në fatura</p>
        </div>
        <button onClick={() => setShowForm(true)}
          style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 22px', borderRadius:12, background:'linear-gradient(135deg,#5A1FD6,#7B2CF5)', color:'white', fontWeight:700, fontSize:14, border:'none', cursor:'pointer' }}>
          <Plus size={15}/> Krijo Ofertë
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:18, padding:24 }}>
          <h3 style={{ fontFamily:'Poppins,sans-serif', fontSize:17, fontWeight:800, color:'var(--text-1)', marginBottom:20 }}>Ofertë e Re</h3>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }}>Emri Klientit *</label>
              <input value={form.client_name} onChange={e => setForm(p=>({...p,client_name:e.target.value}))} placeholder="Agim Berisha SH.P.K" style={I}/>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }}>Email Klientit</label>
              <input value={form.client_email} onChange={e => setForm(p=>({...p,client_email:e.target.value}))} placeholder="agim@email.com" style={I}/>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }}>Data e Lëshimit</label>
              <input type="date" value={form.issue_date} onChange={e => setForm(p=>({...p,issue_date:e.target.value}))} style={I}/>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }}>Vlefshme Deri</label>
              <input type="date" value={form.valid_until} onChange={e => setForm(p=>({...p,valid_until:e.target.value}))} style={I}/>
            </div>
          </div>

          {/* Items */}
          <p style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:10 }}>Artikujt</p>
          <div style={{ border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', marginBottom:14 }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'var(--bg-muted)', borderBottom:'1px solid var(--border)' }}>
                  {['Përshkrimi','Sasia','Çmimi','Totali',''].map((h,i) => (
                    <th key={i} style={{ padding:'9px 12px', textAlign:'left', fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} style={{ borderBottom:'1px solid var(--border)' }}>
                    <td style={{ padding:'8px 10px' }}>
                      <input value={item.description} onChange={e => updateItem(i,'description',e.target.value)} placeholder="Shërbim / Produkt" style={{ ...I, padding:'7px 10px' }}/>
                    </td>
                    <td style={{ padding:'8px 10px', width:80 }}>
                      <input type="number" value={item.quantity} onChange={e => updateItem(i,'quantity',parseFloat(e.target.value)||0)} style={{ ...I, padding:'7px 10px' }}/>
                    </td>
                    <td style={{ padding:'8px 10px', width:120 }}>
                      <input type="number" value={item.unit_price} onChange={e => updateItem(i,'unit_price',parseFloat(e.target.value)||0)} placeholder="€" style={{ ...I, padding:'7px 10px' }}/>
                    </td>
                    <td style={{ padding:'8px 12px', fontSize:13, fontWeight:700, color:'var(--text-1)', width:100 }}>€{Number(item.total).toFixed(2)}</td>
                    <td style={{ padding:'8px 10px', width:40 }}>
                      {items.length > 1 && (
                        <button onClick={() => setItems(prev => prev.filter((_,j) => j!==i))}
                          style={{ padding:'4px', borderRadius:6, border:'none', background:'transparent', color:'var(--text-3)', cursor:'pointer', display:'flex' }}>
                          <Trash2 size={13}/>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={() => setItems(prev => [...prev, { ...EMPTY_ITEM }])}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:9, border:'1px dashed rgba(90,31,214,0.3)', background:'transparent', color:'var(--purple-light)', fontSize:13, fontWeight:600, cursor:'pointer', marginBottom:16 }}>
            <Plus size={13}/> Shto artikull
          </button>

          {/* Totals + VAT */}
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
            <div style={{ minWidth:260, display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'var(--text-3)' }}>
                <span>Nëntotali:</span><span>€{subtotal.toFixed(2)}</span>
              </div>
              {isVatRegistered && (
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:13, color:'var(--text-3)' }}>
                  <span>TVSH:</span>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <select value={form.vat_rate} onChange={e => setForm(p=>({...p,vat_rate:parseInt(e.target.value)}))} style={{ ...I, width:'auto', padding:'5px 8px', fontSize:12 }}>
                      <option value={0}>0%</option>
                      <option value={8}>8%</option>
                      <option value={18}>18%</option>
                    </select>
                    <span>€{vatAmount.toFixed(2)}</span>
                  </div>
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:16, fontWeight:800, color:'var(--text-1)', borderTop:'1px solid var(--border)', paddingTop:8 }}>
                <span>Totali:</span><span style={{ color:'#9B5CF8' }}>€{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:11, fontWeight:600, color:'var(--text-3)', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:'0.05em' }}>Shënime</label>
            <textarea value={form.notes} onChange={e => setForm(p=>({...p,notes:e.target.value}))} rows={2} placeholder="Kushtet e pagesës, vërejtje..." style={{ ...I, resize:'none' }}/>
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => setShowForm(false)} style={{ flex:1, padding:11, borderRadius:10, border:'1px solid var(--border)', background:'transparent', color:'var(--text-3)', cursor:'pointer', fontSize:13, fontWeight:600 }}>Anulo</button>
            <button onClick={saveQuote} disabled={saving}
              style={{ flex:2, padding:11, borderRadius:10, background:'linear-gradient(135deg,#5A1FD6,#7B2CF5)', color:'white', fontSize:14, fontWeight:700, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
              {saving ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>}
              {saving ? 'Duke ruajtur...' : 'Ruaj Ofertën'}
            </button>
          </div>
        </div>
      )}

      {/* Quotes List */}
      {quotes.length === 0 && !showForm ? (
        <div style={{ textAlign:'center', padding:60 }}>
          <FileText size={48} style={{ color:'var(--text-3)', margin:'0 auto 16px', opacity:0.3 }}/>
          <p style={{ fontSize:15, color:'var(--text-3)', marginBottom:20 }}>Nuk ka oferta akoma</p>
          <button onClick={() => setShowForm(true)}
            style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'11px 24px', borderRadius:12, background:'linear-gradient(135deg,#5A1FD6,#7B2CF5)', color:'white', fontWeight:700, fontSize:14, border:'none', cursor:'pointer' }}>
            <Plus size={14}/> Krijo Ofertën e Parë
          </button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {quotes.map(quote => {
            const st = STATUS_COLORS[quote.status] || STATUS_COLORS.draft
            return (
              <div key={quote.id} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'16px 18px', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap', transition:'border-color .2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor='rgba(90,31,214,0.25)'}
                onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}>
                <div style={{ flex:1, minWidth:200 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                    <p style={{ fontSize:13, fontWeight:800, color:'var(--text-1)', fontFamily:'Poppins,sans-serif' }}>{quote.quote_number}</p>
                    <span style={{ fontSize:11, padding:'2px 9px', borderRadius:20, fontWeight:700, background:st.bg, color:st.color }}>{st.label}</span>
                  </div>
                  <p style={{ fontSize:14, fontWeight:600, color:'var(--text-1)', marginBottom:2 }}>{quote.client_name}</p>
                  <p style={{ fontSize:11, color:'var(--text-3)' }}>
                    Lëshuar: {formatDate(quote.issue_date)}
                    {quote.valid_until && ` · Vlefshme deri: ${formatDate(quote.valid_until)}`}
                  </p>
                </div>

                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <p style={{ fontFamily:'Poppins,sans-serif', fontSize:20, fontWeight:900, color:'#9B5CF8' }}>€{Number(quote.total_amount).toFixed(2)}</p>
                  <p style={{ fontSize:11, color:'var(--text-3)' }}>{quote.items?.length || 0} artikuj</p>
                </div>

                <div style={{ display:'flex', gap:7, flexShrink:0, flexWrap:'wrap' }}>
                  <button onClick={() => downloadPDF(quote)} disabled={generatingPdf === quote.id}
                    style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:9, border:'1px solid rgba(90,31,214,0.25)', background:'rgba(90,31,214,0.08)', color:'#9B5CF8', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    {generatingPdf === quote.id ? <Loader2 size={12} className="animate-spin"/> : <Download size={12}/>}
                    {generatingPdf === quote.id ? 'PDF...' : 'PDF'}
                  </button>
                  {quote.status !== 'converted' && (
                    <button onClick={() => convertToInvoice(quote.id)} disabled={converting === quote.id}
                      style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 12px', borderRadius:9, border:'1px solid rgba(16,185,129,0.25)', background:'rgba(16,185,129,0.08)', color:'var(--text-1)', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                      {converting === quote.id ? <Loader2 size={12} className="animate-spin"/> : <ArrowRight size={12}/>}
                      {converting === quote.id ? 'Duke konvertuar...' : 'Bëj Faturë'}
                    </button>
                  )}
                  {quote.status !== 'converted' && (
                    <button onClick={() => deleteQuote(quote.id)} disabled={deleting === quote.id}
                      style={{ display:'flex', alignItems:'center', padding:'7px 9px', borderRadius:9, border:'1px solid rgba(239,68,68,0.2)', background:'rgba(239,68,68,0.07)', color:'var(--text-1)', cursor:'pointer' }}>
                      {deleting === quote.id ? <Loader2 size={12} className="animate-spin"/> : <Trash2 size={12}/>}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
