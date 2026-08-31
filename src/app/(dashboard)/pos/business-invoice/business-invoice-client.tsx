'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Printer, ArrowLeft, Eye } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  companyId: string
  userId: string
  company: any
  history: any[]
}

const EMPTY = {
  client_name: '', client_nui: '', client_address: '', client_city: '',
  period_from: '', period_to: '', description: '',
  total_amount: '', vat_amount: '', invoice_number: ''
}

export default function BusinessInvoiceClient({ companyId, userId, company, history: init }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [history, setHistory] = useState(init)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [preview, setPreview] = useState<any>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const C = {
    bg: 'var(--bg-base)', card: 'var(--bg-card)', border: 'var(--border)',
    purple: '#5B21B6', text1: 'var(--text-1)', text2: 'var(--text-2)', text3: 'var(--text-3)'
  }
  const S = {
    label: { fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 6, display: 'block' },
    input: { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 14, color: 'var(--text-1)', background: 'var(--bg-muted)', outline: 'none', boxSizing: 'border-box' as const }
  }

  async function save() {
    if (!form.client_name || !form.total_amount) { toast.error('Emri i klientit dhe shuma kërkohen'); return }
    setSaving(true)
    try {
      const invNum = form.invoice_number || `BIZ-${new Date().getFullYear()}-${String(history.length + 1).padStart(3,'0')}`
      const { data, error } = await supabase.from('business_invoices').insert({
        company_id:    companyId,
        created_by:    userId,
        client_name:   form.client_name,
        client_nui:    form.client_nui || null,
        client_address:form.client_address || null,
        period_from:   form.period_from || null,
        period_to:     form.period_to || null,
        description:   form.description || null,
        total_amount:  Number(form.total_amount),
        vat_amount:    form.vat_amount ? Number(form.vat_amount) : 0,
        invoice_number: invNum,
        status:        'issued',
      }).select().single()
      if (error) { toast.error(error.message); return }
      setHistory(h => [data, ...h])
      setForm(EMPTY)
      setShowForm(false)
      setPreview(data)
      toast.success('Fatura u krijua')
    } finally { setSaving(false) }
  }

  function printInvoice(inv: any) {
    const net = Number(inv.total_amount) - Number(inv.vat_amount || 0)
    const w = window.open('', '_blank')!
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Faturë ${inv.invoice_number}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: Arial, sans-serif; color: #111; background: white; padding: 40px; font-size: 14px; }
      .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
      .company-info h2 { font-size: 22px; font-weight: 900; color: #1a1a1a; margin-bottom: 6px; }
      .company-info p { font-size: 13px; color: #555; line-height: 1.6; }
      .invoice-info { text-align: right; }
      .invoice-info .inv-title { font-size: 28px; font-weight: 900; color: #5B21B6; letter-spacing: -1px; }
      .invoice-info p { font-size: 13px; color: #555; margin-top: 4px; }
      .invoice-info strong { color: #111; }
      .divider { border: none; border-top: 2px solid #5B21B6; margin: 24px 0; }
      .client-section { background: #f8f7ff; border-radius: 10px; padding: 20px; margin-bottom: 32px; }
      .client-section h3 { font-size: 11px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
      .client-section h2 { font-size: 18px; font-weight: 800; color: #111; margin-bottom: 4px; }
      .client-section p { font-size: 13px; color: #555; line-height: 1.6; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
      thead tr { background: #5B21B6; }
      thead th { padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; color: white; text-transform: uppercase; letter-spacing: 0.5px; }
      tbody tr { border-bottom: 1px solid #eee; }
      tbody td:last-child { text-align: right; font-weight: 700; }
      .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; border-bottom: 1px solid #eee; }
      .footer { position: fixed; bottom: 20px; left: 0; right: 0; text-align: center; font-size: 12px; color: #aaa; border-top: 1px solid #eee; padding-top: 12px; margin: 0 40px; }
    </style></head><body>
      .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; border-bottom: 1px solid #eee; }
      .total-row.final { font-size: 18px; font-weight: 900; color: #5B21B6; border-top: 2px solid #5B21B6; border-bottom: none; padding-top: 12px; margin-top: 4px; }
      .footer { position: fixed; bottom: 20px; left: 0; right: 0; text-align: center; font-size: 12px; color: #aaa; border-top: 1px solid #eee; padding-top: 12px; margin: 0 40px; }
      @media print { body { padding: 20px; } .footer { position: fixed; bottom: 10px; } }
    </style></head><body>
    <div class="header">
      <div class="company-info">
        <h2>${company?.name || ''}</h2>
        <p>${company?.address || ''}${company?.address && company?.city ? ', ' : ''}${company?.city || ''}<br>
        ${company?.phone ? 'Tel: ' + company.phone + '<br>' : ''}
        ${company?.tax_number ? 'NUI: ' + company.tax_number + '<br>' : ''}
        ${company?.vat_number ? 'Nr. TVSH: ' + company.vat_number : ''}</p>
      </div>
      <div class="invoice-info">
        <div class="inv-title">FATURË</div>
        <p><strong>Nr: ${inv.invoice_number}</strong></p>
        <p>Data: <strong>${new Date(inv.created_at).toLocaleDateString('sq-AL')}</strong></p>
        ${inv.period_from ? `<p>Periudha: <strong>${inv.period_from} — ${inv.period_to || ''}</strong></p>` : ''}
      </div>
    </div>
    <hr class="divider">
    <div class="client-section">
      <h3>Fatura lëshohet për</h3>
      <h2>${inv.client_name}</h2>
      ${inv.client_nui ? `<p>NUI/NIPT: ${inv.client_nui}</p>` : ''}
      ${inv.client_address ? `<p>${inv.client_address}</p>` : ''}
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:60%">Përshkrimi</th>
          <th>Njësia</th>
          <th>Shuma</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${inv.description || 'Shërbim sipas marrëveshjes'}</td>
          <td>1</td>
          <td>€${net.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
    <div class="totals">
      <div class="total-row"><span>Neto:</span><span>€${net.toFixed(2)}</span></div>
      ${Number(inv.vat_amount) > 0 ? `<div class="total-row"><span>TVSH (18%):</span><span>€${Number(inv.vat_amount).toFixed(2)}</span></div>` : ''}
      <div class="total-row final"><span>TOTALI:</span><span>€${Number(inv.total_amount).toFixed(2)}</span></div>
    </div>
    <div class="footer">
      <p>${company?.name || ''} — ${company?.address || ''} — ${company?.phone || ''}</p>
      <p style="margin-top:6px">Faturë e gjeneruar nga Fiscalix POS</p>
    </div>
    </body></html>`)
    w.document.close()
    setTimeout(() => { w.print() }, 500)
  }

  return (
    <div style={{ padding: 24, fontFamily: 'Inter,sans-serif', color: C.text1, maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, border: `1px solid ${C.border}`, background: C.card, cursor: 'pointer', fontSize: 13, color: C.text2 }}>
            <ArrowLeft size={14} /> Mbrapa
          </button>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900 }}>Faturë për Biznes</h1>
            <p style={{ fontSize: 12, color: C.text3 }}>Fatura mujore për klientë biznes</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10, background: C.purple, color:'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, boxShadow: '0 4px 12px rgba(91,33,182,0.3)' }}>
          <Plus size={15} /> Krijo Faturë
        </button>
      </div>
      {showForm && (
        <div style={{ background: C.card, borderRadius: 16, padding: 24, border: `1px solid ${C.border}`, marginBottom: 24 }}>
          <p style={{ fontSize: 16, fontWeight: 800, marginBottom: 20 }}>Faturë e Re</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div><label style={S.label}>Emri i Klientit *</label><input value={form.client_name} onChange={e=>setForm(f=>({...f,client_name:e.target.value}))} placeholder="Kompania ABC sh.p.k" style={S.input}/></div>
            <div><label style={S.label}>NUI / NIPT i Klientit</label><input value={form.client_nui} onChange={e=>setForm(f=>({...f,client_nui:e.target.value}))} placeholder="810XXXXXXX" style={S.input}/></div>
            <div><label style={S.label}>Adresa e Klientit</label><input value={form.client_address} onChange={e=>setForm(f=>({...f,client_address:e.target.value}))} placeholder="Rr. Xxxxxxxxx, Prishtinë" style={S.input}/></div>
            <div><label style={S.label}>Nr. Faturës</label><input value={form.invoice_number} onChange={e=>setForm(f=>({...f,invoice_number:e.target.value}))} placeholder={`BIZ-${new Date().getFullYear()}-${String(history.length+1).padStart(3,'0')}`} style={S.input}/></div>
            <div><label style={S.label}>Periudha Nga</label><input type="date" value={form.period_from} onChange={e=>setForm(f=>({...f,period_from:e.target.value}))} style={S.input}/></div>
            <div><label style={S.label}>Periudha Deri</label><input type="date" value={form.period_to} onChange={e=>setForm(f=>({...f,period_to:e.target.value}))} style={S.input}/></div>
            <div style={{gridColumn:'1/-1'}}><label style={S.label}>Përshkrimi i Shërbimit</label><textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Shërbim ushqimi për periudhën Gusht 2026 — sipas kuponave fiskalë" rows={3} style={{...S.input, resize:'vertical' as const}}/></div>
            <div><label style={S.label}>Shuma Pa TVSH (€) *</label><input type="number" value={form.total_amount} onChange={e=>setForm(f=>({...f,total_amount:e.target.value}))} placeholder="1250.00" style={S.input}/></div>
            <div><label style={S.label}>TVSH (€)</label><input type="number" value={form.vat_amount} onChange={e=>setForm(f=>({...f,vat_amount:e.target.value}))} placeholder="225.00" style={S.input}/></div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={()=>{setShowForm(false);setForm(EMPTY)}} style={{ padding: '9px 20px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.card, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Anulo</button>
            <button onClick={save} disabled={saving} style={{ padding: '9px 20px', borderRadius: 10, background: C.purple, color:'white', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
              {saving ? 'Duke krijuar...' : 'Krijo & Printo'}
            </button>
          </div>
        </div>
      )}
      {/* History */}
      <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}` }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}` }}>
          <p style={{ fontSize: 15, fontWeight: 800 }}>Faturat e Lëshuara</p>
        </div>
        {history.length === 0 ? (
          <p style={{ textAlign: 'center', padding: '32px', color: C.text3, fontSize: 14 }}>Nuk ka fatura ende — krijo të parën</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
            <thead>
              <tr style={{ background: 'var(--bg-muted)' }}>
                {['Nr. Faturës','Klienti','Periudha','Shuma','Veprime'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left' as const, fontSize: 11, fontWeight: 700, color: C.text3, textTransform: 'uppercase' as const }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((inv, i) => (
                <tr key={inv.id} style={{ borderTop: `1px solid ${C.border}`, background: i%2===0?'transparent':'var(--bg-muted)' }}>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700 }}>{inv.invoice_number}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>{inv.client_name}<br/><span style={{fontSize:11,color:C.text3}}>{inv.client_nui}</span></td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: C.text3 }}>{inv.period_from} → {inv.period_to}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 800, color: C.purple }}>€{Number(inv.total_amount).toFixed(2)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={()=>printInvoice(inv)} style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, color: C.purple }}>
                      <Printer size={13}/> Printo
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
