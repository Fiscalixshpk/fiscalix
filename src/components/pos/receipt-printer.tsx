'use client'
// ── ATK-Compliant Receipt Printer ─────────────────────────────
// Konforme me: Kërkesat Specifike Teknike dhe Funksionale (Maj 2026)
// Neni 25, 28 (SEF) dhe Shtojca F — struktura e plotë e kuponit

export interface ReceiptItem {
  name: string
  quantity: number
  price: number       // €0.0001 units (ATK format): €1.50 = 15000
  unit: string
  taxRate: string     // 'A' | 'C' | 'D' | 'E'
  discount?: number   // në cents
}

export interface SplitPayment {
  cash: number        // në cents
  card: number        // në cents
}

export interface ReceiptData {
  // Kompania — Kreu i kuponit (Neni 25, pika 18)
  company: {
    name: string
    nui: string         // NF-NUI: Numri Fiskal / Numri Unik Identifikues
    vatNumber?: string  // Numri i TVSH-së (nëse ka)
    address: string     // Adresa e njësisë
    city: string
    phone?: string
    logo_url?: string
  }

  // Punëtori
  operator: string

  // Items
  items: ReceiptItem[]

  // Totalet — në CENT (€1.00 = 100)
  totals: {
    subtotal: number    // para zbritjes
    discount: number    // zbritja totale
    total: number       // totali final
    tax: number         // TVSH totale
    noTax: number       // pa TVSH
  }

  // Pagesa
  paymentMethod: 'cash' | 'card' | 'split' | 'voucher' | 'insurance' | 'other'
  splitPayment?: SplitPayment

  // Të dhëna fiskale — ATK
  couponType: 'SALE' | 'CANCEL' | 'RETURN'
  status: 'fiscalized' | 'offline' | 'failed'
  receiptNumber?: string    // KF-2026-XXXX
  dailyCouponNo?: number    // Nr. rendor ditor
  sefId?: string            // NR. IDENTIFIKUES I SEF: [NUI Njësisë]-[NUI]-[PosId]
  nuikf?: string            // Numri Unik Identifikues i Kuponit Fiskal (max 16 karaktere)
  qrCodeData?: string       // Base64|Signature — për verifikim ATK
  issuedAt?: Date
  isOffline?: boolean

  // Referenca (për CANCEL/RETURN)
  referenceReceiptNo?: string
  cancelReason?: string
}

// ── Formatimi ─────────────────────────────────────────────────
const fmtEUR = (cents: number) => `€${(cents / 100).toFixed(2)}`
const fmtItemPrice = (atkUnits: number) => `€${(atkUnits / 10000).toFixed(4)}`

const TAX_LABELS: Record<string, string> = {
  A: 'A 0% (i lirë)',
  C: 'C 0%',
  D: 'D 8%',
  E: 'E 18%',
}

const TAX_RATES: Record<string, number> = { A: 0, C: 0, D: 0.08, E: 0.18 }

const PAYMENT_LABELS: Record<string, string> = {
  cash:      'PARA TË GATSHME',
  card:      'KARTË BANKARE',
  split:     'E KOMBINUAR',
  voucher:   'KUPON / VOUCHER',
  insurance: 'SIGURIM',
  other:     'TJETËR',
}

// ── Groupo TVSH sipas normës ───────────────────────────────────
function groupTax(items: ReceiptItem[]) {
  const groups: Record<string, { total: number; tax: number }> = {}
  for (const item of items) {
    const rate = item.taxRate || 'E'
    const totalCents = Math.round((item.price / 100) * item.quantity) - (item.discount || 0)
    const taxRate = TAX_RATES[rate] ?? 0.18
    const tax = Math.round(totalCents * taxRate / (1 + taxRate))
    if (!groups[rate]) groups[rate] = { total: 0, tax: 0 }
    groups[rate].total += totalCents
    groups[rate].tax += tax
  }
  return groups
}

