import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ContractsClient from './contracts-client'

export const metadata = { title: 'Kontratat — Fiscalix' }

export default async function ContractsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('company_id').eq('id', user.id).single()
  if (!profile?.company_id) redirect('/login')

  const { data: contracts } = await supabase
    .from('b2b_contracts')
    .select('*')
    .eq('company_id', profile.company_id)
    .order('created_at', { ascending: false })

  return <ContractsClient contracts={contracts || []} companyId={profile.company_id} />
}
