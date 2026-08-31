import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AccountantChatClient from '@/components/dashboard/accountant-chat-client'

export default async function AccountantChatPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role, company_id, full_name')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) redirect('/dashboard')
  if (profile.role === 'accountant' || profile.role === 'admin') redirect('/dashboard')

  // Verify there is a linked accountant - otherwise this page shouldn't be accessible
  const { data: rel } = await supabase
    .from('accountant_clients')
    .select('accountant_id')
    .eq('company_id', profile.company_id)
    .eq('is_active', true)
    .eq('status', 'active')
    .maybeSingle()

  if (!rel?.accountant_id) redirect('/dashboard')

  const { data: accountantUser } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', rel.accountant_id)
    .maybeSingle()

  return (
    <AccountantChatClient
      userId={user.id}
      companyId={profile.company_id}
      accountantName={accountantUser?.full_name || 'Kontabilisti'}
    />
  )
}
