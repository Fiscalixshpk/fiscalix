'use client'
// KOT — Kitchen Order Ticket
// Printohet automatikisht kur kamarieri dërgon porosinë te kuzhina

interface KOTItem { name: string; quantity: number; notes?: string | null }

interface KOTData {
  tableLabel:  string
  waiterName:  string | null
  items:       KOTItem[]
  ticketNumber?: string
}

// Funksion global për të printuar KOT
export function printKOT(data: KOTData) {
  const now    = new Date()
  const time   = now.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const date   = now.toLocaleDateString('sq-AL', { day: '2-digit', month: '2-digit' })

  const win = window.open('', '_blank', 'width=300,height=400')
  if (!win) {
    // Fallback nëse popup blocked — shfaq mesazh
    console.log('KOT:', JSON.stringify(data))
    return
  }

  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>KOT - ${data.tableLabel}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Courier New', monospace;
          font-size: 14px;
          width: 80mm;
          padding: 8px;
          color: #000;
        }
        .header {
          text-align: center;
          border-bottom: 2px dashed #000;
          padding-bottom: 8px;
          margin-bottom: 8px;
        }
        .kot-title {
          font-size: 20px;
          font-weight: 900;
          letter-spacing: 3px;
        }
        .table-name {
          font-size: 28px;
          font-weight: 900;
          margin: 6px 0;
        }
        .meta {
          font-size: 12px;
          color: #333;
        }
        .items {
          margin: 8px 0;
          border-bottom: 2px dashed #000;
          padding-bottom: 8px;
        }
        .item {
          display: flex;
          gap: 8px;
          margin-bottom: 6px;
          align-items: flex-start;
        }
        .qty {
          font-size: 18px;
          font-weight: 900;
          min-width: 28px;
          background: #000;
          color: #fff;
          text-align: center;
          padding: 0 4px;
          border-radius: 2px;
        }
        .name {
          font-size: 15px;
          font-weight: 700;
          line-height: 1.3;
          flex: 1;
        }
        .notes {
          font-size: 11px;
          color: #555;
          margin-left: 36px;
          font-style: italic;
        }
        .footer {
          text-align: center;
          font-size: 11px;
          color: #555;
          margin-top: 6px;
        }
        @media print {
          body { width: 80mm; }
          @page { margin: 0; size: 80mm auto; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="kot-title">— K O T —</div>
        <div class="table-name">${data.tableLabel}</div>
        <div class="meta">${date} ${time}</div>
        ${data.waiterName ? `<div class="meta">Kamerieri: <strong>${data.waiterName}</strong></div>` : ''}
        ${data.ticketNumber ? `<div class="meta">#${data.ticketNumber}</div>` : ''}
      </div>
      <div class="items">
        ${data.items.map(item => `
          <div class="item">
            <span class="qty">${item.quantity}</span>
            <span class="name">${item.name.toUpperCase()}</span>
          </div>
          ${item.notes ? `<div class="notes">→ ${item.notes}</div>` : ''}
        `).join('')}
      </div>
      <div class="footer">*** KUZHINA ***</div>
    </body>
    </html>
  `)

  win.document.close()
  win.focus()

  // Auto print pas 300ms (koha për render)
  setTimeout(() => {
    win.print()
    win.close()
  }, 300)
}
