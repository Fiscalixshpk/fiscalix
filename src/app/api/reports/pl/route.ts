import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const companyId = req.nextUrl.searchParams.get('company_id')!
  const year = parseInt(req.nextUrl.searchParams.get('year') || new Date().getFullYear().toString())
  const format = req.nextUrl.searchParams.get('format') || 'json'

  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`

  // Use admin client for data (bypasses RLS - already verified access above)
  const adminSupabase = await createAdminClient()
  const { data: company } = await adminSupabase.from('companies').select('name, vat_number').eq('id', companyId).single()
  const { data: invoices } = await adminSupabase.from('invoices').select('total_amount, total, issue_date, status').eq('company_id', companyId).gte('issue_date', startDate).lte('issue_date', endDate)
  const { data: expenses } = await adminSupabase.from('expenses').select('amount, expense_date, category').eq('company_id', companyId).gte('expense_date', startDate).lte('expense_date', endDate)

  const MONTHS = ['Janar','Shkurt','Mars','Prill','Maj','Qershor','Korrik','Gusht','Shtator','Tetor','Nëntor','Dhjetor']

  // Monthly breakdown
  const monthly = MONTHS.map((name, i) => {
    const m = i + 1
    const revenue = (invoices || []).filter(inv => {
      const d = new Date(inv.issue_date); return d.getMonth()+1 === m
    }).reduce((s, inv) => s + Number(inv.total_amount || inv.total || 0), 0)
    const expense = (expenses || []).filter(exp => {
      const d = new Date(exp.expense_date); return d.getMonth()+1 === m
    }).reduce((s, exp) => s + Number(exp.amount || 0), 0)
    return { month: name, revenue: +revenue.toFixed(2), expense: +expense.toFixed(2), profit: +(revenue - expense).toFixed(2) }
  })

  const totRevenue = monthly.reduce((s, m) => s + m.revenue, 0)
  const totExpense = monthly.reduce((s, m) => s + m.expense, 0)
  const totProfit = totRevenue - totExpense

  // Expenses by category
  const byCategory: Record<string, number> = {}
  ;(expenses || []).forEach(e => {
    const cat = e.category || 'Tjetër'
    byCategory[cat] = (byCategory[cat] || 0) + Number(e.amount || 0)
  })

  if (format === 'json') {
    return NextResponse.json({ company: company?.name, year, monthly, totRevenue, totExpense, totProfit, byCategory })
  }

  // Excel export
  const purple = 'FF5A1FD6'
  const white = 'FFFFFFFF'
  const green = 'FF10B981'
  const red = 'FFEF4444'

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Profit & Loss')
  const hStyle = { font: { bold: true, color: { argb: white } }, fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: purple } }, alignment: { horizontal: 'center' as const } }

  ws.mergeCells('A1:E1')
  ws.getCell('A1').value = `PASQYRA E TË ARDHURAVE DHE SHPENZIMEVE — ${year}`
  ws.getCell('A1').font = { bold: true, size: 14, color: { argb: purple } }
  ws.getCell('A1').alignment = { horizontal: 'center' }
  ws.getRow(1).height = 32
  ws.mergeCells('A2:E2')
  ws.getCell('A2').value = company?.name || ''
  ws.getCell('A2').alignment = { horizontal: 'center' }
  ws.addRow([])

  ws.columns = [{ width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }]
  const hRow = ws.addRow(['Muaji', 'Të Ardhura (€)', 'Shpenzime (€)', 'Fitimi (€)', 'Marzhi %'])
  hRow.height = 22
  hRow.eachCell(cell => Object.assign(cell, hStyle))

  monthly.forEach(m => {
    const margin = m.revenue > 0 ? +((m.profit/m.revenue)*100).toFixed(1) : 0
    const row = ws.addRow([m.month, m.revenue, m.expense, m.profit, `${margin}%`])
    ;[2,3,4].forEach(c => row.getCell(c).numFmt = '#,##0.00 "€"')
    if (m.profit < 0) row.getCell(4).font = { color: { argb: red } }
    else if (m.profit > 0) row.getCell(4).font = { color: { argb: green } }
  })

  ws.addRow([])
  const totRow = ws.addRow(['TOTALI', totRevenue, totExpense, totProfit, `${totRevenue > 0 ? +((totProfit/totRevenue)*100).toFixed(1) : 0}%`])
  totRow.font = { bold: true, color: { argb: white } }
  totRow.fill = { type:'pattern', pattern:'solid', fgColor:{argb: totProfit >= 0 ? green : red} }
  ;[2,3,4].forEach(c => totRow.getCell(c).numFmt = '#,##0.00 "€"')

  ws.addRow([])
  ws.addRow(['SHPENZIMET SIPAS KATEGORISË'])
  ws.lastRow!.font = { bold: true, color: { argb: purple } }
  Object.entries(byCategory).sort((a,b) => b[1]-a[1]).forEach(([cat, amt]) => {
    const row = ws.addRow([cat, amt])
    row.getCell(2).numFmt = '#,##0.00 "€"'
  })

  const buffer = await wb.xlsx.writeBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="PL_${year}_${company?.name?.replace(/\s+/g,'_') || ''}.xlsx"`,
    }
  })
}
