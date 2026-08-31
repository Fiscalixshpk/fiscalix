import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TourismModuleClient from './tourism-module-client'

export default async function TourismModulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single()
  const companyId = profile?.company_id

  const [{ data: rooms }, { data: bookings }] = await Promise.all([
    supabase.from('rooms').select('*').eq('company_id', companyId).order('room_number'),
    supabase.from('bookings').select('*').eq('company_id', companyId).order('check_in', { ascending: false }).limit(100),
  ])

  return <TourismModuleClient companyId={companyId || ''} rooms={rooms || []} bookings={bookings || []} />
}
