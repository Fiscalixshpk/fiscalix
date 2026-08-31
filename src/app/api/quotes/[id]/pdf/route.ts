import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: quote } = await supabase
    .from('quotes').select('*, items:quote_items(*), companies(name, address, vat_number, email, phone)')
    .eq('id', id).single()

  if (!quote) return NextResponse.json({ error: 'Nuk u gjet' }, { status: 404 })

  const comp = quote.companies as { name?: string; address?: string; vat_number?: string; email?: string; phone?: string } | null

  const html = `<!DOCTYPE html>
<html lang="sq">
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #1F2937; padding: 40px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:40px; border-bottom:2px solid #5A1FD6; padding-bottom:20px }
  .logo { font-size:22px; font-weight:900; color:#5A1FD6 }
  .doc-title { font-size:28px; font-weight:900; color:#5A1FD6; text-align:right }
  .doc-number { font-size:13px; color:#6B7280; text-align:right }
  .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:30px; margin-bottom:30px }
  .info-block h4 { font-size:10px; text-transform:uppercase; letter-spacing:0.08em; color:#9CA3AF; margin-bottom:8px }
  .info-block p { font-size:13px; color:#1F2937; line-height:1.6 }
  table { width:100%; border-collapse:collapse; margin-bottom:20px }
  th { background:#F3F0FF; color:#5A1FD6; padding:10px 12px; text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:0.05em }
  td { padding:10px 12px; border-bottom:1px solid #F3F4F6; font-size:13px }
  tr:nth-child(even) td { background:#FAFAFA }
  .totals { margin-left:auto; width:280px }
  .total-row { display:flex; justify-content:space-between; padding:6px 0; font-size:13px; color:#6B7280 }
  .total-final { display:flex; justify-content:space-between; padding:10px 0; font-size:16px; font-weight:900; color:#5A1FD6; border-top:2px solid #5A1FD6; margin-top:6px }
  .footer { margin-top:40px; padding-top:16px; border-top:1px solid #E5E7EB; font-size:11px; color:#9CA3AF; text-align:center }
  .valid-badge { display:inline-block; padding:4px 12px; border-radius:20px; background:#EEF2FF; color:#5A1FD6; font-size:11px; font-weight:700; margin-bottom:16px }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Fiscalix</div>
      <p style="color:#6B7280;font-size:12px;margin-top:4px">${comp?.name || ''}</p>
      ${comp?.address ? `<p style="color:#6B7280;font-size:12px">${comp.address}</p>` : ''}
      ${comp?.vat_number ? `<p style="color:#6B7280;font-size:12px">NUI TVSH: ${comp.vat_number}</p>` : ''}
    </div>
    <div>
      <div class="doc-title">OFERTË</div>
      <div class="doc-number">${quote.quote_number}</div>
    </div>
  </div>

  <span class="valid-badge">Vlefshme deri: ${quote.valid_until || '30 ditë'}</span>

  <div class="info-grid">
    <div class="info-block">
      <h4>Lëshuar nga</h4>
      <p>${comp?.name || ''}</p>
      ${comp?.email ? `<p>${comp.email}</p>` : ''}
      ${comp?.phone ? `<p>${comp.phone}</p>` : ''}
    </div>
    <div class="info-block">
      <h4>Drejtuar</h4>
      <p style="font-weight:700">${quote.client_name}</p>
      ${quote.client_email ? `<p>${quote.client_email}</p>` : ''}
      ${quote.client_address ? `<p>${quote.client_address}</p>` : ''}
    </div>
    <div class="info-block">
      <h4>Data e Lëshimit</h4>
      <p>${quote.issue_date}</p>
    </div>
    <div class="info-block">
      <h4>Numri Ofertës</h4>
      <p style="font-weight:700;color:#5A1FD6">${quote.quote_number}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Nr.</th><th>Përshkrimi</th><th style="text-align:right">Sasia</th><th style="text-align:right">Çmimi</th><th style="text-align:right">Totali</th>
      </tr>
    </thead>
    <tbody>
      ${(quote.items || []).map((item: { description: string; quantity: number; unit_price: number; total: number }, i: number) => `
      <tr>
        <td>${i+1}</td>
        <td>${item.description}</td>
        <td style="text-align:right">${item.quantity}</td>
        <td style="text-align:right">€${Number(item.unit_price).toFixed(2)}</td>
        <td style="text-align:right;font-weight:700">€${Number(item.total).toFixed(2)}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row"><span>Nëntotali:</span><span>€${Number(quote.subtotal).toFixed(2)}</span></div>
    <div class="total-row"><span>TVSH ${quote.vat_rate}%:</span><span>€${Number(quote.vat_amount).toFixed(2)}</span></div>
    <div class="total-final"><span>TOTALI:</span><span>€${Number(quote.total_amount).toFixed(2)}</span></div>
  </div>

  ${quote.notes ? `<div style="margin-top:24px;padding:14px;background:#F9FAFB;border-radius:8px;border-left:3px solid #5A1FD6"><p style="font-size:11px;color:#9CA3AF;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.05em">Shënime</p><p style="font-size:13px;color:#374151">${quote.notes}</p></div>` : ''}

  <div class="footer">
    <p>Gjeneruar nga Fiscalix · ${new Date().toLocaleDateString('sq-AL')} · Kjo ofertë është vlefshme deri më ${quote.valid_until || '30 ditë nga data e lëshimit'}</p>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    }
  })
}
