import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: inv } = await supabase
    .from('invoices').select('*, invoice_items(*), companies(*)').eq('id', id).single()
  if (!inv) return NextResponse.json({ error: 'Nuk u gjet' }, { status: 404 })

  const comp = inv.companies as Record<string,string> | null
  const items = (inv.invoice_items || []) as { description: string; quantity: number; unit_price: number; total: number }[]
  const notes = (inv.notes || '').split('\n')
  const caseDesc = notes.find((n:string) => n.startsWith('Rasti/Çështja:'))?.replace('Rasti/Çështja:','').trim() || ''
  const caseNumber = notes.find((n:string) => n.startsWith('Nr. Dosjes:'))?.replace('Nr. Dosjes:','').trim() || ''
  const advancePaid = parseFloat(notes.find((n:string) => n.startsWith('Avans/Depozitë'))?.match(/€([\d.]+)/)?.[1] || '0') || 0
  const toPay = Number(inv.total_amount) - advancePaid

  const html = `<!DOCTYPE html>
<html lang="sq">
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4 portrait; margin: 14mm }
  * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important }
  body { font-family: 'Georgia', 'Times New Roman', serif; color: #1a1a2e; background: #f0f0f0 }

  .toolbar { position:fixed; top:0; left:0; right:0; background:#1a1a2e; padding:10px 20px; display:flex; gap:10px; align-items:center; z-index:100 }
  .toolbar button { padding:8px 16px; border-radius:8px; border:none; cursor:pointer; font-size:13px; font-weight:600; font-family:inherit }
  .btn-print { background:#8B5CF6; color:white }
  .btn-close { margin-left:auto; background:rgba(255,255,255,0.1); color:rgba(255,255,255,0.7) }
  .toolbar-title { color:rgba(255,255,255,0.6); font-size:13px; margin-left:10px }
  .page-wrap { padding-top:60px; display:flex; justify-content:center; padding-bottom:40px }
  .page { background:white; width:210mm; min-height:297mm; box-shadow:0 4px 32px rgba(0,0,0,0.15); display:flex; flex-direction:column }
  @media print { .toolbar { display:none } .page-wrap { padding:0; background:white } .page { box-shadow:none; width:100% } }

  .header { padding:28px 32px 20px; border-bottom:3px solid #1a1a2e; display:flex; justify-content:space-between; align-items:flex-start }
  .firm-name { font-size:22px; font-weight:900; color:#1a1a2e; letter-spacing:-0.5px; font-family:'Helvetica Neue',Arial,sans-serif }
  .firm-sub { font-size:10px; color:#6b7280; line-height:1.7; margin-top:4px; font-family:'Helvetica Neue',Arial,sans-serif }
  .doc-right { text-align:right }
  .doc-type-label { font-size:9px; letter-spacing:0.2em; text-transform:uppercase; color:#8B5CF6; font-weight:700; margin-bottom:3px; font-family:'Helvetica Neue',Arial,sans-serif }
  .doc-number { font-size:22px; font-weight:900; color:#1a1a2e; font-family:'Helvetica Neue',Arial,sans-serif }

  .meta { display:flex; gap:0; margin:16px 32px; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; font-family:'Helvetica Neue',Arial,sans-serif }
  .meta-item { flex:1; padding:10px 14px; border-right:1px solid #e5e7eb }
  .meta-item:last-child { border-right:none }
  .meta-label { font-size:8px; text-transform:uppercase; letter-spacing:0.12em; color:#9ca3af; font-weight:700; margin-bottom:3px }
  .meta-value { font-size:12px; font-weight:700; color:#1a1a2e }

  .body { padding:16px 32px; flex:1; font-family:'Helvetica Neue',Arial,sans-serif }

  .parties { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px }
  .party { padding:14px 16px; border-radius:8px }
  .party-from { background:#f3f4f6; border-left:3px solid #1a1a2e }
  .party-to { background:#f5f3ff; border-left:3px solid #8B5CF6 }
  .party-label { font-size:8px; text-transform:uppercase; letter-spacing:0.12em; color:#9ca3af; font-weight:700; margin-bottom:5px }
  .party-name { font-size:14px; font-weight:800; color:#1a1a2e; margin-bottom:3px }
  .party-detail { font-size:10px; color:#6b7280; line-height:1.5 }

  .case-box { background:#f5f3ff; border:1px solid #ddd6fe; border-radius:8px; padding:12px 16px; margin-bottom:16px }
  .case-label { font-size:8px; text-transform:uppercase; letter-spacing:0.12em; color:#8B5CF6; font-weight:700; margin-bottom:4px }
  .case-value { font-size:12px; color:#1a1a2e; font-weight:600; font-style:italic }

  table { width:100%; border-collapse:collapse; margin-bottom:16px; font-size:11px }
  thead tr { background:#1a1a2e; color:white }
  th { padding:9px 12px; text-align:left; font-size:9px; text-transform:uppercase; letter-spacing:0.08em; font-weight:700 }
  th.right { text-align:right }
  td { padding:9px 12px; border-bottom:1px solid #f3f4f6; color:#374151; font-size:11px }
  td.right { text-align:right; font-weight:600 }
  tr:nth-child(even) td { background:#faf9ff }

  .totals { margin-left:auto; width:260px }
  .total-row { display:flex; justify-content:space-between; padding:6px 0; font-size:11px; color:#6b7280; border-bottom:1px solid #f3f4f6 }
  .total-honorar { display:flex; justify-content:space-between; padding:12px 14px; background:linear-gradient(135deg,#6D28D9,#8B5CF6); color:white; border-radius:8px; margin-top:10px }
  .honorar-label { font-size:13px; font-weight:700 }
  .honorar-amount { font-size:22px; font-weight:900 }

  .confidential { background:#fff7ed; border:1px solid #fed7aa; border-radius:6px; padding:10px 14px; margin:16px 0; font-size:10px; color:#92400e; line-height:1.6 }

  .footer { border-top:1px solid #e5e7eb; padding:16px 32px; display:flex; justify-content:space-between; align-items:flex-end; font-family:'Helvetica Neue',Arial,sans-serif }
  .signature-box { text-align:center; min-width:160px }
  .signature-line { border-bottom:1px solid #374151; margin-bottom:5px; height:35px }
  .signature-label { font-size:9px; color:#9ca3af }
  .footer-meta { font-size:9px; color:#9ca3af; text-align:center; line-height:1.7 }
</style>
</head>
<body>
  <div class="toolbar">
    <button class="btn-print" onclick="window.print()">🖨️ Printo / Shkarko PDF</button>
    <span class="toolbar-title">${inv.invoice_number} — ${inv.client_name}</span>
    <button class="btn-close" onclick="window.close()">✕</button>
  </div>

  <div class="page-wrap"><div class="page">

  <div class="header">
    <div>
      <div class="firm-name">${comp?.name || ''}</div>
      <div class="firm-sub">
        ${comp?.address ? comp.address + '<br>' : ''}
        ${comp?.phone ? 'Tel: ' + comp.phone : ''}${comp?.email ? ' · ' + comp.email : ''}
        ${comp?.vat_number ? '<br>NUI TVSH: ' + comp.vat_number : ''}
      </div>
    </div>
    <div class="doc-right">
      <div class="doc-type-label">Faturë Honorari</div>
      <div class="doc-number">${inv.invoice_number}</div>
    </div>
  </div>

  <div class="meta">
    <div class="meta-item">
      <div class="meta-label">Data Lëshimit</div>
      <div class="meta-value">${new Date(inv.issue_date).toLocaleDateString('sq-AL', { day:'2-digit', month:'long', year:'numeric' })}</div>
    </div>
    ${inv.due_date ? `<div class="meta-item"><div class="meta-label">Afati Pagesës</div><div class="meta-value">${new Date(inv.due_date).toLocaleDateString('sq-AL', { day:'2-digit', month:'long', year:'numeric' })}</div></div>` : ''}
    ${caseNumber ? `<div class="meta-item"><div class="meta-label">Nr. Dosjes</div><div class="meta-value">${caseNumber}</div></div>` : ''}
  </div>

  <div class="body">
    <div class="parties">
      <div class="party party-from">
        <div class="party-label">Avokati / Firma Juridike</div>
        <div class="party-name">${comp?.name || ''}</div>
        <div class="party-detail">${comp?.address || ''}<br>${comp?.vat_number ? 'NUI: ' + comp.vat_number : ''}</div>
      </div>
      <div class="party party-to">
        <div class="party-label">Klienti / Pala</div>
        <div class="party-name">${inv.client_name}</div>
        <div class="party-detail">${inv.client_address || ''}<br>${inv.client_vat ? 'NUI: ' + inv.client_vat : ''}</div>
      </div>
    </div>

    ${caseDesc ? `<div class="case-box"><div class="case-label">Rasti / Çështja Juridike</div><div class="case-value">${caseDesc}</div></div>` : ''}

    <table>
      <thead>
        <tr>
          <th>Shërbimi / Puna Juridike</th>
          <th class="right" style="width:80px">Sasia</th>
          <th class="right" style="width:90px">Tarifa</th>
          <th class="right" style="width:90px">Totali €</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, i) => `
        <tr>
          <td>${item.description}</td>
          <td class="right">${item.quantity}</td>
          <td class="right">€${Number(item.unit_price).toFixed(2)}</td>
          <td class="right" style="font-weight:800; color:#6D28D9">€${Number(item.total).toFixed(2)}</td>
        </tr>`).join('')}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row"><span>Honorari:</span><span>€${Number(inv.subtotal).toFixed(2)}</span></div>
      ${Number(inv.tax_rate) > 0 ? `<div class="total-row"><span>TVSH ${inv.tax_rate}%:</span><span>€${Number(inv.tax_amount).toFixed(2)}</span></div>` : ''}
      ${advancePaid > 0 ? `<div class="total-row"><span>(-) Avans/Depozitë:</span><span style="color:#dc2626">-€${advancePaid.toFixed(2)}</span></div>` : ''}
      <div class="total-honorar">
        <span class="honorar-label">${advancePaid > 0 ? 'PËR PAGESË:' : 'HONORARI TOTAL:'}</span>
        <span class="honorar-amount">€${toPay.toFixed(2)}</span>
      </div>
    </div>

    <div class="confidential">
      ⚖️ <strong>Konfidencialitet:</strong> Ky dokument është konfidencial dhe i dërguar ekskluzivisht palës së adresuar. Honorari i avokatit është i mbrojtur sipas Ligjit nr. 04/L-193 për Avokatinë në Kosovë.
    </div>
  </div>

  <div class="footer">
    <div class="signature-box">
      <div class="signature-line"></div>
      <div class="signature-label">Avokati / Firma</div>
    </div>
    <div class="footer-meta">
      ${comp?.name || ''}<br>
      ${inv.invoice_number} · ${new Date().toLocaleDateString('sq-AL')}<br>
      Gjeneruar nga Fiscalix
    </div>
    <div class="signature-box">
      <div class="signature-line"></div>
      <div class="signature-label">Klienti / Pala</div>
    </div>
  </div>

  </div></div>
</body>
</html>`

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
