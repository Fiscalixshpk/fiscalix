// API për kontabilistin — të dhëna financiare të restorantit
import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verifiko që është kontabilist
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!['accountant','admin'].includes(profile?.role||'')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')
  const month     = searchParams.get('month') || new Date().toISOString().slice(0,7) // 2026-08
  const year      = searchParams.get('year')  || new Date().getFullYear().toString()

  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 })

  // Verifiko lidhjen kontabilist → biznes
  const { data: link } = await supabase
    .from('accountant_clients')
    .select('id')
    .eq('accountant_id', user.id)
    .eq('company_id', companyId)
    .maybeSingle()

  if (!link) return NextResponse.json({ error: 'No access to this company' }, { status: 403 })

  const start = `${month}-01T00:00:00.000Z`
  const endDate = new Date(month + '-01')
  endDate.setMonth(endDate.getMonth() + 1)
  const end = endDate.toISOString()

  // ── SHITJET POS (nga ATK) ────────────────────────────────
  const { data: sales } = await supabase
    .from('sales')
    .select('id, receipt_number, total_amount, total_tax, total_no_tax, payment_method, status, issued_at, atk_transaction_id, sale_items(name, price, quantity, total, tax_rate)')
    .eq('company_id', companyId)
    .eq('status', 'fiscalized')
    .gte('issued_at', start)
    .lt('issued_at', end)
    .order('issued_at', { ascending: false })

  // ── SHPENZIMET ───────────────────────────────────────────
  const { data: expenses } = await supabase
    .from('expenses')
    .select('id, vendor_name, amount, category, expense_date, description, tax_amount')
    .eq('company_id', companyId)
    .gte('expense_date', start.split('T')[0])
    .lt('expense_date', end.split('T')[0])
    .order('expense_date', { ascending: false })

  // ── LLOGARITJET TVSH ─────────────────────────────────────
  const totalSales    = (sales||[]).reduce((s,r) => s + r.total_amount, 0)
  const totalTaxSales = (sales||[]).reduce((s,r) => s + r.total_tax, 0)
  const cashSales     = (sales||[]).filter(r => r.payment_method==='cash').reduce((s,r) => s + r.total_amount, 0)
  const cardSales     = (sales||[]).filter(r => r.payment_method==='card').reduce((s,r) => s + r.total_amount, 0)

  // TVSH 8% (ushqim i gatuar) vs 18% (pije etj)
  let tvsh8 = 0, tvsh18 = 0, base8 = 0, base18 = 0
  for (const sale of sales||[]) {
    for (const item of sale.sale_items||[]) {
      if (item.tax_rate === 'D') { // 8%
        const base = item.total / 10000
        const tax  = base - base / 1.08
        tvsh8 += tax; base8 += base - tax
      } else if (item.tax_rate === 'E') { // 18%
        const base = item.total / 10000
        const tax  = base - base / 1.18
        tvsh18 += tax; base18 += base - tax
      }
    }
  }

  const totalExpenses   = (expenses||[]).reduce((s,e) => s + Number(e.amount), 0)
  const totalTaxExpense = (expenses||[]).reduce((s,e) => s + Number(e.tax_amount||0), 0)
  const profit          = (totalSales/100) - totalExpenses

  // ── VITET — shitjet per muaj (trend) ────────────────────
  const { data: yearSales } = await supabase
    .from('sales')
    .select('issued_at, total_amount')
    .eq('company_id', companyId)
    .eq('status', 'fiscalized')
    .gte('issued_at', `${year}-01-01T00:00:00.000Z`)
    .lt('issued_at',  `${year}-12-31T23:59:59.999Z`)

  const monthlySales: Record<string, number> = {}
  for (const s of yearSales||[]) {
    const m = s.issued_at.slice(0,7)
    monthlySales[m] = (monthlySales[m]||0) + s.total_amount
  }

  return NextResponse.json({
    month, year, companyId,
    sales:    sales    || [],
    expenses: expenses || [],
    summary: {
      totalSalesCents:  totalSales,
      totalTaxSales:    Math.round(totalTaxSales),
      cashSalesCents:   cashSales,
      cardSalesCents:   cardSales,
      totalExpenses:    totalExpenses,
      totalTaxExpenses: Math.round(totalTaxExpense * 100),
      profitCents:      Math.round(profit * 100),
      txCount:          (sales||[]).length,
      tvsh8Cents:       Math.round(tvsh8 * 100),
      tvsh18Cents:      Math.round(tvsh18 * 100),
      base8Cents:       Math.round(base8 * 100),
      base18Cents:      Math.round(base18 * 100),
      tvshDetyrim:      Math.round((tvsh8 + tvsh18 - totalTaxExpense) * 100),
    },
    monthlySales,
  })
}
