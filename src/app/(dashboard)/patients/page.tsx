import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PatientsClient from './patients-client'

export default async function PatientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single()
  if (!profile?.company_id) redirect('/dashboard')
  
  const { data: patients } = await supabase
    .from('patients')
    .select('*, invoices(id, invoice_number, total_amount, issue_date, diagnosis)')
    .eq('company_id', profile.company_id)
    .order('full_name')
  
  return <PatientsClient patients={patients || []} companyId={profile.company_id} />
}
