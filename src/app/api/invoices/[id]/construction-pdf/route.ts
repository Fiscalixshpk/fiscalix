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
  const projectName = notes.find((n:string) => n.startsWith('Projekti:'))?.replace('Projekti:','').trim() || ''
  const projectLocation = notes.find((n:string) => n.startsWith('Lokacioni:'))?.replace('Lokacioni:','').trim() || ''
  const contractNumber = notes.find((n:string) => n.startsWith('Nr. Kontratës:'))?.replace('Nr. Kontratës:','').trim() || ''
  const advancePaid = parseFloat(notes.find((n:string) => n.startsWith('Avans i paguar:'))?.replace('Avans i paguar: €','').trim() || '0') || 0
  const toPay = Number(inv.total_amount) - advancePaid

  const html = `<!DOCTYPE html>
<html lang="sq">
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4 portrait; margin: 12mm }
  * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a2e; background: #f0f0f0; }

  .toolbar { position:fixed; top:0; left:0; right:0; background:#1a1a2e; padding:10px 20px; display:flex; gap:10px; align-items:center; z-index:100 }
  .toolbar button { padding:8px 16px; border-radius:8px; border:none; cursor:pointer; font-size:13px; font-weight:600; font-family:inherit }
  .btn-print { background:#F59E0B; color:#1a1a2e }
  .btn-close { margin-left:auto; background:rgba(255,255,255,0.1); color:rgba(255,255,255,0.7) }
  .toolbar-title { color:rgba(255,255,255,0.6); font-size:13px; margin-left:10px }
  .page-wrap { padding-top:60px; display:flex; justify-content:center; padding-bottom:40px }
  .page { background:white; width:210mm; min-height:297mm; position:relative; box-shadow:0 4px 32px rgba(0,0,0,0.15); display:flex; flex-direction:column; }
  .body { padding:20px 28px; flex:1; }
  @media print { .toolbar { display:none } .page-wrap { padding:0; background:white } .page { box-shadow:none; width:100% } }

  .header { background:#1a2744; color:white; padding:22px 28px 18px; display:flex; justify-content:space-between; align-items:flex-start }
  .company-name { font-size:20px; font-weight:900; margin-bottom:4px; letter-spacing:-0.3px }
  .company-info { font-size:10px; opacity:0.65; line-height:1.7 }
  .doc-type { text-align:right }
  .doc-type-label { font-size:10px; letter-spacing:0.15em; text-transform:uppercase; opacity:0.6; margin-bottom:3px }
  .doc-number { font-size:24px; font-weight:900; color:#F59E0B }

  .meta-strip { background:#F59E0B; color:#1a1a2e; padding:8px 28px; display:flex; gap:24px }
  .meta-item { font-size:10px; font-weight:700 }
  .meta-item span { font-size:11px; font-weight:900 }

  .parties { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:18px }
  .party-box { background:#f8f9fa; border:1px solid #e9ecef; border-radius:8px; padding:12px 14px }
  .party-label { font-size:8px; text-transform:uppercase; letter-spacing:0.12em; color:#6c757d; font-weight:700; margin-bottom:5px }
  .party-name { font-size:14px; font-weight:800; color:#1a1a2e; margin-bottom:3px }
  .party-detail { font-size:10px; color:#6c757d; line-height:1.5 }

  .project-box { background:#fff3cd; border:1px solid #ffc107; border-radius:8px; padding:12px 16px; margin-bottom:18px; display:flex; gap:20px }
  .project-item { flex:1 }
  .project-item .label { font-size:8px; text-transform:uppercase; letter-spacing:0.1em; color:#856404; font-weight:700; margin-bottom:3px }
  .project-item .value { font-size:12px; font-weight:700; color:#1a1a2e }

  table { width:100%; border-collapse:collapse; margin-bottom:16px; font-size:11px }
  thead tr { background:#1a2744; color:white }
  th { padding:9px 10px; text-align:left; font-size:9px; text-transform:uppercase; letter-spacing:0.08em; font-weight:700 }
  th.right { text-align:right }
  td { padding:8px 10px; border-bottom:1px solid #f1f3f4; color:#374151 }
  td.right { text-align:right; font-weight:600 }
  tr:nth-child(even) td { background:#f8f9fa }
  .total-label { font-size:10px; color:#6c757d; font-weight:600 }

  .totals { margin-left:auto; width:240px }
  .total-row { display:flex; justify-content:space-between; padding:5px 0; font-size:11px; color:#6c757d; border-bottom:1px solid #f1f3f4 }
  .total-row-vat { display:flex; justify-content:space-between; padding:5px 0; font-size:11px; color:#856404; background:#fff3cd; padding:6px 10px; border-radius:4px; margin:4px 0 }
  .total-final { display:flex; justify-content:space-between; padding:10px 12px; background:#1a2744; color:white; border-radius:8px; margin-top:8px }
  .total-final-label { font-size:12px; font-weight:700 }
  .total-final-amount { font-size:20px; font-weight:900; color:#F59E0B }

  .footer { border-top:2px solid #1a2744; padding:14px 28px; margin-top:20px; display:flex; justify-content:space-between; align-items:flex-end }
  .signature-box { text-align:center; min-width:140px }
  .signature-line { border-bottom:1px solid #374151; margin-bottom:5px; height:35px }
  .signature-label { font-size:9px; color:#6c757d }
  .footer-meta { font-size:9px; color:#9ca3af; text-align:right; line-height:1.7 }
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
      <div class="company-name">${comp?.name || ''}</div>
      <div class="company-info">
        ${comp?.address ? comp.address + '<br>' : ''}
        ${comp?.phone ? 'Tel: ' + comp.phone : ''}
        ${comp?.email ? ' · ' + comp.email : ''}
        ${comp?.vat_number ? '<br>NUI TVSH: ' + comp.vat_number : ''}
      </div>
    </div>
    <div class="doc-type">
      <div class="doc-type-label">Dokument Financiar</div>
      <div class="doc-number">${inv.invoice_number}</div>
    </div>
  </div>

  <div class="meta-strip">
    <div class="meta-item">Data: <span>${new Date(inv.issue_date).toLocaleDateString('sq-AL', { day:'2-digit', month:'long', year:'numeric' })}</span></div>
    ${inv.due_date ? `<div class="meta-item">Afati: <span>${new Date(inv.due_date).toLocaleDateString('sq-AL', { day:'2-digit', month:'long', year:'numeric' })}</span></div>` : ''}
    ${contractNumber ? `<div class="meta-item">Kontrata: <span>${contractNumber}</span></div>` : ''}
  </div>

  <div class="body">

    <div class="parties">
      <div class="party-box">
        <div class="party-label">Kontraktor / Lëshues</div>
        <div class="party-name">${comp?.name || ''}</div>
        <div class="party-detail">
          ${comp?.address || ''}<br>
          ${comp?.vat_number ? 'NUI: ' + comp.vat_number : ''}
        </div>
      </div>
      <div class="party-box">
        <div class="party-label">Investitor / Porositës</div>
        <div class="party-name">${inv.client_name}</div>
        <div class="party-detail">
          ${inv.client_address || ''}<br>
          ${inv.client_vat ? 'NUI: ' + inv.client_vat : ''}
        </div>
      </div>
    </div>

    ${(projectName || projectLocation) ? `
    <div class="project-box">
      ${projectName ? `<div class="project-item"><div class="label">Projekti</div><div class="value">${projectName}</div></div>` : ''}
      ${projectLocation ? `<div class="project-item"><div class="label">Lokacioni</div><div class="value">${projectLocation}</div></div>` : ''}
    </div>` : ''}

    <table>
      <thead>
        <tr>
          <th style="width:35px">Nr.</th>
          <th>Përshkrimi / Zëri i Punës</th>
          <th class="right" style="width:70px">Sasia</th>
          <th class="right" style="width:85px">Çmimi/Njësi</th>
          <th class="right" style="width:90px">Totali €</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((item, i) => `
        <tr>
          <td>${i+1}</td>
          <td>${item.description}</td>
          <td class="right">${item.quantity}</td>
          <td class="right">€${Number(item.unit_price).toFixed(2)}</td>
          <td class="right" style="font-weight:800; color:#1a2744">€${Number(item.total).toFixed(2)}</td>
        </tr>`).join('')}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row"><span>Nëntotali:</span><span>€${Number(inv.subtotal).toFixed(2)}</span></div>
      ${Number(inv.tax_rate) > 0 ? `<div class="total-row-vat"><span>TVSH ${inv.tax_rate}%:</span><span>€${Number(inv.tax_amount).toFixed(2)}</span></div>` : ''}
      ${advancePaid > 0 ? `<div class="total-row"><span>(-) Avans i paguar:</span><span style="color:#dc2626">-€${advancePaid.toFixed(2)}</span></div>` : ''}
      <div class="total-final">
        <span class="total-final-label">${advancePaid > 0 ? 'PËR PAGESË:' : 'TOTALI:'}</span>
        <span class="total-final-amount">€${toPay.toFixed(2)}</span>
      </div>
    </div>

  </div>

  <div class="footer">
    <div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Lëshoi / Firma</div>
      </div>
    </div>
    <div class="footer-meta">
      ${comp?.name || ''} · ${comp?.phone || ''}<br>
      ${inv.invoice_number} · Gjeneruar nga Fiscalix<br>
      ${new Date().toLocaleDateString('sq-AL')}
    </div>
    <div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Pranoi / Investitori</div>
      </div>
    </div>
  </div>

  </div></div>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  })
}
