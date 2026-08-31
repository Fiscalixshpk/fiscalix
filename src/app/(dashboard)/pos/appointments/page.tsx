import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import AppointmentsClient from './appointments-client'

export const metadata = { title: 'Terminet — Fiscalix POS' }

export default async function AppointmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('id, full_name, company_id, companies(id, name, business_type, pos_enabled, nui)')
    .eq('id', user.id).single()

  const company = Array.isArray(userData?.companies)
    ? userData.companies[0]
    : userData?.companies as { id: string; name: string; business_type: string | null; pos_enabled: boolean; nui: string | null } | null

  if (!company?.pos_enabled) redirect('/dashboard')

  // Services
  const { data: services } = await supabase
    .from('services')
    .select('id, name, price, duration_minutes, category')
    .eq('company_id', company.id)
    .eq('is_active', true)
    .order('name')

  const today = new Date().toISOString().split('T')[0]
  const { data: todayApps } = await supabase
    .from('appointments')
    .select('*')
    .eq('company_id', company.id)
    .eq('appointment_date', today)
    .order('appointment_time')

  const isMock = process.env.NEXT_PUBLIC_POS_MOCK_MODE === 'true'

  return (
    <AppointmentsClient
      cashierName={userData?.full_name || 'Operator'}
      company={{ id: company.id, name: company.name, nui: company.nui || '', businessType: company.business_type || 'salon' }}
      services={services || []}
      initialAppointments={todayApps || []}
      isMockMode={isMock}
    />
  )
}
