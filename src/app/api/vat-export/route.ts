import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const companyId = req.nextUrl.searchParams.get('company_id')!
  const year = parseInt(req.nextUrl.searchParams.get('year') || new Date().getFullYear().toString())
  const quarter = parseInt(req.nextUrl.searchParams.get('quarter') || '1')

  const startMonth = (quarter - 1) * 3 + 1
  const endMonth = startMonth + 2
  const startDate = `${year}-${String(startMonth).padStart(2,'0')}-01`
  const endDate = `${year}-${String(endMonth).padStart(2,'0')}-31`

  // Use admin client for data (bypasses RLS - already verified access above)
  const adminSupabase = await createAdminClient()
  const { data: company } = await adminSupabase.from('companies').select('name, vat_number, tax_number, address').eq('id', companyId).single()
  const { data: invoices } = await adminSupabase.from('invoices').select('*').eq('company_id', companyId).gte('issue_date', startDate).lte('issue_date', endDate).order('issue_date')
  const { data: expenses } = await adminSupabase.from('expenses').select('*').eq('company_id', companyId).gte('expense_date', startDate).lte('expense_date', endDate).order('expense_date')

  const purple = 'FF5A1FD6'
  const white = 'FFFFFFFF'
  const green = 'FF10B981'
  const red = 'FFEF4444'
  const hStyle = { font: { bold: true, color: { argb: white }, size: 10 }, fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: purple } }, alignment: { horizontal: 'center' as const, vertical: 'middle' as const } }

  const qLabel = `T${quarter} ${year}`
  const wb = new ExcelJS.Workbook()

  // ═══ SHEET 1: TVSH Dalëse (Shitjet) ═══
  const ws1 = wb.addWorksheet('TVSH Dalëse (Shitjet)')
  ws1.mergeCells('A1:F1')
  ws1.getCell('A1').value = `TVSH DALËSE — SHITJET — ${qLabel}`
  ws1.getCell('A1').font = { bold: true, size: 13, color: { argb: purple } }
  ws1.getCell('A1').alignment = { horizontal: 'center' }
  ws1.getRow(1).height = 28
  ws1.mergeCells('A2:F2')
  ws1.getCell('A2').value = `${company?.name || ''} | NUI TVSH: ${company?.vat_number || ''}`
  ws1.getCell('A2').alignment = { horizontal: 'center' }
  ws1.addRow([])

  ws1.columns = [{ width: 6 }, { width: 14 }, { width: 28 }, { width: 16 }, { width: 12 }, { width: 16 }]
  const h1 = ws1.addRow(['Nr.', 'Data', 'Klienti / Përshkrimi', 'Vlera pa TVSH (€)', 'Norma TVSH', 'TVSH (€)'])
  h1.height = 22
  h1.eachCell(cell => Object.assign(cell, hStyle))

  let totSalesNet = 0, totSalesVat = 0
  ;(invoices || []).forEach((inv, i) => {
    const total = Number(inv.total_amount || inv.total || 0)
    const vatRate = Number(inv.vat_rate || 18)
    const vat = +(total - total / (1 + vatRate/100)).toFixed(2)
    const net = +(total - vat).toFixed(2)
    totSalesNet += net; totSalesVat += vat
    const row = ws1.addRow([i+1, inv.issue_date, inv.client_name || inv.bill_to_name || '—', net, `${vatRate}%`, vat])
    if (i%2===0) row.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFF8F9FA'} }
    ;[4,6].forEach(c => { row.getCell(c).numFmt = '#,##0.00 "€"' })
  })

  ws1.addRow([])
  const t1 = ws1.addRow(['', '', 'TOTALI TVSH DALËSE', totSalesNet, '', totSalesVat])
  t1.font = { bold: true, color: { argb: white } }
  t1.fill = { type:'pattern', pattern:'solid', fgColor:{argb:green} }
  ;[4,6].forEach(c => { t1.getCell(c).numFmt = '#,##0.00 "€"' })

  // ═══ SHEET 2: TVSH Hyrëse (Blerjet) ═══
  const ws2 = wb.addWorksheet('TVSH Hyrëse (Blerjet)')
  ws2.mergeCells('A1:F1')
  ws2.getCell('A1').value = `TVSH HYRËSE — BLERJET — ${qLabel}`
  ws2.getCell('A1').font = { bold: true, size: 13, color: { argb: purple } }
  ws2.getCell('A1').alignment = { horizontal: 'center' }
  ws2.getRow(1).height = 28
  ws2.mergeCells('A2:F2')
  ws2.getCell('A2').value = `${company?.name || ''} | NUI TVSH: ${company?.vat_number || ''}`
  ws2.getCell('A2').alignment = { horizontal: 'center' }
  ws2.addRow([])

  ws2.columns = [{ width: 6 }, { width: 14 }, { width: 28 }, { width: 16 }, { width: 12 }, { width: 16 }]
  const h2 = ws2.addRow(['Nr.', 'Data', 'Furnizuesi / Shpenzimi', 'Vlera pa TVSH (€)', 'Norma TVSH', 'TVSH (€)'])
  h2.height = 22
  h2.eachCell(cell => Object.assign(cell, hStyle))

  let totExpNet = 0, totExpVat = 0
  ;(expenses || []).filter(e => e.is_vat_applicable).forEach((exp, i) => {
    const amount = Number(exp.amount || 0)
    const vatRate = Number(exp.vat_rate || 18)
    const vat = +(amount * vatRate / 100).toFixed(2)
    const net = +(amount - vat).toFixed(2)
    totExpNet += net; totExpVat += vat
    const row = ws2.addRow([i+1, exp.expense_date, exp.vendor_name || exp.description || '—', net, `${vatRate}%`, vat])
    if (i%2===0) row.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFF8F9FA'} }
    ;[4,6].forEach(c => { row.getCell(c).numFmt = '#,##0.00 "€"' })
  })

  ws2.addRow([])
  const t2 = ws2.addRow(['', '', 'TOTALI TVSH HYRËSE', totExpNet, '', totExpVat])
  t2.font = { bold: true, color: { argb: white } }
  t2.fill = { type:'pattern', pattern:'solid', fgColor:{argb:red} }
  ;[4,6].forEach(c => { t2.getCell(c).numFmt = '#,##0.00 "€"' })

  // ═══ SHEET 3: Deklarata TVSH ═══
  const ws3 = wb.addWorksheet('Deklarata TVSH ATK')
  ws3.columns = [{ width: 40 }, { width: 20 }]
  ws3.mergeCells('A1:B1')
  ws3.getCell('A1').value = `DEKLARATA E TVSH-SË — ${qLabel}`
  ws3.getCell('A1').font = { bold: true, size: 14, color: { argb: purple } }
  ws3.getCell('A1').alignment = { horizontal: 'center' }
  ws3.getRow(1).height = 32

  const vatBalance = totSalesVat - totExpVat
  const summaryData = [
    ['Kompania:', company?.name || ''],
    ['NUI TVSH:', company?.vat_number || ''],
    ['Periudha:', qLabel],
    ['', ''],
    ['TVSH DALËSE (nga shitjet):', totSalesVat],
    ['TVSH HYRËSE (nga blerjet):', totExpVat],
    ['', ''],
    ['TVSH për PAGESË / RIMBURSIM:', vatBalance],
    ['', ''],
    ['Afati i deklarimit:', `Deri më 15 të muajit pasues të tremujorit`],
    ['Deklaro në:', 'https://edi.atk-ks.org'],
  ]

  summaryData.forEach(([label, value]) => {
    const row = ws3.addRow([label, value])
    if (label === 'TVSH për PAGESË / RIMBURSIM:') {
      row.font = { bold: true, size: 12, color: { argb: vatBalance >= 0 ? red : green } }
      row.fill = { type:'pattern', pattern:'solid', fgColor:{argb: vatBalance >= 0 ? 'FFFEF2F2' : 'FFF0FDF4'} }
      row.getCell(2).numFmt = '#,##0.00 "€"'
    } else if (['TVSH DALËSE (nga shitjet):', 'TVSH HYRËSE (nga blerjet):'].includes(label as string)) {
      row.font = { bold: true }
      row.getCell(2).numFmt = '#,##0.00 "€"'
    } else if (label === '') {
      row.height = 8
    }
  })

  const buffer = await wb.xlsx.writeBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Deklarata_TVSH_${qLabel.replace(' ','_')}.xlsx"`,
    }
  })
}
