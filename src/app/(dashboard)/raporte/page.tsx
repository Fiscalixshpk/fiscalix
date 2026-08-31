import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RaporteClient from './raporte-client'

export default async function RaportePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role, company_id, full_name').eq('id', user.id).single()
  
  let companies: { id: string; name: string }[] = []
  
  if (profile?.role === 'accountant') {
    const { data: clients } = await supabase
      .from('accountant_clients')
      .select('company_id, companies(id, name)')
      .eq('accountant_id', user.id)
      .eq('is_active', true)
    companies = (clients || []).map(c => c.companies as { id: string; name: string }).filter(Boolean)
  } else if (profile?.company_id) {
    const { data: company } = await supabase.from('companies').select('id, name').eq('id', profile.company_id).single()
    if (company) companies = [company]
  }

  return <RaporteClient companies={companies} userRole={profile?.role || 'business_owner'} />
}
