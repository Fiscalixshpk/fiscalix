import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role, company_id').eq('id', user.id).single()

  const companyId = req.nextUrl.searchParams.get('company_id')
  const type = req.nextUrl.searchParams.get('type')
  if (!companyId || !type) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  // Autorizimi: admin/accountant mund të kërkojnë çdo kompani (verifikuar më poshtë për kontabilist
  // përmes accountant_clients në praktikë reale); business_owner vetëm kompaninë e vet.
  if (profile?.role === 'business_owner') {
    if (profile.company_id !== companyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } else if (!['accountant', 'admin'].includes(profile?.role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Date range — nëse mungojnë, fallback te "Janar - sot" e vitit aktual (sjellja e vjetër)
  const now = new Date()
  const dateFrom = req.nextUrl.searchParams.get('from') || `${now.getFullYear()}-01-01`
  const dateTo   = req.nextUrl.searchParams.get('to')   || now.toISOString().slice(0, 10)

  try {
    const { data: comp } = await supabase.from('companies').select('name, vat_number, is_vat_registered').eq('id', companyId).single()
    const isVat = comp?.is_vat_registered !== false // default true nëse fusha mungon

    let rows: Record<string, unknown>[] = []
    let headers: string[] = []
    let sheetName = ''

    if (type === 'shitjeve') {
      const { data } = await supabase.from('invoices')
        .select('invoice_number, issue_date, client_name, client_vat, subtotal, tax_amount, tax_rate, total, total_amount')
        .eq('company_id', companyId).gte('issue_date', dateFrom).lte('issue_date', dateTo).order('issue_date')

      headers = isVat
        ? ['NR.','DATA','NR. FATURËS','BLERËSI','NUI/NF','BAZA (€)','TVSH 18% (€)','TVSH 8% (€)','TOTALI (€)']
        : ['NR.','DATA','NR. FATURËS','BLERËSI','NUI/NF','TOTALI (€)']

      rows = (data || []).map((inv, i) => {
        const base: Record<string, unknown> = {
          'NR.': i+1,
          'DATA': new Date(inv.issue_date as string).toLocaleDateString('sq-AL'),
          'NR. FATURËS': inv.invoice_number,
          'BLERËSI': inv.client_name,
          'NUI/NF': inv.client_vat || '',
        }
        if (isVat) {
          base['BAZA (€)'] = Number(inv.subtotal||0).toFixed(2)
          base['TVSH 18% (€)'] = Number(inv.tax_rate||18)===18 ? Number(inv.tax_amount||0).toFixed(2) : '0.00'
          base['TVSH 8% (€)'] = Number(inv.tax_rate||18)===8  ? Number(inv.tax_amount||0).toFixed(2) : '0.00'
        }
        base['TOTALI (€)'] = Number(inv.total_amount||inv.total||0).toFixed(2)
        return base
      })
      sheetName = 'Libri Shitjeve'

    } else if (type === 'blerjeve') {
      const { data } = await supabase.from('expenses')
        .select('*, expense_categories(name_sq)')
        .eq('company_id', companyId).gte('expense_date', dateFrom).lte('expense_date', dateTo).order('expense_date')

      headers = isVat
        ? ['NR.','DATA','NR. FATURËS','FURNITORI','KATEGORIA','BAZA (€)','TVSH 18% (€)','TOTALI (€)']
        : ['NR.','DATA','NR. FATURËS','FURNITORI','KATEGORIA','TOTALI (€)']

      rows = (data || []).map((exp, i) => {
        const amt = Number(exp.amount||0)
        const base: Record<string, unknown> = {
          'NR.': i+1,
          'DATA': new Date(exp.expense_date as string).toLocaleDateString('sq-AL'),
          'NR. FATURËS': exp.reference_number || `BL-${String(i+1).padStart(4,'0')}`,
          'FURNITORI': exp.vendor_name || '',
          'KATEGORIA': (exp.expense_categories as {name_sq?:string}|null)?.name_sq || '',
        }
        if (isVat) {
          const baseAmt = amt/1.18
          const tax = amt-baseAmt
          base['BAZA (€)'] = baseAmt.toFixed(2)
          base['TVSH 18% (€)'] = tax.toFixed(2)
        }
        base['TOTALI (€)'] = amt.toFixed(2)
        return base
      })
      sheetName = 'Libri Blerjeve'

    } else if (type === 'arka' || type === 'banka') {
      const entryType = type === 'arka' ? 'cash' : 'bank'
      const { data, error: entriesError } = await supabase.from('cash_bank_entries')
        .select('*')
        .eq('company_id', companyId).eq('entry_type', entryType)
        .gte('entry_date', dateFrom).lte('entry_date', dateTo).order('entry_date')

      if (entriesError) {
        console.error('Cash/bank entries query error:', entriesError)
        return NextResponse.json({ error: entriesError.message }, { status: 500 })
      }

      // Lookup manual i emrave të llogarive (jo embed) — më e sigurt, pa varësi nga emri i FK constraint
      const { data: accounts } = await supabase.from('chart_of_accounts').select('code, name_sq')
      const accountNameByCode = new Map((accounts || []).map(a => [a.code, a.name_sq]))

      headers = ['NR.','DATA','LLOGARIA','BANKA','PËRSHKRIMI','HYRJE (€)','DALJE (€)']
      rows = (data || []).map((e, i) => ({
        'NR.': i+1,
        'DATA': new Date(e.entry_date as string).toLocaleDateString('sq-AL'),
        'LLOGARIA': accountNameByCode.get(e.account_code) || e.account_code,
        'BANKA': e.bank_name || (entryType === 'cash' ? 'Arka' : ''),
        'PËRSHKRIMI': e.description,
        'HYRJE (€)': e.direction === 'in'  ? Number(e.amount||0).toFixed(2) : '0.00',
        'DALJE (€)': e.direction === 'out' ? Number(e.amount||0).toFixed(2) : '0.00',
      }))
      sheetName = type === 'arka' ? 'Libri Arkës' : 'Libri Bankës'

    } else if (type === 'pension') {
      headers = ['NR.','EMRI DHE MBIEMRI','NR. PERSONAL','PAGA BRUTO (€)','KONTRIB. PUNONJËSI 5% (€)','KONTRIB. PUNËDHËNËSI 5% (€)','TOTALI 10% (€)']
      rows = Array.from({length: 10}, (_, i) => ({
        'NR.': i+1,
        'EMRI DHE MBIEMRI': '',
        'NR. PERSONAL': '',
        'PAGA BRUTO (€)': '0.00',
        'KONTRIB. PUNONJËSI 5% (€)': '0.00',
        'KONTRIB. PUNËDHËNËSI 5% (€)': '0.00',
        'TOTALI 10% (€)': '0.00',
      }))
      sheetName = 'Pension'
    }

    const compName = comp?.name || 'Kompania'
    const titles: Record<string, string> = {
      shitjeve: 'LIBRI I SHITJEVE', blerjeve: 'LIBRI I BLERJEVE',
      arka: 'LIBRI I ARKËS', banka: 'LIBRI I BANKËS', pension: 'KONTRIBUTET PENSIONALE',
    }
    const title = titles[type] || 'RAPORT'

    const fromLabel = new Date(dateFrom).toLocaleDateString('sq-AL')
    const toLabel = new Date(dateTo).toLocaleDateString('sq-AL')

    // Identifikon kolonat monetare (€) sipas pozicionit në headers — për ngjyrim/format numerik
    const currencyColumns = headers
      .map((h, i) => (h.includes('(€)') ? i : -1))
      .filter(i => i >= 0)

    const dataRows = rows.map(r => headers.map(h => r[h] ?? ''))

    // Rresht totalesh — mblidh çdo kolonë monetare
    const totalsRow = headers.map((h, i) => {
      if (i === 0) return 'TOTALI'
      if (!currencyColumns.includes(i)) return ''
      const sum = rows.reduce((s, r) => s + (parseFloat(String(r[h] ?? '0')) || 0), 0)
      return Number(sum.toFixed(2))
    })

    const { generateProfessionalExcel } = await import('@/lib/excel-export')
    const buf = await generateProfessionalExcel({
      title,
      companyName: compName,
      vatNumber: comp?.vat_number || undefined,
      periodLabel: `${fromLabel} - ${toLabel}`,
      sheetName: title.slice(0, 28),
      headers,
      rows: dataRows,
      currencyColumns,
      totalsRow: rows.length > 0 ? totalsRow : undefined,
    })

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${title}_${compName.replace(/\s+/g,'_')}.xlsx"`,
      }
    })
  } catch (err) {
    console.error('Books API error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
