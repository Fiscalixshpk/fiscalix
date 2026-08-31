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
  const discount = Number(inv.discount_amount) || 0
  const statusLabel = inv.status === 'paid' ? 'E PAGUAR' : inv.status === 'overdue' ? 'E VONUAR' : 'NË PRITJE'
  const statusColor = inv.status === 'paid' ? '#10B981' : inv.status === 'overdue' ? '#EF4444' : '#F59E0B'

  const html = `<!DOCTYPE html>
<html lang="sq">
<head><meta charset="UTF-8">
<style>
  @page { size:A4 portrait; margin:12mm }
  * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important }
  body { font-family:'Helvetica Neue',Arial,sans-serif; color:#111827; background:#f0f0f0 }
  .toolbar { position:fixed; top:0; left:0; right:0; background:#111827; padding:10px 20px; display:flex; gap:10px; align-items:center; z-index:100 }
  .toolbar button { padding:8px 16px; border-radius:8px; border:none; cursor:pointer; font-size:13px; font-weight:600; font-family:inherit }
  .btn-print { background:#6D28D9; color:white }
  .btn-close { margin-left:auto; background:rgba(255,255,255,0.1); color:rgba(255,255,255,0.7) }
  .toolbar-title { color:rgba(255,255,255,0.6); font-size:13px; margin-left:10px }
  .page-wrap { padding-top:60px; display:flex; justify-content:center; padding-bottom:40px }
  .page { background:white; width:210mm; min-height:297mm; box-shadow:0 4px 32px rgba(0,0,0,0.15); display:flex; flex-direction:column }
  @media print { .toolbar{display:none} .page-wrap{padding:0;background:white} .page{box-shadow:none;width:100%} }

  .header { background:#1F1135; color:white; padding:22px 28px; display:flex; justify-content:space-between; align-items:flex-start }
  .co-name { font-size:22px; font-weight:900; margin-bottom:4px }
  .co-info { font-size:10px; opacity:0.6; line-height:1.7 }
  .doc-right { text-align:right }
  .doc-label { font-size:9px; letter-spacing:0.2em; text-transform:uppercase; color:#C4B5FD; font-weight:700; margin-bottom:3px }
  .doc-num { font-size:26px; font-weight:900 }
  .status-stamp { display:inline-block; border:2px solid ${statusColor}; border-radius:6px; padding:3px 10px; color:${statusColor}; font-size:11px; font-weight:900; letter-spacing:2px; margin-top:5px; transform:rotate(-4deg) }

  .meta { background:#F5F3FF; border-bottom:1px solid #DDD6FE; padding:9px 28px; display:flex; gap:20px; font-size:10px }
  .m-label { color:#6D28D9; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; margin-right:5px }
  .m-val { color:#1F1135; font-weight:800 }

  .body { padding:20px 28px; flex:1 }
  .parties { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:18px }
  .party { padding:13px 16px; border-radius:8px }
  .p-from { background:#f9fafb; border-left:3px solid #1F1135 }
  .p-to { background:#F5F3FF; border-left:3px solid #7C3AED }
  .p-label { font-size:8px; text-transform:uppercase; letter-spacing:0.12em; color:#9ca3af; font-weight:700; margin-bottom:4px }
  .p-name { font-size:14px; font-weight:800; color:#111827; margin-bottom:2px }
  .p-detail { font-size:10px; color:#6b7280; line-height:1.5 }

  table { width:100%; border-collapse:collapse; margin-bottom:16px }
  thead tr { background:#1F1135; color:white }
  th { padding:9px 12px; text-align:left; font-size:9px; text-transform:uppercase; letter-spacing:0.08em; font-weight:700 }
  th.r { text-align:right }
  td { padding:9px 12px; border-bottom:1px solid #F5F3FF; font-size:11px; color:#374151 }
  td.r { text-align:right; font-weight:700; color:#6D28D9 }
  tr:nth-child(even) td { background:#faf9ff }

  .totals { margin-left:auto; width:250px }
  .t-row { display:flex; justify-content:space-between; padding:7px 0; font-size:11px; border-bottom:1px solid #F5F3FF }
  .t-label { color:#6b7280 }
  .t-val { font-weight:600 }
  .t-final { display:flex; justify-content:space-between; align-items:center; padding:12px 16px; background:#1F1135; border-radius:9px; margin-top:8px; color:white }
  .tf-label { font-size:13px; font-weight:700 }
  .tf-amount { font-size:22px; font-weight:900; color:#C4B5FD }

  .notes-box { background:#F5F3FF; border:1px solid #DDD6FE; border-radius:8px; padding:11px 15px; margin-top:14px; font-size:10px; color:#4C1D95; line-height:1.7 }

  .footer { border-top:1px solid #EDE9FE; padding:13px 28px; display:flex; justify-content:space-between }
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
      <div class="co-info">${comp?.address ? comp.address + '<br>' : ''}${comp?.phone ? 'Tel: ' + comp.phone : ''}${comp?.email ? ' · ' + comp.email : ''}${comp?.vat_number ? '<br>NUI TVSH: ' + comp.vat_number : ''}</div>
    </div>
    <div class="doc-right">
      <div class="doc-label">Faturë Shërbimi</div>
      <div class="doc-num">${inv.invoice_number}</div>
      <div class="status-stamp">${statusLabel}</div>
    </div>
  </div>

  <div class="meta">
    <span><span class="m-label">Data:</span><span class="m-val">${new Date(inv.issue_date).toLocaleDateString('sq-AL', { day:'2-digit', month:'long', year:'numeric' })}</span></span>
    ${inv.due_date ? `<span><span class="m-label">Afati:</span><span class="m-val">${new Date(inv.due_date).toLocaleDateString('sq-AL', { day:'2-digit', month:'long', year:'numeric' })}</span></span>` : ''}
  </div>

  <div class="body">
    <div class="parties">
      <div class="party p-from">
        <div class="p-label">Ofruesi i Shërbimit</div>
        <div class="p-name">${comp?.name || ''}</div>
        <div class="p-detail">${comp?.address || ''}${comp?.vat_number ? '<br>NUI TVSH: ' + comp.vat_number : ''}</div>
      </div>
      <div class="party p-to">
        <div class="p-label">Klienti</div>
        <div class="p-name">${inv.client_name}</div>
        <div class="p-detail">${inv.client_address || ''}${inv.client_email ? '<br>' + inv.client_email : ''}${inv.client_vat ? '<br>NUI: ' + inv.client_vat : ''}</div>
      </div>
    </div>

    <table>
      <thead><tr>
        <th style="width:30px">Nr.</th>
        <th>Shërbimi / Puna e Kryer</th>
        <th class="r" style="width:70px">Sasia</th>
        <th class="r" style="width:95px">Çmimi/Njësi</th>
        <th class="r" style="width:100px">Totali €</th>
      </tr></thead>
      <tbody>
        ${items.map((item, i) => `<tr>
          <td style="color:#9ca3af;font-size:10px">${i+1}</td>
          <td>${item.description}</td>
          <td class="r">${item.quantity}</td>
          <td class="r">€${Number(item.unit_price).toFixed(2)}</td>
          <td class="r">€${Number(item.total).toFixed(2)}</td>
        </tr>`).join('')}
      </tbody>
    </table>

    <div class="totals">
      <div class="t-row"><span class="t-label">Nëntotali</span><span class="t-val">€${Number(inv.subtotal).toFixed(2)}</span></div>
      ${discount > 0 ? `<div class="t-row"><span class="t-label">(-) Zbritja</span><span class="t-val" style="color:#d97706">-€${discount.toFixed(2)}</span></div>` : ''}
      ${Number(inv.tax_rate) > 0 ? `<div class="t-row"><span class="t-label">TVSH ${inv.tax_rate}%</span><span class="t-val">€${Number(inv.tax_amount).toFixed(2)}</span></div>` : ''}
      <div class="t-final"><span class="tf-label">TOTALI</span><span class="tf-amount">€${Number(inv.total_amount).toFixed(2)}</span></div>
    </div>

    ${inv.notes ? `<div class="notes-box"><strong>Shënime:</strong> ${inv.notes}</div>` : ''}
  </div>

  <div class="footer">
    <div class="f-left"><strong>${comp?.name || ''}</strong><br>${comp?.phone || ''}${comp?.email ? ' · ' + comp.email : ''}</div>
    <div class="f-right">${inv.invoice_number} · ${new Date().toLocaleDateString('sq-AL')}<br>Gjeneruar nga Fiscalix</div>
  </div>
  </div></div>
</body></html>`

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
