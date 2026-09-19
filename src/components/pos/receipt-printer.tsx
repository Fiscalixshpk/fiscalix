'use client'
// ── ATK-Compliant Receipt Printer ─────────────────────────────
// Konforme me: Kërkesat Specifike Teknike (Maj 2026) — Neni 25, 28, Shtojca F

export interface ReceiptItem {
  name: string
  quantity: number
  price: number       // ATK format: €1.50 = 15000
  unit: string
  taxRate: string     // 'A' | 'C' | 'D' | 'E'
  discount?: number   // në cents
}

export interface SplitPayment {
  cash: number
  card: number
}

export interface ReceiptData {
  company: {
    name: string
    nui: string
    vatNumber?: string
    address?: string
    city?: string
    phone?: string
    logo_url?: string
  }
  operator: string
  items: ReceiptItem[]
  totals: {
    subtotal: number
    discount: number
    total: number
    tax: number
    noTax: number
  }
  paymentMethod: 'cash' | 'card' | 'split' | 'voucher' | 'insurance' | 'other'
  splitPayment?: SplitPayment
  couponType: 'SALE' | 'CANCEL' | 'RETURN'
  status: 'fiscalized' | 'offline' | 'failed'
  receiptNumber?: string
  dailyCouponNo?: number
  nuikf?: string
  sefId?: string
  qrCodeData?: string
  issuedAt?: Date
  isOffline?: boolean
  referenceReceiptNo?: string
  cancelReason?: string
}

// ── Format helpers ─────────────────────────────────────────────
const fmtEUR = (cents: number) => `${(cents / 100).toFixed(2)}`

const TAX_RATES: Record<string, number> = { A: 0, C: 0, D: 0.08, E: 0.18 }
const TAX_PCT:   Record<string, string>  = { A: '0%', C: '0%', D: '8%', E: '18%' }

const PAYMENT_LABELS: Record<string, string> = {
  cash:      'Para te gatshme',
  card:      'Karte bankare',
  split:     'E kombinuar',
  voucher:   'Kupon/Voucher',
  insurance: 'Sigurim',
  other:     'Tjeter',
}

function groupTax(items: ReceiptItem[]) {
  const g: Record<string, { total: number; tax: number }> = {}
  for (const item of items) {
    const rate = item.taxRate || 'E'
    const tot  = Math.round((item.price / 100) * item.quantity) - (item.discount || 0)
    const r    = TAX_RATES[rate] ?? 0.18
    const tax  = Math.round(tot * r / (1 + r))
    if (!g[rate]) g[rate] = { total: 0, tax: 0 }
    g[rate].total += tot
    g[rate].tax   += tax
  }
  return g
}

