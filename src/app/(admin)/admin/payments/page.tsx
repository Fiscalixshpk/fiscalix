import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PaymentsConfirmationClient from '@/components/admin/payments-confirmation-client'

export default async function AdminPaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  // 1. New business registrations awaiting payment (subscriptions.status = pending)
  const { data: pendingBizSubsRaw } = await supabase
    .from('subscriptions')
    .select('id, plan, price_monthly, status, created_at, company_id')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  const pendingBizSubs = await Promise.all(
    (pendingBizSubsRaw || []).map(async (s) => {
      const { data: c } = await supabase.from('companies').select('name, email').eq('id', s.company_id).maybeSingle()
      return { ...s, company: c || null, source: 'new_registration' as const }
    })
  )

  // 2. New accountant registrations awaiting payment
  const { data: pendingAccSubsRaw } = await supabase
    .from('accountant_subscriptions')
    .select('id, plan, price_monthly, status, created_at, user_id')
    .eq('status', 'pending_payment')
    .order('created_at', { ascending: false })

  const pendingAccSubs = await Promise.all(
    (pendingAccSubsRaw || []).map(async (p) => {
      const { data: u } = await supabase.from('users').select('full_name, email').eq('id', p.user_id).maybeSingle()
      return { ...p, user: u || null, source: 'new_accountant' as const }
    })
  )

  // 3. Renewal payment notices from existing businesses (payments table, status=pending)
  const { data: pendingRenewalsRaw } = await supabase
    .from('payments')
    .select('id, amount, method, status, reference_number, period_months, created_at, company_id, subscription_id')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  const pendingRenewals = await Promise.all(
    (pendingRenewalsRaw || []).map(async (p) => {
      const { data: c } = await supabase.from('companies').select('name, email').eq('id', p.company_id).maybeSingle()
      return { ...p, company: c || null, source: 'renewal' as const }
    })
  )

  // 4. Recently confirmed payments (history) - last 20
  const { data: recentConfirmed } = await supabase
    .from('payments')
    .select('id, amount, method, confirmed_at, company_id')
    .eq('status', 'confirmed')
    .order('confirmed_at', { ascending: false })
    .limit(20)

  const confirmedHistory = await Promise.all(
    (recentConfirmed || []).map(async (p) => {
      const { data: c } = await supabase.from('companies').select('name').eq('id', p.company_id).maybeSingle()
      return { ...p, company_name: c?.name || 'I panjohur' }
    })
  )

  return (
    <PaymentsConfirmationClient
      pendingBizSubs={pendingBizSubs}
      pendingAccSubs={pendingAccSubs}
      pendingRenewals={pendingRenewals}
      confirmedHistory={confirmedHistory}
    />
  )
}
