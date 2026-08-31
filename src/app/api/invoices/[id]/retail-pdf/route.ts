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
  .btn-print { background:#059669; color:white }
  .btn-close { margin-left:auto; background:rgba(255,255,255,0.1); color:rgba(255,255,255,0.7) }
  .toolbar-title { color:rgba(255,255,255,0.6); font-size:13px; margin-left:10px }
  .page-wrap { padding-top:60px; display:flex; justify-content:center; padding-bottom:40px }
  .page { background:white; width:210mm; min-height:297mm; box-shadow:0 4px 32px rgba(0,0,0,0.15); display:flex; flex-direction:column }
  @media print { .toolbar{display:none} .page-wrap{padding:0;background:white} .page{box-shadow:none;width:100%} }

  .header { background:#064E3B; color:white; padding:22px 28px; display:flex; justify-content:space-between; align-items:flex-start }
  .co-name { font-size:22px; font-weight:900; margin-bottom:4px; letter-spacing:-0.5px }
  .co-info { font-size:10px; opacity:0.6; line-height:1.7 }
  .doc-right { text-align:right }
  .doc-label { font-size:9px; letter-spacing:0.2em; text-transform:uppercase; color:#6EE7B7; font-weight:700; margin-bottom:4px }
  .doc-number { font-size:26px; font-weight:900 }
  .status-stamp { display:inline-block; border:2.5px solid ${statusColor}; border-radius:6px; padding:4px 12px; color:${statusColor}; font-size:12px; font-weight:900; letter-spacing:2px; margin-top:6px; transform:rotate(-4deg) }

  .meta-strip { background:#ECFDF5; border-bottom:1px solid #A7F3D0; padding:9px 28px; display:flex; gap:24px }
  .m-item { font-size:10px }
  .m-label { color:#065F46; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; margin-right:5px }
  .m-value { color:#059669; font-weight:800 }

  .body { padding:20px 28px; flex:1 }

  .parties { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:18px }
  .party { padding:13px 16px; border-radius:8px }
  .party-from { background:#f9fafb; border-left:3px solid #064E3B }
  .party-to { background:#ECFDF5; border-left:3px solid #059669 }
  .p-label { font-size:8px; text-transform:uppercase; letter-spacing:0.12em; color:#9ca3af; font-weight:700; margin-bottom:5px }
  .p-name { font-size:14px; font-weight:800; color:#111827; margin-bottom:2px }
  .p-detail { font-size:10px; color:#6b7280; line-height:1.5 }

  table { width:100%; border-collapse:collapse; margin-bottom:16px }
  thead tr { background:#064E3B; color:white }
  th { padding:9px 12px; text-align:left; font-size:9px; text-transform:uppercase; letter-spacing:0.08em; font-weight:700 }
  th.r { text-align:right }
  td { padding:9px 12px; border-bottom:1px solid #f0fdf4; font-size:11px; color:#374151 }
  td.r { text-align:right; font-weight:600 }
  td.total-cell { text-align:right; font-weight:800; color:#064E3B; font-size:12px }
  tr:nth-child(even) td { background:#f9fafb }
  .nr { color:#9ca3af; font-size:10px }

  .totals { margin-left:auto; width:260px }
  .t-row { display:flex; justify-content:space-between; padding:7px 0; font-size:11px; border-bottom:1px solid #f0fdf4 }
  .t-label { color:#6b7280 }
  .t-val { font-weight:600; color:#111827 }
  .t-discount { background:#FEF3C7; padding:7px 10px; border-radius:6px; display:flex; justify-content:space-between; font-size:11px; margin:4px 0 }
  .t-final { display:flex; justify-content:space-between; align-items:center; padding:13px 16px; background:#064E3B; border-radius:9px; margin-top:10px; color:white }
  .tf-label { font-size:13px; font-weight:700 }
  .tf-amount { font-size:24px; font-weight:900; color:#6EE7B7 }

  .payment-box { background:#f0fdf4; border:1px solid #A7F3D0; border-radius:8px; padding:12px 16px; margin-top:16px; font-size:10px; color:#065F46 }
  .payment-title { font-weight:800; font-size:11px; margin-bottom:6px }

  .footer { border-top:1px solid #D1FAE5; padding:14px 28px; display:flex; justify-content:space-between; align-items:center }
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
      <div class="co-info">
        ${comp?.address ? comp.address + '<br>' : ''}
        ${comp?.phone ? 'Tel: ' + comp.phone : ''}${comp?.email ? ' · ' + comp.email : ''}
        ${comp?.vat_number ? '<br>NUI TVSH: ' + comp.vat_number : ''}
      </div>
    </div>
    <div class="doc-right">
      <div class="doc-label">Faturë Shitjeje</div>
      <div class="doc-number">${inv.invoice_number}</div>
      <div class="status-stamp">${statusLabel}</div>
    </div>
  </div>

  <div class="meta-strip">
    <div class="m-item"><span class="m-label">Data:</span><span class="m-value">${new Date(inv.issue_date).toLocaleDateString('sq-AL', { day:'2-digit', month:'long', year:'numeric' })}</span></div>
    ${inv.due_date ? `<div class="m-item"><span class="m-label">Afati:</span><span class="m-value">${new Date(inv.due_date).toLocaleDateString('sq-AL', { day:'2-digit', month:'long', year:'numeric' })}</span></div>` : ''}
  </div>

  <div class="body">
    <div class="parties">
      <div class="party party-from">
        <div class="p-label">Shitësi</div>
        <div class="p-name">${comp?.name || ''}</div>
        <div class="p-detail">${comp?.address || ''}${comp?.vat_number ? '<br>NUI TVSH: ' + comp.vat_number : ''}</div>
      </div>
      <div class="party party-to">
        <div class="p-label">Blerësi</div>
        <div class="p-name">${inv.client_name}</div>
        <div class="p-detail">${inv.client_address || ''}${inv.client_vat ? '<br>NUI Fiskal: ' + inv.client_vat : ''}</div>
      </div>
    </div>

    <table>
      <thead><tr>
        <th style="width:32px">Nr.</th>
        <th>Artikulli / Malli</th>
        <th class="r" style="width:70px">Sasia</th>
        <th class="r" style="width:90px">Çmimi/Njësi</th>
        <th class="r" style="width:100px">Totali €</th>
      </tr></thead>
      <tbody>
        ${items.map((item, i) => `
        <tr>
          <td><span class="nr">${i+1}</span></td>
          <td>${item.description}</td>
          <td class="r">${item.quantity}</td>
          <td class="r">€${Number(item.unit_price).toFixed(2)}</td>
          <td class="total-cell">€${Number(item.total).toFixed(2)}</td>
        </tr>`).join('')}
      </tbody>
    </table>

    <div class="totals">
      <div class="t-row"><span class="t-label">Nëntotali</span><span class="t-val">€${Number(inv.subtotal).toFixed(2)}</span></div>
      ${discount > 0 ? `<div class="t-discount"><span class="t-label">(-) Skonto</span><span style="color:#d97706;font-weight:600">-€${discount.toFixed(2)}</span></div>` : ''}
      ${Number(inv.tax_rate) > 0 ? `<div class="t-row"><span class="t-label">TVSH ${inv.tax_rate}%</span><span class="t-val">€${Number(inv.tax_amount).toFixed(2)}</span></div>` : ''}
      <div class="t-final">
        <span class="tf-label">TOTALI</span>
        <span class="tf-amount">€${Number(inv.total_amount).toFixed(2)}</span>
      </div>
    </div>

    <div class="payment-box">
      <div class="payment-title">Detajet e Pagesës</div>
      ${comp?.bank_account ? `Xhirollogaria: <strong>${comp.bank_account}</strong><br>` : ''}
      ${comp?.bank_name ? `Banka: ${comp.bank_name}<br>` : ''}
      ${comp?.name ? `Përfituesi: ${comp.name}` : ''}
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
