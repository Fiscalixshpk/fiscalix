import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReportsClient from '@/components/reports/reports-client'

export const metadata: Metadata = { title: 'Raporte ATK — Fiscalix' }

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('role, company_id').eq('id', user.id).single()

  const isAccountant = profile?.role === 'accountant'

  // Merr listën e kompanive
  let companies: { id: string; name: string }[] = []
  if (isAccountant) {
    const { data: clients } = await supabase
      .from('accountant_clients')
      .select('company_id, companies(id, name)')
      .eq('accountant_id', user.id)
      .eq('is_active', true)
    companies = (clients || []).map(c => c.companies as { id: string; name: string }).filter(Boolean)
  } else if (profile?.company_id) {
    const { data: c } = await supabase.from('companies').select('id, name').eq('id', profile.company_id).single()
    if (c) companies = [c]
  }

  const firstCompanyId = companies[0]?.id || profile?.company_id || ''

  const { data: subscription } = await supabase
    .from('subscriptions').select('plan, status')
    .eq('company_id', firstCompanyId).maybeSingle()

  const plan = subscription?.plan || 'basic'
  const hasAccess = isAccountant || ['advanced', 'enterprise'].includes(plan)

  const [{ data: invoices }, { data: expenses }, { data: company }] = await Promise.all([
    supabase.from('invoices').select('*').eq('company_id', firstCompanyId).order('issue_date', { ascending: false }),
    supabase.from('expenses').select('*, expense_categories(name_sq,name)').eq('company_id', firstCompanyId).order('expense_date', { ascending: false }),
    supabase.from('companies').select('*').eq('id', firstCompanyId).single(),
  ])

  return (
    <ReportsClient
      hasAccess={hasAccess}
      plan={plan}
      invoices={invoices || []}
      expenses={expenses || []}
      company={company}
      companies={companies}
      userRole={profile?.role || 'business_owner'}
    />
  )
}
