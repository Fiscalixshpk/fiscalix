import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: inv } = await supabase.from('invoices').select('*, invoice_items(*), companies(*)').eq('id', id).single()
  if (!inv) return NextResponse.json({ error: 'Nuk u gjet' }, { status: 404 })

  const comp = inv.companies as Record<string,string> | null
  const items = (inv.invoice_items || []) as { description: string; quantity: number; unit_price: number; total: number }[]
  const notes = (inv.notes || '').split('\n')
  const booking = notes.find((n:string) => n.startsWith('Check-in:'))?.replace('Check-in:','').trim() || ''
  const roomType = notes.find((n:string) => n.startsWith('Dhoma:'))?.replace('Dhoma:','').trim() || ''
  const numGuests = notes.find((n:string) => n.startsWith('Mysafirë:'))?.replace('Mysafirë:','').trim() || ''
  const destination = notes.find((n:string) => n.startsWith('Destinacioni:'))?.replace('Destinacioni:','').trim() || ''
  const nights = notes.find((n:string) => n.startsWith('Netë:'))?.replace('Netë:','').trim() || ''
  const clientEmail = notes.find((n:string) => n.startsWith('Email:'))?.replace('Email:','').trim() || inv.client_email || ''
  const checkin = booking.split('·')[0]?.replace('','').trim() || ''
  const checkout = booking.split('·')[1]?.replace('Check-out:','').trim() || ''

  const html = `<!DOCTYPE html>
<html lang="sq">
<head><meta charset="UTF-8">
<style>
  @page { size:A4 portrait; margin:12mm }
  * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important }
  body { font-family:'Helvetica Neue',Arial,sans-serif; color:#111827; background:#f0f0f0 }
  .toolbar { position:fixed; top:0; left:0; right:0; background:#111827; padding:10px 20px; display:flex; gap:10px; align-items:center; z-index:100 }
  .toolbar button { padding:8px 16px; border-radius:8px; border:none; cursor:pointer; font-size:13px; font-weight:600; font-family:inherit }
  .btn-print { background:#10B981; color:white }
  .btn-close { margin-left:auto; background:rgba(255,255,255,0.1); color:rgba(255,255,255,0.7) }
  .toolbar-title { color:rgba(255,255,255,0.6); font-size:13px; margin-left:10px }
  .page-wrap { padding-top:60px; display:flex; justify-content:center; padding-bottom:40px }
  .page { background:white; width:210mm; min-height:297mm; box-shadow:0 4px 32px rgba(0,0,0,0.15); display:flex; flex-direction:column }
  @media print { .toolbar{display:none} .page-wrap{padding:0;background:white} .page{box-shadow:none;width:100%} }

  .header { background:linear-gradient(135deg,#064E3B,#065F46); color:white; padding:24px 28px; display:flex; justify-content:space-between; align-items:flex-start }
  .co-name { font-size:22px; font-weight:900; margin-bottom:4px }
  .co-info { font-size:10px; opacity:0.6; line-height:1.7 }
  .doc-right { text-align:right }
  .doc-label { font-size:9px; letter-spacing:0.2em; text-transform:uppercase; color:#6EE7B7; font-weight:700; margin-bottom:3px }
  .doc-num { font-size:26px; font-weight:900 }

  .booking-card { background:#ECFDF5; border-bottom:2px solid #A7F3D0; padding:14px 28px; display:grid; grid-template-columns:repeat(4,1fr); gap:12px }
  .booking-item .label { font-size:8px; text-transform:uppercase; letter-spacing:0.1em; color:#065F46; font-weight:700; margin-bottom:3px }
  .booking-item .value { font-size:13px; font-weight:800; color:#064E3B }

  .body { padding:20px 28px; flex:1; }
  .parties { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:18px }
  .party { padding:13px 16px; border-radius:8px }
  .party-hotel { background:#f9fafb; border-left:3px solid #064E3B }
  .party-guest { background:#ECFDF5; border-left:3px solid #10B981 }
  .p-label { font-size:8px; text-transform:uppercase; letter-spacing:0.12em; color:#9ca3af; font-weight:700; margin-bottom:4px }
  .p-name { font-size:14px; font-weight:800; color:#111827; margin-bottom:2px }
  .p-detail { font-size:10px; color:#6b7280; line-height:1.5 }

  table { width:100%; border-collapse:collapse; margin-bottom:16px }
  thead tr { background:#064E3B; color:white }
  th { padding:9px 12px; text-align:left; font-size:9px; text-transform:uppercase; letter-spacing:0.08em; font-weight:700 }
  th.r { text-align:right }
  td { padding:10px 12px; border-bottom:1px solid #f0fdf4; font-size:11px; color:#374151 }
  td.r { text-align:right; font-weight:700; color:#065F46 }
  tr:nth-child(even) td { background:#f9fafb }

  .totals { margin-left:auto; width:250px }
  .t-row { display:flex; justify-content:space-between; padding:7px 0; font-size:11px; border-bottom:1px solid #f0fdf4 }
  .t-label { color:#6b7280 }
  .t-val { font-weight:600 }
  .t-final { display:flex; justify-content:space-between; align-items:center; padding:13px 16px; background:linear-gradient(135deg,#064E3B,#065F46); border-radius:9px; margin-top:10px; color:white }
  .tf-label { font-size:13px; font-weight:700 }
  .tf-amount { font-size:22px; font-weight:900; color:#6EE7B7 }

  .policy-box { background:#FEF3C7; border:1px solid #FDE68A; border-radius:8px; padding:12px 16px; margin-top:16px; font-size:10px; color:#92400E; line-height:1.7 }
  .policy-title { font-weight:800; font-size:11px; margin-bottom:5px }

  .footer { border-top:1px solid #D1FAE5; padding:14px 28px; display:flex; justify-content:space-between }
  .f-left { font-size:10px; color:#9ca3af; line-height:1.7 }
  .f-right { font-size:10px; color:#9ca3af; text-align:right; line-height:1.7 }
</style></head>
<body>
  <div class="toolbar">
    <button class="btn-print" onclick="window.print()">🖨️ Printo / Shkarko PDF</button>
    <span class="toolbar-title">${inv.invoice_number} — ${inv.client_name}</span>
    <button class="btn-close" onclick="window.close()">✕</button>
  </div>
  <div class="page-wrap"><div class="page">

  <div class="header">
    <div>
      <div class="co-name">${comp?.name || ''}</div>
      <div class="co-info">${destination ? '📍 ' + destination + '<br>' : ''}${comp?.address ? comp.address + '<br>' : ''}${comp?.phone ? 'Tel: ' + comp.phone : ''}${comp?.email ? ' · ' + comp.email : ''}</div>
    </div>
    <div class="doc-right">
      <div class="doc-label">Faturë Rezervimi</div>
      <div class="doc-num">${inv.invoice_number}</div>
    </div>
  </div>

  ${(checkin || nights || roomType || numGuests) ? `
  <div class="booking-card">
    ${checkin ? `<div class="booking-item"><div class="label">Check-in</div><div class="value">${checkin}</div></div>` : ''}
    ${checkout ? `<div class="booking-item"><div class="label">Check-out</div><div class="value">${checkout}</div></div>` : ''}
    ${nights ? `<div class="booking-item"><div class="label">Netë</div><div class="value">${nights} 🌙</div></div>` : ''}
    ${numGuests ? `<div class="booking-item"><div class="label">Mysafirë</div><div class="value">${numGuests} 👤</div></div>` : ''}
    ${roomType ? `<div class="booking-item" style="grid-column:span 2"><div class="label">Dhoma / Paketa</div><div class="value">${roomType}</div></div>` : ''}
  </div>` : ''}

  <div class="body">
    <div style="display:flex;gap:16px;margin-bottom:16px;font-size:10px;color:#6b7280">
      <span>Data: <strong style="color:#064E3B">${new Date(inv.issue_date).toLocaleDateString('sq-AL', { day:'2-digit', month:'long', year:'numeric' })}</strong></span>
      ${inv.due_date ? `<span>Afati Pagesës: <strong style="color:#064E3B">${new Date(inv.due_date).toLocaleDateString('sq-AL', { day:'2-digit', month:'long', year:'numeric' })}</strong></span>` : ''}
    </div>

    <div class="parties">
      <div class="party party-hotel">
        <div class="p-label">Hotel / Operatori Turistik</div>
        <div class="p-name">${comp?.name || ''}</div>
        <div class="p-detail">${comp?.address || ''}${comp?.vat_number ? '<br>NUI TVSH: ' + comp.vat_number : ''}</div>
      </div>
      <div class="party party-guest">
        <div class="p-label">Mysafiri / Grupi</div>
        <div class="p-name">${inv.client_name}</div>
        <div class="p-detail">${clientEmail ? clientEmail + '<br>' : ''}${inv.client_address || ''}${inv.client_vat ? '<br>NUI: ' + inv.client_vat : ''}</div>
      </div>
    </div>

    <table>
      <thead><tr>
        <th>Shërbimi / Paketa Turistike</th>
        <th class="r" style="width:70px">Sasia</th>
        <th class="r" style="width:100px">Çmimi/Njësi</th>
        <th class="r" style="width:100px">Totali €</th>
      </tr></thead>
      <tbody>
        ${items.map(item => `<tr>
          <td>${item.description}</td>
          <td class="r">${item.quantity}</td>
          <td class="r">€${Number(item.unit_price).toFixed(2)}</td>
          <td class="r">€${Number(item.total).toFixed(2)}</td>
        </tr>`).join('')}
      </tbody>
    </table>

    <div class="totals">
      <div class="t-row"><span class="t-label">Nëntotali</span><span class="t-val">€${Number(inv.subtotal).toFixed(2)}</span></div>
      ${Number(inv.tax_rate) > 0 ? `<div class="t-row"><span class="t-label">TVSH ${inv.tax_rate}% (Akomodim)</span><span class="t-val">€${Number(inv.tax_amount).toFixed(2)}</span></div>` : ''}
      <div class="t-final"><span class="tf-label">TOTALI</span><span class="tf-amount">€${Number(inv.total_amount).toFixed(2)}</span></div>
    </div>

    <div class="policy-box">
      <div class="policy-title">⚠️ Politika e Anulimit</div>
      Anulimi falas deri 48 orë para check-in · Pas kësaj afati zbatohet tarifa e plotë e qëndrimit.
      Rezervimi konfirmohet pas pagesës së paradhënies.
    </div>
  </div>

  <div class="footer">
    <div class="f-left"><strong>${comp?.name || ''}</strong><br>${comp?.phone || ''}${comp?.email ? ' · ' + comp.email : ''}</div>
    <div class="f-right">${inv.invoice_number} · ${new Date().toLocaleDateString('sq-AL')}<br>Gjeneruar nga Fiscalix</div>
  </div>

  </div></div>
</body></html>`

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
