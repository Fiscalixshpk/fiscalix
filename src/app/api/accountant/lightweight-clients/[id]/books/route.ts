import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const type = req.nextUrl.searchParams.get('type') || 'shitjeve'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership
  const { data: client } = await supabase
    .from('lightweight_clients')
    .select('business_name, is_vat_registered')
    .eq('id', id)
    .eq('accountant_id', user.id)
    .maybeSingle()
  if (!client) return NextResponse.json({ error: 'Jo i gjetur' }, { status: 404 })

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Fiscalix'
  wb.created = new Date()

  const headerStyle = { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF5A1FD6' } }, alignment: { horizontal: 'center' as const } }
  const currencyFmt = '#,##0.00 "€"'

  if (type === 'shitjeve') {
    const { data: sales } = await supabase
      .from('lightweight_sales_entries')
      .select('*')
      .eq('lightweight_client_id', id)
      .order('entry_date')

    const ws = wb.addWorksheet('Libri i Shitjeve')
    ws.columns = [
      { header: 'Data', key: 'date', width: 14 },
      { header: 'Burimi', key: 'source', width: 24 },
      { header: 'Shuma Bruto (€)', key: 'gross', width: 18 },
      { header: 'TVSH (€)', key: 'vat', width: 14 },
      { header: 'Shuma Neto (€)', key: 'net', width: 18 },
    ]
    ws.getRow(1).eachCell(cell => Object.assign(cell, headerStyle))
    ;(sales || []).forEach(s => {
      const gross = Number(s.gross_amount) || 0
      const vat = Number(s.vat_amount) || 0
      ws.addRow({ date: s.entry_date, source: s.source_note || 'Arke Fiskale', gross, vat, net: gross - vat })
    })
    // Totals
    const totRow = ws.addRow({
      date: 'TOTALI', source: '',
      gross: (sales || []).reduce((s, e) => s + (Number(e.gross_amount) || 0), 0),
      vat: (sales || []).reduce((s, e) => s + (Number(e.vat_amount) || 0), 0),
      net: (sales || []).reduce((s, e) => s + (Number(e.gross_amount) || 0) - (Number(e.vat_amount) || 0), 0),
    })
    totRow.font = { bold: true }
    totRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
    ws.getColumn('gross').numFmt = currencyFmt
    ws.getColumn('vat').numFmt = currencyFmt
    ws.getColumn('net').numFmt = currencyFmt

  } else if (type === 'blerjeve') {
    const { data: expenses } = await supabase
      .from('lightweight_expenses')
      .select('*')
      .eq('lightweight_client_id', id)
      .order('expense_date')

    const ws = wb.addWorksheet('Libri i Blerjeve')
    ws.columns = [
      { header: 'Data', key: 'date', width: 14 },
      { header: 'Furnizuesi', key: 'vendor', width: 24 },
      { header: 'Kategoria', key: 'cat', width: 18 },
      { header: 'Shuma (€)', key: 'amount', width: 16 },
    ]
    ws.getRow(1).eachCell(cell => Object.assign(cell, headerStyle))
    ;(expenses || []).forEach(e => {
      ws.addRow({ date: e.expense_date, vendor: e.vendor_name || '—', cat: e.category || '—', amount: Number(e.amount) || 0 })
    })
    const totRow = ws.addRow({ date: 'TOTALI', vendor: '', cat: '', amount: (expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0) })
    totRow.font = { bold: true }
    totRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
    ws.getColumn('amount').numFmt = currencyFmt

  } else if (type === 'shpenzimeve') {
    const { data: expenses } = await supabase
      .from('lightweight_expenses')
      .select('*')
      .eq('lightweight_client_id', id)
      .order('expense_date')

    const ws = wb.addWorksheet('Libri i Shpenzimeve')
    ws.columns = [
      { header: 'Data', key: 'date', width: 14 },
      { header: 'Furnizuesi', key: 'vendor', width: 24 },
      { header: 'Kategoria', key: 'cat', width: 18 },
      { header: 'Shuma (€)', key: 'amount', width: 16 },
    ]
    ws.getRow(1).eachCell(cell => Object.assign(cell, headerStyle))
    // Group by category
    const byCategory: Record<string, number> = {}
    ;(expenses || []).forEach(e => {
      const cat = e.category || 'Tjetër'
      byCategory[cat] = (byCategory[cat] || 0) + (Number(e.amount) || 0)
      ws.addRow({ date: e.expense_date, vendor: e.vendor_name || '—', cat, amount: Number(e.amount) || 0 })
    })
    const totRow = ws.addRow({ date: 'TOTALI', vendor: '', cat: '', amount: Object.values(byCategory).reduce((s, v) => s + v, 0) })
    totRow.font = { bold: true }
    ws.getColumn('amount').numFmt = currencyFmt
  }

  const buffer = await wb.xlsx.writeBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Libri_${type}_${client.business_name}.xlsx"`,
    }
  })
}
