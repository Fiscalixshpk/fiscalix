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
  const period = notes.find((n:string) => n.startsWith('Periudha:'))?.replace('Periudha:','').trim() || ''
  const projectNumber = notes.find((n:string) => n.startsWith('Nr. Projektit:'))?.replace('Nr. Projektit:','').trim() || ''
  const discount = parseFloat(notes.find((n:string) => n.startsWith('Skonto:'))?.replace('Skonto: -€','').trim() || '0') || 0

  const html = `<!DOCTYPE html>
<html lang="sq">
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4 portrait; margin: 0 }
  * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111827; background: #f0f0f0 }

  .toolbar { position:fixed; top:0; left:0; right:0; background:#111827; padding:10px 20px; display:flex; gap:10px; align-items:center; z-index:100 }
  .toolbar button { padding:8px 16px; border-radius:8px; border:none; cursor:pointer; font-size:13px; font-weight:600; font-family:inherit }
  .btn-print { background:#3B82F6; color:white }
  .btn-close { margin-left:auto; background:rgba(255,255,255,0.1); color:rgba(255,255,255,0.7) }
  .toolbar-title { color:rgba(255,255,255,0.6); font-size:13px; margin-left:10px }
  .page-wrap { padding-top:60px; display:flex; justify-content:center; padding-bottom:40px }
  .page { background:white; width:210mm; min-height:297mm; box-shadow:0 4px 32px rgba(0,0,0,0.15); display:flex; flex-direction:column }
  @media print { .toolbar { display:none } .page-wrap { padding:0; background:white } .page { box-shadow:none; width:100% } }

  .accent-bar { height:5px; background:linear-gradient(90deg, #1D4ED8, #3B82F6, #60A5FA) }
  .header { padding:28px 36px 24px; display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid #f3f4f6 }
  .agency-name { font-size:24px; font-weight:900; color:#111827; letter-spacing:-1px }
  .agency-tagline { font-size:10px; color:#6b7280; margin-top:3px; letter-spacing:0.05em }
  .agency-contact { font-size:10px; color:#9ca3af; margin-top:8px; line-height:1.7 }
  .doc-right { text-align:right }
  .doc-label { font-size:10px; letter-spacing:0.2em; text-transform:uppercase; color:#3B82F6; font-weight:700; margin-bottom:4px }
  .doc-number { font-size:28px; font-weight:900; color:#111827; letter-spacing:-1px }

  .period-bar { background:#EFF6FF; padding:10px 36px; display:flex; gap:32px; border-bottom:1px solid #DBEAFE }
  .period-item { font-size:10px }
  .period-label { color:#93C5FD; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; margin-right:6px }
  .period-value { color:#1D4ED8; font-weight:800 }

  .body { padding:24px 36px; flex:1 }

  .parties { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px }
  .party { padding:16px 18px; border-radius:10px }
  .party-from { background:#f9fafb; border:1px solid #e5e7eb }
  .party-to { background:#EFF6FF; border:1px solid #BFDBFE }
  .party-label { font-size:8px; text-transform:uppercase; letter-spacing:0.15em; font-weight:700; margin-bottom:6px }
  .party-label-from { color:#9ca3af }
  .party-label-to { color:#3B82F6 }
  .party-name { font-size:15px; font-weight:800; color:#111827; margin-bottom:3px }
  .party-detail { font-size:10px; color:#6b7280; line-height:1.6 }

  ${projectName ? `.project-tag { display:inline-flex; align-items:center; gap:6px; background:#EFF6FF; border:1px solid #BFDBFE; border-radius:20px; padding:6px 14px; font-size:11px; font-weight:700; color:#1D4ED8; margin-bottom:18px }` : ''}

  table { width:100%; border-collapse:collapse; margin-bottom:20px }
  thead tr { border-bottom:2px solid #111827 }
  th { padding:10px 12px; text-align:left; font-size:9px; text-transform:uppercase; letter-spacing:0.1em; color:#6b7280; font-weight:700 }
  th.right { text-align:right }
  td { padding:12px 12px; border-bottom:1px solid #f3f4f6; font-size:12px; color:#374151 }
  td.right { text-align:right; font-weight:600; color:#111827 }
  tr:last-child td { border-bottom:none }

  .totals-wrap { display:flex; justify-content:flex-end }
  .totals { width:260px; border:1px solid #e5e7eb; border-radius:10px; overflow:hidden }
  .total-row { display:flex; justify-content:space-between; padding:10px 16px; font-size:11px; border-bottom:1px solid #f3f4f6 }
  .total-label { color:#6b7280 }
  .total-value { color:#111827; font-weight:600 }
  .total-discount { background:#FEF3C7 }
  .total-final-row { display:flex; justify-content:space-between; align-items:center; padding:14px 16px; background:linear-gradient(135deg,#1D4ED8,#3B82F6); color:white }
  .total-final-label { font-size:13px; font-weight:700 }
  .total-final-amount { font-size:24px; font-weight:900 }

  .footer { padding:20px 36px; border-top:1px solid #f3f4f6; display:flex; justify-content:space-between; align-items:center }
  .footer-left { font-size:10px; color:#9ca3af; line-height:1.7 }
  .footer-right { font-size:10px; color:#9ca3af; text-align:right; line-height:1.7 }
  .footer-brand { font-size:11px; font-weight:800; color:#3B82F6 }
</style>
</head>
<body>
  <div class="toolbar">
    <button class="btn-print" onclick="window.print()">🖨️ Printo / Shkarko PDF</button>
    <span class="toolbar-title">${inv.invoice_number} — ${inv.client_name}</span>
    <button class="btn-close" onclick="window.close()">✕</button>
  </div>

  <div class="page-wrap"><div class="page">
  <div class="accent-bar"></div>

  <div class="header">
    <div>
      <div class="agency-name">${comp?.name || ''}</div>
      <div class="agency-contact">
        ${comp?.phone ? 'Tel: ' + comp.phone : ''}${comp?.email ? ' · ' + comp.email : ''}<br>
        ${comp?.address || ''}${comp?.vat_number ? ' · NUI TVSH: ' + comp.vat_number : ''}
      </div>
    </div>
    <div class="doc-right">
      <div class="doc-label">Faturë</div>
      <div class="doc-number">${inv.invoice_number}</div>
    </div>
  </div>

  <div class="period-bar">
    <div class="period-item"><span class="period-label">Data:</span><span class="period-value">${new Date(inv.issue_date).toLocaleDateString('sq-AL', { day:'2-digit', month:'long', year:'numeric' })}</span></div>
    ${inv.due_date ? `<div class="period-item"><span class="period-label">Afati:</span><span class="period-value">${new Date(inv.due_date).toLocaleDateString('sq-AL', { day:'2-digit', month:'long', year:'numeric' })}</span></div>` : ''}
    ${period ? `<div class="period-item"><span class="period-label">Periudha:</span><span class="period-value">${period}</span></div>` : ''}
    ${projectNumber ? `<div class="period-item"><span class="period-label">Projekti:</span><span class="period-value">${projectNumber}</span></div>` : ''}
  </div>

  <div class="body">
    <div class="parties">
      <div class="party party-from">
        <div class="party-label party-label-from">Agjensia</div>
        <div class="party-name">${comp?.name || ''}</div>
        <div class="party-detail">${comp?.address || ''}<br>${comp?.vat_number ? 'NUI TVSH: ' + comp.vat_number : ''}</div>
      </div>
      <div class="party party-to">
        <div class="party-label party-label-to">Klienti / Brandi</div>
        <div class="party-name">${inv.client_name}</div>
        <div class="party-detail">
          ${inv.client_email ? inv.client_email + '<br>' : ''}
          ${inv.client_address || ''}${inv.client_vat ? '<br>NUI: ' + inv.client_vat : ''}
        </div>
      </div>
    </div>

    ${projectName ? `<div class="project-tag">📁 ${projectName}</div>` : ''}

    <table>
      <thead>
        <tr>
          <th>Shërbimi / Deliverable</th>
          <th class="right" style="width:80px">Sasia</th>
          <th class="right" style="width:100px">Çmimi</th>
          <th class="right" style="width:100px">Totali</th>
        </tr>
      </thead>
      <tbody>
        ${items.map(item => `
        <tr>
          <td>${item.description}</td>
          <td class="right">${item.quantity}</td>
          <td class="right">€${Number(item.unit_price).toFixed(2)}</td>
          <td class="right" style="font-weight:800;color:#1D4ED8">€${Number(item.total).toFixed(2)}</td>
        </tr>`).join('')}
      </tbody>
    </table>

    <div class="totals-wrap">
      <div class="totals">
        <div class="total-row"><span class="total-label">Nëntotali</span><span class="total-value">€${Number(inv.subtotal).toFixed(2)}</span></div>
        ${discount > 0 ? `<div class="total-row total-discount"><span class="total-label">(-) Skonto</span><span class="total-value" style="color:#d97706">-€${discount.toFixed(2)}</span></div>` : ''}
        ${Number(inv.tax_rate) > 0 ? `<div class="total-row"><span class="total-label">TVSH ${inv.tax_rate}%</span><span class="total-value">€${Number(inv.tax_amount).toFixed(2)}</span></div>` : ''}
        <div class="total-final-row">
          <span class="total-final-label">TOTALI</span>
          <span class="total-final-amount">€${Number(inv.total_amount).toFixed(2)}</span>
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    <div class="footer-left">
      <div class="footer-brand">${comp?.name || ''}</div>
      ${comp?.phone || ''} · ${comp?.email || ''}
    </div>
    <div class="footer-right">
      ${inv.invoice_number} · ${new Date().toLocaleDateString('sq-AL')}<br>
      Gjeneruar nga Fiscalix
    </div>
  </div>

  </div></div>
</body>
</html>`

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
