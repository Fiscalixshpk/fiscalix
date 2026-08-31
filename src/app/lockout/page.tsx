import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LockoutScreen from '@/components/shared/lockout-screen'

export default async function LockoutPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('company_id, role').eq('id', user.id).single()

  // Nëse është admin ose accountant, dërgoje te dashboard
  if (profile?.role !== 'business_owner') redirect('/dashboard')

  const { data: company } = await supabase
    .from('companies')
    .select('name, trial_ends_at')
    .eq('id', profile.company_id)
    .single()

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('trial_ends_at, status')
    .eq('company_id', profile.company_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Nëse subscription aktive, kthe te dashboard
  if (sub?.status === 'active') redirect('/dashboard')

  const trialEnd = sub?.trial_ends_at ? new Date(sub.trial_ends_at) : null
  const now = new Date()

  // Nëse trial ende aktiv, kthe te dashboard
  if (trialEnd && trialEnd > now) redirect('/dashboard')

  const daysOverdue = trialEnd
    ? Math.floor((now.getTime() - trialEnd.getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <LockoutScreen
      companyName={company?.name || ''}
      trialEndedAt={trialEnd?.toISOString()}
      daysOverdue={daysOverdue}
    />
  )
}
