import type { Company } from '@/types'

interface InvoiceItem {
  description: string
  quantity: number
  unit: string
  unit_price: number
  discount_percent?: number
  total: number
}

interface PDFInvoiceData {
  invoice_number: string
  client_name: string
  client_email?: string
  client_address?: string
  client_phone?: string
  client_vat?: string
  issue_date: string
  due_date?: string
  currency?: string
  payment_method?: string
  payment_split?: string   // 'bank' | 'cash' | '50_50' | 'paid' | 'unpaid'
  notes?: string
  status?: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total_amount?: number
  total?: number
  items: InvoiceItem[]
  company: Company | null
}

// Hex to RGB
function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  if (h.length !== 6) return [90, 31, 214]
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

function lighten(rgb: [number, number, number], amount = 0.35): [number, number, number] {
  return rgb.map(c => Math.round(c + (255 - c) * amount)) as [number, number, number]
}

export async function generateInvoicePDF(data: PDFInvoiceData): Promise<void> {
  const { jsPDF } = await import('jspdf')
  await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 18

  // Brand color — from company settings or default purple
  const brandHex = data.company?.invoice_color || '#5A1FD6'
  const brand = hexRgb(brandHex)
  const brandLight = lighten(brand, 0.35)

  // Colors
  const dark    = [15, 20, 40] as [number,number,number]
  const gray    = [100, 110, 130] as [number,number,number]
  const lgray   = [248, 248, 252] as [number,number,number]
  const border  = [220, 220, 235] as [number,number,number]
  const green   = [16, 185, 129] as [number,number,number]
  const red     = [220, 50, 50] as [number,number,number]
  const amber   = [200, 130, 10] as [number,number,number]
  const white   = [255, 255, 255] as [number,number,number]

  const fmt = (n: number) => `€ ${Math.abs(Number(n||0)).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('sq-AL',{day:'2-digit',month:'2-digit',year:'numeric'}) : '—'

  const total = Number(data.total_amount ?? data.total ?? 0)

  // Status color
  const statusColor: [number,number,number] =
    data.status === 'paid' ? green :
    data.status === 'overdue' ? red : amber
  const statusLabel =
    data.status === 'paid' ? 'PAGUAR' :
    data.status === 'overdue' ? 'VONUAR' : 'NË PRITJE'

  // ══════════════════════════════════════
  // TOP ACCENT BAR
  // ══════════════════════════════════════
  doc.setFillColor(...brand)
  doc.rect(0, 0, W, 2, 'F')

  // ══════════════════════════════════════
  // HEADER — Logo/Name LEFT | Invoice info RIGHT
  // ══════════════════════════════════════
  let y = 10

  // Company logo or name
  let logoLoaded = false

  // Check for pre-fetched base64 (passed from server to avoid CORS)
  const preBase64 = (data.company as {_logoBase64?: string | null} | null)?._logoBase64

  // Helper to load image from base64 or URL
  async function loadLogoIntoDoc(src: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        try {
          const aspect = img.width / img.height
          const logoH = 16
          const logoW = Math.min(45, logoH * aspect)
          doc.addImage(img, 'PNG', M, y, logoW, logoH)
          resolve(true)
        } catch { resolve(false) }
      }
      img.onerror = () => resolve(false)
      img.src = src
    })
  }

  if (preBase64) {
    logoLoaded = await loadLogoIntoDoc(preBase64)
  }

  // Fallback: try via proxy API route (client-side)
  if (!logoLoaded && data.company?.logo_url) {
    try {
      const proxyUrl = `/api/logo?url=${encodeURIComponent(data.company.logo_url)}`
      const res = await fetch(proxyUrl)
      if (res.ok) {
        const blob = await res.blob()
        const b64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
        logoLoaded = await loadLogoIntoDoc(b64)
      }
    } catch {}
  }

  if (!logoLoaded && data.company?.logo_url) {
    // Final fallback: try direct fetch
    try {
      const response = await fetch(data.company.logo_url)
      if (response.ok) {
        const blob = await response.blob()
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
        const img = new Image()
        await new Promise<void>((resolve) => {
          img.onload = () => {
            try {
              const aspect = img.width / img.height
              const logoH = 16
              const logoW = Math.min(45, logoH * aspect)
              doc.addImage(base64, 'PNG', M, y, logoW, logoH)
              logoLoaded = true
            } catch {}
            resolve()
          }
          img.onerror = () => resolve()
          img.src = base64
        })
      }
    } catch {}
  }

  if (logoLoaded) {
    y += 20
  } else {
    // Fallback: Company name as text
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(...brand)
    doc.text(data.company?.name || 'Kompania', M, y + 8)
    y += 12
  }

  // Company details under logo/name
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...gray)
  const compInfo = [
    data.company?.email,
    data.company?.phone,
    data.company?.address,
    data.company?.vat_number ? `NUI: ${data.company.vat_number}` : null,
    data.company?.iban ? `IBAN: ${data.company.iban}` : null,
  ].filter(Boolean) as string[]

  compInfo.forEach((line, i) => {
    doc.text(line.slice(0, 45), M, y + i * 4.5)
  })

  // FATURË title - top right
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(26)
  doc.setTextColor(...dark)
  doc.text('FATURË', W - M, 18, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...brand)
  doc.text(`#${data.invoice_number}`, W - M, 27, { align: 'right' })

  // Status badge
  doc.setFillColor(...statusColor)
  doc.roundedRect(W - M - 28, 30, 28, 7, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(255, 255, 255)
  doc.text(statusLabel, W - M - 14, 35, { align: 'center' })

  // Divider
  const headerBottom = Math.max(y + compInfo.length * 4.5 + 4, 44)
  doc.setDrawColor(...border)
  doc.setLineWidth(0.4)
  doc.line(M, headerBottom, W - M, headerBottom)

  // ══════════════════════════════════════
  // INFO BOXES — 3 columns
  // ══════════════════════════════════════
  y = headerBottom + 6
  const boxW = (W - M * 2 - 8) / 3

  const boxes = [
    {
      title: 'DATA E LËSHIMIT',
      lines: [
        { text: fmtDate(data.issue_date), bold: true, size: 10 },
        { text: 'DATA E SKADIMIT', bold: false, size: 7, color: gray },
        { text: data.due_date ? fmtDate(data.due_date) : '—', bold: true, size: 10, color: data.due_date ? red : gray },
      ]
    },
    {
      title: 'MËNYRA PAGESËS',
      lines: [
        { text: data.payment_method || 'Transfer Bankar', bold: true, size: 10 },
        ...(data.company?.iban ? [
          { text: 'IBAN:', bold: false, size: 7, color: gray },
          { text: data.company.iban.slice(0, 26), bold: true, size: 8, color: brand },
        ] : []),
        ...(data.payment_split ? [
          { text: data.payment_split, bold: false, size: 7.5, color: amber },
        ] : []),
      ]
    },
    {
      title: 'FATURA PËR',
      lines: [
        { text: data.client_name.slice(0, 24), bold: true, size: 10 },
        ...(data.client_email ? [{ text: data.client_email.slice(0, 28), bold: false, size: 8, color: gray }] : []),
        ...(data.client_address ? [{ text: data.client_address.slice(0, 26), bold: false, size: 8, color: gray }] : []),
        ...(data.client_vat ? [{ text: `NUI: ${data.client_vat}`, bold: false, size: 7.5, color: gray }] : []),
      ]
    },
  ]

  const boxH = 26
  boxes.forEach((box, i) => {
    const bx = M + i * (boxW + 4)
    doc.setFillColor(...lgray)
    doc.roundedRect(bx, y, boxW, boxH, 2, 2, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...gray)
    doc.text(box.title, bx + 3, y + 5)

    let ly = y + 10
    box.lines.forEach(line => {
      doc.setFont('helvetica', line.bold ? 'bold' : 'normal')
      doc.setFontSize(line.size || 8)
      const col = (line.color || dark) as [number,number,number]
      doc.setTextColor(...col)
      doc.text(line.text, bx + 3, ly)
      ly += (line.size || 8) * 0.45 + 2.5
    })
  })

  y += boxH + 8

  // ══════════════════════════════════════
  // ITEMS TABLE
  // ══════════════════════════════════════
  // @ts-expect-error autotable
  doc.autoTable({
    startY: y,
    head: [['#', 'Përshkrimi', 'Njësia', 'Sasia', 'Çmimi/Njësi', 'Zbritja', 'Totali']],
    body: data.items.map((item, i) => {
      const disc = Number(item.discount_percent || 0)
      const lineTotal = Number(item.quantity) * Number(item.unit_price) * (1 - disc / 100)
      return [
        String(i + 1),
        item.description.slice(0, 40),
        item.unit || 'copë',
        Number(item.quantity).toFixed(0),
        fmt(Number(item.unit_price)),
        disc > 0 ? `${disc}%` : '—',
        fmt(lineTotal),
      ]
    }),
    margin: { left: M, right: M },
    headStyles: {
      fillColor: brand,
      textColor: white,
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
    },
    bodyStyles: {
      fontSize: 8.5,
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      textColor: dark,
      lineColor: border,
      lineWidth: 0.2,
    },
    alternateRowStyles: { fillColor: lgray },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      2: { halign: 'center', cellWidth: 16 },
      3: { halign: 'center', cellWidth: 14 },
      4: { halign: 'right', cellWidth: 26 },
      5: { halign: 'center', cellWidth: 16 },
      6: { halign: 'right', fontStyle: 'bold', cellWidth: 24 },
    },
    didParseCell: (data2: { section: string; column: { index: number }; cell: { styles: { textColor: number[] } } }) => {
      if (data2.section === 'head') {
        data2.cell.styles.textColor = [255, 255, 255]
      }
    },
  })

  // @ts-expect-error autotable
  y = doc.lastAutoTable.finalY + 6

  // ══════════════════════════════════════
  // TOTALS — right side
  // ══════════════════════════════════════
  const totW = 68
  const totX = W - M - totW

  const totRows = [
    { label: 'Nëntotali', value: fmt(data.subtotal), bold: false },
    { label: `TVSH ${data.tax_rate}%`, value: fmt(data.tax_amount), bold: false },
    ...(Number(data.subtotal) !== Number(data.total_amount ?? data.total ?? 0) &&
        Number(data.tax_amount) === 0 ? [] : []),
  ]

  totRows.forEach((row, i) => {
    const rowY = y + i * 7.5
    doc.setFillColor(i % 2 === 0 ? 252 : 248, i % 2 === 0 ? 252 : 248, i % 2 === 0 ? 255 : 252)
    doc.rect(totX, rowY, totW, 7.5, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...dark)
    doc.text(row.label, totX + 3, rowY + 5)
    doc.text(row.value, totX + totW - 3, rowY + 5, { align: 'right' })
  })

  // TOTAL box
  const totalY = y + totRows.length * 7.5
  doc.setFillColor(...brand)
  doc.roundedRect(totX, totalY, totW, 11, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(255, 255, 255)
  doc.text('TOTALI', totX + 3, totalY + 7)
  doc.setFontSize(12)
  doc.text(fmt(total), totX + totW - 3, totalY + 7.5, { align: 'right' })

  y = totalY + 17

  // ══════════════════════════════════════
  // NOTES
  // ══════════════════════════════════════
  if (data.notes) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...brand)
    doc.text('Shënime:', M, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...dark)
    const lines = doc.splitTextToSize(data.notes, W - M * 2 - totW - 8)
    lines.slice(0, 3).forEach((line: string, i: number) => {
      doc.text(line, M, y + 5 + i * 4.5)
    })
    y += 5 + Math.min(lines.length, 3) * 4.5 + 6
  }

  // ══════════════════════════════════════
  // BANK INFO + QR CODE
  // ══════════════════════════════════════
  const bankY = Math.max(y, totalY + 17)
  const qrSize = 26

  // Bank info box
  if (data.company?.iban || data.company?.bank_name) {
    doc.setFillColor(...lgray)
    doc.roundedRect(M, bankY, W - M * 2 - qrSize - 8, 14, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...dark)
    doc.text('Informacioni Bankar:', M + 3, bankY + 5.5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...gray)
    if (data.company.iban) doc.text(`IBAN: ${data.company.iban}`, M + 3, bankY + 10)
    if (data.company.bank_name) doc.text(data.company.bank_name, M + 70, bankY + 10)
  }

  // ══════════════════════════════════════
  // QR CODE — pixel drawing (no canvas needed)
  // ══════════════════════════════════════
  const qrX = W - M - qrSize
  const qrY = bankY

  try {
    const QRCode = await import('qrcode')
    const qrText = [
      data.invoice_number,
      `EUR ${fmt(total)}`,
      data.client_name,
      data.company?.iban || '',
      data.company?.name || '',
    ].filter(Boolean).join('|')

    const qrObj = QRCode.create(qrText, { errorCorrectionLevel: 'M' })
    const modules = qrObj.modules
    const size = modules.size
    const cellSz = qrSize / size

    // White bg
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(...border)
    doc.setLineWidth(0.3)
    doc.roundedRect(qrX - 1.5, qrY - 1, qrSize + 3, qrSize + 7, 2, 2, 'FD')

    // Draw pixels
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (modules.get(row, col)) {
          doc.setFillColor(...dark)
          doc.rect(qrX + col * cellSz, qrY + row * cellSz, cellSz, cellSz, 'F')
        }
      }
    }

    // Label
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5)
    doc.setTextColor(...gray)
    doc.text('SKANOJ PËR PAGESË', qrX + qrSize / 2, qrY + qrSize + 4.5, { align: 'center' })

  } catch {
    // Fallback
    doc.setFillColor(...lgray)
    doc.roundedRect(qrX - 1.5, qrY - 1, qrSize + 3, qrSize + 7, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...gray)
    doc.text('QR', qrX + qrSize / 2, qrY + qrSize / 2, { align: 'center' })
  }

  // ══════════════════════════════════════
  // ══════════════════════════════════════
  // FOOTER — minimal, vetëm informacioni i faturës (PDF plotësisht white-label)
  // ══════════════════════════════════════
  const footerY = H - 12
  doc.setDrawColor(...border)
  doc.setLineWidth(0.3)
  doc.line(M, footerY, W - M, footerY)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...gray)
  doc.text(
    `${data.company?.name || ''} · ${data.invoice_number} · ${fmtDate(data.issue_date)}`,
    W / 2, footerY + 5, { align: 'center' }
  )

  doc.save(`Fatura_${data.invoice_number}.pdf`)
}
