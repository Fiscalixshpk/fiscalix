import type { Invoice, Expense, Company } from '@/types'

export async function generatePDFReport(
  type: 'mujor' | 'vjetor',
  invoices: Invoice[],
  expenses: (Expense & { expense_categories?: { name_sq?: string; name?: string } })[],
  company: Company | null,
  year: number,
  month: number
) {
  const { jsPDF } = await import('jspdf')
  await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 18

  // Colors - clean professional palette
  const purple  = [90, 31, 214] as [number,number,number]
  const purpleL = [123, 44, 245] as [number,number,number]
  const dark    = [15, 20, 40] as [number,number,number]
  const gray    = [100, 110, 130] as [number,number,number]
  const lgray   = [248, 248, 252] as [number,number,number]
  const border  = [220, 220, 235] as [number,number,number]
  const white   = [255, 255, 255] as [number,number,number]
  const green   = [16, 185, 129] as [number,number,number]
  const red     = [220, 50, 50] as [number,number,number]
  const amber   = [200, 130, 10] as [number,number,number]

  const MONTHS = ['Janar','Shkurt','Mars','Prill','Maj','Qershor','Korrik','Gusht','Shtator','Tetor','Nëntor','Dhjetor']
  const periodLabel = month > 0 ? `${MONTHS[month-1]} ${year}` : `Viti ${year}`
  const title = type === 'mujor' ? 'RAPORT MUJOR FINANCIAR' : 'RAPORT VJETOR FINANCIAR'

  const totalRev = invoices.reduce((s,i) => s+Number((i.total_amount ?? i.total)||0), 0)
  const totalExp = expenses.reduce((s,e) => s+Number(e.amount||0), 0)
  const profit   = totalRev - totalExp
  const margin2  = totalRev > 0 ? (profit/totalRev*100) : 0
  const totalTax = invoices.reduce((s,i) => s+Number(i.tax_amount||0), 0)
  const paid     = invoices.filter(i => i.status==='paid')
  const pending  = invoices.filter(i => i.status==='pending')
  const overdue  = invoices.filter(i => i.status==='overdue')

  const fmt = (n: number) => `€ ${Math.abs(Number(n||0)).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})}${n<0?'*':''}`
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('sq-AL',{day:'2-digit',month:'2-digit',year:'numeric'}) : '—'

  // ═══════════════════════════
  // HEADER — Clean white + purple accent
  // ═══════════════════════════
  // Top purple bar
  doc.setFillColor(...purpleL)
  doc.rect(0, 0, W, 1.5, 'F')

  // Company name + report title
  doc.setFont('helvetica','bold')
  doc.setFontSize(18)
  doc.setTextColor(...dark)
  doc.text(company?.name || 'Raporti Financiar', M, 18)

  doc.setFont('helvetica','normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...gray)
  if (company?.email) doc.text(company.email, M, 24)

  // Title right
  doc.setFont('helvetica','bold')
  doc.setFontSize(15)
  doc.setTextColor(...dark)
  doc.text(title, W-M, 18, {align:'right'})

  doc.setFont('helvetica','normal')
  doc.setFontSize(10)
  doc.setTextColor(...purpleL)
  doc.text(periodLabel, W-M, 25, {align:'right'})

  doc.setFontSize(8)
  doc.setTextColor(...gray)
  doc.text(`Gjeneruar: ${new Date().toLocaleDateString('sq-AL')}`, W-M, 31, {align:'right'})

  // Divider line
  doc.setDrawColor(...border)
  doc.setLineWidth(0.5)
  doc.line(M, 35, W-M, 35)

  let y = 43

  // ═══════════════════════════
  // KPI CARDS — 4 in a row
  // ═══════════════════════════
  const kpis = [
    { label:'Të Ardhura', value:fmt(totalRev), sub:`${paid.length} fatura paguar`, color:purpleL },
    { label:'Shpenzime',  value:fmt(totalExp), sub:`${expenses.length} transaksione`, color:red },
    { label:'Fitimi Neto', value:fmt(profit), sub:`Marzhi ${margin2.toFixed(1)}%`, color:profit>=0?green:red },
    { label:'TVSH 18%',   value:fmt(totalTax), sub:'Tatim i mbledhur', color:[59,130,246] as [number,number,number] },
  ]
  const cw = (W-M*2-9)/4
  kpis.forEach((k,i) => {
    const x = M+i*(cw+3)
    doc.setFillColor(...lgray)
    doc.roundedRect(x, y, cw, 20, 2, 2, 'F')
    doc.setDrawColor(...border)
    doc.setLineWidth(0.4)
    doc.roundedRect(x, y, cw, 20, 2, 2, 'S')
    // Top accent
    doc.setFillColor(...k.color)
    doc.roundedRect(x, y, cw, 1.2, 1, 1, 'F')
    // Value — font size adaptive to avoid overflow on long numbers
    const valueFontSize = k.value.length > 11 ? 10 : k.value.length > 8 ? 11.5 : 13
    doc.setFont('helvetica','bold')
    doc.setFontSize(valueFontSize)
    doc.setTextColor(...k.color)
    doc.text(k.value, x+cw/2, y+10, {align:'center'})
    // Label
    doc.setFont('helvetica','bold')
    doc.setFontSize(7)
    doc.setTextColor(...dark)
    doc.text(k.label, x+cw/2, y+15, {align:'center'})
    // Sub
    doc.setFont('helvetica','normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...gray)
    doc.text(k.sub, x+cw/2, y+19, {align:'center'})
  })
  y += 26

  // ═══════════════════════════
  // SECTION HEADER style
  // ═══════════════════════════
  function sectionHeader(label: string, yPos: number) {
    doc.setFont('helvetica','bold')
    doc.setFontSize(9.5)
    doc.setTextColor(...purpleL)
    doc.text(label, M, yPos)
    doc.setDrawColor(...purpleL)
    doc.setLineWidth(0.5)
    doc.line(M, yPos+1.5, M+doc.getTextWidth(label), yPos+1.5)
    return yPos + 8
  }

  // ═══════════════════════════
  // STATUSET E FATURAVE
  // ═══════════════════════════
  y = sectionHeader('STATUSI I FATURAVE', y)

  const statusCols = [
    {l:'Fatura Totale', v:String(invoices.length), col:dark},
    {l:'Paguar', v:String(paid.length), col:green},
    {l:'Në Pritje', v:String(pending.length), col:amber},
    {l:'Vonuara', v:String(overdue.length), col:red},
  ]
  const sw2 = (W-M*2-9)/4
  statusCols.forEach((s,i) => {
    const x = M+i*(sw2+3)
    doc.setFillColor(...lgray)
    doc.roundedRect(x, y, sw2, 16, 2, 2, 'F')
    doc.setDrawColor(...border)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, y, sw2, 16, 2, 2, 'S')
    doc.setFont('helvetica','bold')
    doc.setFontSize(15)
    doc.setTextColor(...s.col as [number,number,number])
    doc.text(s.v, x+sw2/2, y+8.5, {align:'center'})
    doc.setFont('helvetica','normal')
    doc.setFontSize(7)
    doc.setTextColor(...gray)
    doc.text(s.l, x+sw2/2, y+13.5, {align:'center'})
  })
  y += 22

  // Detyrimet tatimore
  doc.setFillColor(240, 236, 255)
  doc.roundedRect(M, y, W-M*2, 11, 2, 2, 'F')
  const taxItems = [
    { label: 'Tatim Fitimi 10%:', value: fmt(Math.max(0,profit)*0.1), color: purpleL },
    { label: 'TVSH e Mbledhur:', value: fmt(totalTax), color: purpleL },
    { label: 'Totali Detyrimit:', value: fmt(totalTax + Math.max(0,profit)*0.1), color: red },
  ]
  const taxColW = (W - M*2 - 8) / 3
  taxItems.forEach((item, i) => {
    const x = M + 4 + i * taxColW
    doc.setFont('helvetica','bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...dark)
    doc.text(item.label, x, y+7)
    doc.setTextColor(...item.color)
    doc.text(item.value, x + doc.getTextWidth(item.label) + 3, y+7)
  })
  y += 17

  // ═══════════════════════════
  // SHPENZIME SIPAS KATEGORISË
  // ═══════════════════════════
  const byCat: Record<string,number> = {}
  expenses.forEach(exp => {
    const cat = exp.expense_categories?.name_sq || exp.expense_categories?.name || 'Tjera'
    byCat[cat] = (byCat[cat]||0) + Number(exp.amount||0)
  })
  const cats = Object.entries(byCat).sort((a,b)=>b[1]-a[1]).slice(0,5)

  if (cats.length > 0) {
    y = sectionHeader('SHPENZIME SIPAS KATEGORISË', y)
    const maxCat = Math.max(...cats.map(c=>c[1]),1)
    const catCols = [purpleL, [59,130,246], green, amber, red] as [number,number,number][]
    const barW = W-M*2-55
    cats.forEach(([cat,amt],i) => {
      const bLen = Math.max(2, (amt/maxCat)*barW)
      doc.setFillColor(...catCols[i%catCols.length])
      doc.roundedRect(M, y, bLen, 5, 0.5, 0.5, 'F')
      doc.setFillColor(...border)
      doc.roundedRect(M+bLen, y, barW-bLen, 5, 0, 0, 'F')
      doc.setFont('helvetica','normal')
      doc.setFontSize(8)
      doc.setTextColor(...dark)
      doc.text(cat.slice(0,22), M+barW+3, y+4)
      doc.setFont('helvetica','bold')
      doc.setTextColor(...catCols[i%catCols.length])
      doc.text(fmt(amt), W-M, y+4, {align:'right'})
      y += 8
    })
    y += 4
  }

  // ═══════════════════════════
  // TABELA FATURAVE
  // ═══════════════════════════
  if (invoices.length > 0) {
    y = sectionHeader(`LISTA E FATURAVE (${invoices.length})`, y)
    // @ts-expect-error autotable
    doc.autoTable({
      startY: y,
      head: [['Nr. Faturës','Klienti','Data','Skadenca','Statusi','Totali']],
      body: invoices.slice(0,30).map(inv => [
        inv.invoice_number||'—',
        (inv.client_name||'—').slice(0,24),
        fmtDate(inv.issue_date),
        fmtDate(inv.due_date),
        inv.status==='paid'?'Paguar':inv.status==='pending'?'Pritje':'Vonuar',
        fmt(Number((inv.total_amount ?? inv.total)||0)),
      ]),
      margin:{left:M,right:M},
      headStyles:{fillColor:purple,textColor:255,fontSize:8,fontStyle:'bold',cellPadding:{top:3,bottom:3,left:3,right:3}},
      bodyStyles:{fontSize:8,cellPadding:{top:2.5,bottom:2.5,left:3,right:3},textColor:dark,lineColor:border,lineWidth:0.2},
      alternateRowStyles:{fillColor:lgray},
      columnStyles:{
        0:{fontStyle:'bold',textColor:purpleL},
        4:{halign:'center',fontStyle:'bold'},
        5:{halign:'right',fontStyle:'bold'},
      },
      didParseCell: (data: {section:string;column:{index:number};cell:{styles:{textColor:number[]}};row:{raw:string[]}}) => {
        if (data.section==='body' && data.column.index===4) {
          const s=data.row.raw[4]
          if (s==='Paguar') data.cell.styles.textColor=green
          else if (s==='Pritje') data.cell.styles.textColor=amber
          else if (s==='Vonuar') data.cell.styles.textColor=red
        }
      },
    })
    // @ts-expect-error autotable
    y = doc.lastAutoTable.finalY + 10
  }

  // ═══════════════════════════
  // TABELA SHPENZIMEVE
  // ═══════════════════════════
  if (expenses.length > 0) {
    if (y > H-60) { doc.addPage(); y = 20 }
    y = sectionHeader(`LISTA E SHPENZIMEVE (${expenses.length})`, y)
    // @ts-expect-error autotable
    doc.autoTable({
      startY: y,
      head: [['Data','Furnitori','Kategoria','Mënyra','Shuma']],
      body: expenses.slice(0,30).map(exp => [
        fmtDate(exp.expense_date||''),
        (exp.vendor_name||'—').slice(0,26),
        (exp.expense_categories?.name_sq||exp.expense_categories?.name||'—').slice(0,18),
        exp.payment_method||'cash',
        fmt(Number(exp.amount||0)),
      ]),
      margin:{left:M,right:M},
      headStyles:{fillColor:dark,textColor:255,fontSize:8,fontStyle:'bold',cellPadding:{top:3,bottom:3,left:3,right:3}},
      bodyStyles:{fontSize:8,cellPadding:{top:2.5,bottom:2.5,left:3,right:3},textColor:dark,lineColor:border,lineWidth:0.2},
      alternateRowStyles:{fillColor:lgray},
      columnStyles:{4:{halign:'right',fontStyle:'bold',textColor:red}},
    })
  }

  // ═══════════════════════════
  // FOOTER
  // ═══════════════════════════
  const totalPages = (doc.internal as {getNumberOfPages:()=>number}).getNumberOfPages()
  for (let pg=1; pg<=totalPages; pg++) {
    doc.setPage(pg)
    doc.setDrawColor(...border)
    doc.setLineWidth(0.5)
    doc.line(M, H-14, W-M, H-14)
    doc.setFont('helvetica','normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...gray)
    doc.text(`${company?.name||''} · ${periodLabel} · Gjeneruar: ${new Date().toLocaleDateString('sq-AL')}`, M, H-8)
    doc.text(`${pg}/${totalPages}`, W-M, H-8, {align:'right'})
  }

  doc.save(`Fiscalix_Raport_${periodLabel.replace(/ /g,'_')}.pdf`)
}
