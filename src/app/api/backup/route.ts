import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role, company_id').eq('id', user.id).single()
  const companyId = req.nextUrl.searchParams.get('company_id') || profile?.company_id

  const [
    { data: invoices },
    { data: expenses },
    { data: cashEntries },
    { data: company },
    { data: employees },
  ] = await Promise.all([
    supabase.from('invoices').select('*').eq('company_id', companyId!).order('issue_date'),
    supabase.from('expenses').select('*').eq('company_id', companyId!).order('expense_date'),
    supabase.from('cash_bank_entries').select('*').eq('company_id', companyId!).order('entry_date'),
    supabase.from('companies').select('name, vat_number, email, address').eq('id', companyId!).single(),
    supabase.from('employees').select('*').eq('company_id', companyId!),
  ])

  const purple = 'FF5A1FD6', white = 'FFFFFFFF'
  const hStyle = { font:{bold:true,color:{argb:white}}, fill:{type:'pattern' as const,pattern:'solid' as const,fgColor:{argb:purple}}, alignment:{horizontal:'center' as const} }
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Fiscalix Backup'
  wb.created = new Date()

  function makeSheet(name: string, cols: {header:string,key:string,width:number}[], rows: Record<string,unknown>[]) {
    const ws = wb.addWorksheet(name)
    ws.columns = cols
    const hRow = ws.addRow(cols.map(c=>c.header))
    hRow.eachCell(cell=>Object.assign(cell,hStyle))
    rows.forEach(r => ws.addRow(cols.map(c=>r[c.key])))
    return ws
  }

  makeSheet('Faturat', [
    {header:'ID',key:'id',width:36},{header:'Data',key:'issue_date',width:14},{header:'Klienti',key:'client_name',width:28},
    {header:'Totali',key:'total_amount',width:16},{header:'Statusi',key:'status',width:14},{header:'Afati',key:'due_date',width:14}
  ], invoices||[])

  makeSheet('Shpenzimet', [
    {header:'ID',key:'id',width:36},{header:'Data',key:'expense_date',width:14},{header:'Furnizuesi',key:'vendor_name',width:28},
    {header:'Shuma',key:'amount',width:16},{header:'Kategoria',key:'category',width:20},{header:'Përshkrimi',key:'description',width:30}
  ], expenses||[])

  makeSheet('Arka & Banka', [
    {header:'ID',key:'id',width:36},{header:'Data',key:'entry_date',width:14},{header:'Lloji',key:'entry_type',width:10},
    {header:'Llogaria',key:'account_type',width:14},{header:'Shuma',key:'amount',width:16},{header:'Përshkrimi',key:'description',width:30}
  ], cashEntries||[])

  if (employees && employees.length > 0) {
    makeSheet('Punonjësit', [
      {header:'ID',key:'id',width:36},{header:'Emri',key:'full_name',width:28},{header:'Nr. Personal',key:'personal_id',width:16},
      {header:'Pozita',key:'position',width:20},{header:'Paga Bruto',key:'gross_salary',width:16},{header:'Filloi',key:'start_date',width:14}
    ], employees)
  }

  // Info sheet
  const wsInfo = wb.addWorksheet('Informata')
  wsInfo.columns = [{width:30},{width:40}]
  ;[
    ['Kompania:', company?.name||''],
    ['NUI:', company?.vat_number||''],
    ['Email:', company?.email||''],
    ['Backup Data:', new Date().toISOString()],
    ['Faturat Total:', invoices?.length||0],
    ['Shpenzimet Total:', expenses?.length||0],
    ['Hyrjet Arka/Bankë:', cashEntries?.length||0],
  ].forEach(([l,v]) => wsInfo.addRow([l,v]))

  const buffer = await wb.xlsx.writeBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Backup_Fiscalix_${company?.name?.replace(/\s+/g,'_')||''}_${new Date().toISOString().split('T')[0]}.xlsx"`,
    }
  })
}
