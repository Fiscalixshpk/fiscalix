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
  const projectName = notes.find((n:string) => n.startsWith('Projekti:'))?.replace('Projekti:','').trim() || ''
  const techStack = notes.find((n:string) => n.startsWith('Tech Stack:'))?.replace('Tech Stack:','').trim() || ''
  const period = notes.find((n:string) => n.startsWith('Periudha:'))?.replace('Periudha:','').trim() || ''
  const projectNumber = notes.find((n:string) => n.startsWith('Nr. Projektit:'))?.replace('Nr. Projektit:','').trim() || ''
  const discount = parseFloat(notes.find((n:string) => n.startsWith('Skonto:'))?.match(/€([\d.]+)/)?.[1] || '0') || 0

  const html = `<!DOCTYPE html>
<html lang="sq">
<head><meta charset="UTF-8">
<style>
  @page { size:A4 portrait; margin:0 }
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

  .header { background:#0F172A; color:white; padding:24px 32px; display:flex; justify-content:space-between; align-items:flex-start }
  .company-name { font-size:22px; font-weight:900; letter-spacing:-0.5px; margin-bottom:4px }
  .company-sub { font-size:10px; opacity:0.55; line-height:1.7 }
  .badge { display:inline-block; background:rgba(16,185,129,0.2); color:#10B981; font-size:9px; font-weight:700; padding:3px 10px; border-radius:20px; letter-spacing:0.1em; text-transform:uppercase; margin-top:6px }
  .doc-right { text-align:right }
  .doc-type { font-size:9px; letter-spacing:0.2em; text-transform:uppercase; color:#10B981; font-weight:700; margin-bottom:4px }
  .doc-number { font-size:26px; font-weight:900; letter-spacing:-1px }

  .info-bar { background:#F0FDF4; border-bottom:1px solid #D1FAE5; padding:10px 32px; display:flex; gap:28px }
  .info-item { font-size:10px }
  .info-label { color:#6B7280; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; margin-right:5px }
  .info-value { color:#059669; font-weight:800 }

  .body { padding:22px 32px; flex:1 }
  .parties { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:18px }
  .party { padding:14px 16px; border-radius:8px }
  .party-from { background:#f8faff; border:1px solid #e2e8f0; border-left:3px solid #0F172A }
  .party-to { background:#f0fdf4; border:1px solid #a7f3d0; border-left:3px solid #10B981 }
  .party-label { font-size:8px; text-transform:uppercase; letter-spacing:0.15em; font-weight:700; margin-bottom:5px; color:#6b7280 }
  .party-name { font-size:14px; font-weight:800; color:#111827; margin-bottom:3px }
  .party-detail { font-size:10px; color:#6b7280; line-height:1.5 }

  .project-box { background:#0F172A; color:white; border-radius:8px; padding:12px 18px; margin-bottom:18px; display:flex; justify-content:space-between; align-items:center }
  .project-info .label { font-size:8px; text-transform:uppercase; letter-spacing:0.1em; color:#94A3B8; font-weight:700; margin-bottom:3px }
  .project-info .value { font-size:13px; font-weight:700; color:white }
  .tech-pills { display:flex; gap:6px; flex-wrap:wrap }
  .tech-pill { background:rgba(16,185,129,0.15); color:#10B981; font-size:9px; font-weight:700; padding:3px 9px; border-radius:12px; border:1px solid rgba(16,185,129,0.3) }

  table { width:100%; border-collapse:collapse; margin-bottom:18px }
  thead tr { background:#0F172A; color:white }
  th { padding:9px 12px; text-align:left; font-size:9px; text-transform:uppercase; letter-spacing:0.08em; font-weight:700 }
  th.right { text-align:right }
  td { padding:10px 12px; border-bottom:1px solid #f1f5f9; font-size:11px; color:#374151 }
  td.right { text-align:right; font-weight:700; color:#111827 }
  tr:nth-child(even) td { background:#f8faff }

  .totals-wrap { display:flex; justify-content:flex-end }
  .totals { width:260px }
  .total-row { display:flex; justify-content:space-between; padding:7px 0; font-size:11px; border-bottom:1px solid #f1f5f9 }
  .t-label { color:#6b7280 }
  .t-value { color:#111827; font-weight:600 }
  .total-final { display:flex; justify-content:space-between; align-items:center; padding:12px 16px; background:#0F172A; border-radius:8px; margin-top:10px }
  .tf-label { font-size:13px; font-weight:700; color:white }
  .tf-amount { font-size:24px; font-weight:900; color:#10B981 }

  .footer { border-top:1px solid #e2e8f0; padding:14px 32px; display:flex; justify-content:space-between; align-items:center }
  .footer-left { font-size:10px; color:#9ca3af; line-height:1.7 }
  .footer-right { font-size:10px; color:#9ca3af; text-align:right; line-height:1.7 }
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
      <div class="company-sub">${comp?.address || ''}${comp?.phone ? ' · Tel: ' + comp.phone : ''}${comp?.email ? ' · ' + comp.email : ''}<br>${comp?.vat_number ? 'NUI TVSH: ' + comp.vat_number : ''}</div>
      <span class="badge">IT & Tech</span>
    </div>
    <div class="doc-right">
      <div class="doc-type">Faturë</div>
      <div class="doc-number">${inv.invoice_number}</div>
    </div>
  </div>

  <div class="info-bar">
    <div class="info-item"><span class="info-label">Data:</span><span class="info-value">${new Date(inv.issue_date).toLocaleDateString('sq-AL', { day:'2-digit', month:'long', year:'numeric' })}</span></div>
    ${inv.due_date ? `<div class="info-item"><span class="info-label">Afati:</span><span class="info-value">${new Date(inv.due_date).toLocaleDateString('sq-AL', { day:'2-digit', month:'long', year:'numeric' })}</span></div>` : ''}
    ${period ? `<div class="info-item"><span class="info-label">Periudha:</span><span class="info-value">${period}</span></div>` : ''}
    ${projectNumber ? `<div class="info-item"><span class="info-label">Nr. Proj.:</span><span class="info-value">${projectNumber}</span></div>` : ''}
  </div>

  <div class="body">
    <div class="parties">
      <div class="party party-from">
        <div class="party-label">Zhvilluesi / Firma IT</div>
        <div class="party-name">${comp?.name || ''}</div>
        <div class="party-detail">${comp?.address || ''}<br>${comp?.vat_number ? 'NUI TVSH: ' + comp.vat_number : ''}</div>
      </div>
      <div class="party party-to">
        <div class="party-label">Klienti</div>
        <div class="party-name">${inv.client_name}</div>
        <div class="party-detail">${inv.client_email ? inv.client_email + '<br>' : ''}${inv.client_address || ''}${inv.client_vat ? '<br>NUI: ' + inv.client_vat : ''}</div>
      </div>
    </div>

    ${(projectName || techStack) ? `
    <div class="project-box">
      ${projectName ? `<div class="project-info"><div class="label">Projekti</div><div class="value">${projectName}</div></div>` : ''}
      ${techStack ? `<div class="tech-pills">${techStack.split(',').map((t:string) => `<span class="tech-pill">${t.trim()}</span>`).join('')}</div>` : ''}
    </div>` : ''}

    <table>
      <thead><tr>
        <th>Shërbimi / Task</th>
        <th class="right" style="width:80px">Sasia</th>
        <th class="right" style="width:100px">Tarifa</th>
        <th class="right" style="width:100px">Totali</th>
      </tr></thead>
      <tbody>
        ${items.map(item => `<tr>
          <td>${item.description}</td>
          <td class="right">${item.quantity}</td>
          <td class="right">€${Number(item.unit_price).toFixed(2)}</td>
          <td class="right" style="color:#059669">€${Number(item.total).toFixed(2)}</td>
        </tr>`).join('')}
      </tbody>
    </table>

    <div class="totals-wrap"><div class="totals">
      <div class="total-row"><span class="t-label">Nëntotali</span><span class="t-value">€${Number(inv.subtotal).toFixed(2)}</span></div>
      ${discount > 0 ? `<div class="total-row"><span class="t-label">(-) Skonto</span><span class="t-value" style="color:#d97706">-€${discount.toFixed(2)}</span></div>` : ''}
      ${Number(inv.tax_rate) > 0 ? `<div class="total-row"><span class="t-label">TVSH ${inv.tax_rate}%</span><span class="t-value">€${Number(inv.tax_amount).toFixed(2)}</span></div>` : ''}
      <div class="total-final">
        <span class="tf-label">TOTALI</span>
        <span class="tf-amount">€${Number(inv.total_amount).toFixed(2)}</span>
      </div>
    </div></div>
  </div>

  <div class="footer">
    <div class="footer-left"><strong>${comp?.name || ''}</strong><br>${comp?.phone || ''} · ${comp?.email || ''}</div>
    <div class="footer-right">${inv.invoice_number} · ${new Date().toLocaleDateString('sq-AL')}<br>Gjeneruar nga Fiscalix</div>
  </div>
  </div></div>
</body></html>`

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
