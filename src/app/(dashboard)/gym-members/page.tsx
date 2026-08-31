import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import GymMembersClient from './gym-members-client'

export const metadata = { title: 'Anëtarët — Fiscalix' }

export default async function GymMembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users').select('company_id').eq('id', user.id).single()

  const { data: members } = await supabase
    .from('gym_members')
    .select('*')
    .eq('company_id', userData?.company_id)
    .order('expires_at', { ascending: true })

  return (
    <GymMembersClient
      companyId={userData?.company_id!}
      userId={user.id}
      initialMembers={members || []}
    />
  )
}
