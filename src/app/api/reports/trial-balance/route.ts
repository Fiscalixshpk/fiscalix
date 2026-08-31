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
  const { data: company } = await adminSupabase.from('companies').select('name').eq('id', companyId).single()
  const { data: invoices } = await adminSupabase.from('invoices').select('total_amount, total, status').eq('company_id', companyId).gte('issue_date', startDate).lte('issue_date', endDate)
  const { data: expenses } = await adminSupabase.from('expenses').select('amount, category').eq('company_id', companyId).gte('expense_date', startDate).lte('expense_date', endDate)
  const { data: paidInvoices } = await supabase.from('invoices').select('total_amount, total').eq('company_id', companyId).eq('status', 'paid').gte('issue_date', startDate).lte('issue_date', endDate)
  const { data: pendingInvoices } = await supabase.from('invoices').select('total_amount, total').eq('company_id', companyId).neq('status', 'paid').gte('issue_date', startDate).lte('issue_date', endDate)

  const totalRevenue = (invoices || []).reduce((s, i) => s + Number(i.total_amount || i.total || 0), 0)
  const totalExpenses = (expenses || []).reduce((s, e) => s + Number(e.amount || 0), 0)
  const totalPaid = (paidInvoices || []).reduce((s, i) => s + Number(i.total_amount || i.total || 0), 0)
  const totalPending = (pendingInvoices || []).reduce((s, i) => s + Number(i.total_amount || i.total || 0), 0)
  const netProfit = totalRevenue - totalExpenses

  const accounts = [
    { code: '100', name: 'AKTIVE', type: 'header' },
    { code: '110', name: 'Të ardhura nga shitjet', debit: totalRevenue, credit: 0 },
    { code: '120', name: 'Arkëtime të pranuara', debit: totalPaid, credit: 0 },
    { code: '130', name: 'Arkëtime në pritje', debit: totalPending, credit: 0 },
    { code: '200', name: 'DETYRIME', type: 'header' },
    { code: '210', name: 'Shpenzime operative', debit: 0, credit: totalExpenses },
    { code: '300', name: 'EKUITETI', type: 'header' },
    { code: '310', name: 'Fitimi neto i periudhës', debit: netProfit >= 0 ? netProfit : 0, credit: netProfit < 0 ? Math.abs(netProfit) : 0 },
  ]

  if (format === 'json') {
    return NextResponse.json({ company: company?.name, year, accounts, totalRevenue, totalExpenses, netProfit })
  }

  const purple = 'FF5A1FD6'
  const white = 'FFFFFFFF'
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Trial Balance')
  const hStyle = { font: { bold: true, color: { argb: white } }, fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: purple } }, alignment: { horizontal: 'center' as const } }

  ws.mergeCells('A1:D1')
  ws.getCell('A1').value = `GJENDJA E LLOGARIVE (TRIAL BALANCE) — ${year}`
  ws.getCell('A1').font = { bold: true, size: 13, color: { argb: purple } }
  ws.getCell('A1').alignment = { horizontal: 'center' }
  ws.getRow(1).height = 30
  ws.mergeCells('A2:D2')
  ws.getCell('A2').value = company?.name || ''
  ws.getCell('A2').alignment = { horizontal: 'center' }
  ws.addRow([])

  ws.columns = [{ width: 10 }, { width: 36 }, { width: 18 }, { width: 18 }]
  const hRow = ws.addRow(['Kodi', 'Llogaria', 'Debi (€)', 'Kredi (€)'])
  hRow.eachCell(cell => Object.assign(cell, hStyle))

  accounts.forEach(acc => {
    if (acc.type === 'header') {
      const row = ws.addRow([acc.code, acc.name, '', ''])
      row.font = { bold: true, color: { argb: purple } }
      row.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFF3F4F6'} }
    } else {
      const row = ws.addRow([acc.code, acc.name, acc.debit || '', acc.credit || ''])
      ;[3,4].forEach(c => { if (row.getCell(c).value) row.getCell(c).numFmt = '#,##0.00 "€"' })
    }
  })

  ws.addRow([])
  const totDebit = accounts.filter(a => !a.type).reduce((s,a) => s+(a.debit||0), 0)
  const totCredit = accounts.filter(a => !a.type).reduce((s,a) => s+(a.credit||0), 0)
  const tRow = ws.addRow(['', 'TOTALI', totDebit, totCredit])
  tRow.font = { bold: true, color: { argb: white } }
  tRow.fill = { type:'pattern', pattern:'solid', fgColor:{argb:purple} }
  ;[3,4].forEach(c => { tRow.getCell(c).numFmt = '#,##0.00 "€"' })

  const buffer = await wb.xlsx.writeBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="TrialBalance_${year}.xlsx"`,
    }
  })
}
