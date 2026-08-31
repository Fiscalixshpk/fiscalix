import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const companyId = req.nextUrl.searchParams.get('company_id')!
  const year = parseInt(req.nextUrl.searchParams.get('year') || new Date().getFullYear().toString())
  const month = parseInt(req.nextUrl.searchParams.get('month') || (new Date().getMonth()+1).toString())

  // Use admin client for data (bypasses RLS - already verified access above)
  const adminSupabase = await createAdminClient()
  const { data: company } = await adminSupabase.from('companies').select('name, vat_number, tax_number').eq('id', companyId).single()
  const { data: records } = await supabase.from('withholding_tax').select('*').eq('company_id', companyId).eq('year', year).eq('month', month).order('payment_date')

  const MONTHS = ['Janar','Shkurt','Mars','Prill','Maj','Qershor','Korrik','Gusht','Shtator','Tetor','Nëntor','Dhjetor']
  const periodLabel = `${MONTHS[month-1]} ${year}`
  const purple = 'FF5A1FD6'
  const white = 'FFFFFFFF'

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Tatimi në Burim')
  const hStyle = { font: { bold: true, color: { argb: white }, size: 10 }, fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: purple } }, alignment: { horizontal: 'center' as const, vertical: 'middle' as const } }

  ws.mergeCells('A1:F1')
  ws.getCell('A1').value = 'DEKLARATA E TATIMIT NË BURIM — 9%'
  ws.getCell('A1').font = { bold: true, size: 13, color: { argb: purple } }
  ws.getCell('A1').alignment = { horizontal: 'center' }
  ws.getRow(1).height = 30

  ws.mergeCells('A2:F2')
  ws.getCell('A2').value = `${company?.name || ''} | NUI: ${company?.vat_number || company?.tax_number || ''} | Periudha: ${periodLabel}`
  ws.getCell('A2').alignment = { horizontal: 'center' }
  ws.addRow([])

  ws.columns = [{ width: 6 }, { width: 28 }, { width: 30 }, { width: 14 }, { width: 10 }, { width: 16 }]
  const hRow = ws.addRow(['Nr.', 'Furnizuesi', 'Përshkrimi', 'Shuma (€)', 'Norma %', 'Tatimi (€)'])
  hRow.height = 22
  hRow.eachCell(cell => Object.assign(cell, hStyle))

  let totAmount = 0, totTax = 0
  ;(records || []).forEach((r, i) => {
    totAmount += Number(r.amount)
    totTax += Number(r.tax_amount)
    const row = ws.addRow([i+1, r.vendor_name, r.service_description || '—', Number(r.amount), `${r.tax_rate}%`, Number(r.tax_amount)])
    row.getCell(4).numFmt = '#,##0.00 "€"'
    row.getCell(6).numFmt = '#,##0.00 "€"'
  })

  ws.addRow([])
  const tRow = ws.addRow(['', 'TOTALI', '', totAmount, '', totTax])
  tRow.font = { bold: true, color: { argb: white } }
  tRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: purple } }
  tRow.getCell(4).numFmt = '#,##0.00 "€"'
  tRow.getCell(6).numFmt = '#,##0.00 "€"'

  ws.addRow([])
  ws.addRow(['• Norma standarde: 9% për shërbime profesionale'])
  ws.addRow(['• Afati pagesës: deri më 15 të muajit pasues'])
  ws.addRow(['• Deklaro në: https://edi.atk-ks.org'])
  ;[ws.lastRow!.rowNumber - 2, ws.lastRow!.rowNumber - 1, ws.lastRow!.rowNumber].forEach(rn => {
    ws.getRow(rn).font = { size: 9, color: { argb: '666666' } }
  })

  const buffer = await wb.xlsx.writeBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Tatimi_Burim_${periodLabel.replace(' ','_')}.xlsx"`,
    }
  })
}