function buildReceiptHTML(data: ReceiptData): string {
  const now     = data.issuedAt || new Date()
  const dateStr = now.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const taxGroups = groupTax(data.items)
  const isCancel  = data.couponType === 'CANCEL'
  const isReturn  = data.couponType === 'RETURN'
  const isOffline = data.status === 'offline' || data.isOffline

  const couponLabel = isCancel ? 'KUPON FISKAL I ANULUAR'
    : isReturn ? 'KUPON FISKAL KTHIMI'
    : 'KUPON FISKAL'

  // ── Items
  const itemsHTML = data.items.map(item => {
    const tot  = Math.round((item.price / 100) * item.quantity) - (item.discount || 0)
    const px   = (item.price / 10000).toFixed(2)
    const sign = (isCancel || isReturn) ? '-' : ''
    return `
<tr>
  <td>${item.name}</td>
  <td class="center">${item.quantity}</td>
  <td class="center">${px}</td>
  <td class="center">${item.taxRate}</td>
  <td class="right">${sign}${fmtEUR(tot)}</td>
</tr>`
  }).join('')

  // ── TVSH breakdown
  const tvshHTML = Object.entries(taxGroups).map(([rate, g]) => `
<tr>
  <td>Tvsh ${rate}(${TAX_PCT[rate] || rate}):</td>
  <td class="right" colspan="4">${fmtEUR(g.tax)}</td>
</tr>`).join('')

  // ── Pagesa
  let payHTML = ''
  if (data.paymentMethod === 'split' && data.splitPayment) {
    payHTML = `
<tr><td>Para te gatshme:</td><td class="right" colspan="4">${fmtEUR(data.splitPayment.cash)}</td></tr>
<tr><td>Karte bankare:</td><td class="right" colspan="4">${fmtEUR(data.splitPayment.card)}</td></tr>`
  } else {
    payHTML = `<tr><td colspan="5">${PAYMENT_LABELS[data.paymentMethod] || data.paymentMethod}</td></tr>`
  }

  // ── QR Code — i vogël, i pastër, i lexueshëm
  const qrHTML = data.qrCodeData ? `
<div style="text-align:center;margin:6px 0 2px;">
  <div id="qr" style="display:inline-block;"></div>
  <div style="font-size:8px;margin-top:3px;text-align:center;">Skanoni per verifikim ne ATK</div>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
<script>
  window.onload = function() {
    new QRCode(document.getElementById('qr'), {
      text: ${JSON.stringify(data.qrCodeData)},
      width: 90, height: 90,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  };
<\/script>` : ''

  // ── Logo RKS MF — e vogël, e pastër, si foto 1
  const logoHTML = `
<div class="center" style="margin:6px 0 2px;">
  <svg width="28" height="34" viewBox="0 0 28 34" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;">
    <path d="M14 1 L27 6 L27 20 Q27 30 14 33 Q1 30 1 20 L1 6 Z"
          fill="none" stroke="#000" stroke-width="1.5"/>
    <path d="M14 1 L27 6 L27 20 Q27 30 14 33 Q1 30 1 20 L1 6 Z"
          fill="#fff"/>
    <!-- Flamuri i Kosovës - simplified harta -->
    <path d="M8 16 L9 13 L11 12 L14 13 L17 12 L19 13 L20 16 L18 19 L14 20 L10 19 Z"
          fill="#244AA5"/>
    <!-- 5 yjet e artë -->
    <text x="5" y="12" font-size="3.5" fill="#D4AF37" font-family="Arial" letter-spacing="1">★★★★★</text>
    <!-- Harta fill -->
    <path d="M8 16 L9 13 L11 12 L14 13 L17 12 L19 13 L20 16 L18 19 L14 20 L10 19 Z"
          fill="#D4AF37" opacity="0.6"/>
  </svg>
  <div style="font-size:9px;font-weight:bold;letter-spacing:2px;margin-top:1px;">RKS MF</div>
</div>`

  const offlineHTML = isOffline
    ? `<div style="text-align:center;font-size:9px;font-weight:bold;margin:3px 0;">** OFFLINE **</div>`
    : ''

  const refHTML = (isCancel || isReturn) && data.referenceReceiptNo
    ? `<div>Ref: ${data.referenceReceiptNo}${data.cancelReason ? ' - ' + data.cancelReason : ''}</div>`
    : ''

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Kupon Fiskal</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body {
  font-family: Arial, Helvetica, sans-serif;
  width: 58mm;
  font-size: 12px;
  color: #000;
  background: #fff;
  padding: 4px 6px;
  margin: 0 auto;
}
@media screen {
  body { width: 58mm; margin: 0 auto; }
}
@media print {
  @page { margin: 0; size: 58mm auto; }
  html, body { width: 58mm; margin: 0; padding: 2px 4px; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
}
.center { text-align: center; }
.right  { text-align: right; }
.bold   { font-weight: bold; }
.dash   { border-top: 1px dashed #000; margin: 4px 0; }
.solid  { border-top: 2px solid #000; margin: 4px 0; }

/* Header */
.co-name { font-size: 14px; font-weight: bold; text-align: center; margin-bottom: 1px; }
.co-info  { font-size: 10px; text-align: center; line-height: 1.6; }

/* Coupon title */
.title { font-size: 13px; font-weight: bold; text-align: center; letter-spacing: 1px; margin: 5px 0 4px; }

/* Table */
table { width: 100%; border-collapse: collapse; font-size: 11px; }
th { font-size: 11px; font-weight: bold; text-align: left; padding-bottom: 3px; }
th.right, td.right { text-align: right; }
th.center, td.center { text-align: center; }
td { padding: 1px 0; vertical-align: top; }
td:first-child { word-break: break-word; max-width: 22mm; }

/* Total */
.total-row td { font-size: 14px; font-weight: bold; padding: 4px 0; }

/* Footer */
.footer { text-align: center; font-size: 8px; margin-top: 4px; }

/* Offline */
</style>
</head>
<body>

<!-- KREU -->
<div class="co-name">${data.company.name}</div>
<div class="co-info">
  ${data.company.address ? data.company.address + '<br>' : ''}
  ${data.company.city || 'Kosove'}<br>
  NUI: ${data.company.nui}
  ${data.company.vatNumber ? '<br>TVSH Nr.: ' + data.company.vatNumber : ''}
</div>

<div class="dash"></div>

<div style="font-size:9px;display:flex;justify-content:space-between;">
  <span>Operator: ${data.operator}.</span>
</div>
${data.receiptNumber ? `<div style="font-size:9px;">Porosia: ${data.receiptNumber}.</div>` : ''}

<div class="dash"></div>

<div class="title">${couponLabel}</div>

${offlineHTML}
${refHTML}

<!-- ARTIKUJT -->
<table>
  <thead>
    <tr>
      <th>Emri</th>
      <th class="center">Sas.</th>
      <th class="center">Cm.</th>
      <th class="center">TVSH</th>
      <th class="right">€</th>
    </tr>
  </thead>
  <tbody>
    ${itemsHTML}
  </tbody>
</table>

<div class="dash"></div>

<!-- TOTALI -->
<table>
  ${data.totals.discount > 0 ? `
  <tr>
    <td>Nentotali:</td>
    <td class="right" colspan="4">${fmtEUR(data.totals.subtotal)}</td>
  </tr>
  <tr>
    <td>Zbritje:</td>
    <td class="right" colspan="4">-${fmtEUR(data.totals.discount)}</td>
  </tr>` : ''}
</table>

<div class="solid"></div>
<table>
  <tr class="total-row">
    <td>Total:</td>
    <td class="right" colspan="4">${fmtEUR(data.totals.total)}</td>
  </tr>
</table>
<div class="solid"></div>

<!-- PAGESA -->
<table>
  ${payHTML}
</table>

<div class="dash"></div>

<!-- TVSH -->
<table>
  ${tvshHTML}
  <tr>
    <td class="bold">Total Tvsh:</td>
    <td class="right bold" colspan="4">${fmtEUR(data.totals.tax)}</td>
  </tr>
  <tr>
    <td>Pa Tvsh:</td>
    <td class="right" colspan="4">${fmtEUR(data.totals.noTax)}</td>
  </tr>
</table>

<div class="dash"></div>

<!-- FOOTER — DATA ORA -->
<div style="font-size:8px;text-align:center;margin:3px 0;">
  ${dateStr} ${timeStr}
</div>
${data.nuikf ? `<div style="font-size:8px;">NUIKF: ${data.nuikf}</div>` : ''}

<div style="font-size:9px;text-align:center;margin:4px 0;font-weight:bold;">
  Faleminderit per viziten tuaj!
</div>

<!-- QR CODE -->
${qrHTML}

<!-- LOGO RKS MF -->
${logoHTML}

<div class="footer" style="font-style:italic;font-size:8px;">e-kuponi</div>

</body>
</html>`
}

// ── Print ──────────────────────────────────────────────────────
export function printReceipt(data: ReceiptData): void {
  const html = buildReceiptHTML(data)
  const w = window.open('', '_blank')
  if (!w) { console.error('Popup i bllokuar'); return }
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => { w.print(); w.close() }, 1200)
}

export function previewReceipt(data: ReceiptData): void {
  const html = buildReceiptHTML(data)
  const w = window.open('', '_blank', 'width=320,height=700,scrollbars=yes')
  if (!w) return
  w.document.write(html)
  w.document.close()
}

export function buildReceiptFromAPIResponse(
  apiResponse: any,
  payload: any,
  company: any
): ReceiptData {
  const totalCents = Math.round(parseFloat(apiResponse.totals?.totalEUR || '0') * 100) || apiResponse.total || 0
  const taxCents   = Math.round(parseFloat(apiResponse.totals?.taxEUR   || '0') * 100) || apiResponse.tax   || 0
  const noTaxCents = totalCents - taxCents
  const discount   = payload.totalDiscount || 0

  return {
    company: {
      name:      company.name,
      nui:       company.nui || '—',
      vatNumber: company.vat_number,
      address:   company.address || '',
      city:      company.location_city || 'Kosove',
      phone:     company.phone,
      logo_url:  company.logo_url,
    },
    operator:      payload.operatorName || 'Operator',
    items:         (payload.items || []).map((i: any) => ({
      name:     i.name,
      quantity: i.quantity,
      price:    i.price,
      unit:     i.unit || 'cope',
      taxRate:  i.taxRate || i.tax_rate || 'E',
      discount: i.discount,
    })),
    totals: {
      subtotal: totalCents + discount,
      discount,
      total:    totalCents,
      tax:      taxCents,
      noTax:    noTaxCents,
    },
    paymentMethod: payload.paymentMethod as ReceiptData['paymentMethod'],
    splitPayment:  payload.splitPayment,
    couponType:    'SALE',
    status:        apiResponse.status || 'fiscalized',
    receiptNumber: apiResponse.receiptNumber,
    dailyCouponNo: apiResponse.dailyCouponNo,
    nuikf:         apiResponse.nuikf || apiResponse.iic,
    sefId:         apiResponse.sefId,
    qrCodeData:    apiResponse.qrCodeData || apiResponse.qrCode,
    issuedAt:      new Date(),
    isOffline:     apiResponse.status === 'offline',
  }
}  // Logo RKS MF — base64 embedded
  const fiscalLogoHTML = `
<div style="text-align:center;margin:6px 0 2px;">
  <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCAxMjAgODAiPgogIDwhLS0gU2hpZWxkIGZpbGwgYmxhY2sgLS0+CiAgPHBhdGggZD0iTTYwLDQgTDEwOCwyMCBMMTA4LDUwIFExMDgsNzQgNjAsNzggUTEyLDc0IDEyLDUwIEwxMiwyMCBaIiBmaWxsPSIjMDAwIi8+CiAgPCEtLSBTaGllbGQgaW5uZXIgd2hpdGUgLS0+CiAgPHBhdGggZD0iTTYwLDggTDEwNCwyMiBMMTA0LDUwIFExMDQsNzAgNjAsNzQgUTE2LDcwIDE2LDUwIEwxNiwyMiBaIiBmaWxsPSIjZmZmIi8+CiAgPCEtLSA1IHN0YXJzIGJsYWNrIC0tPgogIDx0ZXh0IHg9IjE4IiB5PSIzMiIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzAwMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBsZXR0ZXItc3BhY2luZz0iMiI+4piF4piF4piF4piF4piFPC90ZXh0PgogIDwhLS0gS29zb3ZvIG1hcCBibGFjayAtLT4KICA8cGF0aCBkPSJNMzYsNDQgTDQwLDM2IEw0NiwzMyBMNTQsMzYgTDYwLDMyIEw2NiwzNiBMNzQsMzMgTDgwLDM2IEw4NCw0NCBMODAsNTIgTDY2LDU2IEw2MCw1OCBMNTQsNTYgTDQwLDUyIFoiIGZpbGw9IiMwMDAiLz4KPC9zdmc+" style="width:48px;height:auto;display:inline-block;filter:contrast(200%) brightness(0);" alt="RKS MF"/><div style="font-size:10px;font-weight:bold;letter-spacing:2px;margin-top:2px;">RKS  MF</div>
</div>`
