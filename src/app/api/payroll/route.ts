import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { company_id, year, month, employees } = await req.json()

  const { data: company } = await supabase.from('companies').select('name, vat_number, tax_number, address').eq('id', company_id).single()

  const MONTHS = ['Janar','Shkurt','Mars','Prill','Maj','Qershor','Korrik','Gusht','Shtator','Tetor','Nëntor','Dhjetor']
  const periodLabel = `${MONTHS[month-1]} ${year}`

  // Kosovo TAP brackets 2024
  function calcTAP(gross: number): number {
    const monthly = gross
    if (monthly <= 80) return 0
    if (monthly <= 250) return (monthly - 80) * 0.04
    if (monthly <= 450) return (170 * 0.04) + ((monthly - 250) * 0.08)
    return (170 * 0.04) + (200 * 0.08) + ((monthly - 450) * 0.10)
  }

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Fiscalix'

  // ═══ SHEET 1: LISTËPAGESA ═══
  const ws1 = wb.addWorksheet('Listëpagesa')
  const purple = 'FF5A1FD6'
  const white = 'FFFFFFFF'
  const lightGray = 'FFF8F9FA'
  const darkText = 'FF1F2937'

  const hStyle = { font: { bold: true, color: { argb: white }, size: 10 }, fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: purple } }, alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true }, border: { bottom: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } } } }

  // Title
  ws1.mergeCells('A1:J1')
  const titleCell = ws1.getCell('A1')
  titleCell.value = 'LISTËPAGESA MUJORE — FORMAT ATK'
  titleCell.font = { bold: true, size: 14, color: { argb: purple } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  ws1.getRow(1).height = 32

  ws1.mergeCells('A2:J2')
  ws1.getCell('A2').value = `${company?.name || ''} | Periudha: ${periodLabel}`
  ws1.getCell('A2').font = { bold: true, size: 11, color: { argb: darkText } }
  ws1.getCell('A2').alignment = { horizontal: 'center' }
  ws1.getRow(2).height = 22

  ws1.addRow([])

  // Headers
  const headers = ['Nr.', 'Emri dhe Mbiemri', 'Nr. Personal', 'Paga Bruto (€)', 'Pension 5%\nPunonjësi (€)', 'Pension 5%\nPunëdhënësi (€)', 'TAP (€)', 'Paga Neto (€)', 'Totali Deduk. (€)', 'Kostoja Totale (€)']
  const headerRow = ws1.addRow(headers)
  headerRow.height = 40
  headerRow.eachCell(cell => Object.assign(cell, hStyle))

  ws1.columns = [
    { key: 'nr', width: 6 }, { key: 'name', width: 28 }, { key: 'pid', width: 16 },
    { key: 'gross', width: 16 }, { key: 'penemp', width: 16 }, { key: 'penemp2', width: 16 },
    { key: 'tap', width: 14 }, { key: 'net', width: 16 }, { key: 'deduk', width: 16 }, { key: 'total', width: 18 }
  ]

  let totGross = 0, totPenEmp = 0, totPenEr = 0, totTAP = 0, totNet = 0, totDeduk = 0, totCost = 0

  employees.forEach((emp: { name: string; personal_id: string; gross_salary: number }, i: number) => {
    const gross = Number(emp.gross_salary || 0)
    const penEmp = +(gross * 0.05).toFixed(2)
    const penEr = +(gross * 0.05).toFixed(2)
    const tap = +calcTAP(gross).toFixed(2)
    const net = +(gross - penEmp - tap).toFixed(2)
    const deduk = +(penEmp + tap).toFixed(2)
    const cost = +(gross + penEr).toFixed(2)

    totGross += gross; totPenEmp += penEmp; totPenEr += penEr
    totTAP += tap; totNet += net; totDeduk += deduk; totCost += cost

    const row = ws1.addRow([i+1, emp.name, emp.personal_id || '', gross, penEmp, penEr, tap, net, deduk, cost])
    row.height = 20
    if (i % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightGray } }
    ;[4,5,6,7,8,9,10].forEach(c => { row.getCell(c).numFmt = '#,##0.00 "€"' })
  })

  ws1.addRow([])
  const totRow = ws1.addRow(['', 'TOTALI', '', totGross, totPenEmp, totPenEr, totTAP, totNet, totDeduk, totCost])
  totRow.height = 22
  totRow.font = { bold: true, size: 11, color: { argb: white } }
  totRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: purple } }
  ;[4,5,6,7,8,9,10].forEach(c => { totRow.getCell(c).numFmt = '#,##0.00 "€"' })

  // Notes
  ws1.addRow([])
  ws1.addRow(['SHËNIME LIGJORE:'])
  ws1.lastRow!.font = { bold: true, color: { argb: purple } }
  const notes = [
    '• Pension: 5% punonjësi + 5% punëdhënësi (Ligji Nr. 04/L-101)',
    '• TAP: 0% deri €80 | 4% €80-250 | 8% €250-450 | 10% mbi €450',
    '• Afati pagesës: deri më 15 të muajit pasues',
    '• Deklaro në: https://edi.atk-ks.org',
  ]
  notes.forEach(n => { ws1.addRow([n]); ws1.lastRow!.font = { size: 9, color: { argb: '666666' } } })

  // ═══ SHEET 2: DEKLARATA PENSION ATK ═══
  const ws2 = wb.addWorksheet('Deklarata Pension ATK')
  ws2.mergeCells('A1:F1')
  ws2.getCell('A1').value = 'DEKLARATA E KONTRIBUTEVE PENSIONALE'
  ws2.getCell('A1').font = { bold: true, size: 13, color: { argb: purple } }
  ws2.getCell('A1').alignment = { horizontal: 'center' }
  ws2.getRow(1).height = 30
  ws2.mergeCells('A2:F2')
  ws2.getCell('A2').value = `Kompania: ${company?.name || ''} | NUI: ${company?.vat_number || company?.tax_number || ''} | Periudha: ${periodLabel}`
  ws2.getCell('A2').alignment = { horizontal: 'center' }
  ws2.addRow([])

  const h2 = ws2.addRow(['Nr.', 'Emri dhe Mbiemri', 'Nr. Personal', 'Paga Bruto (€)', 'Kontrib. Punonjësi 5% (€)', 'Kontrib. Punëdhënësi 5% (€)'])
  h2.eachCell(cell => Object.assign(cell, hStyle))
  ws2.columns = [{ width: 6 }, { width: 30 }, { width: 16 }, { width: 16 }, { width: 22 }, { width: 22 }]

  employees.forEach((emp: { name: string; personal_id: string; gross_salary: number }, i: number) => {
    const gross = Number(emp.gross_salary || 0)
    ws2.addRow([i+1, emp.name, emp.personal_id || '', gross, +(gross*0.05).toFixed(2), +(gross*0.05).toFixed(2)])
    ;[4,5,6].forEach(c => { ws2.lastRow!.getCell(c).numFmt = '#,##0.00 "€"' })
  })

  ws2.addRow([])
  const t2 = ws2.addRow(['', 'TOTALI', '', totGross, totPenEmp, totPenEr])
  t2.font = { bold: true, color: { argb: white } }
  t2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: purple } }
  ;[4,5,6].forEach(c => { t2.getCell(c).numFmt = '#,##0.00 "€"' })

  // Save payroll records
  for (const emp of employees) {
    const gross = Number(emp.gross_salary || 0)
    const penEmp = +(gross * 0.05).toFixed(2)
    const penEr = +(gross * 0.05).toFixed(2)
    const tap = +calcTAP(gross).toFixed(2)
    const net = +(gross - penEmp - tap).toFixed(2)
    if (emp.id) {
      await supabase.from('payroll_records').upsert({
        company_id, employee_id: emp.id, year, month,
        gross_salary: gross, tax_income: tap,
        pension_employee: penEmp, pension_employer: penEr, net_salary: net
      }, { onConflict: 'company_id,employee_id,year,month' })
    }
  }

  const buffer = await wb.xlsx.writeBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Listepagesa_${periodLabel.replace(' ','_')}_${company?.name?.replace(/\s+/g,'_') || ''}.xlsx"`,
    }
  })
}
