'use client'
import { useState } from 'react'
import { Printer, Hotel } from 'lucide-react'
import { toast } from 'sonner'

interface Company { name?: string; address?: string; phone?: string; email?: string; vat_number?: string }

export default function BookingConfirmEditor({ company }: { company: any }) {
  const [form, setForm] = useState({
    booking_number: `BKG-${new Date().getFullYear()}-${String(Math.floor(Math.random()*9000)+1000)}`,
    guest_name: '', guest_email: '', guest_phone: '', guest_address: '',
    checkin: '', checkout: '', room_type: '', num_guests: '2',
    total_price: '', deposit_paid: '', remaining: '',
    destination: '', notes: '', cancellation_policy: '48 orë para check-in',
  })

  const nights = form.checkin && form.checkout
    ? Math.max(0, Math.ceil((new Date(form.checkout).getTime() - new Date(form.checkin).getTime()) / 86400000))
    : 0

  function printConfirm() {
    if (!form.guest_name || !form.checkin) { toast.error('Shto emrin e mysafirit dhe datën e check-in'); return }
    const checkinStr = form.checkin ? new Date(form.checkin).toLocaleDateString('sq-AL', { weekday:'long', day:'2-digit', month:'long', year:'numeric' }) : ''
    const checkoutStr = form.checkout ? new Date(form.checkout).toLocaleDateString('sq-AL', { weekday:'long', day:'2-digit', month:'long', year:'numeric' }) : ''

    const html = `<!DOCTYPE html><html lang="sq"><head><meta charset="UTF-8">
<style>
  @page{size:A4;margin:12mm} *{margin:0;padding:0;box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  body{font-family:'Helvetica Neue',Arial,sans-serif;color:#111827;background:#e5e7eb}
  .toolbar{position:fixed;top:0;left:0;right:0;background:#111;padding:10px 20px;display:flex;gap:10px;align-items:center;z-index:100}
  .toolbar button{padding:8px 16px;border-radius:8px;border:none;cursor:pointer;font-size:13px;font-weight:600}
  .btn-p{background:#10B981;color:white} .btn-c{margin-left:auto;background:var(--bg-muted);color:var(--bg-muted)}
  .page-wrap{padding-top:56px;display:flex;justify-content:center;padding-bottom:30px}

  .h-left .name{font-size:22px;font-weight:900;margin-bottom:3px}
  .h-right{text-align:right}
  .h-num{font-size:20px;font-weight:900}

  .h-right{text-align:right}
  .h-label{font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:#6EE7B7;font-weight:700;margin-bottom:3px}
  .h-num{font-size:20px;font-weight:900}
  .confirmed-badge{display:inline-block;background:#10B981;color:white;font-size:10px;font-weight:900;padding:4px 12px;border-radius:20px;margin-top:5px;letter-spacing:1px}

  .ci-item .ci-label{font-size:8px;text-transform:uppercase;letter-spacing:0.1em;color:#065F46;font-weight:700;margin-bottom:3px}
  .ci-arrow{font-size:20px;color:#10B981;font-weight:900}

  .section{margin-bottom:16px}


  .body{padding:18px 28px;flex:1}
  .section{margin-bottom:16px}
  .section-title{font-size:9px;text-transform:uppercase;letter-spacing:0.12em;color:#9ca3af;font-weight:700;margin-bottom:10px;border-bottom:1px solid #f3f4f6;padding-bottom:5px}

  .guest-card{background:#f9fafb;border:1px solid #e5e7eb;border-left:3px solid #10B981;border-radius:8px;padding:12px 16px}
  .guest-name{font-size:16px;font-weight:800;color:#111827;margin-bottom:4px}
  .guest-meta{font-size:10px;color:#6b7280;line-height:1.7}

  .details-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .detail-item{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px}
  .d-label{font-size:8px;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;font-weight:700;margin-bottom:3px}
  .d-value{font-size:12px;font-weight:700;color:#111827}

  .payment-box{background:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px;padding:12px 16px}
  .pay-row{display:flex;justify-content:space-between;padding:5px 0;font-size:11px;border-bottom:1px solid #D1FAE5}
  .pay-label{color:#065F46}
  .pay-val{font-weight:600;color:#064E3B}
  .pay-total{display:flex;justify-content:space-between;padding:10px 0 0;font-size:14px}
  .pay-total-label{font-weight:800;color:#064E3B}
  .pay-total-val{font-weight:900;color:#059669;font-size:18px}

  .policy-box{background:#FEF3C7;border:1px solid #FDE68A;border-radius:8px;padding:10px 14px;font-size:10px;color:#92400E;line-height:1.6}

  .footer{border-top:1px solid #D1FAE5;padding:12px 28px;display:flex;justify-content:space-between;align-items:center}
  .f-left{font-size:9px;color:#9ca3af;line-height:1.6}
  .f-right{font-size:9px;color:#9ca3af;text-align:right}
  .thank-you{text-align:center;padding:12px;font-size:12px;color:#065F46;font-weight:700;font-style:italic}

  @media print{.toolbar{display:none}.page-wrap{padding:0;background:white}.page{box-shadow:none;width:100%}}
</style></head><body>
<div class="toolbar">
  <button class="btn-p" onclick="window.print()">🖨️ Printo / Shkarko PDF</button>
  <button class="btn-c" onclick="window.close()">✕</button>
</div>
<div class="page-wrap"><div class="page">

<div class="header">
  <div class="h-left">
    <div class="name">${company?.name || ''}</div>
    <div class="info">${form.destination ? '📍 ' + form.destination + '<br>' : ''}${company?.address ? company.address + '<br>' : ''}${company?.phone ? 'Tel: ' + company.phone : ''}${company?.email ? ' · ' + company.email : ''}</div>
  </div>
  <div class="h-right">
    <div class="h-label">Konfirmim Rezervimi</div>
    <div class="h-num">${form.booking_number}</div>
    <span class="confirmed-badge">✓ KONFIRMUAR</span>
  </div>
</div>

${(form.checkin || form.checkout) ? `
<div class="checkin-bar">
  <div class="ci-item"><div class="ci-label">Check-in</div><div class="ci-value">${checkinStr}</div></div>
  <div class="ci-arrow">→</div>
  <div class="ci-item"><div class="ci-label">Check-out</div><div class="ci-value">${checkoutStr}</div></div>
  <div></div>
  ${nights > 0 ? `<div class="nights-badge">${nights} 🌙 netë</div>` : ''}
</div>` : ''}

<div class="body">
  <div class="section">
    <div class="section-title">Mysafiri</div>
    <div class="guest-card">
      <div class="guest-name">${form.guest_name}</div>
      <div class="guest-meta">
        ${form.guest_email ? '✉ ' + form.guest_email + '<br>' : ''}
        ${form.guest_phone ? '📱 ' + form.guest_phone + '<br>' : ''}
        ${form.guest_address ? '📍 ' + form.guest_address : ''}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Detajet e Rezervimit</div>
    <div class="details-grid">
      ${form.room_type ? `<div class="detail-item"><div class="d-label">Dhoma / Paketa</div><div class="d-value">${form.room_type}</div></div>` : ''}
      ${form.num_guests ? `<div class="detail-item"><div class="d-label">Nr. Mysafirësh</div><div class="d-value">${form.num_guests} persona</div></div>` : ''}
      ${form.destination ? `<div class="detail-item"><div class="d-label">Destinacioni</div><div class="d-value">${form.destination}</div></div>` : ''}
    </div>
  </div>

  ${(form.total_price || form.deposit_paid) ? `
  <div class="section">
    <div class="section-title">Pagesat</div>
    <div class="payment-box">
      ${form.deposit_paid ? `<div class="pay-row"><span class="pay-label">✓ Depozitë e paguar</span><span class="pay-val">€${form.deposit_paid}</span></div>` : ''}
      ${form.remaining ? `<div class="pay-row"><span class="pay-label">Mbetur për pagesë</span><span class="pay-val">€${form.remaining}</span></div>` : ''}
      ${form.total_price ? `<div class="pay-total"><span class="pay-total-label">Totali i Rezervimit</span><span class="pay-total-val">€${form.total_price}</span></div>` : ''}
    </div>
  </div>` : ''}

  ${form.notes ? `<div class="section"><div class="section-title">Shënime</div><div class="policy-box">${form.notes}</div></div>` : ''}

  <div class="section">
    <div class="section-title">Politika e Anulimit</div>
    <div class="policy-box">⚠️ ${form.cancellation_policy}</div>
  </div>

  <div class="thank-you">🙏 Faleminderit për zgjedhjen tuaj! Presim me padurim ardhjen tuaj.</div>
</div>

<div class="footer">
  <div class="f-left"><strong>${company?.name || ''}</strong><br>${company?.phone || ''}${company?.email ? ' · ' + company.email : ''}</div>
  <div class="f-right">${form.booking_number}<br>${new Date().toLocaleDateString('sq-AL')}</div>
</div>
</div></div></body></html>`

    const win = window.open('', '_blank')
    if (win) { win.document.write(html); win.document.close() }
    else toast.error('Lejo popup-et në browser')
  }

  const I = { background:'var(--bg-input,var(--bg-muted))', border:'1px solid var(--border)', borderRadius:10, padding:'9px 12px', color:'var(--text-1)', fontSize:13, width:'100%', outline:'none' }
  const L = { fontSize:10, fontWeight:700, color:'var(--text-3)', display:'block', marginBottom:5, textTransform:'uppercase' as const, letterSpacing:'0.06em' }
  const S = { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'18px 20px', marginBottom:14 }

  return (
    <div className="page-enter" style={{ maxWidth:800, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontFamily:'Poppins,sans-serif', fontSize:24, fontWeight:800, color:'var(--text-1)', marginBottom:4 }}>Konfirmim Rezervimi</h1>
          <p style={{ fontSize:13, color:'var(--text-3)' }}>Gjenero dokument konfirmimi për mysafirët</p>
        </div>
        <button onClick={printConfirm} style={{ display:'flex', alignItems:'center', gap:8, padding:'11px 22px', borderRadius:12, background:'linear-gradient(135deg,#065F46,#10B981)', color:'white', fontWeight:700, fontSize:14, border:'none', cursor:'pointer' }}>
          <Printer size={16}/> Gjenero Konfirmimin
        </button>
      </div>

      <div style={S}>
        <h3 style={{ fontFamily:'Poppins,sans-serif', fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:14 }}>Mysafiri</h3>
        <div className="form-grid-2">
          <div className="form-span-2"><label style={L}>Emri i Plotë *</label><input value={form.guest_name} onChange={e=>setForm(p=>({...p,guest_name:e.target.value}))} placeholder="Agim Berisha" style={I}/></div>
          <div><label style={L}>Email</label><input type="email" value={form.guest_email} onChange={e=>setForm(p=>({...p,guest_email:e.target.value}))} style={I}/></div>
          <div><label style={L}>Telefon</label><input value={form.guest_phone} onChange={e=>setForm(p=>({...p,guest_phone:e.target.value}))} style={I}/></div>
          <div className="form-span-2"><label style={L}>Adresa / Shteti</label><input value={form.guest_address} onChange={e=>setForm(p=>({...p,guest_address:e.target.value}))} style={I}/></div>
        </div>
      </div>

      <div style={S}>
        <h3 style={{ fontFamily:'Poppins,sans-serif', fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:14 }}>Rezervimi</h3>
        <div className="form-grid-2">
          <div><label style={L}>Check-in *</label><input type="date" value={form.checkin} onChange={e=>setForm(p=>({...p,checkin:e.target.value}))} style={I}/></div>
          <div><label style={L}>Check-out {nights > 0 && <span style={{ color:'var(--text-1)' }}>· {nights} netë</span>}</label><input type="date" value={form.checkout} onChange={e=>setForm(p=>({...p,checkout:e.target.value}))} style={I}/></div>
          <div><label style={L}>Dhoma / Paketa</label><input value={form.room_type} onChange={e=>setForm(p=>({...p,room_type:e.target.value}))} placeholder="Dhomë Standarde" style={I}/></div>
          <div><label style={L}>Nr. Mysafirësh</label><input type="number" value={form.num_guests} onChange={e=>setForm(p=>({...p,num_guests:e.target.value}))} style={I}/></div>
          <div className="form-span-2"><label style={L}>Destinacioni</label><input value={form.destination} onChange={e=>setForm(p=>({...p,destination:e.target.value}))} placeholder="Brezovica, Sharr..." style={I}/></div>
        </div>
      </div>

      <div style={S}>
        <h3 style={{ fontFamily:'Poppins,sans-serif', fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:14 }}>Pagesa</h3>
        <div className="form-grid-2">
          <div><label style={L}>Çmimi Total (€)</label><input type="number" value={form.total_price} onChange={e=>setForm(p=>({...p,total_price:e.target.value}))} style={I}/></div>
          <div><label style={L}>Depozitë e Paguar (€)</label><input type="number" value={form.deposit_paid} onChange={e=>setForm(p=>({...p,deposit_paid:e.target.value}))} style={I}/></div>
          <div><label style={L}>Mbetur për Pagesë (€)</label><input type="number" value={form.remaining} onChange={e=>setForm(p=>({...p,remaining:e.target.value}))} style={I}/></div>
          <div><label style={L}>Nr. Konfirmimit</label><input value={form.booking_number} onChange={e=>setForm(p=>({...p,booking_number:e.target.value}))} style={I}/></div>
        </div>
      </div>

      <div style={S}>
        <div className="form-grid-2">
          <div className="form-span-2"><label style={L}>Politika e Anulimit</label><input value={form.cancellation_policy} onChange={e=>setForm(p=>({...p,cancellation_policy:e.target.value}))} style={I}/></div>
          <div className="form-span-2"><label style={L}>Shënime shtesë</label><textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={3} style={{ ...I, resize:'none' }}/></div>
        </div>
      </div>
    </div>
  )
}
