import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TaxCalendarClient from '@/components/tax/tax-calendar-client'

export const metadata: Metadata = { title: 'Kalendar Tatimor — Fiscalix' }

export default async function TaxCalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('role, company_id').eq('id', user.id).single()

  const { data: subscription } = await supabase
    .from('subscriptions').select('plan, status')
    .eq('company_id', profile?.company_id).maybeSingle()

  const { data: company } = await supabase
    .from('companies').select('is_vat_registered')
    .eq('id', profile?.company_id).maybeSingle()

  const isAccountant = profile?.role === 'accountant'
  const plan = subscription?.plan || 'basic'
  // Accountants always have access to reports and calendar
  const hasAccess = isAccountant || ['advanced', 'enterprise'].includes(plan)

  return <TaxCalendarClient hasAccess={hasAccess} plan={plan} isVatRegistered={company?.is_vat_registered ?? true} />
}
