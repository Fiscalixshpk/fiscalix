import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FinancialReportClient from './financial-report-client'

export default async function RaporteFinanciare() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('company_id, role').eq('id', user.id).single()

  // Kontabilisti ka company_id të vet (firmës së tij)
  const companyId = profile?.company_id || ''

  const { data: company } = await supabase
    .from('companies').select('*').eq('id', companyId).single()

  const now = new Date()
  const quarter = Math.floor(now.getMonth() / 3)

  const [{ data: invoices }, { data: expenses }, { data: employees }, { data: posSales }] = await Promise.all([
    supabase.from('invoices').select('total_amount, issue_date, status').eq('company_id', companyId),
    supabase.from('expenses').select('amount, expense_date').eq('company_id', companyId),
    supabase.from('employees').select('*').eq('company_id', companyId),
    supabase.from('sales').select('total_amount, issued_at').eq('company_id', companyId),
  ])

  // Shto POS sales si invoices fiktive për raport
  // total_amount te sales ruhet në cents (×100) — e ndajmë me 100
  const posAsInvoices = (posSales || []).map((s: any) => ({
    total_amount: Number(s.total_amount) / 100,
    issue_date:   s.issued_at?.split('T')[0],
    status:       'paid'
  }))
  const allRevenue = [...(invoices || []), ...posAsInvoices]

  return <FinancialReportClient
    company={company}
    invoices={allRevenue}
    expenses={expenses || []}
    employees={employees || []}
    currentQuarter={quarter + 1}
    currentYear={now.getFullYear()}
    qStart={new Date(now.getFullYear(), quarter * 3, 1).toISOString().split('T')[0]}
    qEnd={new Date(now.getFullYear(), quarter * 3 + 3, 0).toISOString().split('T')[0]}
    userRole={profile?.role || 'business_owner'}
  />
}
