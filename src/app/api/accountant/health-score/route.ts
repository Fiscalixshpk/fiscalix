import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const companyId = req.nextUrl.searchParams.get('company_id')
  if (!companyId) return NextResponse.json({ error: 'company_id required' }, { status: 400 })

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const yearStart = `${now.getFullYear()}-01-01`
  const today = now.toISOString().split('T')[0]

  const [
    { data: invoices },
    { data: expenses },
    { data: overdueInvs },
    { data: company },
  ] = await Promise.all([
    supabase.from('invoices').select('total_amount, total, status, issue_date').eq('company_id', companyId).gte('issue_date', yearStart),
    supabase.from('expenses').select('amount, expense_date').eq('company_id', companyId).gte('expense_date', yearStart),
    supabase.from('invoices').select('id, due_date').eq('company_id', companyId).eq('status', 'overdue'),
    supabase.from('companies').select('is_vat_registered, created_at').eq('id', companyId).single(),
  ])

  const totalRevenue = (invoices||[]).reduce((s,i) => s+Number(i.total_amount||i.total||0), 0)
  const totalExpenses = (expenses||[]).reduce((s,e) => s+Number(e.amount||0), 0)
  const paidInvoices = (invoices||[]).filter(i => i.status==='paid')
  const pendingInvoices = (invoices||[]).filter(i => i.status==='pending')

  // Score calculation (0-100)
  let score = 100
  const issues: { type: 'error'|'warning'|'ok'; label: string }[] = []

  // 1. Fatura të vonuara (-15 për secilën, max -40)
  const overdueCount = (overdueInvs||[]).length
  if (overdueCount > 0) {
    const penalty = Math.min(overdueCount * 15, 40)
    score -= penalty
    issues.push({ type:'error', label:`${overdueCount} fatura të vonuara` })
  } else {
    issues.push({ type:'ok', label:'Asnjë faturë e vonuar' })
  }

  // 2. Marzhi fitimit (-20 nëse negativ, -10 nëse < 10%)
  const profit = totalRevenue - totalExpenses
  const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0
  if (profit < 0) {
    score -= 20
    issues.push({ type:'error', label:`Humbje: €${Math.abs(profit).toFixed(0)}` })
  } else if (margin < 10) {
    score -= 10
    issues.push({ type:'warning', label:`Marzhi i ulët: ${margin.toFixed(1)}%` })
  } else {
    issues.push({ type:'ok', label:`Marzhi: ${margin.toFixed(1)}%` })
  }

  // 3. Asnjë faturë këtë muaj (-15 nëse mbi ditën 10)
  const thisMonthInvs = (invoices||[]).filter(i => i.issue_date >= monthStart)
  if (thisMonthInvs.length === 0 && now.getDate() > 10) {
    score -= 15
    issues.push({ type:'warning', label:'Asnjë faturë këtë muaj' })
  } else {
    issues.push({ type:'ok', label:`${thisMonthInvs.length} fatura këtë muaj` })
  }

  // 4. Raporti fatura paguar vs total
  const paymentRate = (invoices||[]).length > 0 ? paidInvoices.length / (invoices||[]).length : 1
  if (paymentRate < 0.5) {
    score -= 15
    issues.push({ type:'warning', label:`${Math.round(paymentRate*100)}% fatura të paguara` })
  } else {
    issues.push({ type:'ok', label:`${Math.round(paymentRate*100)}% fatura të paguara` })
  }

  // 5. Shpenzime vs të ardhura (nëse > 80% e të ardhurave)
  const expenseRatio = totalRevenue > 0 ? totalExpenses / totalRevenue : 0
  if (expenseRatio > 0.9) {
    score -= 10
    issues.push({ type:'warning', label:`Shpenzime ${Math.round(expenseRatio*100)}% e xhiros` })
  }

  score = Math.max(0, Math.min(100, Math.round(score)))

  const grade = score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : score >= 35 ? 'D' : 'F'
  const color = score >= 80 ? '#10B981' : score >= 65 ? '#3B82F6' : score >= 50 ? '#F59E0B' : '#EF4444'
  const label = score >= 80 ? 'Shkëlqyeshëm' : score >= 65 ? 'Mirë' : score >= 50 ? 'Mesatar' : score >= 35 ? 'Dobët' : 'Kritik'

  return NextResponse.json({
    score, grade, color, label,
    metrics: { totalRevenue, totalExpenses, profit, margin: +margin.toFixed(1), overdueCount, paymentRate: +paymentRate.toFixed(2) },
    issues,
  })
}
