import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HealthModuleClient from './health-module-client'

export default async function HealthModulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single()
  const companyId = profile?.company_id

  const [{ data: patients }, { data: visits }] = await Promise.all([
    supabase.from('patients').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
    supabase.from('medical_visits').select('*, patients(full_name)').eq('company_id', companyId).order('visit_date', { ascending: false }).limit(50),
  ])

  return <HealthModuleClient companyId={companyId || ''} patients={patients || []} visits={visits || []} />
}
