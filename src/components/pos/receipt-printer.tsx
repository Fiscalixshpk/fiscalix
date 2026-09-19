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
}  // Logo RKS MF — JPG base64 embedded
  const fiscalLogoHTML = `
<div style="text-align:center;margin:6px 0 2px;">
  <img src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAgEASABIAAD/7QAsUGhvdG9zaG9wIDMuMAA4QklNA+0AAAAAABAASAAAAAEAAQBIAAAAAQAB/+FZlmh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8APD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4KPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNy4yLWMwMDAgNzkuMWI2NWE3OSwgMjAyMi8wNi8xMy0xNzo0NjoxNCAgICAgICAgIj4KICAgPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4KICAgICAgPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIKICAgICAgICAgICAgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIgogICAgICAgICAgICB4bWxuczp4bXBHSW1nPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvZy9pbWcvIgogICAgICAgICAgICB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iCiAgICAgICAgICAgIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIgogICAgICAgICAgICB4bWxuczpzdFJlZj0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlUmVmIyIKICAgICAgICAgICAgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyI+CiAgICAgICAgIDx4bXA6Q3JlYXRvclRvb2w+QWRvYmUgSWxsdXN0cmF0b3IgMjcuMCAoTWFjaW50b3NoKTwveG1wOkNyZWF0b3JUb29sPgogICAgICAgICA8eG1wOkNyZWF0ZURhdGU+MjAyNi0wOS0xOVQxMTozNjozOSswMjowMDwveG1wOkNyZWF0ZURhdGU+CiAgICAgICAgIDx4bXA6TWV0YWRhdGFEYXRlPjIwMjYtMDktMTlUMTE6MzY6MzkrMDI6MDA8L3htcDpNZXRhZGF0YURhdGU+CiAgICAgICAgIDx4bXA6TW9kaWZ5RGF0ZT4yMDI2LTA5LTE5VDA5OjM2OjUxWjwveG1wOk1vZGlmeURhdGU+CiAgICAgICAgIDx4bXA6VGh1bWJuYWlscz4KICAgICAgICAgICAgPHJkZjpBbHQ+CiAgICAgICAgICAgICAgIDxyZGY6bGkgcmRmOnBhcnNlVHlwZT0iUmVzb3VyY2UiPgogICAgICAgICAgICAgICAgICA8eG1wR0ltZzp3aWR0aD4yNTY8L3htcEdJbWc6d2lkdGg+CiAgICAgICAgICAgICAgICAgIDx4bXBHSW1nOmhlaWdodD4xNjg8L3htcEdJbWc6aGVpZ2h0PgogICAgICAgICAgICAgICAgICA8eG1wR0ltZzpmb3JtYXQ+SlBFRzwveG1wR0ltZzpmb3JtYXQ+CiAgICAgICAgICAgICAgICAgIDx4bXBHSW1nOmltYWdlPi85ai80QUFRU2taSlJnQUJBZ0VBU0FCSUFBRC83UUFzVUdodmRHOXphRzl3SURNdU1BQTRRa2xOQSswQUFBQUFBQkFBU0FBQUFBRUEmI3hBO0FRQklBQUFBQVFBQi8rSUNLRWxEUTE5UVVrOUdTVXhGQUFFQkFBQUNHR0Z3Y0d3RUFBQUFiVzUwY2xKSFFpQllXVm9nQitZQUFRQUImI3hBO0FBQUFBQUFBWVdOemNFRlFVRXdBQUFBQVFWQlFUQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBUGJXQUFFQUFBQUEweTFoY0hCc0FBQUEmI3hBO0FBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBS1pHVnpZd0FBQVB3QUFBQXcmI3hBO1kzQnlkQUFBQVN3QUFBQlFkM1J3ZEFBQUFYd0FBQUFVY2xoWldnQUFBWkFBQUFBVVoxaFpXZ0FBQWFRQUFBQVVZbGhaV2dBQUFiZ0EmI3hBO0FBQVVjbFJTUXdBQUFjd0FBQUFnWTJoaFpBQUFBZXdBQUFBc1lsUlNRd0FBQWN3QUFBQWdaMVJTUXdBQUFjd0FBQUFnYld4MVl3QUEmI3hBO0FBQUFBQUFCQUFBQURHVnVWVk1BQUFBVUFBQUFIQUJFQUdrQWN3QndBR3dBWVFCNUFDQUFVQUF6Yld4MVl3QUFBQUFBQUFBQkFBQUEmI3hBO0RHVnVWVk1BQUFBMEFBQUFIQUJEQUc4QWNBQjVBSElBYVFCbkFHZ0FkQUFnQUVFQWNBQndBR3dBWlFBZ0FFa0FiZ0JqQUM0QUxBQWcmI3hBO0FESUFNQUF5QURKWVdWb2dBQUFBQUFBQTl0VUFBUUFBQUFEVExGaFpXaUFBQUFBQUFBQ0Qzd0FBUGIvLy8vKzdXRmxhSUFBQUFBQUEmI3hBO0FFcS9BQUN4TndBQUNybFlXVm9nQUFBQUFBQUFLRGdBQUJFTEFBREl1WEJoY21FQUFBQUFBQU1BQUFBQ1ptWUFBUEtuQUFBTldRQUEmI3hBO0U5QUFBQXBiYzJZek1nQUFBQUFBQVF4Q0FBQUYzdi8vOHlZQUFBZVRBQUQ5a1AvLys2TC8vLzJqQUFBRDNBQUF3RzcvN2dBT1FXUnYmI3hBO1ltVUFaTUFBQUFBQi85c0FoQUFHQkFRRUJRUUdCUVVHQ1FZRkJna0xDQVlHQ0FzTUNnb0xDZ29NRUF3TURBd01EQkFNRGc4UUR3NE0mI3hBO0V4TVVGQk1USEJzYkd4d2ZIeDhmSHg4Zkh4OGZBUWNIQncwTURSZ1FFQmdhRlJFVkdoOGZIeDhmSHg4Zkh4OGZIeDhmSHg4Zkh4OGYmI3hBO0h4OGZIeDhmSHg4Zkh4OGZIeDhmSHg4Zkh4OGZIeDhmSHg4Zkh4Ly93QUFSQ0FDb0FRQURBUkVBQWhFQkF4RUIvOFFCb2dBQUFBY0ImI3hBO0FRRUJBUUFBQUFBQUFBQUFCQVVEQWdZQkFBY0lDUW9MQVFBQ0FnTUJBUUVCQVFBQUFBQUFBQUFCQUFJREJBVUdCd2dKQ2dzUUFBSUImI3hBO0F3TUNCQUlHQndNRUFnWUNjd0VDQXhFRUFBVWhFakZCVVFZVFlTSnhnUlF5a2FFSEZiRkNJOEZTMGVFekZtTHdKSEtDOFNWRE5GT1MmI3hBO29ySmpjOEkxUkNlVG83TTJGMVJrZE1QUzRnZ21nd2tLR0JtRWxFVkdwTFJXMDFVb0d2TGo4OFRVNVBSbGRZV1ZwYlhGMWVYMVpuYUcmI3hBO2xxYTJ4dGJtOWpkSFYyZDNoNWVudDhmWDUvYzRTRmhvZUlpWXFMakkyT2o0S1RsSldXbDVpWm1wdWNuWjZma3FPa3BhYW5xS21xcTYmI3hBO3l0cnEraEVBQWdJQkFnTUZCUVFGQmdRSUF3TnRBUUFDRVFNRUlSSXhRUVZSRTJFaUJuR0JrVEtoc2ZBVXdkSGhJMElWVW1KeThUTWsmI3hBO05FT0NGcEpUSmFKanNzSUhjOUkxNGtTREYxU1RDQWtLR0JrbU5rVWFKMlIwVlRmeW83UERLQ25UNC9PRWxLUzB4TlRrOUdWMWhaV2wmI3hBO3RjWFY1ZlZHVm1aMmhwYW10c2JXNXZaSFYyZDNoNWVudDhmWDUvYzRTRmhvZUlpWXFMakkyT2o0T1VsWmFYbUptYW01eWRucCtTbzYmI3hBO1NscHFlb3FhcXJySzJ1cjYvOW9BREFNQkFBSVJBeEVBUHdEMVRpclR1aUl6dXdWRkJMTVRRQURja2s0cXduVy96cy9LM1I1emJYUG0mI3hBO0sydUx3SGlMT3g1WDA1ZitUMDdWWm1EZlBGVXQvd0NWcytadFNGUExQNWU2NWZWK3pQcVFnMGlCZ2YyZzF5NWs0MC80citXS3RpYi8mI3hBO0FKeUMxTGRMZnk1NWRnWWphVjd2VXJsUjFQMkJiUS9qaXJ2K1ZmZm1sZWovQUhLL21WY29qRDRvZEwwMnp0QUNhMTR5U0M0azc5YTQmI3hBO3EzL3lwT3ptSU9vK2NQTldvanF5UzZ0SkZHVFd2MkxaWUY5c1ZiWC9BSng5L0sxbVY3cXd1NzJWQ1NKTG5VOVJrUHhkZGpjY2Z3eFYmI3hBO1FUOGlmeUdzM2VOdkwybnErM0pKcFhkaDlFa2hJeFZmL3dBcVgvSVgvcVg5Sy80TC9tL0ZYUWZrRCtTTTdTeTJtZ1c0WndVa2UxdWImI3hBO21PZ1Bhc1V5OGZveFZVLzVVSDVDaEgrNDZYVjlMb0ZDL1U5WDFCYUJlbE9jejRxdC93Q1ZQNnJiRGxwWDVoZWFMYVFkQmRYY04vSDMmI3hBOzZyY1FzeDYvellxNCtWdnp3c1Bqc1BQTmhxOVBzd2F0cEtSQTcxQWFXeWxpUHRzbUt0ZjRqL1BiU3lCcVBsRFN0ZVFmYW0wYlVqYk4mI3hBO1R4RVY5R3RUN2VwOU9LdGY4cjAwU3dIL0FEdGVnYTc1WEMvYnViNndrbHRhL3dDVGNXbjFoQ1BjMHhWbG5sM3o3NUo4eUtEb091V08mI3hBO3BNUlgwcmVlTnBSL3JSVjVyOUl4VlBzVmRpcnNWZGlyc1ZkaXJzVmRpcnNWZGlyc1ZkaXJzVmRpcnNWZVM2SnJmNXdmbUhwTnRyV2kmI3hBOzNtbWVUL0xXb0taTEtmMG0xTFUyaXFRck1rbnBXMGZLblQ0cWUrS3BpdjVFZVdMOTFtODNhbHF2bStjRVB4MVc4aytySzMrUmF3ZWomI3hBO0NvOWlweFZNYnp6UCtUbjVjd05iU1hlaitYdUkrT3l0aERITVFQOEFpaUFlcTMvQTRxODg4eGY4NWwvbGpwNWVQU0xXL3dCYWxIMkomI3hBO0VqVzJnUDhBc3BpSlIveUt4VjV2cm4vT2JmbkNjc3VpZVg3Q3dVN0JydVNXN2NEeCtBMnkxK2pGV0NhdC93QTVRL25acUpZRFhoWlImI3hBO04vdXEwdHJlT25iWnlqU2Qvd0NiRldKYWgrYW41bWFpVyt1ZWE5V21WdXNadmJnSnVLZllEaGZ3eFZJNWIzV05VblNLV2U0dnJpWjEmI3hBO1dPTjNlWjNjL0NvQUpZbHV3eFZCWXE3RlY2UXl5SzdJak9zUzg1Q29KQ3JVTHlhblFWWURGVXhzL05IbWF4SU5scTk3YWtiZ3czRXMmI3hBO2U1RlAyV0hiRldTYWIrZUg1dmFjUWJmemRxYjA2QzR1R3VSOTAvcVlxekxSL3dEbkx6ODVMQ24xcTVzZFdBLzViTFZWci8waW0yeFYmI3hBO24rZy84NXdOVkUxL3lzS2Y3c3VMQzUvNGpES24vTTNGWHBubHovbkt6OG05WktwTnFVMmp6dnNJdFJnWkJYM2tpOWFJZlM0eFZrbDEmI3hBOzVHL0pyejdibStYVHRKMWtNUVRxTmlZeE5VN2ovU2JWbGxCLzJlS3BkL3lxYnpQb3Z4K1MvUE9xYWVpL1owM1Z1R3IyZkVkRVVUOFomI3hBO28xLzFaTVZSbmxiemY1Nmc4NFJlVVBPdGhwNHZMdXptdnRPMWJTWlpUQk1sczhhU0pKQk9QVWpiOThEOW9qRlhvR0t1eFYyS3V4VjImI3hBO0t1eFYyS3V4VjJLdXhWMkt1eFYyS3ZJZnkvOEFNVng1YS81eGswL1g3YUpaN2pTOUVsdW9ZcENRalBHSFpRMU42VjY0cStSZk5uNTUmI3hBOy9tcjVwTHBxbm1HNVMxZXRiTzBiNnBCeC9sWklPSE1mNjljVllJVFhjOWNWYXhWZkZGTE5La1VTbDVaR0NSb29xV1pqUUFBZHljVlomI3hBO2grYlA1Y1h2NWUrYmo1ZnVYTXdOcGJYTVZ3YVVrOVdJZXFWcCt5czZ5SVBZWXF4YlRiQ1RVTlF0N0dLU0tLVzVkWWtrdUpGaGlETWEmI3hBO0RuSTVDSUsvdE1hRHZpcjZXL0lmL25Hdnoxb1g1aWFkNWk4MVdsdmI2WnBhdmNRcUo0cmd5enRHVWk0aU10VGdYOVRrZkFZcXhEOHcmI3hBO3YrY1hmUDhBcG12YTVmNmJiV1VmbFdLZWE0dEx5VzhnZ2ppdEdZdWdrOVpveXZwb1FyVjJxTnNWZVYrVWZKdXIrYk5hWFJkSGEyYlUmI3hBO1pLK2hGUFBIYmlVZzA0eE5LVURONEtOejRZcSttL3lTL3dDY2FOZDByUi9OeWVjNEliYTcxelQyMG13UkpVbk1jY3RYa21iaHlTb2smI3hBO1NJcHZYNFRpcncvemovemo5K1kvazdTcmpWdGZoczdUVG9HS2ljM2tGWlczNHJFbklTT3pVcUZDMTlzVmViNHF6YVQ4c3RSVDhvNHYmI3hBO3pESmYwSk5WYlQvUTQvRDZBajJ1T1hoNnl0Rjg4VllUaXJzVlJXbmFucVdtWFMzZW0zYzFsZHA5aTR0NUhpa1h2czZGV0dLdm9UL24mI3hBO0huOCsvd0F6ZFIvTURSZkttczZwK2x0SjFCNUluTjJpdmNKeGhlUU1zNDR5RThrSDJ5MjJLdmZkV1p2K2hoUEw2MVBFZVhOUUlYc0MmI3hBO2JxQ3AvREZYcE9LdXhWMktzS3YvQU02dnlrc1dLWEhtN1N5d1BFaUs1am1JUHY2UmZ3eFZUdFB6eS9LQzdtRVVYbTNUUTU2ZXJPc0smI3hBOy93REJTOEYvSEZXYVdsNWFYbHRIZFdjOGR6YlNqbEZQQ3l5UnNQRldVa0hGVVByV3Q2Um9tbXphcHJGNUZZYWRiOGZYdTdoeEhHbk4mI3hBO3dpOG1Pd3E3QUQzeFZqK25mbTMrV09wWDBGaFllYU5OdXIyNmRZcmUzaXVZMmVSMk5GVlZCcVNUaXJJZFkxblN0RjAyYlU5V3U0ckgmI3hBO1Q3Y0F6M2M3aU9OQXpCRjVNMndxekFZcXhpUDg1L3lubGtXT1B6YnBieU9RcUl0ekdXTEUwQUFCM0p4Vm1lS3NLMS84NmZ5cTBDNmUmI3hBOzExVHpQWXhYVVo0eXdSeWV2SWplRHJDSkNwOWppcUs4cy9tdCtYSG1pZGJiUXZNVmxlM2IxNFdnbENUdFFWUEdHVGhJYWV5NHE4LzgmI3hBO3VJai9BUE9JMHdaUXdIbFcvTkNLN3JiekVINkNNVmZDMktzOWkvSzI5ZjhBSm1mOHhmM25HTFZVc2hEUUJQcW5EaTF4WHFmOUpaWXgmI3hBOzlPS3NDeFY5Vy84QU9NK3QvbGY1eHZvZEl2dkpWaGFlYmRIaEY3RHFWdkFHaGxXM2tSUktlUlpvNVF6cWU0SjNCSDJjVmVyZm53LzUmI3hBO2E2TDVhYnpiNXY4QUxVWG1DZTE0MmRqR1lnemw1U3pKRzBoMmpqNUFrc2VuWUVrQXF2Z3ZYTlN0dFMxVzR2YmF3ZzB1M21hc1ZoYTgmI3hBOy9TaVhvRlV5Tkk1OXlUaXI2cS9JNzgwTkwvTHY4a3JmVmZPMnJTekpmWGN4OHZhU3JDYTZOcEZTSGpCR3hVcW5xeHlmYVlJUEVFN3EmI3hBO3NiLzV5czgxeGViZkxYbGZ6SDVhMWxyN3lsY3ZOYjNWbkczRklyNVFKSS9YajJZU21NdUFIR3dXbysxdXErYTFabFlNcEtzcHFyRFkmI3hBO2dqdU1WZmMray9uYjVUL0wzeWg1VDBQenpyVTk5NW51TFMzYlUrS200bnRmWFgxT1Y1UThoNmF1Ri9ha2JyeFBYRlh6OS96bFplMzEmI3hBOzcrWkVkK3VxL3BUeTdxVmpCZWFBMGNucVcwY0xMNk1vaTRuaFV6UXN6VTMzRmNWU0Q4blBPdmtiUk5UR25lYy9LdHJyMmxYc28vMHomI3hBOzB2VXZMZG1vbzRDdEpFOFUrMTNCL1pLcjd3ZnlWNVJieXgvaGR0SXRUNWRDaFJwUWlYNnZRUDZ2OTJCU3ZxZkhYcnkzNjRxK0MvemQmI3hBOzg4ZVNOZTFBV1hrenl0YWFCbzlxNXBjaUlMZVhEQ29xOUNSR25nZzM4VDJDckFyR3l1cis5dDdHMGpNdDFkU3BCYnhMMWVTUmdxS1AmI3hBO214cGlyTHZ6Zy9McVQ4dnZQTjE1ZDlWcmkzU0tHZTB1WEFCa2psakJZMEg4c29kUG94Vk52K2Nidi9KMitWditNODMvQUZEUzRxK3YmI3hBOzlWLzlhRzBEL3dBQnkvOEErb3FIRlhwV0t1eFYyS3Z5cnhWNlI1by81eDkvTXZ5NTVVaTgwM2xsRmNhUThTVHpTV3NvbGVHT1FBcTAmI3hBO3FVVmdOeFVyVUR2aXE3OGovd0E0TmEvTDd6WGFINjA3ZVc3eVpJOVhzR1ltTDAzSVZwMFhvc2tZK0lFZGFVTzJLdnJYL25LUC93QWsmI3hBO1Q1bS82TWYrNmhiNHErTmZ5VS84bTU1US93QzJyYS84blJpcjMvOEE1elU4K2VqWWFUNUl0WktQZEg5SmFtQWQvU1FsTGREN00vTmkmI3hBO1A4a1lxODgvNXhQL0FDMGJ6UDU5SG1DOWg1YU41YkszRldId3lYcC8zblQzNEVHUStIRmE5Y1ZaOS96bHorY2VzYWZlcDVBMEs0YTAmI3hBO1NTQlo5Y3VZbTR5TXN2OEFkMndZYnFwUWNuL21CQTZWQlZmUG5rWDhyUFB2bnA1aDVZMG1TK2l0eUZ1TGt0SERBaE8vRXl5c2ljcWImI3hBOzhRU2Fkc1ZldmZrVitSdjVnK1hmem0wYTU4MGFITloyVmlseGRmV2FwTmJseEN5Umoxb1drajVjNUF3VXRYYkZYcS9rb3lIL0FKeEImI3hBO3VmVUpMTDViMWRUeXJVQlV1UUJ2NEFVeFY4di9BSlNmbUQ1YjhzYW45Vzh6K1ZyRHpMb3QzSXBsOWUxaG12WVNhTHl0M2tIeENuKzYmI3hBOzJOQ2VoWGVxcjcvajhzK1cwMEg5QUpwVm9taGxER2RLRUVZdHVESGtWTU5PRkN4cWR1dStLdmdmODVmUDNsanpEcXJhZDVYOHAyUGwmI3hBO3JTYkNWaHlqdElZTDZlUmFxVE95S0RHby93QjlnOWZ0RTdVVlF2NWJmbTFxWDVlNlhyWjBHMmovQU1RYXdzVUVXcVRBT0xXQ1BtWDkmI3hBO0pEc3p5TTZuNHZoSEViSHNxam9mejM4MjMza25XdkozbXVhVHpEcGVxUkZyYTV1WkMxM2EzU09Kb25XWnVUUEg2aWpramR2c2tEWXEmI3hBO3ZNOFZYeXp6UzhmVmthVGdvUk9SSjRxdlJSWG9CNFlxNFRUQ0ZvUkl3aGRsZDRnVHhaa0RCV0s5Q1ZEdFErNXhWWmlxK2FhYWVaNXAmI3hBO25hV2FWaThramtzek14cVdZbmNrbkZYTk5NMGFSTTdORkdTWTBKSlZTMU9WQjBGYWI0cW0va3pYTFBRZk5lbGE1ZVdodm9kTHVZN3cmI3hBO1dZWVIrckpBZlVqUm1JYWltUlY1YkhiRlhvS2Y4NVEvbTB2blAvRXAxSU5DZmdPaEVIOUhlald2cCtqWDdYL0ZsZWYrVlRiRlhubm0mI3hBOzNXYkhXUE5PcDZ6WVdoc0xiVUxtUzdTeVpoSUltbWIxR2pCQ3FDcXV4Qy9EMHhWOVAvOEFPTWZtbnlMNXp2ZjBaZjhBa2pTclh6Um8mI3hBO2tLMzBXdDJsamJwRzRpa1JGYzBYbEZPR2RXSEhZMEpIR2xNVmVrL245cVBrUHkxNVhQbXp6RDVUdFBNdCtqcFlXWDFpM2hrS21UbkkmI3hBO2drbWtWMlNJRU1kcS9FYVUzcmlyNVovSXpWMjFmL25JVHkvcVRXbHJZL1dicVp4WjJNSzI5dEVQcXNvQ1J4cnNBQjlKNmtrNHErdHImI3hBO3lPS1QvbklMUytScThIbGE5a1VBN2psZjJ5VkkrUk9LdlJNVmRpcnNWZmxYaXI5SGRhdTlPdFB5VnU3alVpb3NFOHZNTGdOMFpXcysmI3hBO1BHbmN0WGlCM09LdnptdDdlZTV1SXJlQkRKUE02eHhScUtzenNhS29IaVNjVmZldi9PUzBMd2Y4NCs2L0RJUVhpajA1SEkzQkszOXMmI3hBO0RTdUt2am44bXBZb2Z6WDhwelN1STRvOVV0bmtkalJWVlpBU1NUMkF4VlMvTXZ6ZGUrZmZ6RjFUVzQwZVU2bGRlbHB0dW9MUDZDMGkmI3hBO3RvMVgrWW9xMUE2c1Rpcjd1L0pqOHZJdklYNWZhYm9SVmYwZ3kvV3RWa1doNVhjd0JrM0hVSlFScWZCUmlyNDcvd0NjcGJHOXRmenUmI3hBOzErUzVCSzNhMms5czVGT1VYMVdLTVUvMVdqSy9SaXIyZi9uRHo4eHZLdzhyUDVKdUo0N0xYbzdxVzR0b3BEeCt0cEtGTlkyT3pTSngmI3hBO29VNjhRQ0s3MFZmU3VLdkZmSmNjOXovemkxcWx2S09FcDB6ekRia1U2Y0o3eUliVjlzVmZGZmxQV2JmUS9NMmw2MWNXdjE2TFRibUsmI3hBOzcrcGx1QWxhQmhJaU0zRjZLV1VjdHVtS3M1bC81eVIvTngvT0E4empXWFNSVFJkSlhsK2p2U3IvQUhSdHE4U0tiY2llZmZsWGZGV0YmI3hBO2VjdGZnOHcrYWRUMTJHMEZnTlVuYTdrdEEvcUtrczN4emNXSVg0VElXS2ltdzJ4VkpjVmRpcnNWWHhSU3pTcEZFcGVXUmdrYUtLbG0mI3hBO1kwQUFIY25GWDFoK1gvOEF6aGJaUmlDOTg4NnExeEo4THRwR24vQkdDRFhoTGNzT2JBalpnaXJUczJLcEYvemxOK1MvNWY4QWxEUU4mI3hBO04xN3kxR21rM010eDlWbTB2MVhjVG9VWmpOR3NqTy9LTWdCcWJVWWQrcXI1cHhWMkt1eFYyS3V4Vm5ma1A4MjljOGllWGRhc1BMa1MmI3hBOzIyc2E0OFN6Nnl4NVNRMjhLdFNPQkNPS3V6U05Welh0UVZvUXFpWWZ6djhBTjkxNUkxanlaNWtubDEvU2RUUU5CTmR5dTkxYlhFY2kmI3hBO3l4eUpPM05tVG1nNUkzYm9WM3FxbVA4QXppNEFmejI4czEvNWZ2OEF1bjNHS3ZyZ3BHLy9BRGtZcmgvM2tQazlnWTZmc3k2bUtHdi8mI3hBO0FEeU9LdlI4VmRpcnNWZmxYaXJOUE5mNXgvbU41cDBTMzBMV05ZZVRSclpZMFN3aVNPQ05oRUFFOVQwbFF5Y2VJSTVrNzc5Y1Zlcy8mI3hBOzg0bC9sVDVjMTdWLzhYNmpxVnZkM09pU2g3YlFvK1hxeFQ5WXJpNDVCZmhCRlkrRlFXRzUrRXJpcjNML0FKeWovd0RKRStaditqSC8mI3hBO0FMcUZ2aXI0RGltbGhrRWtUbEhBSURMc1J5RkQrQnhWT3ZJbm1OZkxQblBSUE1Ed3JQSHBsNURjeVFzQTNKSTNCYWxmMnVQMlQyTkQmI3hBO2lyOU1yUzd0cnkxaHU3YVFTMjF4R3NzRXEvWlpIQVpXSHNRYTRxOG8vd0NjZy95TmgvTWpSNHIzVG1XMzgwNllqQ3hrZmFPZUlua2ImI3hBO2VWdTIrNk4reVNleE9LdmhuV3REMTd5M3JFdW02dmFUYWJxbG93NXd5Z3BJcEc2c3A3ZzlWWmRqMUJ4VjlNLzg0MS84NUc2cmU2cmEmI3hBOytTUE9WMGJ0cm9pTFJ0WG1OWmZWL1p0NTJQMitmUkhQeGN0aldvb3E5TC9MbTFFbjVQZWJOSkt5ZjZOZStZckpsUDI5N2lmWUR4K1AmI3hBO3c2NHErQ2NWZGlyc1ZkaXJzVmRpcXJiWE54YTNNVnpiU05EY1FPc2tNcUVxeU9oNUt5a2RDQ0tqRlg2US9sTjVnOHkrWXZ5ODBUWFAmI3hBO01rTUVHcWFoYnJjTUxZbmc4VDd3eUZUWGd6eDhXS2dtbGUzUUtzaTFqUmRKMXJUWjlNMWV6aXY5UHVWNHoyczZCMFlmSTl4MUI3WXEmI3hBOzhyLzZGTy9KVDFYa1hTcmhWWlpGRWYxdWNxdnFMUUVjbUpxblZhbnIxcmlyNDYvTm55R1BJZm43VS9LNlhMWGtGbDZUUVhUcDZaa2omI3hBO21oU1lmQ0NSOFBQaWFkeGlyRU1WZGlyc1ZkaXJzVmV4Zjg0bTI3Uy9uWnBUaFFSQmIza2hKN0EyN3BVZjhIVEZYMVpwaCtzZjg1QTYmI3hBOzdMUkQ5Ujh0NmZhOGg5b2VyZDNFMUQ4LzZZcTlHeFYyS3V4VitWZUt2cm44OS95ZjhvSDhrckx6Um91a1d1bTZ4cE50WlhFOHRuRWsmI3hBO0hyd3pCSTVoS3NZVlhZR1FQeWI0dHV1K0t2RXYrY2N2TlUvbHo4MzlBa1J5dHZxY3cwdTdRR2dkTHdpTkFmOEFWbUtQOUdLdnJQOEEmI3hBOzV5ai9BUEpFK1p2K2pIL3VvVytLdmlYOHRkQ3NkZS9NSHk3b3QrQzFqcUdvVzBGMHFtaGFKNUFIVUh0VWJZcXlEL25JRHlSRjVPL04mI3hBO1RXTk50WVJCcHQweTMrbXhxQXFMQmMvRndRRG9zY25PTmZaY1ZmVXYvT0p2bnIvRWY1WXhhVmNTY3RROHR5ZlVaQVR1YlpnWHRtK1EmI3hBO1dzWS8xTVZlMVlxODgvTy84dHZMZm5UeVBxWDZTZ1JkUjA2MW11ZE0xS2dFc0VrU0Y2Y3VwamJqUjE2SDVnSEZYNTYyVjVjV1Y1QmUmI3hBO1d6bU81dHBFbWhrSFZYallNcEh5SXhWK2dYNVNRSVpQekUwbVQ0ZVBtblVXUEd0ZlR2WW9ad2FzT3RaV3hWK2ZNc1VrVXJ4U0RqSkcmI3hBO3hWMThDRFFqYkZWbUt1eFYyS3V4VjJLdnI3L25INy9uR2Z5OUhvTnQ1cTgyK2hyUjEvVFVlMDBwNGdZYmVHN1VTQ1F1eDVOTjZaVUEmI3hBO3FGNFZhaEpvUXErazRJSUxlQ08zdDQxaGdoVlk0b2tBVkVSUlJWVlJzQUFLQVlxdnhWMkt2TS96OThoYVo1aS9MYnpITERwVWQxcnkmI3hBOzJpVFd0eEZBcjNaYXpjeW9pTlRtZGk2MEhaaUIxeFYrZkJCVWtFVUkySVBVSEZXc1ZkaXJzVmRpcjNqL0FKd3pzL1gvQURadXBpQWYmI3hBO3F1azNFb0o3RnBvSXR2Zjk1aXI2VjhrZjZSK2NYNWszWDJsZ0dpMk1iVVhiMDdSNTNVTU4rdHdLNHE5SHhWMkt1eFYrVmVLdjBaOHcmI3hBO2FJMnVma2xkNlNpODVienkrWTRGcFg5NzlVckZ0L3JnWXEvTy9UTCtmVHRSdGRRdHp4dUxPYU80aGJwUjRtRHIrSXhWOTIvODVJYWgmI3hBO2JhbC96anZyZW8ycmNyYTloMDI0Z2J4amx2cloxUDNOaXI0Ky9KVC9BTW01NVEvN2F0ci9BTW5SaXI2TC93Q2MxZkpuMXZ5NW8vbTYmI3hBO0JheTZaTWJHOElHNWd1ZmlqWW53U1JPUCt6eFY1Qi96aTE1N1BsZjgwck96bms0NmI1aEg2TnVRZWdsYzF0bitmcTBUNU1jVlp2OEEmI3hBO25EL3prVitZdmxQODM5ZTA3eS9meHRvOW1iZUZiQzVpU2FMMUZnUXlrSGFSZjNqTUR4ZkZXQ2VlUCtjb2Z6UjgzNkpQb3R3OW5wbGgmI3hBO2RvWXJ4ZE9pa2plYU0vYVJubGttWUszUmdwRlJzZHE0cWdmeUIvS2pWUFBubmF6ZHJkdjhPNlpOSGNhdmRzQ0l5c1pEaTNEZDNscFMmI3hBO25aYW5GWDE5NUhCdFB6Zy9NZXdQd3BjL29qVW9GOGZWdFdnbEkvMmR2K09LdmhQOHhOT09tZWYvQURMcDVIRVdtcVhrS2ovSlM0Y0smI3hBO1JzTmlQYkZXUFlxN0ZWZUd3dnA3ZWE1Z3Q1WmJlMkFOeE1pTXlSaGpRRjJBb3RmZkZXVC9BSmFmbGY1cS9NVFhIMG5RSTR3WVl6TmQmI3hBOzNsd1dTM2dUb3ZxT3F1YXNkbFVLU2ZrQ1FxOTEwYi9uQjYrZXo1YTE1cWl0N3cvN3FzN1ZwNGwvNTZTU1FNMy9BQUF4VjlIL0FKZismI3hBO1NiSHlUNVRzdkxWaGQzTjdhV1BQMDVyeDFlVDk0NWNyOEtvb1VGdmhBR3d4VmtXS3V4VjJLdXhWNXgrY1g1ZC9sbnJPZzMzbWZ6Wm8mI3hBO292NWRCc2JxNFNXR1dXM21LUnhtUXB5aGVQbnV2dzg2Z0g1bXFyODhzVmRpcnNWZGlyNmEvd0NjSDlOOVRYL05XcFUvM210TGEyci8mI3hBO0FNeEVqdjQvOHUvaGlyM0w4bkNMdTk4KzZ3ZmlONzVudllJMzJJYUt4aml0VUlQY2NvMjc0cTlJeFYyS3V4VjVCLzBLZitTWC9Wb24mI3hBOy93Q2t5NS81cnhWNnpaMmtGblp3V2R1T01GdEdrTVNra2tJaWhWRlQxMkdLdktaditjVlB5VWxtZVZ0R21WcEdMRUxkM0txQ3hyc28mI3hBO2VnSHRpck5iL3dETGZ5bmYrUTE4aTNWdkpKNWJTR0czVzJNMG5NUjIwaXlSTDZ2TDFQaGFOZS9UYkZXTGFEL3pqVitVZWc2MVphenAmI3hBO3VselJhaHA4eVhGckkxMWNPRmtqUEpTVlp5RHY0NHF6enpQNWEwYnpQb041b090UWZXZE12a0NYTVBKa0pDc0hVaGxJWUVNb0lJeFYmI3hBOzV0Ri96aXArUzhNcVRSYVZjUnl4c0hqZGIyNkRLeW1vSUlrNmc0cW5mbkQ4Z2Z5bzgyMzArbzZ0b2FEVTdnbHByMjFrbHQ1R1lqZDImI3hBO0ViS2pON3NweFZJZE8vNXhRL0phenVGbWZTNTczaVFWaXVicVlwVWVLbzBkZmtkc1ZlcWFUbzJrNlBZUmFmcE5uRFlXTUlwRmJXOGEmI3hBO3hScjhsVUFZcXdPOS93Qnh2L09RZW1UdDhNUG1IeTVjV2FiVTVUNmRkTFBXdmNpSzRiOE1WZkluL09UV2ovb3Y4NnZNU3F2R0s3ZUcmI3hBOzhqUFN2cndJem4va1p5eFY1ZGlyc1Zmb3grVS9tUDhBS3EvOHIyT21lUmJ1ek5sREFLNlpHVVM2VUFCWGE0Z05KT1pQMm5ZZkVkNm4mI3hBO3JpckxkSTh2NkRvc2NzV2phYmE2YkhPNWxuU3pnamdWNUQxZHhHcThtOXppcVB4VjJLdXhWMkt1eFYyS29IWGREMHZYdEh1OUcxYUQmI3hBOzZ6cHQvRzBOM0J5ZVBuRzNVY295cmo2RGlyeC9WUDhBbkQvOG43dTZlZTFqdjlPUXB4UzBndWk4S3RUN2Y3OVpwYS83T21LdkNCL3omI3hBO2g5K2NCdXIySGpwd2l0UldDNU4wZlR1dmg1VWhBUXVEK3orOVZCWDIzeFY0dGVXbHpaM2M5bmRSTkRkVzBqUXp3dUtNa2tiRldWaDImI3hBO0lJb2NWVWNWZll2L0FEaHJaUmFYK1czbUh6RGRmdTRaNzV1VC93REZObGJxeGI3NVgrN0ZYcG41QVdrMFA1VWFKZFhJcGQ2cjlZMVMmI3hBOzRhdGVUWDF4SmNBbi9ZU0tNVmVoNHE3RlhZcTdGWFlxN0ZYWXE3RlhZcTdGWFlxN0ZYWXE4MS9PRS9velZmSXZtc2JMcEd1eFdsM0omI3hBOzBDV21xeHRaeXUzc0hhUEZYaFAvQURtMzVmYUR6VDVlOHdLdndYMW5KWlNNT25PMWs5UVY5eXR6K0dLdm12RlhZcTk0L3dDY00vMGYmI3hBOy93QXJZdXZyUWk5Y2FUY0d4YVNuTVRldEFENlZmMnZTTDFwdnhyMnJpcjdjeFYyS3V4VjJLdXhWMkt1eFYyS3V4VklQUDNtbUh5cDUmI3hBO0wxcnpGSzBRYlRiT2FlQkptNEpKT3FIMFlpZitMSk9LQ25qaXI4MU5UMUs5MVRVcnZVNzZVelgxOU5KYzNVeEFCZVdaeTdzUUtEZG0mI3hBO0p4VkM0cSswdEx0Si9LSC9BRGlSRmF3cVJxZXRhZjZVS0RaM24xeWJoR0IvbExIY2ovZ2NWZTZhRHBNR2o2SHAya1c0QWcwNjFodEkmI3hBO2dPbkNDTVJyK0M0cWpzVmRpcnNWZGlyc1ZkaXJzVmRpcnNWZGlyc1ZkaXJzVllyK2FubGgvTS81ZDYvb2tTbHJtNnRIYXpDOWZyTU4mI3hBO0pyZWxQK0xvMXhWNUQrZWNZL01UL25HM1RQTjBDaDd5eVMxMVNVSlNvTlBxOTRtM1pHZGlmOVRGWHhuaXJzVlZMYTV1TGE0anViYVYmI3hBOzRMaUZoSkROR3hSMGRUVldWbG9RUWVoR0t2dmYvbkdmOHlMN3p2OEFseEUycVNQUHJHalNtd3ZibVFsbW1DcUhpbFpqdVdNYkJXSk4mI3hBO1N3Sjc0cTlaeFYyS3V4VjJLdXhWMkt1eFYyS3Zqai9uTVQ4ekRxM21PRHlMYVJ5eFcyZ3lDZlVIY2dKTmN6UW84WEFBbjRZb3BDS24mI3hBO3V4Mm9LbFY4NVlxbS9sSHkvY2VZL05PazZEYjFFdXFYY05xSEFyeEVyaFdmNUtDV09LdnUzejdiUTZqNTYvTDN5UmFMeHNySzRiWDcmI3hBOzJOZWtkdnBNWVMwVWorVnJpVlIvc2NWZW9ZcTdGWFlxN0ZYWXE3RlhZcTdGWFlxN0ZYWXE3RlhZcTdGWFlxOG44aDZaWjIycStmUHkmI3hBO3MxTks2YThrdW82WkQwRGFYclFZeXh4MUgyWVp6SWxmRTRxK0dmTmZseSs4dGVaZFQwQytGTHJUTG1TMmtOS0J2VFloWFd2N0xyUmgmI3hBOzdIRlVweFYyS3ZXLytjY2Z6YTBuOHVmTldvM1d1UGRuUnIreU1MVzlxb2tyY3JMRzBVakl6SjlsUFVGUnY4V0t2c2p5SCtiMzVlK2UmI3hBO2pKSDViMVpMbTdoRlpiS1ZYZ3VBdEs4aEhLRlpsSGRscUJpck1jVmRpcnNWZGlyc1ZkaXJBdnpuOHdmbVI1ZThwUHJQa2V6czlRbnMmI3hBOytVbXBXMTNISkpJTFlJU1pZQkhMRlZvNlZLbXRSMDZicXZ6NTh3K1lOWDh4YTNlYTNyRndiclVyK1F6WE01QVhreDIyVlFBb0FGQUImI3hBO3NCaXFYWXEraFA4QW5EYnlRMnFlZXJ6elRjUlZzOUFnS1c3bm9idTZCUmFlUEdIMUsrRlZ4VjlDZmxvVDVqODllY1BQVC9IWm1kZkwmI3hBOzJndWFIL1JOT0pOeElqQW1xVFhic1IvcTRxOU14VjJLdXhWMkt1eFY0UDhBblQvemt4ZC9sMTV5SGwyMzBLTFUxK3F4WEx6dmN0RVYmI3hBO2FVc09CVVJ2MENnOWUrS3BwK1JIL09RVGZtZHFtcTZiYzZUSHBWeFlRUjNFSWpuTTNxSXpsSksxU09uRWxQdnhWN0ZKSkhGRzBrakImI3hBO0kwQloyT3dBQXFTY1ZmS0Uvd0R6bkRmaWFRUStVNFhoREVSdTE0NFlyWFlrZWlhR21Ldm9uOHNQT2orZGZJbWsrYUh0bHMzMUpKR2EmI3hBOzJSL1ZWREhNOFJITWhhLzNmaGlyeVg4M2YrY283L3lENTZ2ZkxFUGw2TFVJN1NPQnhkUGN0RVc5YUpaS2NCRy9UbFRyaXJEZitoNDkmI3hBO1YvNmxHRC9wTmY4QTZvNHF6NzhsUCtjbGI3OHgvT0wrWHA5QmkwMUV0SmJ2NndsdzB4ckd5THg0bU5PdlB4eFY3dGlyc1ZlWS9tNnImI3hBO2VXdFk4djhBNW1RS2ZUMEtYNmg1aUNDclBwRjh5bzdFQ3BiNnZOd2xBK2VLdkUvK2N5Znk5V1BVTk8vTUhURUQyZW9vbG5xa2tkQ3YmI3hBO3JLdGJlWWtWcUpJaHdyMCtGZkhGWHpMaXJzVmRpcXJiWE56YTNFZHpheXZCY1FzSGhtaVlvNk1wcUdWbG9RUjRqRlgzNy96am4rWmwmI3hBO3o1OS9MeUc1MUYxZld0S2srb2FpOWF0S1VSV2puWWRqSXAzN0ZnMVBERlhxV0t1eFZJUE8zbnJ5eDVLME9YV2ZNTjZscGF4Z2lLT28mI3hBO00wejlvNFk2MWR6NERwMU5CVTRxcmVVZk9IbDN6Zm9VR3VlWDd4YjNUcHl5cklBeXNyb2FNam93REl5K0JIdjBJeFY0MS96a0QvemsmI3hBO25kK1F0YnR2TG5sbTN0N3ZXb1FseHFqM2F0SmJ4eHlJM0NEakc4YitvMVZrSjVDaTA2MTJWZk9XbGY4QU9SdjUxYVhiTmJXdm1pZDQmI3hBO25rYVUvV1lyYTZmazVxUUh1SXBYQytDZzBIWVlxODZ1YmlXNHVKYmlXbnF6TzBrbkZWUmVUR3BvcWhWVVZQUUNtS3JVUm5ZSWdMT3gmI3hBO0FWUUtrazlBQmlyN2MwblNMdjhBS0w4aUxQUkxGQi9qYnpISWxyYXhyVG1kVzFJQkIwQjJ0WStwNmZCNzRxOWM4bGVWckx5cDVUMHImI3hBO3k3WmJ3YWJicEQ2bEtlbzQza2tJOFpKQ3puM09LcDFpcnNWZGlyc1ZkaXI0TC81eXZ1L1gvTzdXSXExK3F3V2NOS1VwVzFqbCtuKzgmI3hBO3hWYi9BTTRxK1lEcEg1emFYRVg0UTZ0RGNhZk1hMHJ6ajlXTWZUTENneFY5Z2ZuWnI1MEQ4cC9OT3BxM0NSYkNTQ0YrNnkzVkxhTWomI3hBOzVQS01WZm5EaXI3NC93Q2NVN2d5L2tmb1VlMytqeTNzWXAxM3ZKWk4vd0RnOFZmTS93RHpsaC81TzNXUCtNRm4vd0JRMGVLc2wvSWomI3hBOy9uSER5dCtZdmttVFg5VTFPK3RMbEwyVzFFVnQ2UERqR2tiQS9Ham12eCtPS3ZkZnl0LzV4dzhyZmwxNWxiWDlMMU8rdTdsN2FTMU0mI3hBO1Z6NlBEakl5c1Q4Q0lhL0I0NHE5YXhWMktvYlU5TnNkVTA2NjAyL2hXNHNiMko3ZTZnZjdMeFNLVmRUOHdjVmVTZVVkSWcxYnk1NWkmI3hBOy9KSHplNW11ZElnOUxUcmw2ZXBjYVE1LzBHN2o3RjdaZ3FOMkRLdGNWZkZYblB5anEvbER6UHFIbDNWbytGN1lTbU5tQVBHUkR2SEsmI3hBO2xmMlpFSVpmbmlxU1lxN0ZYWXEra3Y4QW5DbnpWcEduK1p0ZDh2WGNyUjZocmtWdkpwcS9zT2JJVHZNbit2d2s1RGJvcmZTcSt1TlYmI3hBOzFPeTByVEx2VkwrUVEyTmpESmMzVXg2SkZFcGQyK2hWeFY4aitlUCtjMFBNV28ydHpaZVU5SlRSMWs1SkhxVnhJTGk1Q0U3T2tZVlkmI3hBO28zcDQ4NmZqaXI1OTFyekJyMnUzbjEzVzlSdXRUdStQQVhGNU5KUElGQnFGRFNGaUJ2MHhWNkgrU0g1N1gvNVd5YW9pNldOWXNkVTkmI3hBO0ZudG11R3R6SEpEekFkRzRUTDhRa28zdzcwRysyS3NXL05EenovanJ6eHFQbWo2Z21tZlgvUy8wTkg5WGo2VUtSVk1uR1BtVzRWSjQmI3hBO2pGV0s0cTdGWHZYL0FEaWYrVTcrWnZOZzgyYWxEWFF2TDhnYUFNS3JQZmlqUnFQYUdva2IzNGp1Y1ZmUXZsY3IrWUg1bVhQbkZ2M24mI3hBO2xqeW1adEw4c0hxbHhldUF0OWVyMlpWcDZNYkRZN25yaXIxWEZYWXE3RlhZcTdGWFlxL1BML25JdTZOeitkWG1xUTFxdHlrWHhHcHAmI3hBO0ZCSEdQbytEYkZXUDIwbDE1SS9NVzJ1Q0hTWFFkU2luVUVVWXBCS3NpMUgrV2dHM3ZpcjZyLzV6Szh4cGIvbGxwbW0yOGdQNmF2NDImI3hBO05Eczl2QkcwcEkvNTZOR2NWZkhsNXBOeGFhWnA5L0tDRTFFU3ZCNEZJbjlJbi9nMVlZcSsxZjhBbkR1NE12NVFjS0FlaHFWMUdLZDYmI3hBO3JHKy8vQjRxK2UvK2NzUC9BQ2R1c2Y4QUdDei9BT29hUEZYcEgvT05INTEvbGw1TC9McVhSL011cy9VTlJiVUo3Z1FmVnJ1YjkyNlImI3hBO2hXNVF4U0p1VU8xYTRxOTk4ai9tNStYdm5tNnViVHl0cTM2UnVMT05aYmxQcTl6QnhSanhCclBGRUR2NFlxeS9GWFlxN0ZYbi93Q2EmI3hBO3ZsVFY3bExEemo1V2o1ZWNQTExOTlp3MTRpOXRXLzNwc0pLZFJLdjJQQitsSzF4VjV6K2Nua0hTUHpwL0wyeDg5ZVQxNTYvWnd0NmQmI3hBO3VRQk5OR2hKbXNwUjJtaWV2RDNxT2pBNHErTTNSa1lvNEt1cElaU0tFRWRRUmlxM0ZYWXE5Uy81eHE4cmF2ci9BT2JtanZwbDJsbWQmI3hBO0daZFV2SkhKNVBiUVNJa3NTQWRXbEV2RDVFbnRURlgzTDU3MC9TTlI4bGE3WmF4SVlkS25zTGhiMllNRU1jWHBNV2NNZGdWRysrMksmI3hBO3Z6SXhWMkt1eFYyS3V4VmxQNWIvQUplNjU1KzgxV3ZsL1NFbzBwNTNkMFJXTzN0MUk1elAwNlYySGMwSGZGWDJUNWp0WXRBMGZSdnkmI3hBO1gvTDBtMTFUVUxjaSt2azNldzAydExxK2xZVS9mVHNXV1BwOFIycFFZcTlSOHVlWDlLOHU2Rlk2SHBNSXQ5TzArSllMZUlkZUs5MlAmI3hBO2RtUHhNZTVOY1ZUSEZYWXE3RlhZcTdGWFlxL05uODNyb1hYNXFlYjVsb1ZPc1h5cVZOUVZTNGRRUWZjTFhGV1ovd0RPVlBsbHREL04mI3hBO2laNmZ1OVRzYlM2UmdLQWxJaGJPUjgzdHl4K2VLcVA1NGVlRDVqOHJmbHBiZXI2cldXZ0I1MkJyKy9NcHRKT1ZQMnEyTlRpcTc4N1AmI3hBO0xNdmw3eVIrV0ZtNmNDK2l5enlBMHFKYm1ZWFVpa2VLbTRwaXIzTC9BSndudU9YNWI2emIwL3U5WWtrclhmOEFlV3NBNmY4QVBQRlgmI3hBO2lIL09XSC9rN2RZLzR3V2YvVU5IaXFXZmwxL3pqMzU4OC84QWw5dGQwS1N4V3lXZDdZaTVtZU4rY2FxemZDc2JpbEhIZkZYMFYvemomI3hBO2IrUjNuVDh1ZGIxaTk4d1BadkRmMjBjTUgxV1Y1RzVKSnlQSU1pVUZNVmUrNHE3RlhZcTdGWGszbW15dnZ5ejh5M1hublJZSHVQSismI3hBO3JTQ1R6cHBFSUxOYnlrZ2ZwVzNqQU80SCs5Q3IxSHhiOVZWZWJmOEFPUVg1Q1dYbW14Yjh5UHk5Q1hrdDNHTHZVTEcxb3lYY2JMWDYmI3hBOzFiQmVzbE4zUWZiNmo0NjhsWHljUlRZOWNWYXhWT3ZLUG5Iekw1UTFxUFd2TGw4MWhxY2FQR3M2ckhJQ2tnb3lza3F1akEvNVM5ZCsmI3hBO294VmtmbXo4OWZ6VTgyYUcyaDY5cnIzT215UDZrOEtSUVFlcVFlU3JJWUVqTEtwM0M5UHVGRldCWXE3RlhZcTdGVTY4bitUL0FEQjUmI3hBO3Y4d1cyZzZEYkc2djdvN0Rva2FEN1VzcmZzb3ZjL3h4VjlvYUxvbmwzOGl2SlZybytqMjQxenozcjdpSzF0MEFXZlVMeWhwV3BySGEmI3hBO3djcWtrMFVibjRteFZuSDVhK1E1ZkxWbGQ2aHE5eCtrZk4ydVNDNjEvVkNQdHkwb2tFWDhzTUMvREd2MDdkQXF6TEZYWXE3RlhZcTcmI3hBO0ZYWXE3Rlg1bWFzLzZWL01HOWNBVGZYOVdsWUxTZ2YxcmttbEQ0OHNWZlNmL09iM2wzbnBubHJ6R2kvM0UwMm4zRCtQcktKb2dmbDYmI3hBO1VuMzRxK1ovS1drWFhtYnpUb1BsL2t6aTh1b0xHSWZ5UnpUVmVuZ0I2ak1jVmZSUC9PY05wREMva3A0bDRqMDlRaENqWlFzZjFVcUEmI3hBO1A5a2NWVFgvQUp3ZW41YUI1cXQrUDkzZDJzbkt2WG5HNHBUMjRZcThsLzV5dy84QUoyNngvd0FZTFA4QTZobzhWZS8vQVBPRzMva28mI3hBOzV2OEF0cTNQL0pxSEZYdXVLdXhWMkt1eFYyS3RNcXNwVmdHVmhSbE80SVBZNHE4bTFDeTFmOHByNlRWTkR0cE5RL0xlNmxhYlY5RmgmI3hBO1V2TnBEUFZwTHF5UWJtMkorS1dFZlkrMHUxY1ZZUDhBbkIvemp4NWUvTUxUZjhkZmx0TmIvcEc5UTNMMjBUS3RyZjEzTEkyd2luSnImI3hBO3k1VUJiN1hFMU9LdmtmVXRNMUhTNytmVDlTdHBMTyt0bk1keGJUcVk1RVlkUXl0UWpGVUxpcnNWZGlyc1ZkaXJNL3l6L0tmemQrWWUmI3hBO3JpeDBPMzQyc2JENjdxY3dJdHJkZXZ4TUJ1MU9pTHVmbHZpcjY5MHJUUEkvNUhhQmJlWC9BQy9aeWE1NTAxc2hiYXpqNC9YYitjQWcmI3hBO1NTSHBCYlJtdFNmaFFWKzAxU1ZXVC9sNStYbDlwMTljZWJmTnR3bXArZXRUUUxjM0tqOXhaUWRWc3JKVDlpSlAybTZ1ZHppclBjVmQmI3hBO2lyc1ZkaXJzVmRpcnNWV1RTaUtHU1VxemlOU3hWUlZqUVZvQjQ0cS9PanlqNUE4OVMrYzlGZTcwRFZJbzVOUnRXdUxoN080VUtwblUmI3hBO3U3RW9BS2RUWEZYMnAvemtINUx2dk4vNVZhdnBXbTI1dWRWak1OMVlRclRrMGtNcWxsV3Zkb3VhajU0cThBLzV4dy9KTHozcFg1cDImI3hBO09zK1pkQ3VOT3NOTWdubmpsdUFvUnBtVDBZMUZDZmkvZWxoOHNWWngvd0E1bWVXOWQxblJmTEQ2VFlYT29QYlhOeUpZcldHU2RsRWsmI3hBO2NaREVSaHFENE8rS3BkL3poZm9mbURScmp6ZEZxMmxYbW5pNlN3ZUY3dUNTQU1ZamNCZ3ZxS3ZMKzhIVEZXQWY4NVArVC9OdXBmbkgmI3hBO3F0M3AyaVg5N2FQRGFCTGkzdFpwWXlWdGtCbzZLeW1oeFY3bi93QTRrNlJxdWxmbFpOYTZwWlQyRnlkVHVIRUZ6RThMOFRIRUEzRncmI3hBO3BvYWRjVmUxWXE3RlhZcTdGWFlxN0ZYRUFpaDNCNmpGWGwycStRZk1mazNVN2p6SCtXaW85dGN1WnRaOGxUT0k3UzZZL2Fsc25QdzImI3hBO3MvOEF3amQrbTZxVjZ6NWMvS2o4OXRLbVM0aGswM3pWcHlpSzVTU1A2dnExZzQvM1hQRTM5NUhVOTZydjhKQnhWOHRmbWorUVBuMzgmI3hBO3ZwSkxpOHQvMGpvUVA3dldiUlMwUUhiMWszYUUvd0N0OE5lakhGWG11S3V4VlZ0Ylc2dTdtTzJ0WVh1TG1aZ2tNRVNsM2RtMkNxcWcmI3hBO2trK0F4VjlHZmxML0FNNGhhenFwaDFiejY3NlZweG82YVBFUjljbEhVQ1p0eENwN2pkKzN3bkZYdFVubkMxc2ovd0FxL3dEeWMwbTEmI3hBO3U3NngvZFhkNmc0NlJwbGZ0TmNUTFgxcCsvcHFTeE5lVzRJeFZsUGtQOHR0UDhzUGNhcGQzTW10ZWJOU0grNWJ6RGRBZXZMMFBweEwmI3hBOzBoaFdnNHhyc0FCMXBpck1NVmRpcnNWZGlyc1ZkaXJzVmRpcnNWZGlyc1ZkaXJzVmRpcnNWZGlyc1ZkaXJzVmRpcnNWZGlyc1ZkaXImI3hBO0VQTy81WWFCNXFtZzFMbk5wUG1TeTMwL3pEcDdlbGVRa2RGTERhV005Q2oxRks5TVZZei9BSTk4NmVTQWJMOHk5Ty9TV2hBRkY4NmEmI3hBO1ZDMGtIcGdVTGFoWnFHa3R6VDdUSUdTcG9NVll6NXcvNXhvL0tuOHdyRWEvNU52SXRJbnV4NmtkM3AzR2V3bEozUEszREtxSHQrN1omI3hBO2FkMUp4VjVyNWMvNXdxODR6YXc2ZVl0WXM3UFNJbnA2MW1Ybm5tWFkvQWpyR3FWNlZZN0g5azRxOW0wL1N2eVIvSk9DTzNzNFBXOHgmI3hBO1hBNDI4RWFmWHRidXl3K3pHaURtb2IyQ0ppcUpieS8rWlg1aUhsNW5rZnlmNVBmZi9EMWxMWFU3dFBDOXUwMmhSaDFqaTNvU0dOZDgmI3hBO1ZlaStYL0xtaGVYZEtoMG5RN0dMVDlPdHhTSzNnWGl0ZTdIdXpIdXpWSjc0cW1PS3V4VjJLdXhWMkt1eFYyS3V4VjJLdXhWMkt1eFYmI3hBOzJLdXhWMkt1eFYyS3V4VjJLdXhWMkt1eFYyS3V4VjJLdXhWeEFZRUVWQjJJUFFqRlhuZXNma3hwU1g4dXNlU3RSdVBKZXV5bm5OTnAmI3hBO29VMlU3RGYvQUVtd2Y5eEo5QVUrSk9Lb1ErWGZ6MjF1bW02MzVoMHZRdExqK0NmVU5CaWxiVUxwZkZUY2d4MnRSM1VNUTFhYlV4VmsmI3hBO3ZrdjhzdkozazhTUzZSWjh0U3VQOTdOWHVtTnhmWEJPN0dXNGtxNXFSVWdVWDJ4VmxXS3V4VjJLdXhWMkt1eFYyS3V4VjJLdXhWMksmI3hBO3V4VjJLdXhWMkt1eFYyS3V4VjJLdXhWMkt2OEEvOWs9PC94bXBHSW1nOmltYWdlPgogICAgICAgICAgICAgICA8L3JkZjpsaT4KICAgICAgICAgICAgPC9yZGY6QWx0PgogICAgICAgICA8L3htcDpUaHVtYm5haWxzPgogICAgICAgICA8ZGM6Zm9ybWF0PmltYWdlL2pwZWc8L2RjOmZvcm1hdD4KICAgICAgICAgPHhtcE1NOkRlcml2ZWRGcm9tIHJkZjpwYXJzZVR5cGU9IlJlc291cmNlIj4KICAgICAgICAgICAgPHN0UmVmOmluc3RhbmNlSUQ+eG1wLmlpZDo3ODY0MTQ4My1iNGQwLTRlNTgtYTdjZS1jNWQwYWVhNDE4YmE8L3N0UmVmOmluc3RhbmNlSUQ+CiAgICAgICAgICAgIDxzdFJlZjpkb2N1bWVudElEPnhtcC5kaWQ6Nzg2NDE0ODMtYjRkMC00ZTU4LWE3Y2UtYzVkMGFlYTQxOGJhPC9zdFJlZjpkb2N1bWVudElEPgogICAgICAgICAgICA8c3RSZWY6b3JpZ2luYWxEb2N1bWVudElEPnhtcC5kaWQ6YmIyYjZmNDEtZWRiYi00ZGU4LWI4MjgtYzFmOTJiMDM1NjMxPC9zdFJlZjpvcmlnaW5hbERvY3VtZW50SUQ+CiAgICAgICAgIDwveG1wTU06RGVyaXZlZEZyb20+CiAgICAgICAgIDx4bXBNTTpEb2N1bWVudElEPnhtcC5kaWQ6OWQ5YzdjMWItMjQwOS00Zjc5LWI4MGYtMjYzMWZlNTlmNGY5PC94bXBNTTpEb2N1bWVudElEPgogICAgICAgICA8eG1wTU06SW5zdGFuY2VJRD54bXAuaWlkOjlkOWM3YzFiLTI0MDktNGY3OS1iODBmLTI2MzFmZTU5ZjRmOTwveG1wTU06SW5zdGFuY2VJRD4KICAgICAgICAgPHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD54bXAuZGlkOmJiMmI2ZjQxLWVkYmItNGRlOC1iODI4LWMxZjkyYjAzNTYzMTwveG1wTU06T3JpZ2luYWxEb2N1bWVudElEPgogICAgICAgICA8eG1wTU06SGlzdG9yeT4KICAgICAgICAgICAgPHJkZjpTZXE+CiAgICAgICAgICAgICAgIDxyZGY6bGkgcmRmOnBhcnNlVHlwZT0iUmVzb3VyY2UiPgogICAgICAgICAgICAgICAgICA8c3RFdnQ6YWN0aW9uPnNhdmVkPC9zdEV2dDphY3Rpb24+CiAgICAgICAgICAgICAgICAgIDxzdEV2dDppbnN0YW5jZUlEPnhtcC5paWQ6YmIyYjZmNDEtZWRiYi00ZGU4LWI4MjgtYzFmOTJiMDM1NjMxPC9zdEV2dDppbnN0YW5jZUlEPgogICAgICAgICAgICAgICAgICA8c3RFdnQ6d2hlbj4yMDI2LTA5LTE5VDExOjMzOjI5KzAyOjAwPC9zdEV2dDp3aGVuPgogICAgICAgICAgICAgICAgICA8c3RFdnQ6c29mdHdhcmVBZ2VudD5BZG9iZSBJbGx1c3RyYXRvciAyNy4wIChNYWNpbnRvc2gpPC9zdEV2dDpzb2Z0d2FyZUFnZW50PgogICAgICAgICAgICAgICAgICA8c3RFdnQ6Y2hhbmdlZD4vPC9zdEV2dDpjaGFuZ2VkPgogICAgICAgICAgICAgICA8L3JkZjpsaT4KICAgICAgICAgICAgICAgPHJkZjpsaSByZGY6cGFyc2VUeXBlPSJSZXNvdXJjZSI+CiAgICAgICAgICAgICAgICAgIDxzdEV2dDphY3Rpb24+c2F2ZWQ8L3N0RXZ0OmFjdGlvbj4KICAgICAgICAgICAgICAgICAgPHN0RXZ0Omluc3RhbmNlSUQ+eG1wLmlpZDo5ZDljN2MxYi0yNDA5LTRmNzktYjgwZi0yNjMxZmU1OWY0Zjk8L3N0RXZ0Omluc3RhbmNlSUQ+CiAgICAgICAgICAgICAgICAgIDxzdEV2dDp3aGVuPjIwMjYtMDktMTlUMTE6MzY6MzkrMDI6MDA8L3N0RXZ0OndoZW4+CiAgICAgICAgICAgICAgICAgIDxzdEV2dDpzb2Z0d2FyZUFnZW50PkFkb2JlIElsbHVzdHJhdG9yIDI3LjAgKE1hY2ludG9zaCk8L3N0RXZ0OnNvZnR3YXJlQWdlbnQ+CiAgICAgICAgICAgICAgICAgIDxzdEV2dDpjaGFuZ2VkPi88L3N0RXZ0OmNoYW5nZWQ+CiAgICAgICAgICAgICAgIDwvcmRmOmxpPgogICAgICAgICAgICA8L3JkZjpTZXE+CiAgICAgICAgIDwveG1wTU06SGlzdG9yeT4KICAgICAgPC9yZGY6RGVzY3JpcHRpb24+CiAgIDwvcmRmOlJERj4KPC94OnhtcG1ldGE+CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAKPD94cGFja2V0IGVuZD0idyI/Pv/iAihJQ0NfUFJPRklMRQABAQAAAhhhcHBsBAAAAG1udHJSR0IgWFlaIAfmAAEAAQAAAAAAAGFjc3BBUFBMAAAAAEFQUEwAAAAAAAAAAAAAAAAAAAAAAAD21gABAAAAANMtYXBwbAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACmRlc2MAAAD8AAAAMGNwcnQAAAEsAAAAUHd0cHQAAAF8AAAAFHJYWVoAAAGQAAAAFGdYWVoAAAGkAAAAFGJYWVoAAAG4AAAAFHJUUkMAAAHMAAAAIGNoYWQAAAHsAAAALGJUUkMAAAHMAAAAIGdUUkMAAAHMAAAAIG1sdWMAAAAAAAAAAQAAAAxlblVTAAAAFAAAABwARABpAHMAcABsAGEAeQAgAFAAM21sdWMAAAAAAAAAAQAAAAxlblVTAAAANAAAABwAQwBvAHAAeQByAGkAZwBoAHQAIABBAHAAcABsAGUAIABJAG4AYwAuACwAIAAyADAAMgAy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" style="width:52px;height:auto;display:inline-block;" alt="RKS MF"/>
</div>`