// ── Gjenero HTML ──────────────────────────────────────────────
function buildReceiptHTML(data: ReceiptData): string {
  const now = data.issuedAt || new Date()
  const dateStr = now.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const taxGroups = groupTax(data.items)
  const isCancel = data.couponType === 'CANCEL'
  const isReturn = data.couponType === 'RETURN'
  const isOffline = data.status === 'offline' || data.isOffline

  const couponLabel = isCancel ? 'KUPON FISKAL I ANULUAR'
    : isReturn ? 'KUPON FISKAL KTHIMI'
    : 'KUPON FISKAL'

  // Items HTML
  const itemsHTML = data.items.map(item => {
    const totalCents = Math.round((item.price / 100) * item.quantity) - (item.discount || 0)
    const displayPrice = (item.price / 10000).toFixed(4)
    const sign = (isCancel || isReturn) ? '-' : ''
    return `
<div class="item">
  <div class="item-name">${item.name} <span class="tax-badge">${item.taxRate}</span></div>
  <div class="item-detail">
    <span>${item.quantity} ${item.unit} × €${displayPrice}</span>
    ${item.discount ? `<span class="discount">(-${fmtEUR(item.discount)})</span>` : ''}
    <span class="item-total">${sign}${fmtEUR(totalCents)}</span>
  </div>
</div>`
  }).join('')

  // TVSH breakdown
  const taxBreakdownHTML = Object.entries(taxGroups).map(([rate, g]) => `
<div class="row small">
  <span>TVSH ${TAX_LABELS[rate] || rate}:</span>
  <span>${fmtEUR(g.tax)} (baza: ${fmtEUR(g.total - g.tax)})</span>
</div>`).join('')

  // Pagesa HTML
  let paymentHTML = ''
  if (data.paymentMethod === 'split' && data.splitPayment) {
    paymentHTML = `
<div class="row small"><span>Para të gatshme:</span><span>${fmtEUR(data.splitPayment.cash)}</span></div>
<div class="row small"><span>Kartë bankare:</span><span>${fmtEUR(data.splitPayment.card)}</span></div>`
  } else {
    paymentHTML = `<div class="row small"><span>Mënyra e pagesës:</span><span>${PAYMENT_LABELS[data.paymentMethod] || data.paymentMethod.toUpperCase()}</span></div>`
  }

  // Referenca (kthim/anulim)
  const referenceHTML = (isCancel || isReturn) && data.referenceReceiptNo ? `
<div class="ref-box">
  <div class="small">Ref. Kuponi: ${data.referenceReceiptNo}</div>
  ${data.cancelReason ? `<div class="small">Arsyeja: ${data.cancelReason}</div>` : ''}
</div>` : ''

  // NUIKF
  const nuikfHTML = data.nuikf ? `
<div class="fiscal-row">
  <span class="label">NUIKF:</span>
  <span class="value mono">${data.nuikf}</span>
</div>` : ''

  // SEF ID
  const sefHTML = data.sefId ? `
<div class="fiscal-row">
  <span class="label">NR. SEF:</span>
  <span class="value mono small">${data.sefId}</span>
</div>` : ''

  // Nr. Kuponit ditor
  const dailyNoHTML = data.dailyCouponNo !== undefined ? `
<div class="fiscal-row">
  <span class="label">KUPON FISKAL DITOR NR.:</span>
  <span class="value mono">${String(data.dailyCouponNo).padStart(4, '0')}</span>
</div>` : ''

  // QR Code — renderrohet si canvas me ngjyrë të zezë të plotë
  const qrHTML = data.qrCodeData ? `
<div class="center" style="margin: 8px 0 4px;">
  <div id="atk-qr-wrap" style="display:inline-block;padding:4px;background:#fff;border:2px solid #000;"></div>
  <div class="small" style="margin-top:4px;">Skanoni për verifikim në ATK</div>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
<script>
  (function(){
    var wrap = document.getElementById('atk-qr-wrap');
    new QRCode(wrap, {
      text: ${JSON.stringify(data.qrCodeData)},
      width: 110,
      height: 110,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
    // Force black on all canvas pixels after render
    setTimeout(function(){
      var canvas = wrap.querySelector('canvas');
      if (!canvas) return;
      var ctx = canvas.getContext('2d');
      var img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (var i = 0; i < img.data.length; i += 4) {
        if (img.data[i] < 128) {
          img.data[i] = 0; img.data[i+1] = 0; img.data[i+2] = 0; img.data[i+3] = 255;
        } else {
          img.data[i] = 255; img.data[i+1] = 255; img.data[i+2] = 255; img.data[i+3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    }, 200);
  })();
<\/script>` : ''

  // Logo fiskale RKS MF — zyrtare sipas Shtojcës A dhe F (shield me flamur Kosove + 5 yje)
  const fiscalLogoHTML = `
<div class="center" style="margin: 8px 0 4px;">
  <svg width="44" height="52" viewBox="0 0 44 52" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:0 auto;">
    <!-- Shield outline -->
    <path d="M22 2 L42 10 L42 28 Q42 44 22 50 Q2 44 2 28 L2 10 Z"
          fill="#1a3a6b" stroke="#000" stroke-width="1.5"/>
    <!-- Flamuri i Kosovës — sfond blu me hartë dhe yje -->
    <!-- Harta e Kosovës — simplified -->
    <path d="M13 22 L14 19 L17 18 L20 19 L22 17 L25 18 L28 17 L30 19 L31 22 L29 25 L26 26 L22 27 L18 26 L15 25 Z"
          fill="#D4A843" stroke="none"/>
    <!-- 5 yjet e artë sipër hartës -->
    <text x="11" y="18" font-size="4" fill="#D4A843" font-family="Arial">★ ★ ★ ★ ★</text>
    <!-- Vija ndarëse e bardhë (si flamuri) -->
    <line x1="8" y1="32" x2="36" y2="32" stroke="#fff" stroke-width="0.5" opacity="0.3"/>
  </svg>
  <div style="font-weight:900;font-size:11px;letter-spacing:3px;margin-top:2px;color:#000;">RKS MF</div>
</div>`

  // e-kuponi label (për SEF — Shtojca F)
  const eKuponiHTML = `<div class="center" style="font-style:italic;font-size:10px;margin:2px 0;">e-kuponi</div>`

  // Offline badge
  const offlineBadge = isOffline ? `
<div class="offline-badge">⚠ OFFLINE — do të dërgohet tek ATK</div>` : ''

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Kupon Fiskal</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    width: 58mm;
    font-size: 10px;
    color: #000;
    background: white;
    padding: 3px 5px 6px;
  }
  @media print {
    @page { margin: 0; size: 58mm auto; }
    body { padding: 1px 4px 4px; }
  }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: bold; }
  .small { font-size: 9px; }
  .mono { font-family: 'Courier New', monospace; word-break: break-all; }
  .line { border-top: 1px dashed #000; margin: 5px 0; }
  .double { border-top: 2px solid #000; margin: 5px 0; }
  .row { display: flex; justify-content: space-between; margin: 2px 0; }
  .logo { max-width: 120px; max-height: 48px; object-fit: contain; margin: 0 auto 4px; display: block; }
  
  /* Header */
  .company-name { font-size: 14px; font-weight: bold; text-align: center; }
  .company-info { font-size: 9px; text-align: center; line-height: 1.5; }
  
  /* Coupon title */
  .coupon-title {
    font-size: 13px; font-weight: bold; text-align: center;
    letter-spacing: 1px; margin: 6px 0 4px;
  }
  .coupon-cancel { color: #000; }
  
  /* Items */
  .item { margin: 3px 0; }
  .item-name { font-weight: bold; font-size: 11px; }
  .item-detail {
    display: flex; justify-content: space-between;
    font-size: 10px; color: #333; margin-top: 1px;
  }
  .item-total { font-weight: bold; }
  .tax-badge { font-size: 8px; background: #f0f0f0; padding: 0 2px; border-radius: 2px; }
  .discount { color: #444; }
  
  /* Totals */
  .total-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; margin: 4px 0; }
  .subtotal-row { display: flex; justify-content: space-between; font-size: 11px; margin: 2px 0; }
  
  /* Fiscal data */
  .fiscal-row { display: flex; justify-content: space-between; margin: 2px 0; font-size: 9px; }
  .fiscal-row .label { color: #333; }
  .fiscal-row .value { text-align: right; }
  
  /* Reference */
  .ref-box { border: 1px solid #000; padding: 3px 5px; margin: 4px 0; font-size: 9px; }
  
  /* Offline */
  .offline-badge {
    background: #000; color: #fff;
    text-align: center; padding: 3px; font-size: 9px;
    margin: 4px 0; letter-spacing: 1px;
  }
  
  /* Footer */
  .footer { text-align: center; font-size: 8px; margin-top: 6px; color: #333; }
</style>
</head>
<body>

<!-- ══ KREU ══════════════════════════════════════════════════ -->
<div style="margin-bottom:6px;">
  ${data.company.logo_url
    ? `<img src="${data.company.logo_url}" class="logo" alt="logo"/>`
    : `<div class="company-name">${data.company.name}</div>`
  }
  ${data.company.logo_url ? `<div class="bold center">${data.company.name}</div>` : ''}
  <div class="company-info">
    ${data.company.address ? `${data.company.address}, ` : ''}${data.company.city}<br/>
    ${data.company.phone ? `Tel: ${data.company.phone}<br/>` : ''}
    NF-NUI: ${data.company.nui}
    ${data.company.vatNumber ? `<br/>TVSH Nr.: ${data.company.vatNumber}` : ''}
  </div>
</div>

<div class="double"></div>

<!-- Punëtori -->
<div class="row small">
  <span>Kasier:</span><span>${data.operator}</span>
</div>
<div class="row small">
  <span>Data dhe ora:</span><span>${dateStr} ${timeStr}</span>
</div>
${data.receiptNumber ? `<div class="row small"><span>Nr. Kuponit:</span><span>${data.receiptNumber}</span></div>` : ''}

<div class="line"></div>

<!-- ══ TITULLI I KUPONIT ══════════════════════════════════════ -->
<div class="coupon-title ${isCancel || isReturn ? 'coupon-cancel' : ''}">${couponLabel}</div>

${referenceHTML}

<!-- ══ ARTIKUJT ═══════════════════════════════════════════════ -->
${itemsHTML}

<div class="line"></div>

<!-- ══ TOTALET ════════════════════════════════════════════════ -->
${data.totals.discount > 0 ? `
<div class="subtotal-row">
  <span>Nëntotali:</span><span>${fmtEUR(data.totals.subtotal)}</span>
</div>
<div class="subtotal-row">
  <span>Zbritja totale:</span><span>-${fmtEUR(data.totals.discount)}</span>
</div>` : ''}

<div class="double"></div>
<div class="total-row">
  <span>TOTALI PËR PAGESË</span>
  <span>${fmtEUR(data.totals.total)}</span>
</div>
<div class="double"></div>

<!-- Pagesa -->
${paymentHTML}

<div class="line"></div>

<!-- TVSH breakdown -->
${taxBreakdownHTML}
<div class="row small bold">
  <span>TOTALI TVSH:</span><span>${fmtEUR(data.totals.tax)}</span>
</div>
<div class="row small">
  <span>TOTALI PA TVSH:</span><span>${fmtEUR(data.totals.noTax)}</span>
</div>

<div class="line"></div>

<!-- ══ TË DHËNAT FISKALE ATK ═══════════════════════════════════ -->
${offlineBadge}
${dailyNoHTML}
${nuikfHTML}
${sefHTML}

<!-- QR Code — i detyrueshëm sipas Nenit 28 -->
${qrHTML}

<!-- Logo Fiskale — e detyrueshme sipas Shtojcës A/F -->
${fiscalLogoHTML}

<!-- e-kuponi label — sipas Shtojcës F -->
${eKuponiHTML}

<div class="footer">
  Faleminderit!
  <br/>Powered by Fiscalix
</div>

</body>
</html>`
}

// ── Print ──────────────────────────────────────────────────────
export function printReceipt(data: ReceiptData): void {
  const html = buildReceiptHTML(data)
  const w = window.open('', '_blank', 'width=340,height=680,scrollbars=yes')
  if (!w) {
    console.error('Popup i bllokuar — lejo popups për printim')
    return
  }
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => {
    w.print()
    w.close()
  }, 1500)
}

// ── Preview (pa printim) ───────────────────────────────────────
export function previewReceipt(data: ReceiptData): void {
  const html = buildReceiptHTML(data)
  const w = window.open('', '_blank', 'width=340,height=680,scrollbars=yes')
  if (!w) return
  w.document.write(html)
  w.document.close()
}

// ── Adapter nga API response → ReceiptData ─────────────────────
// Përdor këtë funksion pas fiscalize API call
export function buildReceiptFromAPIResponse(
  apiResponse: {
    saleId: string
    receiptNumber?: string
    transactionId?: number
    qrCodeData?: string
    status: 'fiscalized' | 'offline' | 'failed'
    totals: { totalEUR: string; taxEUR: string; noTaxEUR: string }
    dailyCouponNo?: number
    nuikf?: string
    sefId?: string
  },
  payload: {
    items: Array<{ name: string; price: number; quantity: number; unit: string; taxRate?: string; tax_rate?: string; discount?: number }>
    paymentMethod: string
    splitPayment?: SplitPayment
    operatorName?: string
    totalDiscount?: number
  },
  company: {
    name: string
    nui: string
    vatNumber?: string
    address?: string
    city?: string
    phone?: string
    logo_url?: string
  }
): ReceiptData {
  const totalEUR = Math.round(parseFloat(apiResponse.totals.totalEUR) * 100)
  const taxEUR   = Math.round(parseFloat(apiResponse.totals.taxEUR) * 100)
  const noTaxEUR = Math.round(parseFloat(apiResponse.totals.noTaxEUR) * 100)
  const discount = payload.totalDiscount || 0

  return {
    company: {
      name:       company.name,
      nui:        company.nui,
      vatNumber:  company.vatNumber,
      address:    company.address || '',
      city:       company.city || 'Kosovë',
      phone:      company.phone,
      logo_url:   company.logo_url,
    },
    operator: payload.operatorName || 'Operator',
    items: payload.items.map(item => ({
      name:      item.name,
      quantity:  item.quantity,
      price:     item.price,
      unit:      item.unit || 'cope',
      taxRate:   item.taxRate || item.tax_rate || 'E',
      discount:  item.discount,
    })),
    totals: {
      subtotal: totalEUR + discount,
      discount,
      total:    totalEUR,
      tax:      taxEUR,
      noTax:    noTaxEUR,
    },
    paymentMethod: payload.paymentMethod as ReceiptData['paymentMethod'],
    splitPayment:  payload.splitPayment,
    couponType:    'SALE',
    status:        apiResponse.status,
    receiptNumber: apiResponse.receiptNumber,
    dailyCouponNo: apiResponse.dailyCouponNo,
    sefId:         apiResponse.sefId,
    nuikf:         apiResponse.nuikf,
    qrCodeData:    apiResponse.qrCodeData,
    issuedAt:      new Date(),
    isOffline:     apiResponse.status === 'offline',
  }
}
