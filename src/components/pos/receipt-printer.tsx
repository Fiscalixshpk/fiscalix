'use client'
// Receipt Printer — 80mm thermal with logo support

interface ReceiptItem {
  name: string; quantity: number; price: number; taxRate: string; discount?: number
}

interface ReceiptData {
  company: { name: string; nui: string; locationCity: string; logo_url?: string }
  items: ReceiptItem[]
  total: number
  tax: number
  paymentMethod: string
  iic?: string
  fic?: string
  receiptNumber?: string
  qrCode?: string
  operator?: string
  deviceId?: string
}

export function printReceipt(data: ReceiptData) {
  const fmtEUR = (atk: number) => `€${(atk/10000).toFixed(2)}`
  const now = new Date()
  const dateStr = now.toLocaleDateString('sq-AL')
  const timeStr = now.toLocaleTimeString('sq-AL', { hour:'2-digit', minute:'2-digit' })

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Courier New',monospace; width:80mm; font-size:11px; color:#000; background:white; padding:4px 6px; }
  @media print { @page { margin:0; size:80mm auto; } body { padding:2px 4px; } }
  .center { text-align:center; }
  .right { text-align:right; }
  .bold { font-weight:bold; }
  .line { border-top:1px dashed #000; margin:6px 0; }
  .double { border-top:2px solid #000; margin:6px 0; }
  .logo { max-width:120px; max-height:50px; object-fit:contain; margin:0 auto 4px; display:block; }
  .row { display:flex; justify-content:space-between; margin:2px 0; }
  .total-row { display:flex; justify-content:space-between; font-size:14px; font-weight:bold; }
  .item-name { flex:1; margin-right:4px; }
  .item-price { text-align:right; white-space:nowrap; }
  .qr { width:100px; height:100px; margin:8px auto; display:block; }
  .small { font-size:9px; }
  .verify { font-size:9px; word-break:break-all; }
</style>
</head>
<body>

<!-- HEADER / LOGO -->
<div class="center" style="margin-bottom:6px;">
  ${data.company.logo_url
    ? `<img src="${data.company.logo_url}" class="logo" alt="logo"/>`
    : `<div class="bold" style="font-size:14px;">${data.company.name}</div>`
  }
  ${data.company.logo_url ? `<div class="bold">${data.company.name}</div>` : ''}
  <div class="small">NUI: ${data.company.nui}</div>
  <div class="small">${data.company.locationCity}, Kosovë</div>
</div>

<div class="double"></div>

<div class="row small">
  <span>Data:</span><span>${dateStr} ${timeStr}</span>
</div>
<div class="row small">
  <span>Nr. Kuponit:</span><span>${data.receiptNumber||'—'}</span>
</div>
${data.operator ? `<div class="row small"><span>Kasier:</span><span>${data.operator}</span></div>` : ''}

<div class="line"></div>

<!-- ITEMS -->
${data.items.map(it => {
  const total = Math.round(it.price * it.quantity * (1-(it.discount||0)/100))
  return `
<div style="margin-bottom:3px;">
  <div class="bold" style="font-size:11px;">${it.name}</div>
  <div class="row small">
    <span>${it.quantity} x ${fmtEUR(it.price)}${it.discount?` (-${it.discount}%)`:''}</span>
    <span class="bold">${fmtEUR(total)}</span>
  </div>
</div>`
}).join('')}

<div class="line"></div>

<!-- TOTALS -->
<div class="row small"><span>TVSH:</span><span>€${data.tax.toFixed(2)}</span></div>
<div class="row small">
  <span>Metoda:</span>
  <span>${data.paymentMethod==='cash'?'Cash':data.paymentMethod==='card'?'Kartë':'Borxh'}</span>
</div>
<div class="double"></div>
<div class="total-row">
  <span>TOTAL:</span><span>€${data.total.toFixed(2)}</span>
</div>
<div class="double"></div>

<!-- FISCAL DATA -->
${data.iic ? `
<div class="center small" style="margin-top:6px;">
  <div>IIC: <span class="verify">${data.iic}</span></div>
</div>` : ''}

${data.fic ? `
<div class="center small">
  <div>FIC: <span class="verify">${data.fic}</span></div>
</div>` : ''}

<!-- QR CODE -->
${data.qrCode ? `
<div class="center" style="margin:8px 0;">
  <canvas id="qr" class="qr"></canvas>
  <div class="small">Skanoni për verifikim</div>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
<script>
  new QRCode(document.getElementById('qr'), {
    text: '${data.qrCode}', width:100, height:100,
    correctLevel: QRCode.CorrectLevel.M
  });
<\/script>` : ''}

<div class="line"></div>
${data.company.logo_url ? `
<div class="center" style="margin:8px 0 4px;">
  <img src="${data.company.logo_url}" class="logo" alt="logo" style="max-width:80px;max-height:30px;object-fit:contain;"/>
</div>` : ''}
<div class="center small" style="margin-top:4px;">
  Faleminderit për blerjen!<br/>
  <span style="font-size:8px;">Powered by Fiscalix</span>
</div>

</body>
</html>`

  const w = window.open('', '_blank', 'width=320,height=600')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => { w.print(); w.close() }, 600)
}
