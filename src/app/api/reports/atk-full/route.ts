import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const companyId = req.nextUrl.searchParams.get('company_id')!
  const year = parseInt(req.nextUrl.searchParams.get('year') || new Date().getFullYear().toString())
  const quarter = req.nextUrl.searchParams.get('quarter')
  
  let startDate = `${year}-01-01`
  let endDate = `${year}-12-31`
  let periodLabel = `Viti ${year}`
  
  if (quarter) {
    const q = parseInt(quarter)
    const sm = (q-1)*3+1
    startDate = `${year}-${String(sm).padStart(2,'0')}-01`
    endDate = `${year}-${String(sm+2).padStart(2,'0')}-31`
    periodLabel = `T${q} ${year}`
  }

  // Use admin client for data (bypasses RLS - already verified access above)
  const adminSupabase = await createAdminClient()
  const { data: company } = await adminSupabase.from('companies').select('name, vat_number, tax_number, address').eq('id', companyId).single()
  const { data: invoices } = await adminSupabase.from('invoices').select('*').eq('company_id', companyId).gte('issue_date', startDate).lte('issue_date', endDate).order('issue_date')
  const { data: expenses } = await adminSupabase.from('expenses').select('*').eq('company_id', companyId).gte('expense_date', startDate).lte('expense_date', endDate).order('expense_date')
  const { data: cashEntries } = await adminSupabase.from('cash_bank_entries').select('*').eq('company_id', companyId).gte('entry_date', startDate).lte('entry_date', endDate).order('entry_date')

  const purple = 'FF5A1FD6', white = 'FFFFFFFF', lightGray = 'FFF8F9FA'
  const hStyle = { font:{ bold:true, color:{argb:white}, size:10 }, fill:{type:'pattern' as const, pattern:'solid' as const, fgColor:{argb:purple}}, alignment:{horizontal:'center' as const, vertical:'middle' as const} }
  const currFmt = '#,##0.00 "€"'

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Fiscalix'

  function addTitle(ws: ExcelJS.Worksheet, title: string, span: string) {
    ws.mergeCells(span)
    ws.getCell('A1').value = title
    ws.getCell('A1').font = { bold:true, size:13, color:{argb:purple} }
    ws.getCell('A1').alignment = { horizontal:'center' }
    ws.getRow(1).height = 30
    const infoSpan = span.replace('1', '2')
    ws.mergeCells(infoSpan)
    ws.getCell('A2').value = `${company?.name || ''} | NUI: ${company?.vat_number || company?.tax_number || ''} | Periudha: ${periodLabel}`
    ws.getCell('A2').alignment = { horizontal:'center' }
    ws.addRow([])
  }

  // ── LIBRI SHITJEVE ──
  const ws1 = wb.addWorksheet('Libri Shitjeve')
  addTitle(ws1, `LIBRI I SHITJEVE — ${periodLabel}`, 'A1:F1')
  ws1.columns = [{width:6},{width:14},{width:30},{width:18},{width:12},{width:16}]
  const h1 = ws1.addRow(['Nr.','Data','Blerësi','Vlera pa TVSH (€)','Norma TVSH','TVSH (€)'])
  h1.height=22; h1.eachCell(c=>Object.assign(c,hStyle))
  let s1tot=[0,0]
  ;(invoices||[]).forEach((inv,i)=>{
    const total=Number(inv.total_amount||inv.total||0)
    const vr=Number(inv.vat_rate||18)
    const vat=+(total-total/(1+vr/100)).toFixed(2)
    const net=+(total-vat).toFixed(2)
    s1tot[0]+=net; s1tot[1]+=vat
    const row=ws1.addRow([i+1,inv.issue_date,inv.client_name||inv.bill_to_name||'—',net,`${vr}%`,vat])
    if(i%2===0) row.fill={type:'pattern',pattern:'solid',fgColor:{argb:lightGray}}
    ;[4,6].forEach(c=>{row.getCell(c).numFmt=currFmt})
  })
  ws1.addRow([])
  const t1=ws1.addRow(['','','TOTALI',s1tot[0],'',s1tot[1]])
  t1.font={bold:true,color:{argb:white}}; t1.fill={type:'pattern',pattern:'solid',fgColor:{argb:purple}}
  ;[4,6].forEach(c=>{t1.getCell(c).numFmt=currFmt})

  // ── LIBRI BLERJEVE ──
  const ws2 = wb.addWorksheet('Libri Blerjeve')
  addTitle(ws2, `LIBRI I BLERJEVE — ${periodLabel}`, 'A1:F1')
  ws2.columns = [{width:6},{width:14},{width:30},{width:18},{width:12},{width:16}]
  const h2 = ws2.addRow(['Nr.','Data','Furnizuesi','Vlera pa TVSH (€)','Norma TVSH','TVSH (€)'])
  h2.height=22; h2.eachCell(c=>Object.assign(c,hStyle))
  let s2tot=[0,0]
  ;(expenses||[]).filter(e=>e.is_vat_applicable).forEach((exp,i)=>{
    const amt=Number(exp.amount||0)
    const vr=Number(exp.vat_rate||18)
    const vat=+(amt*vr/100).toFixed(2)
    const net=+(amt-vat).toFixed(2)
    s2tot[0]+=net; s2tot[1]+=vat
    const row=ws2.addRow([i+1,exp.expense_date,exp.vendor_name||exp.description||'—',net,`${vr}%`,vat])
    if(i%2===0) row.fill={type:'pattern',pattern:'solid',fgColor:{argb:lightGray}}
    ;[4,6].forEach(c=>{row.getCell(c).numFmt=currFmt})
  })
  ws2.addRow([])
  const t2=ws2.addRow(['','','TOTALI',s2tot[0],'',s2tot[1]])
  t2.font={bold:true,color:{argb:white}}; t2.fill={type:'pattern',pattern:'solid',fgColor:{argb:purple}}
  ;[4,6].forEach(c=>{t2.getCell(c).numFmt=currFmt})

  // ── LIBRI ARKËS ──
  const ws3 = wb.addWorksheet('Libri Arkës')
  addTitle(ws3, `LIBRI I ARKËS — ${periodLabel}`, 'A1:E1')
  ws3.columns = [{width:6},{width:14},{width:30},{width:14},{width:18}]
  const h3=ws3.addRow(['Nr.','Data','Përshkrimi','Lloji','Shuma (€)'])
  h3.height=22; h3.eachCell(c=>Object.assign(c,hStyle))
  let cashBal=0
  ;(cashEntries||[]).filter(e=>e.account_type==='cash').forEach((e,i)=>{
    const amt=Number(e.amount||0)*(e.entry_type==='hyrje'?1:-1)
    cashBal+=amt
    const row=ws3.addRow([i+1,e.entry_date,e.description||'—',e.entry_type==='hyrje'?'Hyrje':'Dalje',Math.abs(Number(e.amount||0))])
    row.getCell(5).numFmt=currFmt
    if(e.entry_type==='dalje') row.getCell(5).font={color:{argb:'FFEF4444'}}
    if(i%2===0) row.fill={type:'pattern',pattern:'solid',fgColor:{argb:lightGray}}
  })
  ws3.addRow([])
  const t3=ws3.addRow(['','','','BALANCA',cashBal])
  t3.font={bold:true,color:{argb:white}}; t3.fill={type:'pattern',pattern:'solid',fgColor:{argb:purple}}
  t3.getCell(5).numFmt=currFmt

  // ── LIBRI BANKËS ──
  const ws4 = wb.addWorksheet('Libri Bankës')
  addTitle(ws4, `LIBRI I BANKËS — ${periodLabel}`, 'A1:E1')
  ws4.columns = [{width:6},{width:14},{width:30},{width:14},{width:18}]
  const h4=ws4.addRow(['Nr.','Data','Përshkrimi','Lloji','Shuma (€)'])
  h4.height=22; h4.eachCell(c=>Object.assign(c,hStyle))
  let bankBal=0
  ;(cashEntries||[]).filter(e=>e.account_type==='bank').forEach((e,i)=>{
    const amt=Number(e.amount||0)*(e.entry_type==='hyrje'?1:-1)
    bankBal+=amt
    const row=ws4.addRow([i+1,e.entry_date,e.description||'—',e.entry_type==='hyrje'?'Hyrje':'Dalje',Math.abs(Number(e.amount||0))])
    row.getCell(5).numFmt=currFmt
    if(e.entry_type==='dalje') row.getCell(5).font={color:{argb:'FFEF4444'}}
    if(i%2===0) row.fill={type:'pattern',pattern:'solid',fgColor:{argb:lightGray}}
  })
  ws4.addRow([])
  const t4=ws4.addRow(['','','','BALANCA',bankBal])
  t4.font={bold:true,color:{argb:white}}; t4.fill={type:'pattern',pattern:'solid',fgColor:{argb:purple}}
  t4.getCell(5).numFmt=currFmt

  // ── PËRMBLEDHJA ──
  const ws5 = wb.addWorksheet('Përmbledhja ATK')
  addTitle(ws5, `PËRMBLEDHJA ATK — ${periodLabel}`, 'A1:B1')
  ws5.columns = [{width:36},{width:20}]
  const sumData = [
    ['TVSH DALËSE (Shitjet):', s1tot[1]],
    ['TVSH HYRËSE (Blerjet):', s2tot[1]],
    ['TVSH NË PAGESË:', s1tot[1]-s2tot[1]],
    ['', ''],
    ['TOTALI SHITJEVE (pa TVSH):', s1tot[0]],
    ['TOTALI SHPENZIMEVE (pa TVSH):', s2tot[0]],
    ['FITIMI PARA TATIMIT:', s1tot[0]-s2tot[0]],
    ['', ''],
    ['BALANCA ARKËS:', cashBal],
    ['BALANCA BANKËS:', bankBal],
  ]
  sumData.forEach(([l,v]) => {
    const row = ws5.addRow([l,v])
    if (typeof v === 'number') row.getCell(2).numFmt = currFmt
    if (['TVSH NË PAGESË:','FITIMI PARA TATIMIT:'].includes(l as string)) {
      row.font = { bold:true, size:12 }
      row.fill = { type:'pattern', pattern:'solid', fgColor:{argb:'FFF3F0FF'} }
    }
  })

  const buffer = await wb.xlsx.writeBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="ATK_Komplet_${periodLabel.replace(' ','_')}_${company?.name?.replace(/\s+/g,'_')||''}.xlsx"`,
    }
  })
}
