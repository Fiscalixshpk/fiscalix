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
  const originCountry = notes.find((n:string) => n.startsWith('Shteti Origjinës:'))?.replace('Shteti Origjinës:','').trim() || ''
  const clientCountry = notes.find((n:string) => n.startsWith('Shteti Blerësit:'))?.replace('Shteti Blerësit:','').trim() || ''
  const hsCode = notes.find((n:string) => n.startsWith('Kodi HS:'))?.replace('Kodi HS:','').trim() || ''
  const incoterm = notes.find((n:string) => n.startsWith('Incoterm:'))?.replace('Incoterm:','').trim() || 'DAP'
  const currency = notes.find((n:string) => n.startsWith('Valuta:'))?.replace('Valuta:','').trim() || 'EUR'
  const currSymbol = currency === 'EUR' ? '€' : currency

  const html = `<!DOCTYPE html>
<html lang="sq">
<head><meta charset="UTF-8">
<style>
  @page { size:A4 portrait; margin:12mm }
  * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important }
  body { font-family:'Helvetica Neue',Arial,sans-serif; color:#111827; background:#f0f0f0 }
  .toolbar { position:fixed; top:0; left:0; right:0; background:#111827; padding:10px 20px; display:flex; gap:10px; align-items:center; z-index:100 }
  .toolbar button { padding:8px 16px; border-radius:8px; border:none; cursor:pointer; font-size:13px; font-weight:600; font-family:inherit }
  .btn-print { background:#F59E0B; color:#111827 }
  .btn-close { margin-left:auto; background:rgba(255,255,255,0.1); color:rgba(255,255,255,0.7) }
  .toolbar-title { color:rgba(255,255,255,0.6); font-size:13px; margin-left:10px }
  .page-wrap { padding-top:60px; display:flex; justify-content:center; padding-bottom:40px }
  .page { background:white; width:210mm; min-height:297mm; box-shadow:0 4px 32px rgba(0,0,0,0.15); display:flex; flex-direction:column }
  @media print { .toolbar{display:none} .page-wrap{padding:0;background:white} .page{box-shadow:none;width:100%} }

  .header { background:#1C1007; color:white; padding:22px 28px; display:flex; justify-content:space-between; align-items:flex-start }
  .co-name { font-size:22px; font-weight:900; margin-bottom:4px }
  .co-info { font-size:10px; opacity:0.6; line-height:1.7 }
  .doc-right { text-align:right }
  .doc-label { font-size:9px; letter-spacing:0.2em; text-transform:uppercase; color:#FCD34D; font-weight:700; margin-bottom:3px }
  .doc-num { font-size:26px; font-weight:900 }
  .currency-badge { display:inline-block; background:#F59E0B; color:#111827; font-size:11px; font-weight:900; padding:3px 10px; border-radius:12px; margin-top:6px }

  .trade-bar { background:#FEF3C7; border-bottom:2px solid #FDE68A; padding:10px 28px; display:flex; gap:20px; align-items:center }
  .trade-item { font-size:10px; color:#92400E }
  .trade-item strong { font-size:12px; font-weight:800; color:#1C1007; margin-right:4px }
  .incoterm-box { margin-left:auto; background:#1C1007; color:#FCD34D; font-size:12px; font-weight:900; padding:4px 14px; border-radius:8px; letter-spacing:1px }

  .body { padding:20px 28px; flex:1; }
  .parties { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px }
  .party { padding:13px 16px; border-radius:8px }
  .party-seller { background:#f9fafb; border-left:3px solid #1C1007 }
  .party-buyer { background:#FEF3C7; border-left:3px solid #F59E0B }
  .p-label { font-size:8px; text-transform:uppercase; letter-spacing:0.12em; color:#9ca3af; font-weight:700; margin-bottom:4px }
  .p-name { font-size:14px; font-weight:800; color:#111827; margin-bottom:2px }
  .p-detail { font-size:10px; color:#6b7280; line-height:1.5 }

  .customs-box { background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:10px 16px; margin-bottom:16px; display:flex; gap:24px }
  .customs-item .label { font-size:8px; text-transform:uppercase; letter-spacing:0.1em; color:#9ca3af; font-weight:700; margin-bottom:3px }
  .customs-item .value { font-size:12px; font-weight:700; color:#111827 }

  .meta-row { display:flex; gap:16px; margin-bottom:16px; font-size:10px; color:#6b7280 }
  .meta-row span strong { color:#1C1007 }

  table { width:100%; border-collapse:collapse; margin-bottom:16px }
  thead tr { background:#1C1007; color:white }
  th { padding:9px 12px; text-align:left; font-size:9px; text-transform:uppercase; letter-spacing:0.08em; font-weight:700 }
  th.r { text-align:right }
  td { padding:9px 12px; border-bottom:1px solid #fef9ee; font-size:11px; color:#374151 }
  td.r { text-align:right; font-weight:700; color:#92400E }
  tr:nth-child(even) td { background:#fffbeb }

  .totals { margin-left:auto; width:260px }
  .t-row { display:flex; justify-content:space-between; padding:7px 0; font-size:11px; border-bottom:1px solid #fef9ee }
  .t-label { color:#6b7280 }
  .t-val { font-weight:600 }
  .t-final { display:flex; justify-content:space-between; align-items:center; padding:13px 16px; background:#1C1007; border-radius:9px; margin-top:10px; color:white }
  .tf-label { font-size:13px; font-weight:700 }
  .tf-amount { font-size:22px; font-weight:900; color:#FCD34D }

  .bank-box { background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:12px 16px; margin-top:16px; font-size:10px; color:#374151; line-height:1.8 }
  .bank-title { font-weight:800; font-size:11px; color:#1C1007; margin-bottom:6px }

  .footer { border-top:1px solid #fde68a; padding:14px 28px; display:flex; justify-content:space-between }
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
      <div class="doc-label">Commercial Invoice</div>
      <div class="doc-num">${inv.invoice_number}</div>
      <span class="currency-badge">${currency}</span>
    </div>
  </div>

  <div class="trade-bar">
    ${originCountry ? `<div class="trade-item"><strong>📦 ${originCountry}</strong>Origjina</div>` : ''}
    ${clientCountry ? `<div class="trade-item">→ <strong>🚩 ${clientCountry}</strong>Destinacioni</div>` : ''}
    ${hsCode ? `<div class="trade-item"><strong>${hsCode}</strong>Kodi HS</div>` : ''}
    <div class="incoterm-box">${incoterm}</div>
  </div>

  <div class="body">
    <div class="meta-row">
      <span>Data: <strong>${new Date(inv.issue_date).toLocaleDateString('sq-AL', { day:'2-digit', month:'long', year:'numeric' })}</strong></span>
      ${inv.due_date ? `<span>Afati: <strong>${new Date(inv.due_date).toLocaleDateString('sq-AL', { day:'2-digit', month:'long', year:'numeric' })}</strong></span>` : ''}
    </div>

    <div class="parties">
      <div class="party party-seller">
        <div class="p-label">Shitësi / Eksportuesi</div>
        <div class="p-name">${comp?.name || ''}</div>
        <div class="p-detail">${comp?.address || ''}${comp?.vat_number ? '<br>NUI TVSH: ' + comp.vat_number : ''}<br>${originCountry || 'Kosovë'}</div>
      </div>
      <div class="party party-buyer">
        <div class="p-label">Blerësi / Importuesi</div>
        <div class="p-name">${inv.client_name}</div>
        <div class="p-detail">${inv.client_address || ''}${inv.client_vat ? '<br>VAT: ' + inv.client_vat : ''}${clientCountry ? '<br>' + clientCountry : ''}</div>
      </div>
    </div>

    <table>
      <thead><tr>
        <th style="width:32px">Nr.</th>
        <th>Emërtimi i Mallit / Description of Goods</th>
        <th class="r" style="width:70px">Sasia</th>
        <th class="r" style="width:90px">Çmimi/Njësi</th>
        <th class="r" style="width:100px">Totali ${currency}</th>
      </tr></thead>
      <tbody>
        ${items.map((item, i) => `<tr>
          <td style="color:#9ca3af;font-size:10px">${i+1}</td>
          <td>${item.description}</td>
          <td class="r">${item.quantity}</td>
          <td class="r">${currSymbol}${Number(item.unit_price).toFixed(2)}</td>
          <td class="r">${currSymbol}${Number(item.total).toFixed(2)}</td>
        </tr>`).join('')}
      </tbody>
    </table>

    <div class="totals">
      <div class="t-row"><span class="t-label">Nëntotali / Subtotal</span><span class="t-val">${currSymbol}${Number(inv.subtotal).toFixed(2)}</span></div>
      ${Number(inv.tax_rate) > 0 ? `<div class="t-row"><span class="t-label">TVSH / VAT ${inv.tax_rate}%</span><span class="t-val">${currSymbol}${Number(inv.tax_amount).toFixed(2)}</span></div>` : ''}
      <div class="t-final">
        <span class="tf-label">TOTAL ${currency}</span>
        <span class="tf-amount">${currSymbol}${Number(inv.total_amount).toFixed(2)}</span>
      </div>
    </div>

    ${comp?.bank_account ? `
    <div class="bank-box">
      <div class="bank-title">Detajet Bankare / Banking Details</div>
      Përfituesi / Beneficiary: <strong>${comp.name}</strong><br>
      ${comp.bank_name ? 'Banka / Bank: <strong>' + comp.bank_name + '</strong><br>' : ''}
      IBAN / Account: <strong>${comp.bank_account}</strong>
    </div>` : ''}
  </div>

  <div class="footer">
    <div class="f-left"><strong>${comp?.name || ''}</strong><br>${comp?.phone || ''}${comp?.email ? ' · ' + comp.email : ''}</div>
    <div class="f-right">${inv.invoice_number} · ${new Date().toLocaleDateString('sq-AL')}<br>Gjeneruar nga Fiscalix</div>
  </div>

  </div></div>
</body></html>`

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
