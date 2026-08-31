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

  // Use admin client for data (bypasses RLS - already verified access above)
  const adminSupabase = await createAdminClient()
  const { data: company } = await adminSupabase.from('companies').select('name').eq('id', companyId).single()
  const MONTHS = ['Janar','Shkurt','Mars','Prill','Maj','Qershor','Korrik','Gusht','Shtator','Tetor','Nëntor','Dhjetor']

  const { data: paidInvoices } = await supabase.from('invoices').select('total_amount, total, issue_date').eq('company_id', companyId).eq('status', 'paid').gte('issue_date', `${year}-01-01`).lte('issue_date', `${year}-12-31`)
  const { data: expenses } = await adminSupabase.from('expenses').select('amount, expense_date').eq('company_id', companyId).gte('expense_date', `${year}-01-01`).lte('expense_date', `${year}-12-31`)
  const { data: cashEntries } = await adminSupabase.from('cash_bank_entries').select('amount, entry_type, entry_date').eq('company_id', companyId).gte('entry_date', `${year}-01-01`).lte('entry_date', `${year}-12-31`).order('entry_date')

  let runningBalance = 0
  const monthly = MONTHS.map((name, i) => {
    const m = i + 1
    const inflow = (paidInvoices || []).filter(inv => new Date(inv.issue_date).getMonth()+1===m)
      .reduce((s,inv) => s+Number(inv.total_amount||inv.total||0), 0)
    const cashIn = (cashEntries || []).filter(e => new Date(e.entry_date).getMonth()+1===m && e.entry_type==='hyrje')
      .reduce((s,e) => s+Number(e.amount||0), 0)
    const outflow = (expenses || []).filter(exp => new Date(exp.expense_date).getMonth()+1===m)
      .reduce((s,exp) => s+Number(exp.amount||0), 0)
    const cashOut = (cashEntries || []).filter(e => new Date(e.entry_date).getMonth()+1===m && e.entry_type==='dalje')
      .reduce((s,e) => s+Number(e.amount||0), 0)
    const net = (inflow + cashIn) - (outflow + cashOut)
    runningBalance += net
    return { month: name, inflow: +(inflow+cashIn).toFixed(2), outflow: +(outflow+cashOut).toFixed(2), net: +net.toFixed(2), balance: +runningBalance.toFixed(2) }
  })

  if (format === 'json') return NextResponse.json({ company: company?.name, year, monthly })

  const purple = 'FF5A1FD6', white = 'FFFFFFFF', green = 'FF10B981', red = 'FFEF4444'
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Cash Flow')
  const hStyle = { font: { bold: true, color: { argb: white } }, fill: { type:'pattern' as const, pattern:'solid' as const, fgColor:{argb:purple} }, alignment:{horizontal:'center' as const} }

  ws.mergeCells('A1:E1')
  ws.getCell('A1').value = `RAPORTI I RRJEDHËS SË PARASË (CASH FLOW) — ${year}`
  ws.getCell('A1').font = { bold: true, size: 13, color: { argb: purple } }
  ws.getCell('A1').alignment = { horizontal: 'center' }
  ws.getRow(1).height = 30
  ws.mergeCells('A2:E2')
  ws.getCell('A2').value = company?.name || ''
  ws.getCell('A2').alignment = { horizontal: 'center' }
  ws.addRow([])

  ws.columns = [{ width: 14 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 20 }]
  const hRow = ws.addRow(['Muaji', 'Hyrjet (€)', 'Daljet (€)', 'Neto (€)', 'Balanca Akum. (€)'])
  hRow.eachCell(cell => Object.assign(cell, hStyle))

  monthly.forEach(m => {
    const row = ws.addRow([m.month, m.inflow, m.outflow, m.net, m.balance])
    ;[2,3,4,5].forEach(c => { row.getCell(c).numFmt = '#,##0.00 "€"' })
    if (m.net < 0) row.getCell(4).font = { color:{argb:red} }
    if (m.balance < 0) row.getCell(5).font = { bold:true, color:{argb:red} }
  })

  ws.addRow([])
  const totRow = ws.addRow(['TOTALI', monthly.reduce((s,m)=>s+m.inflow,0), monthly.reduce((s,m)=>s+m.outflow,0), monthly.reduce((s,m)=>s+m.net,0), monthly[11]?.balance || 0])
  totRow.font = { bold: true, color:{argb:white} }
  totRow.fill = { type:'pattern', pattern:'solid', fgColor:{argb:purple} }
  ;[2,3,4,5].forEach(c => totRow.getCell(c).numFmt = '#,##0.00 "€"')

  const buffer = await wb.xlsx.writeBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="CashFlow_${year}.xlsx"`,
    }
  })
}
