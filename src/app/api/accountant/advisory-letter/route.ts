import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireAccountantAccess, checkCompanyOwnership } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (!auth.ok) return auth.response
  const { user, profile } = auth

  const companyId = req.nextUrl.searchParams.get('company_id')
  if (!companyId) return NextResponse.json({ error: 'company_id mungon' }, { status: 400 })

  if (profile.role === 'accountant') {
    const denied = await requireAccountantAccess(user.id, companyId)
    if (denied) return denied
  } else {
    const denied = checkCompanyOwnership(profile, companyId)
    if (denied) return denied
  }

  const supabase = await createClient()
  const { data: company } = await supabase.from('companies').select('name').eq('id', companyId).maybeSingle()

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()

  const [invThis, invLast, expThis, expLast, overdueRes] = await Promise.all([
    supabase.from('invoices').select('total_amount, total, status').eq('company_id', companyId).gte('issue_date', thisMonthStart),
    supabase.from('invoices').select('total_amount, total').eq('company_id', companyId).gte('issue_date', lastMonthStart).lte('issue_date', lastMonthEnd),
    supabase.from('expenses').select('amount, category_id, expense_categories(name_sq)').eq('company_id', companyId).gte('expense_date', thisMonthStart),
    supabase.from('expenses').select('amount, category_id').eq('company_id', companyId).gte('expense_date', lastMonthStart).lte('expense_date', lastMonthEnd),
    supabase.from('invoices').select('id, total_amount, total').eq('company_id', companyId).eq('status', 'overdue'),
  ])

  const thisRev = (invThis.data || []).reduce((s, i) => s + Number(i.total_amount || i.total || 0), 0)
  const lastRev = (invLast.data || []).reduce((s, i) => s + Number(i.total_amount || i.total || 0), 0)
  const thisExp = (expThis.data || []).reduce((s, e) => s + Number(e.amount || 0), 0)
  const lastExp = (expLast.data || []).reduce((s, e) => s + Number(e.amount || 0), 0)
  const overdue = overdueRes.data || []
  const overdueTotal = overdue.reduce((s, i) => s + Number(i.total_amount || i.total || 0), 0)

  const revChangePct = lastRev > 0 ? Math.round(((thisRev - lastRev) / lastRev) * 100) : null
  const expChangePct = lastExp > 0 ? Math.round(((thisExp - lastExp) / lastExp) * 100) : null

  // Gjej kategorinë me shpenzimin më të madh këtë muaj
  type ExpRow = { amount: number; expense_categories?: { name_sq?: string } | { name_sq?: string }[] | null }
  const categoryTotals: Record<string, number> = {}
  for (const e of (expThis.data || []) as ExpRow[]) {
    const catObj = Array.isArray(e.expense_categories) ? e.expense_categories[0] : e.expense_categories
    const catName = catObj?.name_sq || 'Tjetër'
    categoryTotals[catName] = (categoryTotals[catName] || 0) + Number(e.amount || 0)
  }
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]

  const monthName = now.toLocaleString('sq', { month: 'long' })

  // Ndërtimi i letrës — template + të dhëna, jo AI
  const lines: string[] = []
  lines.push(`Përshëndetje,`)
  lines.push('')
  lines.push(`Ja përmbledhja financiare e ${company?.name || 'biznesit tuaj'} për muajin ${monthName}:`)
  lines.push('')
  lines.push(`Të ardhura: €${thisRev.toFixed(2)}${revChangePct !== null ? ` (${revChangePct >= 0 ? '+' : ''}${revChangePct}% nga muaji i kaluar)` : ''}.`)
  lines.push(`Shpenzime: €${thisExp.toFixed(2)}${expChangePct !== null ? ` (${expChangePct >= 0 ? '+' : ''}${expChangePct}% nga muaji i kaluar)` : ''}.`)

  if (topCategory) {
    lines.push(`Shpenzimi më i madh ishte te kategoria "${topCategory[0]}" (€${topCategory[1].toFixed(2)}).`)
  }

  if (overdue.length > 0) {
    lines.push('')
    lines.push(`Vërejtje: keni ${overdue.length} faturë${overdue.length > 1 ? 'a' : ''} të papaguara mbi afat, në vlerë totale €${overdueTotal.toFixed(2)}. Ja vlen t'i ndiqni me klientët përkatës.`)
  }

  if (revChangePct !== null && revChangePct <= -20) {
    lines.push('')
    lines.push(`Të ardhurat ranë ndjeshëm krahasuar me muajin e kaluar — nëse kjo s'është e planifikuar, ja vlen të diskutojmë shkakun.`)
  }
  if (expChangePct !== null && expChangePct >= 40) {
    lines.push('')
    lines.push(`Shpenzimet u rritën në mënyrë të dukshme këtë muaj — kontrolloni nëse ka kosto të papritura që duhen vërejtur.`)
  }

  lines.push('')
  lines.push(`Nëse keni pyetje rreth këtyre shifrave, jam në dispozicion.`)
  lines.push('')
  lines.push(`Faleminderit,`)

  return NextResponse.json({
    letter: lines.join('\n'),
    summary: { thisRev, lastRev, thisExp, lastExp, revChangePct, expChangePct, overdueCount: overdue.length, overdueTotal, topCategory: topCategory?.[0] || null },
  })
}
