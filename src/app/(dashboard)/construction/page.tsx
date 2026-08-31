import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ConstructionClient from './construction-client'

export default async function ConstructionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single()
  const companyId = profile?.company_id

  const [
    { data: projects },
    { data: units },
    { data: contracts },
    { data: subcontractors },
  ] = await Promise.all([
    supabase.from('construction_projects').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
    supabase.from('construction_units').select('*').eq('company_id', companyId),
    supabase.from('construction_contracts').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
    supabase.from('construction_subcontractors').select('*').eq('company_id', companyId),
  ])

  return <ConstructionClient
    companyId={companyId || ''}
    projects={projects || []}
    units={units || []}
    contracts={contracts || []}
    subcontractors={subcontractors || []}
  />
}
