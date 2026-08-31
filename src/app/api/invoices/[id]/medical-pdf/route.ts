import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: inv } = await supabase
    .from('invoices')
    .select('*, invoice_items(*), companies(*)')
    .eq('id', id)
    .single()

  if (!inv) return NextResponse.json({ error: 'Nuk u gjet' }, { status: 404 })

  const comp = inv.companies as Record<string, string> | null
  const items = (inv.invoice_items || []) as { description: string; unit_price: number; total: number }[]
  const age = inv.patient_birth_year ? new Date().getFullYear() - inv.patient_birth_year : null
  const genderLabel: Record<string, string> = { M: 'Mashkull', F: 'Femër', other: 'Tjetër' }

  const html = `<!DOCTYPE html>
<html lang="sq">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  @page { size: A4 portrait; margin: 10mm }
  * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important }
  html { font-size: 12px }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a2e; background: #f3f4f6; min-height: 100vh }

  .toolbar { position: fixed; top: 0; left: 0; right: 0; background: #1a1a2e; padding: 10px 20px; display: flex; gap: 10px; align-items: center; z-index: 100; box-shadow: 0 2px 8px rgba(0,0,0,0.3) }
  .toolbar-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; font-size: 13px; font-weight: 600; font-family: inherit }
  .btn-print { background: #2563eb; color: white }
  .btn-close { margin-left: auto; background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.7) }
  .toolbar-title { color: rgba(255,255,255,0.6); font-size: 13px; margin-left: 10px }

  .page-wrap { padding-top: 60px; display: flex; justify-content: center; padding-bottom: 40px }
  .page {
    background: white;
    width: 210mm;
    min-height: 297mm;
    position: relative;
    box-shadow: 0 4px 32px rgba(0,0,0,0.15);
    display: flex;
    flex-direction: column;
  }
  .body {
    flex: 1;
  }

  @media print {
    .toolbar { display: none !important }
    .page-wrap { padding: 0; background: white }
    .page { box-shadow: none; width: 100%; min-height: auto }
    @page { margin: 10mm }
  }

  .header { background: linear-gradient(135deg, #1a4a8a 0%, #2563eb 100%); color: white; padding: 24px 32px 20px; display: flex; justify-content: space-between; align-items: flex-start }
  .clinic-name { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 4px }
  .clinic-sub { font-size: 11px; opacity: 0.75; line-height: 1.6 }
  .doc-title { text-align: right }
  .doc-title h2 { font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; opacity: 0.7; margin-bottom: 4px }
  .doc-title .num { font-size: 20px; font-weight: 900; letter-spacing: 1px }

  .body { padding: 24px 32px }

  .patient-card { background: #f0f7ff; border: 1.5px solid #2563eb; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px }
  .patient-card .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; font-weight: 700; margin-bottom: 3px }
  .patient-card .value { font-size: 13px; font-weight: 700; color: #1a1a2e }
  .patient-card .patient-name { grid-column: 1/-1 }
  .patient-card .patient-name .value { font-size: 18px; color: #1a4a8a }

  .diagnosis-box { background: #fff8f0; border-left: 4px solid #f97316; border-radius: 0 8px 8px 0; padding: 12px 16px; margin-bottom: 20px }
  .diagnosis-box .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #f97316; font-weight: 700; margin-bottom: 5px }
  .diagnosis-box .value { font-size: 13px; color: #1a1a2e; font-weight: 600; line-height: 1.5 }

  .services { margin-bottom: 20px }
  .services h3 { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; font-weight: 700; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px }
  .service-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f3f4f6 }
  .service-row:last-child { border-bottom: none }
  .service-name { font-size: 12px; color: #374151; flex: 1 }
  .service-price { font-size: 13px; font-weight: 700; color: #1a4a8a; min-width: 70px; text-align: right }

  .total-row { background: #1a4a8a; color: white; border-radius: 10px; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px }
  .total-label { font-size: 13px; font-weight: 600 }
  .total-amount { font-size: 22px; font-weight: 900 }

  .notes-box { background: #f9fafb; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px }
  .notes-box .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; font-weight: 700; margin-bottom: 5px }
  .notes-box .value { font-size: 11px; color: #374151; line-height: 1.6 }

  .qr-section { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px }
  .qr-info { flex: 1 }
  .qr-info .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; font-weight: 700; margin-bottom: 4px }
  .qr-info .value { font-size: 11px; color: #374151; line-height: 1.5 }
  .qr-box { width: 72px; height: 72px; border: 1.5px solid #e5e7eb; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: white }
  .qr-placeholder { font-size: 8px; text-align: center; color: #9ca3af; line-height: 1.4 }

  .footer { background: #f8faff; border-top: 1px solid #e5e7eb; padding: 12px 32px; display: flex; justify-content: space-between; align-items: center }
  .footer-left { font-size: 10px; color: #6b7280; line-height: 1.6 }
  .footer-right { font-size: 10px; color: #9ca3af; text-align: right }

  .paid-stamp { position: absolute; top: 140px; right: 32px; border: 3px solid #10b981; border-radius: 8px; padding: 6px 14px; transform: rotate(-12deg); color: #10b981; font-size: 16px; font-weight: 900; letter-spacing: 2px; opacity: 0.35 }

  .meta-row { display: flex; gap: 20px; margin-bottom: 16px }
  .meta-item .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; font-weight: 700; margin-bottom: 3px }
  .meta-item .value { font-size: 12px; font-weight: 600; color: #1a1a2e }

  .divider { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0 }
</style>
</head>
<body>

  <!-- TOOLBAR -->
  <div class="toolbar">
    <button class="toolbar-btn btn-print" onclick="window.print()">🖨️ Printo / Shkarko PDF</button>
    <span class="toolbar-title">${inv.invoice_number} — ${inv.client_name}</span>
    <button class="toolbar-btn btn-close" onclick="window.close()">✕ Mbyll</button>
  </div>

  <div class="page-wrap">
  <div class="page">
  <div class="paid-stamp">E PAGUAR</div>

  <!-- HEADER -->
  <div class="header">
    <div>
      <div class="clinic-name">${comp?.name || 'Klinika'}</div>
      <div class="clinic-sub">
        ${comp?.address ? comp.address + '<br>' : ''}
        ${comp?.phone ? 'Tel: ' + comp.phone : ''}
        ${comp?.email ? ' · ' + comp.email : ''}
        ${comp?.vat_number ? '<br>NUI: ' + comp.vat_number : ''}
      </div>
    </div>
    <div class="doc-title">
      <h2>Raport Mjekësor</h2>
      <div class="num">${inv.invoice_number}</div>
    </div>
  </div>

  <!-- BODY -->
  <div class="body">

    <!-- Meta info -->
    <div class="meta-row">
      <div class="meta-item">
        <div class="label">Data e Kontrollit</div>
        <div class="value">${new Date(inv.issue_date).toLocaleDateString('sq-AL', { day:'2-digit', month:'long', year:'numeric' })}</div>
      </div>
    </div>

    <!-- Patient Card -->
    <div class="patient-card">
      <div class="patient-name">
        <div class="label">Pacienti</div>
        <div class="value">${inv.client_name}</div>
      </div>
      ${inv.patient_gender ? `<div><div class="label">Gjinia</div><div class="value">${genderLabel[inv.patient_gender] || inv.patient_gender}</div></div>` : ''}
      ${inv.patient_birth_year ? `<div><div class="label">Viti i Lindjes · Mosha</div><div class="value">${inv.patient_birth_year}${age ? ' · ' + age + ' vjeç' : ''}</div></div>` : ''}
    </div>

    <!-- Diagnosis -->
    ${inv.diagnosis ? `
    <div class="diagnosis-box">
      <div class="label">Diagnoza / Arsyeja e Vizitës</div>
      <div class="value">${inv.diagnosis}</div>
    </div>` : ''}

    <!-- Services -->
    <div class="services">
      <h3>Shërbimet Mjekësore</h3>
      ${items.map(item => `
        <div class="service-row">
          <div class="service-name">${item.description}</div>
          <div class="service-price">€${Number(item.unit_price).toFixed(2)}</div>
        </div>
      `).join('')}
    </div>

    <!-- Total -->
    <div class="total-row">
      <div class="total-label">Totali i Paguar</div>
      <div class="total-amount">€${Number(inv.total_amount).toFixed(2)}</div>
    </div>

    <!-- Notes -->
    ${inv.notes ? `
    <div class="notes-box">
      <div class="label">Rekomandime & Shënime</div>
      <div class="value">${inv.notes}</div>
    </div>` : ''}

    <hr class="divider">

    <!-- QR Section -->
    <div class="qr-section">
      <div class="qr-info">
        <div class="label">Informacioni i Raportit</div>
        <div class="value">
          Ky dokument është raport mjekësor i lëshuar nga ${comp?.name || 'klinika'}.<br>
          Kodi QR përmban të dhënat e pacientit dhe historikun mjekësor.
        </div>
      </div>
      <div class="qr-box">
        <div class="qr-placeholder">QR<br>Diagnoza</div>
      </div>
    </div>

    <!-- Doctor signature -->
    <div style="margin-top:24px; display:flex; justify-content:flex-end">
      <div style="text-align:center; min-width:160px">
        <div style="border-bottom:1px solid #374151; margin-bottom:6px; height:40px"></div>
        <div style="font-size:10px; color:#6b7280">Vula dhe Nënshkrimi i Mjekut</div>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-left">
      <strong>${comp?.name || ''}</strong><br>
      ${comp?.phone ? 'Tel: ' + comp.phone + ' · ' : ''}${comp?.email || ''}
    </div>
    <div class="footer-right">
      Gjeneruar nga Fiscalix · ${new Date().toLocaleDateString('sq-AL')}<br>
      ${inv.invoice_number}
    </div>
  </div>
  </div><!-- end .page -->
  </div><!-- end .page-wrap -->

</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="Raport_${inv.invoice_number}.html"`,
    }
  })
}
