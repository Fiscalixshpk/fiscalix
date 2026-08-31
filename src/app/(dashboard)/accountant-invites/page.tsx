import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AccountantInvitesClient from '@/components/dashboard/accountant-invites-client'

export default async function AccountantInvitesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('role, company_id').eq('id', user.id).single()

  if (profile?.role !== 'business_owner' || !profile.company_id) redirect('/dashboard')

  return <AccountantInvitesClient />
}
